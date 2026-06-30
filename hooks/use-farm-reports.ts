import { useQuery } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce, updateRealtime } from '@/services/firebase';
import {
  buildDailyReport,
  buildMonthlyReport,
  buildWeeklyReport,
  DailyReport,
  HistoryAlert,
  HistoryDisease,
  HistoryIrrigation,
  HistoryPesticide,
  HistorySensor,
  MonthlyReport,
  WeeklyReport,
} from '@/services/report/report-calculator';
import { getDailyInsight, getMonthlyInsight, getWeeklyRecommendation } from '@/utils/report-insights';
import { useAppStore } from '@/store/use-app-store';
import { FirebaseSensorsCurrent } from '@/types/firebase';

export type FarmReportsPayload = {
  daily: DailyReport;
  weekly: WeeklyReport;
  monthly: MonthlyReport;
  offlineSnapshot: boolean;
};

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function readTimestamp(...values: unknown[]) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next) && next > 0) return next < 1e12 ? next : Math.floor(next / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function currentSensorToHistory(sensor: FirebaseSensorsCurrent | null): HistorySensor | null {
  if (!sensor) return null;
  const soil1 = readNumber(sensor.soil1, sensor.soilMoisture1);
  const soil2 = readNumber(sensor.soil2, sensor.soilMoisture2);
  return {
    temperature: readNumber(sensor.temperature, sensor.temp, sensor.temperatureC, sensor.dhtTemp, sensor.airTemperature) ?? 0,
    humidity: readNumber(sensor.humidity, sensor.hum, sensor.humidityPct, sensor.dhtHumidity) ?? 0,
    avgSoil: readNumber(sensor.avgSoil, sensor.avgSoilMoisture, sensor.soilAvg, soil1 != null && soil2 != null ? (soil1 + soil2) / 2 : undefined) ?? 0,
    ph: readNumber(sensor.ph, sensor.pH, sensor.waterPh, sensor.waterPH, sensor.soilPh, sensor.soilPH) ?? null,
    tankLevel: readNumber(sensor.tankLevel, sensor.tankWaterLevel, sensor.waterLevel) ?? 0,
    timestamp: readTimestamp(sensor.timestamp, sensor.ts, sensor.updatedAt, sensor.lastSync),
  };
}

function latestTimestamp(items: Array<{ timestamp?: number }>) {
  return items.reduce((latest, item) => Math.max(latest, readTimestamp(item.timestamp)), 0);
}

function appendCurrentSensor(historySensors: HistorySensor[], currentSensor: HistorySensor | null) {
  if (!currentSensor) return historySensors;
  const currentTs = readTimestamp(currentSensor.timestamp);
  const alreadyLogged = historySensors.some((item) => Math.abs(readTimestamp(item.timestamp) - currentTs) < 60);
  return alreadyLogged ? historySensors : [...historySensors, currentSensor];
}

export function useFarmReports() {
  const language = useAppStore((state) => state.language);
  return useQuery({
    queryKey: ['farm-reports', language],
    queryFn: async (): Promise<FarmReportsPayload> => {
      try {
        const [sensorsRaw, irrigationRaw, diseaseRaw, alertsRaw, pesticideRaw, currentSensorRaw] = await Promise.all([
          getRealtimeOnce<Record<string, HistorySensor>>(firebasePaths.historySensors),
          getRealtimeOnce<Record<string, HistoryIrrigation>>(firebasePaths.historyIrrigation),
          getRealtimeOnce<Record<string, HistoryDisease>>(firebasePaths.historyDisease),
          getRealtimeOnce<Record<string, HistoryAlert>>(firebasePaths.historyAlerts),
          getRealtimeOnce<Record<string, HistoryPesticide>>(firebasePaths.pesticideHistory),
          getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
        ]);

        const currentSensor = currentSensorToHistory(currentSensorRaw);
        const historySensors = Object.values(sensorsRaw ?? {});
        const sensors = appendCurrentSensor(historySensors, currentSensor);
        const irrigation = Object.values(irrigationRaw ?? {});
        const disease = Object.values(diseaseRaw ?? {});
        const alerts = Object.values(alertsRaw ?? {});
        const pesticideHistory = Object.values(pesticideRaw ?? {});
        const payload = {
          sensors,
          irrigation,
          disease,
          alerts,
          pesticideHistory,
        };

        const daily = buildDailyReport(payload, getDailyInsight());
        const weekly = buildWeeklyReport(payload, getWeeklyRecommendation());
        const monthly = buildMonthlyReport(payload, getMonthlyInsight());
        const generatedAt = Math.max(
          latestTimestamp(sensors),
          latestTimestamp(irrigation),
          latestTimestamp(disease),
          latestTimestamp(alerts),
          latestTimestamp(pesticideHistory),
          Math.floor(Date.now() / 1000)
        );
        const data: FarmReportsPayload = { daily, weekly, monthly, offlineSnapshot: false };
        await setCache(cacheKeys.reports, data);
        void updateRealtime('SmartKisanSathi/reports', { daily, weekly, monthly, generatedAt });
        return data;
      } catch (error) {
        const cached = await getCache<FarmReportsPayload>(cacheKeys.reports);
        if (cached) {
          return { ...cached, offlineSnapshot: true };
        }
        throw error;
      }
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    staleTime: 15000,
  });
}
