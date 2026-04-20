import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { firebasePaths } from '@/constants/firebase-paths';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import {
  FarmLocation,
  WeatherPayload,
  cacheWeatherToFirebase,
  fetchWeather,
  readWeatherFromFirebase,
} from '@/services/weather/weather.service';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

const FARM_LOCATION_KEY = 'farmLocation';
const WEATHER_REFRESH_MS = 20 * 60 * 1000;

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

async function readStoredLocation() {
  try {
    const raw = await AsyncStorage.getItem(FARM_LOCATION_KEY);
    if (!raw) return null;
    return toFarmLocation(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function saveStoredLocation(location: FarmLocation) {
  try {
    await AsyncStorage.setItem(FARM_LOCATION_KEY, JSON.stringify(location));
  } catch {
    // no-op
  }
}

async function resolveVillage(latitude: number, longitude: number, fallbackVillage: string) {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    return place?.subregion || place?.district || place?.city || place?.region || fallbackVillage;
  } catch {
    return fallbackVillage;
  }
}

async function readProfileLocation(uid?: string | null) {
  if (!uid) return null;
  const profile = await getRealtimeOnce<Record<string, unknown>>(`${firebasePaths.userProfiles}/${uid}`);
  if (!profile) return null;

  const explicitFarmLocation = toFarmLocation(profile.farmLocation, 'Farm Location');
  if (explicitFarmLocation) return explicitFarmLocation;

  const nestedLocation = toFarmLocation(profile.location, 'Farm Location');
  if (nestedLocation) return nestedLocation;

  const village = typeof profile.location === 'string' && profile.location.trim() ? profile.location : 'Farm Location';
  return village ? { latitude: NaN, longitude: NaN, village } : null;
}

async function resolveFarmerLocation(uid?: string | null, profileVillage?: string) {
  const fallbackVillage = profileVillage?.trim() || 'Farm Location';
  const stored = await readStoredLocation();
  if (stored) return stored;

  const savedProfileLocation = await readProfileLocation(uid);
  if (savedProfileLocation && Number.isFinite(savedProfileLocation.latitude) && Number.isFinite(savedProfileLocation.longitude)) {
    await saveStoredLocation(savedProfileLocation);
    return savedProfileLocation;
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return savedProfileLocation && Number.isFinite(savedProfileLocation.latitude) && Number.isFinite(savedProfileLocation.longitude)
        ? savedProfileLocation
        : null;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const latitude = Number(current.coords.latitude);
    const longitude = Number(current.coords.longitude);
    const village = await resolveVillage(latitude, longitude, savedProfileLocation?.village || fallbackVillage);
    const nextLocation = { latitude, longitude, village };
    await saveStoredLocation(nextLocation);
    if (uid) {
      await setRealtime(`${firebasePaths.userProfiles}/${uid}/farmLocation`, nextLocation);
    }
    return nextLocation;
  } catch {
    return savedProfileLocation && Number.isFinite(savedProfileLocation.latitude) && Number.isFinite(savedProfileLocation.longitude)
      ? savedProfileLocation
      : null;
  }
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
  const profileLocation = useAppStore((state) => state.profile.location);

  return useQuery({
    queryKey: ['farmer-weather', user?.uid ?? 'guest'],
    enabled: role !== 'admin',
    queryFn: async () => {
      const cached = await getCache<WeatherCache>(cacheKeys.weather);
      const location = await resolveFarmerLocation(user?.uid, profileLocation);

      if (cached && Date.now() - cached.fetchedAt < WEATHER_REFRESH_MS) {
        return {
          ...cached,
          location: location ?? cached.location,
          source: cached.source === 'live' ? 'cache' : cached.source,
        } satisfies WeatherCache;
      }

      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        if (cached) return { ...cached, location: location ?? cached.location, source: 'cache' } satisfies WeatherCache;
        const firebaseFallback = await readWeatherFromFirebase();
        if (firebaseFallback) {
          const fromFirebase: WeatherCache = {
            ...firebaseFallback,
            location,
            source: 'firebase',
            fetchedAt: Date.now(),
          };
          await setCache(cacheKeys.weather, fromFirebase);
          return fromFirebase;
        }
        return toUnavailable(location, cached ?? undefined);
      }

      try {
        const payload = await fetchWeather(location.latitude, location.longitude);
        await cacheWeatherToFirebase(payload);
        const next: WeatherCache = {
          ...payload,
          location,
          source: 'live',
          fetchedAt: Date.now(),
        };
        await setCache(cacheKeys.weather, next);
        return next;
      } catch {
        if (cached) {
          return { ...cached, location, source: 'cache', unavailable: false } satisfies WeatherCache;
        }

        const firebaseFallback = await readWeatherFromFirebase();
        if (firebaseFallback) {
          const fromFirebase: WeatherCache = {
            ...firebaseFallback,
            location,
            source: 'firebase',
            fetchedAt: Date.now(),
          };
          await setCache(cacheKeys.weather, fromFirebase);
          return fromFirebase;
        }

        return toUnavailable(location);
      }
    },
    staleTime: WEATHER_REFRESH_MS,
    gcTime: WEATHER_REFRESH_MS * 3,
    refetchInterval: WEATHER_REFRESH_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
