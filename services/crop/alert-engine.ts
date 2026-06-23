import { calculateDueDate, computeCropState, getCropSchedule } from '@/services/crop/crop-engine';
import { WeatherPayload } from '@/services/weather/weather.service';
import { CropAlert, CropPlannerItem } from '@/types/crop';
import { DiseasePrediction, SensorCurrent } from '@/types';

export function buildCropAlerts(
  crops: CropPlannerItem[],
  options?: {
    today?: Date;
    weather?: WeatherPayload | null;
    sensor?: SensorCurrent | null;
    lastDisease?: DiseasePrediction | null;
  }
): CropAlert[] {
  const today = options?.today ?? new Date();
  const alerts: CropAlert[] = [];

  crops
    .filter((crop) => crop.status === 'active')
    .forEach((crop) => {
      const state = computeCropState(crop, { ...options, today });
      getCropSchedule(crop).forEach((item) => {
        const dueInDays = item.day - state.ageDays;
        if (dueInDays < 0 || dueInDays > 7) return;

        const weatherMessage =
          item.type === 'spray' && state.weatherAdvice
            ? state.weatherAdvice
            : `${item.description} Due ${dueInDays === 0 ? 'today' : `in ${dueInDays} days`}.`;

        alerts.push({
          id: `${crop.id}_${item.type}_${item.day}`,
          cropId: crop.id,
          cropName: crop.cropName,
          title: item.title,
          type: item.type,
          dueDate: calculateDueDate(crop.plantDate, item.day),
          dueInDays,
          completed: false,
          priority: dueInDays <= 1 ? 'high' : dueInDays <= 3 ? 'medium' : 'low',
          message: weatherMessage,
          createdAt: Math.floor(Date.now() / 1000),
        });
      });

      if (state.diseaseRiskScore >= 70) {
        alerts.push({
          id: `${crop.id}_disease_risk`,
          cropId: crop.id,
          cropName: crop.cropName,
          title: 'Disease Risk Alert',
          type: 'disease-risk',
          dueDate: today.toISOString(),
          dueInDays: 0,
          completed: false,
          priority: 'high',
          message: state.diseaseRiskReason ?? 'Disease risk is elevated. Inspect crop leaves today.',
          createdAt: Math.floor(Date.now() / 1000),
        });
      }
    });

  return alerts.sort((a, b) => a.dueInDays - b.dueInDays);
}
