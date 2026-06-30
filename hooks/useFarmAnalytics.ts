import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce } from '@/services/firebase';
import {
  buildWeeklyReport,
  HistoryAlert,
  HistoryDisease,
  HistoryIrrigation,
  HistoryPesticide,
  HistorySensor,
} from '@/services/report/report-calculator';
import { AnalyticsSummary, HeatmapRow } from '@/types';
import { useQuery } from '@tanstack/react-query';

type AnalyticsToday = {
  avgSoilTrend?: number[];
  waterUsedLiters?: number;
};

type WeeklyReport = {
  soilTrend?: { value: number; label: string }[];
  waterUsage?: { value: number; label: string }[];
  sprayApprovalsByDay?: { value: number; label: string }[];
  totalWaterRouting?: number;
  totalPesticideRouting?: number;
  routeEfficiencyPercent?: number;
};

type SensorCurrent = {
  avgSoil?: number;
  avgSoilMoisture?: number;
  soilAvg?: number;
  soil1?: number;
  soil2?: number;
  temperature?: number;
  humidity?: number;
  tankLevel?: number;
  timestamp?: number;
  ts?: number;
  updatedAt?: number;
  lastSync?: number;
};

type ActionLog = {
  actionType?: string;
  timestamp?: number;
};

function toMs(ts?: number) {
  if (!ts) return 0;
  return ts < 1e12 ? ts * 1000 : ts;
}

