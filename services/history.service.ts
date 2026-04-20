import { firebasePaths } from '@/constants/firebase-paths';
import { SensorCurrent } from '@/types';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { setRealtime } from '@/services/firebase';

type SensorHistoryItem = {
  temperature: number;
  humidity: number;
  avgSoil: number;
  tankLevel: number;
  timestamp: number;
};

const HISTORY_INTERVAL_MS = 10 * 60 * 1000;
const BLOCK_TTL_MS = 60 * 60 * 1000;

async function isHistoryWriteBlocked() {
  const blockedUntil = (await getCache<number>(cacheKeys.historyWriteBlocked)) ?? 0;
  return blockedUntil > Date.now();
}

async function setHistoryWriteBlocked() {
  await setCache(cacheKeys.historyWriteBlocked, Date.now() + BLOCK_TTL_MS);
}

export async function logSensorSnapshotIfDue(snapshot: SensorCurrent): Promise<void> {
  if (await isHistoryWriteBlocked()) return;
  const now = Date.now();
  const last = (await getCache<number>(cacheKeys.lastSensorHistoryLog)) ?? 0;
  if (now - last < HISTORY_INTERVAL_MS) return;

  const payload: SensorHistoryItem = {
    temperature: Number(snapshot.temperature ?? 0),
    humidity: Number(snapshot.humidity ?? 0),
    avgSoil: Number(snapshot.avgSoilMoisture ?? 0),
    tankLevel: Number(snapshot.tankWaterLevel ?? 0),
    timestamp: Math.floor(now / 1000),
  };

  const key = `${firebasePaths.historySensors}/${now}`;
  const ok = await setRealtime(key, payload);
  // Throttle attempts even when rules deny writes to prevent noisy retry loops.
  await setCache(cacheKeys.lastSensorHistoryLog, now);
  if (!ok) {
    await setHistoryWriteBlocked();
  }
}

export async function logIrrigationHistory(payload: {
  autoMode: boolean;
  threshold: number;
  pumpWater: boolean;
  avgSoil: number;
}) {
  if (await isHistoryWriteBlocked()) return;
  const now = Date.now();
  const ok = await setRealtime(`${firebasePaths.historyIrrigation}/${now}`, {
    ...payload,
    timestamp: Math.floor(now / 1000),
  });
  if (!ok) {
    await setHistoryWriteBlocked();
  }
}

export async function logDiseaseHistory(payload: {
  disease: string;
  confidence: number;
  sprayRecommended: boolean;
  imageUrl: string;
}) {
  if (await isHistoryWriteBlocked()) return;
  const now = Date.now();
  const ok = await setRealtime(`${firebasePaths.historyDisease}/${now}`, {
    ...payload,
    timestamp: Math.floor(now / 1000),
  });
  if (!ok) {
    await setHistoryWriteBlocked();
  }
}

export async function logAlertHistory(payload: {
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}) {
  if (await isHistoryWriteBlocked()) return;
  const now = Date.now();
  const ok = await setRealtime(`${firebasePaths.historyAlerts}/${now}`, {
    ...payload,
    timestamp: Math.floor(now / 1000),
  });
  if (!ok) {
    await setHistoryWriteBlocked();
  }
}
