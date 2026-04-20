import { TFunction } from 'i18next';
import { WeatherPayload } from '@/services/weather/weather.service';
import { DiseaseClass, Lang, UserRole } from '@/types';

export function localeForLanguage(language: string | null | undefined) {
  const short = (language || 'en').slice(0, 2) as Lang;
  if (short === 'hi') return 'hi-IN';
  if (short === 'mr') return 'mr-IN';
  return 'en-IN';
}

export function formatLocalizedDate(value: Date | number | string, language: string, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(localeForLanguage(language), options);
}

export function formatLocalizedTime(value: Date | number | string, language: string, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString(localeForLanguage(language), options);
}

export function formatLocalizedDateTime(value: Date | number | string, language: string, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(localeForLanguage(language), options);
}

export function translateFarmHealthLabel(label: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical', t: TFunction) {
  if (label === 'Excellent') return t('farmHealthExcellent');
  if (label === 'Good') return t('farmHealthGood');
  if (label === 'Needs Attention') return t('farmHealthNeedsAttention');
  return t('farmHealthCritical');
}

export function translateDiseaseName(disease: string, t: TFunction) {
  const map: Record<string, string> = {
    Healthy: 'diseaseNameHealthy',
    'Early Blight': 'diseaseNameEarlyBlight',
    'Late Blight': 'diseaseNameLateBlight',
    'Leaf Mold': 'diseaseNameLeafMold',
    'Target Spot': 'diseaseNameTargetSpot',
    'Spider Mites': 'diseaseNameSpiderMites',
  };

  return map[disease] ? t(map[disease]) : disease;
}

export function translateRole(role: UserRole, t: TFunction) {
  if (role === 'admin') return t('roleAdmin');
  if (role === 'viewer') return t('roleViewer');
  return t('roleFarmer');
}

export function translateWeatherCondition(weather: WeatherPayload | null | undefined, t: TFunction) {
  const code = weather?.current.weatherCode;
  if (code === 0) return t('weatherSunny');
  if (code === 1 || code === 2) return t('weatherPartlyCloudy');
  if (code === 3) return t('weatherCloudy');
  if (code === 45 || code === 48) return t('weatherFoggy');
  if ([51, 53, 55, 56, 57].includes(Number(code))) return t('weatherDrizzle');
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(Number(code))) return t('weatherRain');
  if ([71, 73, 75, 77, 85, 86].includes(Number(code))) return t('weatherSnow');
  if ([95, 96, 99].includes(Number(code))) return t('weatherStorm');
  return t('weatherUnknown');
}

export function translateRainRisk(rainRisk: string | null | undefined, t: TFunction) {
  if (rainRisk === 'HIGH') return t('rainRiskHigh');
  if (rainRisk === 'MEDIUM') return t('rainRiskMedium');
  return t('rainRiskLow');
}

export function buildDashboardWeatherAdvice(weather: WeatherPayload | null | undefined, t: TFunction) {
  if (!weather || weather.unavailable) return t('weatherUnavailable');
  if (weather.guidance.shouldDelayIrrigation) {
    return weather.guidance.nextRainHours == null
      ? t('weatherRainSoonDelay')
      : t('weatherRainInHoursDelay', { hours: weather.guidance.nextRainHours + 1 });
  }
  return weather.guidance.spraySafe ? t('weatherSteadyAdvice') : t('weatherAvoidSprayAdvice');
}

export function buildSprayApprovalWeatherText(weather: WeatherPayload | null | undefined, t: TFunction) {
  if (!weather || weather.unavailable) return t('weatherUnavailable');
  if (weather.guidance.rainExpectedWithin6h) {
    return weather.guidance.nextRainHours == null
      ? t('sprayRainSoonBlocked')
      : t('sprayRainInHoursBlocked', { hours: weather.guidance.nextRainHours + 1 });
  }
  return weather.guidance.spraySafe ? t('spraySafeNow') : t('sprayBlockedNow');
}

export function buildIrrigationWeatherText(weather: WeatherPayload | null | undefined, avgSoil: number, threshold: number, t: TFunction) {
  if (!weather || weather.unavailable) return t('weatherUnavailable');
  if (weather.guidance.shouldDelayIrrigation) return t('weatherDelayIrrigation');
  if (avgSoil < threshold) return t('weatherIrrigationRecommended');
  return t('weatherMonitorSoil');
}

export function translateAlertType(value: string, t: TFunction) {
  const map: Record<string, string> = {
    ALERT: 'alertTypeGeneric',
    'No alerts': 'alertTypeNone',
    TANK_LOW: 'alertTypeTankLow',
    SOIL_DRY: 'alertTypeSoilDry',
    DEVICE_OFFLINE_15M: 'alertTypeDeviceOffline',
    PESTICIDE_TANK_EMPTY: 'alertTypePesticideEmpty',
    DISEASE_HIGH_CONFIDENCE: 'alertTypeDiseaseHighConfidence',
  };

  return map[value] ? t(map[value]) : value;
}

export function localizeDiseaseRecommendation(disease: DiseaseClass, t: TFunction) {
  const keyMap: Record<DiseaseClass, string> = {
    Healthy: 'healthy',
    'Early Blight': 'earlyBlight',
    'Late Blight': 'lateBlight',
    'Leaf Mold': 'leafMold',
    'Target Spot': 'targetSpot',
    'Spider Mites': 'spiderMites',
  };
  const key = keyMap[disease];

  return {
    pesticide: t(`diseaseRecommendations.${key}.pesticide`),
    why: t(`diseaseRecommendations.${key}.why`),
    organicAlternative: t(`diseaseRecommendations.${key}.organicAlternative`),
    dosage: t(`diseaseRecommendations.${key}.dosage`),
    harvestInterval: t(`diseaseRecommendations.${key}.harvestInterval`),
    frequency: t(`diseaseRecommendations.${key}.frequency`),
    severityNote: t(`diseaseRecommendations.${key}.severityNote`),
    spray: disease !== 'Healthy',
  };
}