function toSeconds(ts?: number) {
  if (!ts) return Math.floor(Date.now() / 1000);
  return ts < 1e12 ? ts : Math.floor(ts / 1000);
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function currentSensorToHistory(sensor: SensorCurrent | null): HistorySensor | null {
  if (!sensor) return null;
  const soil1 = readNumber(sensor.soil1);
  const soil2 = readNumber(sensor.soil2);
  return {
    temperature: readNumber(sensor.temperature) ?? 0,
    humidity: readNumber(sensor.humidity) ?? 0,
    avgSoil: readNumber(
      sensor.avgSoil,
      sensor.avgSoilMoisture,
      sensor.soilAvg,
      soil1 != null && soil2 != null ? (soil1 + soil2) / 2 : undefined
    ) ?? 0,
    tankLevel: readNumber(sensor.tankLevel) ?? 0,
    timestamp: toSeconds(sensor.timestamp ?? sensor.ts ?? sensor.updatedAt ?? sensor.lastSync),
  };
}

function appendCurrentSensor(historySensors: HistorySensor[], currentSensor: HistorySensor | null) {
  if (!currentSensor) return historySensors;
  const currentTs = toSeconds(currentSensor.timestamp);
  const alreadyLogged = historySensors.some((item) => Math.abs(toSeconds(item.timestamp) - currentTs) < 60);
  return alreadyLogged ? historySensors : [...historySensors, currentSensor];
}

function trendDelta(values: number[]) {
  if (values.length < 2) return 0;
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  if (!prev) return 0;
  return Math.round(((last - prev) / Math.max(prev, 1)) * 100);
}

function lastValue(values: number[]) {
  return Number(values[values.length - 1] ?? 0);
}

function normalizeTo7(values: number[]) {
  if (values.length >= 7) return values.slice(-7);
  const pad = Array.from({ length: 7 - values.length }, () => 0);
  return [...pad, ...values];
}

function alertCountsFromActions(items: ActionLog[]) {
  const now = Date.now();
  const buckets = Array.from({ length: 7 }, () => 0);
  items.forEach((item) => {
    if (!(item.actionType ?? '').toLowerCase().includes('alert')) return;
    const ts = toMs(item.timestamp);
    if (!ts) return;
    const diffDays = Math.floor((now - ts) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < 7) {
      buckets[6 - diffDays] += 1;
    }
  });
  return buckets;
}

function buildHeatmap(
  irrigation: number[],
  spray: number[],
  alerts: number[]
): HeatmapRow[] {
  const safeIrrigation = normalizeTo7(irrigation);
  const safeSpray = normalizeTo7(spray);
  const safeAlerts = normalizeTo7(alerts);
  const common = safeIrrigation.map((value, idx) => value + (safeSpray[idx] ?? 0));

  return [
    { key: 'irrigation', values: safeIrrigation },
    { key: 'spray', values: safeSpray },
    { key: 'alerts', values: safeAlerts },
    { key: 'common', values: common },
  ];
}

export function useFarmAnalytics() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['farm-analytics-lite'],
    queryFn: async () => {
      const [todayRaw, weeklyRaw, sensorsRaw, actionsRaw] = await Promise.all([
        getRealtimeOnce<AnalyticsToday>(firebasePaths.analyticsToday),
        getRealtimeOnce<WeeklyReport>(firebasePaths.reportsWeekly),
        getRealtimeOnce<SensorCurrent>(firebasePaths.sensorsCurrent),
        getRealtimeOnce<Record<string, ActionLog>>(firebasePaths.logsActions),
      ]);

      const [historySensorsRaw, irrigationRaw, diseaseRaw, alertsRaw, pesticideRaw] = await Promise.all([
        getRealtimeOnce<Record<string, HistorySensor>>(firebasePaths.historySensors),
        getRealtimeOnce<Record<string, HistoryIrrigation>>(firebasePaths.historyIrrigation),
        getRealtimeOnce<Record<string, HistoryDisease>>(firebasePaths.historyDisease),
        getRealtimeOnce<Record<string, HistoryAlert>>(firebasePaths.historyAlerts),
        getRealtimeOnce<Record<string, HistoryPesticide>>(firebasePaths.pesticideHistory),
      ]);

      const generatedWeekly = buildWeeklyReport(
        {
          sensors: appendCurrentSensor(Object.values(historySensorsRaw ?? {}), currentSensorToHistory(sensorsRaw)),
          irrigation: Object.values(irrigationRaw ?? {}),
          disease: Object.values(diseaseRaw ?? {}),
          alerts: Object.values(alertsRaw ?? {}),
          pesticideHistory: Object.values(pesticideRaw ?? {}),
        },
        ''
      );
      const weekly = generatedWeekly.soilTrend.some((item) => Number(item.value) > 0) ||
        generatedWeekly.waterUsage.some((item) => Number(item.value) > 0) ||
        generatedWeekly.totalWaterRouting > 0 ||
        generatedWeekly.totalPesticideRouting > 0
        ? generatedWeekly
        : weeklyRaw;

      const soilTrend = (weekly?.soilTrend ?? []).map((item) => Number(item.value ?? 0));
      const waterUsage = (weekly?.waterUsage ?? []).map((item) => Number(item.value ?? 0));
      const sprayByDay = (weekly?.sprayApprovalsByDay ?? []).map((item) => Number(item.value ?? 0));

      const avgSoilMoisture =
        lastValue(soilTrend) ||
        lastValue(todayRaw?.avgSoilTrend ?? []) ||
        Number(sensorsRaw?.avgSoil ?? 0);

      const waterRouteCycles = Number(weekly?.totalWaterRouting ?? 0);
      const sprayRouteCycles = Number(weekly?.totalPesticideRouting ?? 0);
      const routeEfficiency = Number(weekly?.routeEfficiencyPercent ?? 0);

      const deltaSoil = trendDelta(soilTrend);
      const deltaWater = trendDelta(waterUsage);
      const deltaSpray = trendDelta(sprayByDay);
      const deltaEfficiency = trendDelta([routeEfficiency - 2, routeEfficiency]);

      const actions = Object.values(actionsRaw ?? {});
      const heatmap = buildHeatmap(waterUsage, sprayByDay, alertCountsFromActions(actions));
      const insight = 'AI Farm Insight';

      const efficiencySeries = normalizeTo7(
        soilTrend.map((value, idx) => {
          const water = waterUsage[idx] ?? 0;
          const spray = sprayByDay[idx] ?? 0;
          const total = water + spray;
          if (!total) return 0;
          return Math.round((water / total) * 100);
        })
      );

      return {
        kpi: {
          avgSoilMoisture,
          waterRouteCycles,
          sprayRouteCycles,
          routeEfficiency,
          deltaSoil,
          deltaWater,
          deltaSpray,
          deltaEfficiency,
        },
        heatmap,
        donut: {
          water: waterRouteCycles,
          spray: sprayRouteCycles,
        },
        insight,
        sparklines: {
          soil: normalizeTo7(soilTrend),
          water: normalizeTo7(waterUsage),
          spray: normalizeTo7(sprayByDay),
          efficiency: efficiencySeries,
        },
      };
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    staleTime: 15000,
  });
}
