import { WeatherPayload } from '@/services/weather/weather.service';
import { CropComputedState, CropPlannerItem, CropScheduleItem } from '@/types/crop';
import { DiseasePrediction, SensorCurrent } from '@/types';
import { getCropTemplate } from '@/services/crop/template-engine';

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function calculateCropAgeDays(plantDate: string, today = new Date()) {
  const planted = new Date(plantDate);
  if (Number.isNaN(planted.getTime())) return 0;
  const elapsedDays = Math.floor((startOfDay(today) - startOfDay(planted)) / dayMs);
  return elapsedDays < 0 ? 0 : elapsedDays + 1;
}

export function calculateDueDate(plantDate: string, day: number) {
  const date = new Date(plantDate);
  date.setDate(date.getDate() + Math.max(0, day - 1));
  return date.toISOString();
}

export function getCurrentCropStage(crop: CropPlannerItem, today = new Date()) {
  const template = getCropTemplate(crop.templateKey);
  const ageDays = calculateCropAgeDays(crop.plantDate, today);
  return (
    template.stages.find((stage) => ageDays >= stage.startDay && ageDays <= stage.endDay) ??
    template.stages[template.stages.length - 1]
  );
}

export function getCropSchedule(crop: CropPlannerItem): CropScheduleItem[] {
  const template = getCropTemplate(crop.templateKey);
  return [...template.spraySchedule, ...template.fertilizerSchedule, ...template.harvestSchedule].sort(
    (a, b) => a.day - b.day
  );
}

function getNextAction(crop: CropPlannerItem, ageDays: number) {
  const upcoming = getCropSchedule(crop).find((item) => item.day >= ageDays);
  if (!upcoming) return { action: null, dueInDays: null };
  return { action: upcoming, dueInDays: upcoming.day - ageDays };
}

function resolveHarvestDueInDays(crop: CropPlannerItem, ageDays: number, today: Date) {
  if (crop.expectedHarvestDate) {
    const harvest = new Date(crop.expectedHarvestDate);
    if (!Number.isNaN(harvest.getTime())) {
      return Math.max(0, Math.ceil((startOfDay(harvest) - startOfDay(today)) / dayMs));
    }
  }
  const stage = getCropTemplate(crop.templateKey).stages.at(-1);
  return Math.max(0, (stage?.startDay ?? 0) - ageDays);
}

export function buildWeatherAwareAdvice(
  action: CropScheduleItem | null,
  dueInDays: number | null,
  weather?: WeatherPayload | null
) {
  if (!action || action.type !== 'spray' || dueInDays == null || dueInDays > 2 || !weather) return undefined;
  if (weather.forecast.rainProbabilityNext3h > 70) {
    return dueInDays === 0
      ? 'Pesticide spray is due today, but postponed because rainfall is expected. Do not spray pesticide now.'
      : `Pesticide spray is due in ${dueInDays} days. Rainfall risk is high now, so recheck weather before spraying.`;
  }
  if (weather.current.windSpeed > 20) {
    return dueInDays === 0
      ? 'Pesticide spray is due today, but high wind speed makes spraying unsafe.'
      : `Pesticide spray is due in ${dueInDays} days. Wind is high now, so recheck wind before spraying.`;
  }
  return undefined;
}

export function calculateDiseaseRisk(sensor?: SensorCurrent | null, lastDisease?: DiseasePrediction | null) {
  const humidity = Number(sensor?.humidity ?? 0);
  const temperature = Number(sensor?.temperature ?? 0);
  const fungalWindow = humidity > 85 && temperature >= 20 && temperature <= 30;
  const diseaseBoost = lastDisease && lastDisease.disease !== 'Healthy' ? Math.min(30, Math.round(lastDisease.confidence / 4)) : 0;
  const score = Math.min(100, (fungalWindow ? 70 : 15) + diseaseBoost);
  return {
    score,
    reason: fungalWindow ? 'High fungal disease risk detected.' : undefined,
  };
}

export function computeCropState(
  crop: CropPlannerItem,
  options?: {
    today?: Date;
    weather?: WeatherPayload | null;
    sensor?: SensorCurrent | null;
    lastDisease?: DiseasePrediction | null;
  }
): CropComputedState {
  const today = options?.today ?? new Date();
  const ageDays = calculateCropAgeDays(crop.plantDate, today);
  const currentStage = getCurrentCropStage(crop, today);
  const { action, dueInDays } = getNextAction(crop, ageDays);
  const risk = calculateDiseaseRisk(options?.sensor, options?.lastDisease);

  return {
    crop,
    ageDays,
    currentStage,
    daysRemaining: Math.max(0, currentStage.endDay - ageDays),
    nextAction: action,
    nextActionDueInDays: dueInDays,
    harvestDueInDays: resolveHarvestDueInDays(crop, ageDays, today),
    diseaseRiskScore: risk.score,
    diseaseRiskReason: risk.reason,
    weatherAdvice: buildWeatherAwareAdvice(action, dueInDays, options?.weather),
  };
}
