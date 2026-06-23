import { firebasePaths } from '@/constants/firebase-paths';
import { buildCropAlerts } from '@/services/crop/alert-engine';
import { computeCropState } from '@/services/crop/crop-engine';
import { getCropTemplate, getCropTemplateOptions } from '@/services/crop/template-engine';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { triggerAlertIfNeeded } from '@/services/alerts.service';
import { WeatherPayload } from '@/services/weather/weather.service';
import { CropAlert, CropPlannerItem, CropPlannerSummary, CropTemplateKey } from '@/types/crop';
import { DiseasePrediction, SensorCurrent } from '@/types';

type CropMap = Record<string, CropPlannerItem | null>;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function normalizeCrop(id: string, raw: Partial<CropPlannerItem>): CropPlannerItem {
  const template = getCropTemplate(raw.templateKey);
  return {
    id,
    cropName: raw.cropName || template.cropName,
    variety: raw.variety || template.defaultVarieties[0] || '',
    farmId: raw.farmId || 'default',
    farmName: raw.farmName || '',
    plantDate: raw.plantDate || new Date().toISOString(),
    expectedHarvestDate: raw.expectedHarvestDate || '',
    templateKey: template.key,
    status: raw.status || 'active',
    createdAt: Number(raw.createdAt || nowSec()),
    updatedAt: Number(raw.updatedAt || nowSec()),
  };
}

export async function seedCropTemplates() {
  const templates = getCropTemplateOptions();
  await Promise.all(templates.map((template) => setRealtime(`${firebasePaths.cropTemplates}/${template.key}`, template)));
}

export async function fetchCropPlanner(): Promise<CropPlannerItem[]> {
  const raw = await getRealtimeOnce<CropMap>(firebasePaths.cropPlanner);
  return Object.entries(raw ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([id, value]) => normalizeCrop(id, value ?? {}))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveCropPlannerItem(
  input: Omit<Partial<CropPlannerItem>, 'id'> & { id?: string; cropName: string; plantDate: string; templateKey?: CropTemplateKey }
) {
  const id = input.id || `crop_${Date.now()}`;
  const existing = input.id ? await getRealtimeOnce<CropPlannerItem>(`${firebasePaths.cropPlanner}/${input.id}`) : null;
  const crop = normalizeCrop(id, {
    ...existing,
    ...input,
    id,
    updatedAt: nowSec(),
    createdAt: existing?.createdAt ?? nowSec(),
  });
  await setRealtime(`${firebasePaths.cropPlanner}/${id}`, crop);
  void seedCropTemplates();
  return crop;
}

export async function deleteCropPlannerItem(id: string) {
  await setRealtime(`${firebasePaths.cropPlanner}/${id}`, null);
}

export async function completeCropAlert(alertId: string) {
  await setRealtime(`${firebasePaths.cropAlerts}/${alertId}/completed`, true);
}

export async function syncCropAlerts(alerts: CropAlert[]) {
  await Promise.all(
    alerts.map(async (alert) => {
      await setRealtime(`${firebasePaths.cropAlerts}/${alert.id}`, alert);
      if (alert.completed || alert.dueInDays > 1) return;
      await triggerAlertIfNeeded({
        key: `crop_${alert.id}`,
        type: `CROP_${alert.type.toUpperCase()}`,
        severity: alert.priority,
        title: `${alert.cropName}: ${alert.title}`,
        message: alert.message,
      });
    })
  );
}

export function buildCropPlannerSummary(
  crops: CropPlannerItem[],
  options?: {
    weather?: WeatherPayload | null;
    sensor?: SensorCurrent | null;
    lastDisease?: DiseasePrediction | null;
    selectedCropId?: string | null;
  }
): CropPlannerSummary {
  const active = crops.filter((crop) => crop.status === 'active');
  const computed = active.map((crop) => computeCropState(crop, options));
  const selectedCrop =
    computed.find((state) => state.crop.id === options?.selectedCropId) ??
    computed[0] ??
    null;
  const upcomingAlerts = buildCropAlerts(active, options);
  const selectedAlerts = selectedCrop ? buildCropAlerts([selectedCrop.crop], options) : [];

  return {
    activeCrops: active.length,
    upcomingSprays: upcomingAlerts.filter((alert) => alert.type === 'spray' && alert.dueInDays <= 7).length,
    upcomingHarvests: computed.filter((state) => Number(state.harvestDueInDays ?? 999) <= 14).length,
    diseaseRiskCrops: computed.filter((state) => state.diseaseRiskScore >= 70).length,
    upcomingAlerts,
    selectedAlerts,
    cropStates: computed,
    selectedCropId: selectedCrop?.crop.id ?? null,
    selectedCrop,
    activeCrop: selectedCrop,
  };
}


