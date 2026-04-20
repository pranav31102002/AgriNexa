import { MaterialCommunityIcons } from '@expo/vector-icons';

export type WeatherBadgeTone = 'ok' | 'warn' | 'error' | 'info';

export function weatherConditionIcon(condition: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'weather-rainy';
  if (normalized.includes('storm')) return 'weather-lightning-rainy';
  if (normalized.includes('fog')) return 'weather-fog';
  if (normalized.includes('cloud')) return 'weather-cloudy';
  if (normalized.includes('clear') || normalized.includes('sun')) return 'weather-sunny';
  return 'weather-partly-cloudy';
}

export function rainRiskTone(rainRisk: string): WeatherBadgeTone {
  if (rainRisk === 'HIGH') return 'error';
  if (rainRisk === 'MEDIUM') return 'warn';
  return 'ok';
}

export function sprayAdviceTone(safe: boolean): WeatherBadgeTone {
  return safe ? 'ok' : 'error';
}

export function irrigationAdviceTone(shouldDelayIrrigation: boolean): WeatherBadgeTone {
  return shouldDelayIrrigation ? 'warn' : 'info';
}
