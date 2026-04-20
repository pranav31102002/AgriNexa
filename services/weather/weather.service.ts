import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';

const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const RAIN_HIGH_THRESHOLD = 60;
const RAIN_MEDIUM_THRESHOLD = 35;
const WIND_UNSAFE_THRESHOLD = 20;

type OpenMeteoResponse = {
  current_weather?: {
    temperature?: number;
    windspeed?: number;
    weathercode?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
  };
  daily?: {
    weathercode?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
};

export type FarmLocation = {
  latitude: number;
  longitude: number;
  village: string;
};

export type WeatherCurrent = {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  timestamp: number;
};

export type WeatherForecast = {
  rainProbabilityNext3h: number;
  todayMax: number;
  todayMin: number;
  tomorrowRain: number;
  timestamp: number;
};

export type WeatherGuidance = {
  condition: string;
  rainRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  sprayAdvice: string;
  irrigationAdvice: string;
  windRisk: 'LOW' | 'HIGH';
  spraySafe: boolean;
  shouldDelayIrrigation: boolean;
  rainExpectedWithin6h: boolean;
  nextRainHours: number | null;
  advice: string;
};

export type WeatherPayload = {
  current: WeatherCurrent;
  forecast: WeatherForecast;
  guidance: WeatherGuidance;
};

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeArray(values?: number[]) {
  return Array.isArray(values) ? values.map((value) => asNumber(value)) : [];
}

function resolveCurrentIndex(hourlyTimes: string[] | undefined, currentTime?: string) {
  if (!hourlyTimes?.length || !currentTime) return 0;
  const exact = hourlyTimes.findIndex((value) => value === currentTime);
  if (exact >= 0) return exact;
  const currentMs = Date.parse(currentTime);
  if (!Number.isFinite(currentMs)) return 0;

  let nearestIndex = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;
  hourlyTimes.forEach((value, index) => {
    const delta = Math.abs(Date.parse(value) - currentMs);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function maxSlice(values: number[], start: number, count: number) {
  return values.slice(start, start + count).reduce((max, value) => Math.max(max, value), 0);
}

function firstRainHour(values: number[], start: number, count: number, threshold: number) {
  for (let index = start; index < Math.min(values.length, start + count); index += 1) {
    if (values[index] >= threshold) return index - start;
  }
  return null;
}

export function mapWeatherCodeToCondition(code: number) {
  if (code === 0) return 'Sunny';
  if ([1, 2].includes(code)) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Storm';
  return 'Weather Unknown';
}

export function computeRainRisk(precipitationProbability: number[]) {
  const peak = precipitationProbability.reduce((max, value) => Math.max(max, asNumber(value)), 0);
  if (peak > RAIN_HIGH_THRESHOLD) return 'HIGH' as const;
  if (peak >= RAIN_MEDIUM_THRESHOLD) return 'MEDIUM' as const;
  return 'LOW' as const;
}

export function computeSprayAdvice({
  rainRisk,
  windSpeed,
  windThreshold = WIND_UNSAFE_THRESHOLD,
}: {
  rainRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  windSpeed: number;
  windThreshold?: number;
}) {
  const windRisk = windSpeed >= windThreshold ? 'HIGH' : 'LOW';
  const spraySafe = rainRisk !== 'HIGH' && windRisk === 'LOW';
  const sprayAdvice = spraySafe ? 'Spray conditions look safe right now.' : 'Not safe for spray due to rain or wind risk.';
  return {
    windRisk,
    spraySafe,
    sprayAdvice,
  };
}

export function computeIrrigationAdvice({
  rainExpectedWithin6h,
}: {
  rainExpectedWithin6h: boolean;
}) {
  if (rainExpectedWithin6h) {
    return {
      shouldDelayIrrigation: true,
      irrigationAdvice: 'DELAY irrigation. Rain is expected soon.',
    };
  }

  return {
    shouldDelayIrrigation: false,
    irrigationAdvice: 'No strong rain signal. Irrigate if soil is dry.',
  };
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherPayload> {
  const url = new URL(WEATHER_ENDPOINT);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m');
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }

  const json = (await response.json()) as OpenMeteoResponse;
  const timestamp = Math.floor(Date.now() / 1000);
  const weatherCode = asNumber(json.current_weather?.weathercode);
  const condition = mapWeatherCodeToCondition(weatherCode);
  const hourlyTimes = json.hourly?.time ?? [];
  const startIndex = resolveCurrentIndex(hourlyTimes, json.current_weather?.time);
  const precipitation = safeArray(json.hourly?.precipitation_probability);
  const rainProbabilityNext3h = maxSlice(precipitation, startIndex, 3);
  const rainExpectedWithin6h = maxSlice(precipitation, startIndex, 6) > RAIN_HIGH_THRESHOLD;
  const nextRainHours = firstRainHour(precipitation, startIndex, 6, RAIN_MEDIUM_THRESHOLD);
  const rainRisk = computeRainRisk(precipitation.slice(startIndex, startIndex + 6));
  const windSpeed = asNumber(json.current_weather?.windspeed);
  const spray = computeSprayAdvice({ rainRisk, windSpeed });
  const irrigation = computeIrrigationAdvice({ rainExpectedWithin6h });
  const todayMax = asNumber(json.daily?.temperature_2m_max?.[0]);
  const todayMin = asNumber(json.daily?.temperature_2m_min?.[0]);
  const tomorrowRain = asNumber(json.daily?.precipitation_sum?.[1]);

  const guidance: WeatherGuidance = {
    condition,
    rainRisk,
    sprayAdvice: spray.sprayAdvice,
    irrigationAdvice: irrigation.irrigationAdvice,
    windRisk: spray.windRisk,
    spraySafe: spray.spraySafe,
    shouldDelayIrrigation: irrigation.shouldDelayIrrigation,
    rainExpectedWithin6h,
    nextRainHours,
    advice: irrigation.shouldDelayIrrigation
      ? nextRainHours == null
        ? 'Rain expected soon. Delay irrigation.'
        : `Rain expected in ${nextRainHours + 1} hours. Delay irrigation.`
      : spray.spraySafe
        ? 'Weather is steady. Continue farmer decisions carefully.'
        : 'Wind or rain risk is elevated. Avoid spraying for now.',
  };

  return {
    current: {
      temperature: asNumber(json.current_weather?.temperature),
      windSpeed,
      weatherCode,
      condition,
      timestamp,
    },
    forecast: {
      rainProbabilityNext3h,
      todayMax,
      todayMin,
      tomorrowRain,
      timestamp,
    },
    guidance,
  };
}

export async function readWeatherFromFirebase(): Promise<WeatherPayload | null> {
  const [current, forecast] = await Promise.all([
    getRealtimeOnce<WeatherCurrent>(firebasePaths.weatherCurrent),
    getRealtimeOnce<WeatherForecast>(firebasePaths.weatherForecast),
  ]);

  if (!current || !forecast) return null;

  const guidance = (() => {
    const rainRisk = computeRainRisk([forecast.rainProbabilityNext3h, forecast.tomorrowRain > 0 ? 45 : 0]);
    const spray = computeSprayAdvice({ rainRisk, windSpeed: current.windSpeed });
    const irrigation = computeIrrigationAdvice({ rainExpectedWithin6h: forecast.rainProbabilityNext3h > RAIN_HIGH_THRESHOLD });
    return {
      condition: current.condition,
      rainRisk,
      sprayAdvice: spray.sprayAdvice,
      irrigationAdvice: irrigation.irrigationAdvice,
      windRisk: spray.windRisk,
      spraySafe: spray.spraySafe,
      shouldDelayIrrigation: irrigation.shouldDelayIrrigation,
      rainExpectedWithin6h: forecast.rainProbabilityNext3h > RAIN_HIGH_THRESHOLD,
      nextRainHours: null,
      advice: irrigation.shouldDelayIrrigation ? 'Rain expected soon. Delay irrigation.' : 'No strong rain signal. Irrigate if soil is dry.',
    } satisfies WeatherGuidance;
  })();

  return { current, forecast, guidance };
}

export async function cacheWeatherToFirebase(payload: WeatherPayload) {
  await Promise.all([
    setRealtime(firebasePaths.weatherCurrent, payload.current),
    setRealtime(firebasePaths.weatherForecast, payload.forecast),
  ]);
}
