import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import {
  FarmLocation,
  WeatherPayload,
  fetchWeather,
} from '@/services/weather/weather.service';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

const FARM_LOCATION_KEY = 'farmLocation';
const WEATHER_REFRESH_MS = 5 * 60 * 1000;

type WeatherCache = WeatherPayload & {
  location: FarmLocation | null;
  source: 'live' | 'cache' | 'firebase' | 'unavailable';
  fetchedAt: number;
  unavailable?: boolean;
};

function isFarmLocation(value: unknown): value is FarmLocation {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude));
}

function toFarmLocation(value: unknown, villageFallback = 'Farm Location'): FarmLocation | null {
  if (!isFarmLocation(value)) return null;
  const candidate = value as Record<string, unknown>;
  return {
    latitude: Number(candidate.latitude),
    longitude: Number(candidate.longitude),
    village: String(candidate.village ?? villageFallback),
  };
}

function storedLocationKey(uid?: string | null) {
  return uid ? `${FARM_LOCATION_KEY}:${uid}` : FARM_LOCATION_KEY;
}

function weatherCacheKey(uid?: string | null, signature?: string) {
  return uid && signature ? `${cacheKeys.weather}:${uid}:${signature}` : `${cacheKeys.weather}:guest`;
}

function normalizeLocationPart(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function buildFarmLocationSignature(profile: Record<string, unknown>) {
  const area = normalizeLocationPart(profile.farmArea || profile.farmVillage);
  const district = normalizeLocationPart(profile.farmDistrict);
  const location = normalizeLocationPart(profile.location);
  return [area, district, location].filter(Boolean).join('|').toLowerCase();
}

async function readStoredLocationForUser(uid?: string | null) {
  try {
    const raw = await AsyncStorage.getItem(storedLocationKey(uid));
    if (!raw) return null;
    return toFarmLocation(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveStoredLocation(location: FarmLocation, uid?: string | null) {
  try {
    await AsyncStorage.setItem(storedLocationKey(uid), JSON.stringify(location));
  } catch {
    // no-op
  }
}

function resultMatchesFarm(
  result: { name?: string; admin1?: string; admin2?: string; country?: string },
  district?: string,
  stateOrLocation?: string
) {
  const haystack = [result.name, result.admin1, result.admin2, result.country].map((value) => String(value ?? '').toLowerCase());
  const required = [district, stateOrLocation]
    .map((value) => normalizeLocationPart(value).toLowerCase())
    .filter(Boolean);
  if (!required.length) return true;
  return required.some((part) => haystack.some((value) => value.includes(part)));
}

async function geocodeFarmArea(area: string, district?: string, stateOrLocation?: string): Promise<FarmLocation | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', area);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const json = (await response.json()) as {
    results?: Array<{ name?: string; latitude?: number; longitude?: number; admin1?: string; admin2?: string; country?: string }>;
  };
  const results = json.results ?? [];
  const top = results.find((item) => resultMatchesFarm(item, district, stateOrLocation)) ?? results[0];
  if (!top) return null;
  const latitude = Number(top.latitude);
  const longitude = Number(top.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const districtLabel = district?.trim();
  const village = [String(top.name ?? area), districtLabel].filter(Boolean).join(', ');
  return {
    latitude,
    longitude,
    village,
  };
}

async function readProfileLocation(uid?: string | null) {
  if (!uid) return null;
  const profile = await getRealtimeOnce<Record<string, unknown>>(`${firebasePaths.userProfiles}/${uid}`);
  if (!profile) return null;

  const currentSignature = buildFarmLocationSignature(profile);
  const savedSignature = typeof profile.farmLocationSignature === 'string' ? profile.farmLocationSignature : '';
  const latitude = Number(profile.farmLatitude);
  const longitude = Number(profile.farmLongitude);
  const area =
    (typeof profile.farmArea === 'string' && profile.farmArea.trim()) ||
    (typeof profile.farmVillage === 'string' && profile.farmVillage.trim()) ||
    (typeof profile.location === 'string' && profile.location.trim()) ||
    '';
  const district = typeof profile.farmDistrict === 'string' ? profile.farmDistrict.trim() : '';
  const stateOrLocation = typeof profile.location === 'string' ? profile.location.trim() : '';

  if (Number.isFinite(latitude) && Number.isFinite(longitude) && (!currentSignature || savedSignature === currentSignature)) {
    return {
      latitude,
      longitude,
      village:
        (typeof profile.farmVillage === 'string' && profile.farmVillage.trim()) ||
        (typeof profile.farmArea === 'string' && profile.farmArea.trim()) ||
        (typeof profile.location === 'string' && profile.location.trim()) ||
        'Farm Location',
    } satisfies FarmLocation;
  }

  const explicitFarmLocation = toFarmLocation(profile.farmLocation, 'Farm Location');
  if (explicitFarmLocation && (!currentSignature || savedSignature === currentSignature)) return explicitFarmLocation;

  if (!area) return null;
  const resolved = await geocodeFarmArea(area, district, stateOrLocation);
  if (!resolved) return { latitude: NaN, longitude: NaN, village: area };
  void Promise.all([
    setRealtime(`${firebasePaths.userProfiles}/${uid}/farmVillage`, resolved.village),
    setRealtime(`${firebasePaths.userProfiles}/${uid}/farmLatitude`, resolved.latitude),
    setRealtime(`${firebasePaths.userProfiles}/${uid}/farmLongitude`, resolved.longitude),
    setRealtime(`${firebasePaths.userProfiles}/${uid}/farmLocationSignature`, currentSignature),
  ]);
  return resolved;
}

async function resolveFarmerLocation(uid?: string | null, profileVillage?: string) {
  const fallbackVillage = profileVillage?.trim() || 'Farm Location';
  const savedProfileLocation = await readProfileLocation(uid);
  if (savedProfileLocation && Number.isFinite(savedProfileLocation.latitude) && Number.isFinite(savedProfileLocation.longitude)) {
    await saveStoredLocation(savedProfileLocation, uid);
    return savedProfileLocation;
  }
  const stored = await readStoredLocationForUser(uid);
  if (stored) return stored;
  return savedProfileLocation && Number.isFinite(savedProfileLocation.latitude) && Number.isFinite(savedProfileLocation.longitude)
    ? savedProfileLocation
    : { latitude: NaN, longitude: NaN, village: fallbackVillage };
}

function toUnavailable(location: FarmLocation | null, fallback?: Partial<WeatherCache>): WeatherCache {
  return {
    current: fallback?.current ?? {
      temperature: 0,
      windSpeed: 0,
      weatherCode: -1,
      condition: 'Weather data unavailable',
      timestamp: Math.floor(Date.now() / 1000),
    },
    forecast: fallback?.forecast ?? {
      rainProbabilityNext3h: 0,
      todayMax: 0,
      todayMin: 0,
      tomorrowRain: 0,
      timestamp: Math.floor(Date.now() / 1000),
    },
    guidance: fallback?.guidance ?? {
      condition: 'Weather data unavailable',
      rainRisk: 'LOW',
      sprayAdvice: 'Weather data unavailable',
      irrigationAdvice: 'Weather data unavailable',
      windRisk: 'LOW',
      spraySafe: false,
      shouldDelayIrrigation: false,
      rainExpectedWithin6h: false,
      nextRainHours: null,
      advice: 'Weather data unavailable',
    },
    location,
    source: 'unavailable',
    fetchedAt: Date.now(),
    unavailable: true,
  };
}

export function useWeather() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const profile = useAppStore((state) => state.profile);
  const profileLocation = profile.location;
  const profileSignature = buildFarmLocationSignature(profile as unknown as Record<string, unknown>);
  const scopedWeatherCacheKey = weatherCacheKey(user?.uid, profileSignature || user?.uid);

  return useQuery({
    queryKey: ['farmer-weather', user?.uid ?? 'guest', profileSignature],
    enabled: role !== 'admin',
    queryFn: async () => {
      const cached = await getCache<WeatherCache>(scopedWeatherCacheKey);
      const location = await resolveFarmerLocation(user?.uid, profileLocation);

      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        if (cached) return { ...cached, location: location ?? cached.location, source: 'cache' } satisfies WeatherCache;
        return toUnavailable(location, cached ?? undefined);
      }

      try {
        const payload = await fetchWeather(location.latitude, location.longitude);
        const next: WeatherCache = {
          ...payload,
          location,
          source: 'live',
          fetchedAt: Date.now(),
        };
        await setCache(scopedWeatherCacheKey, next);
        return next;
      } catch {
        if (cached) {
          return { ...cached, location, source: 'cache', unavailable: false } satisfies WeatherCache;
        }

        return toUnavailable(location);
      }
    },
    staleTime: WEATHER_REFRESH_MS,
    gcTime: WEATHER_REFRESH_MS * 3,
    refetchInterval: WEATHER_REFRESH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    retry: 1,
  });
}
