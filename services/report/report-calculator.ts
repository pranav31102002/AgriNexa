import { getFarmHealthScore } from '@/utils/farm-health';

export type DailyReport = {
  avgSoilMoisture: number;
  avgTemperature: number;
  avgHumidity: number;
  pumpOnCycles: number;
  irrigationRuntimeMin: number;
  tankLowAlerts: number;
  diseaseScans: number;
  sprayApprovals: number;
  avgFarmHealthScore: number;
  waterRoutingCycles: number;
  pesticideRoutingCycles: number;
  flushCycles: number;
  routeEfficiencyPercent: number;
  insight: string;
};

export type WeeklyReport = {
  soilTrend: { value: number; label: string }[];
  waterUsage: { value: number; label: string }[];
  diseaseScansByDay: { value: number; label: string }[];
  sprayApprovalsByDay: { value: number; label: string }[];
  totalWaterRouting: number;
  totalPesticideRouting: number;
  totalFlushCycles: number;
  routeEfficiencyPercent: number;
  topAlertType: string;
  bestHealthDay: string;
  worstHealthDay: string;
  riskScore: number;
  recommendation: string;
};

export type MonthlyReport = {
  soilTrend: { value: number; label: string }[];
  irrigationCycles: number;
  waterSavedLiters: number;
  pesticideUsage: number;
  totalWaterRouting: number;
  totalPesticideRouting: number;
  totalFlushCycles: number;
  routeEfficiencyPercent: number;
  diseaseDistribution: { value: number; label: string; color: string }[];
  farmHealthMovement: { value: number; label: string }[];
  uptimePercent: number;
  topIssue: string;
  savingsSummary: string;
  insight: string;
};

export type ReportCalculatorInput = {
  sensors: HistorySensor[];
  irrigation: HistoryIrrigation[];
  disease: HistoryDisease[];
  alerts: HistoryAlert[];
  pesticideHistory: HistoryPesticide[];
};

export type HistorySensor = {
  temperature?: number;
  humidity?: number;
  avgSoil?: number;
  tankLevel?: number;
  timestamp?: number;
};

export type HistoryIrrigation = {
  pumpWater?: boolean;
  lastRunDurationSec?: number;
  avgSoil?: number;
  threshold?: number;
  timestamp?: number;
};

export type HistoryDisease = {
  disease?: string;
  confidence?: number;
  sprayRecommended?: boolean;
  timestamp?: number;
};

export type HistoryAlert = {
  type?: string;
  severity?: string;
  timestamp?: number;
};

export type HistoryPesticide = {
  approved?: boolean;
  durationSec?: number;
  disease?: string;
  timestamp?: number;
};

const dayMs = 24 * 60 * 60 * 1000;

function toMs(ts?: number) {
  if (!ts) return 0;
  return ts < 1e12 ? ts * 1000 : ts;
}

function avg(values: number[]) {
  const safe = values.filter((v) => Number.isFinite(v));
  if (!safe.length) return 0;
  return safe.reduce((a, b) => a + b, 0) / safe.length;
}

function groupByDay<T extends { timestamp?: number }>(items: T[], days: number) {
  const now = Date.now();
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const ts = toMs(item.timestamp);
    if (!ts || now - ts > days * dayMs) continue;
    const date = new Date(ts);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return buckets;
}

function dateLabelFromKey(key: string) {
  const [y, m, d] = key.split('-').map((x) => Number(x));
  const date = new Date(y, m, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function pickTopAlert(alerts: HistoryAlert[]) {
  const counts: Record<string, number> = {};
  alerts.forEach((alert) => {
    const type = alert.type ?? 'ALERT';
    counts[type] = (counts[type] ?? 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'No alerts';
}

function calcHealthFromSensor(sensor: HistorySensor) {
  const snapshot = {
    temperature: Number(sensor.temperature ?? 0),
    humidity: Number(sensor.humidity ?? 0),
    soilMoisture1: 0,
    soilMoisture2: 0,
    avgSoilMoisture: Number(sensor.avgSoil ?? 0),
    tankWaterLevel: Number(sensor.tankLevel ?? 0),
    waterPumpStatus: false,
    pesticidePumpStatus: false,
    autoMode: true,
    deviceOnline: true,
    lastSync: new Date().toISOString(),
  };
  return getFarmHealthScore(snapshot).score;
}

export function buildDailyReport(input: ReportCalculatorInput, insight: string): DailyReport {
  const now = Date.now();
  const sensors = input.sensors.filter((s) => now - toMs(s.timestamp) <= dayMs);
  const irrigation = input.irrigation.filter((s) => now - toMs(s.timestamp) <= dayMs);
  const disease = input.disease.filter((s) => now - toMs(s.timestamp) <= dayMs);
  const alerts = input.alerts.filter((s) => now - toMs(s.timestamp) <= dayMs);
  const pesticide = input.pesticideHistory.filter((s) => now - toMs(s.timestamp) <= dayMs);

  const avgSoilMoisture = avg(sensors.map((s) => Number(s.avgSoil ?? 0)));
  const avgTemperature = avg(sensors.map((s) => Number(s.temperature ?? 0)));
  const avgHumidity = avg(sensors.map((s) => Number(s.humidity ?? 0)));
  const pumpOnCycles = irrigation.filter((i) => Boolean(i.pumpWater)).length;
  const irrigationRuntimeMin = Math.round(
    irrigation.reduce((sum, i) => sum + Number(i.lastRunDurationSec ?? 0), 0) / 60
  );
  const tankLowAlerts = alerts.filter((a) => (a.type ?? '').toLowerCase().includes('tank')).length;
  const diseaseScans = disease.length;
  const sprayApprovals = pesticide.filter((p) => Boolean(p.approved)).length;
  const avgFarmHealthScore = Math.round(avg(sensors.map(calcHealthFromSensor)));
  const waterRoutingCycles = pumpOnCycles;
  const pesticideRoutingCycles = sprayApprovals;
  const flushCycles = pesticideRoutingCycles;
  const routeEfficiencyPercent =
    waterRoutingCycles + pesticideRoutingCycles > 0
      ? Math.round((waterRoutingCycles / (waterRoutingCycles + pesticideRoutingCycles)) * 100)
      : 0;

  return {
    avgSoilMoisture,
    avgTemperature,
    avgHumidity,
    pumpOnCycles,
    irrigationRuntimeMin,
    tankLowAlerts,
    diseaseScans,
    sprayApprovals,
    avgFarmHealthScore,
    waterRoutingCycles,
    pesticideRoutingCycles,
    flushCycles,
    routeEfficiencyPercent,
    insight,
  };
}

export function buildWeeklyReport(input: ReportCalculatorInput, recommendation: string): WeeklyReport {
  const sensorsByDay = groupByDay(input.sensors, 7);
  const irrigationByDay = groupByDay(input.irrigation, 7);
  const diseaseByDay = groupByDay(input.disease, 7);
  const pesticideByDay = groupByDay(input.pesticideHistory, 7);
  const alertWeek = input.alerts.filter((s) => Date.now() - toMs(s.timestamp) <= 7 * dayMs);

  const keys = Array.from(sensorsByDay.keys()).sort((a, b) => a.localeCompare(b));
  const soilTrend = keys.map((key) => {
    const list = sensorsByDay.get(key) ?? [];
    return { value: avg(list.map((s) => Number(s.avgSoil ?? 0))), label: dateLabelFromKey(key) };
  });

  const waterUsage = keys.map((key) => {
    const list = irrigationByDay.get(key) ?? [];
    const minutes = Math.round(list.reduce((sum, i) => sum + Number(i.lastRunDurationSec ?? 0), 0) / 60);
    return { value: minutes, label: dateLabelFromKey(key) };
  });

  const diseaseScansByDay = keys.map((key) => ({
    value: (diseaseByDay.get(key) ?? []).length,
    label: dateLabelFromKey(key),
  }));

  const sprayApprovalsByDay = keys.map((key) => ({
    value: (pesticideByDay.get(key) ?? []).filter((p) => Boolean(p.approved)).length,
    label: dateLabelFromKey(key),
  }));

  const totalWaterRouting = input.irrigation.filter((i) => Boolean(i.pumpWater)).length;
  const totalPesticideRouting = input.pesticideHistory.filter((p) => Boolean(p.approved)).length;
  const totalFlushCycles = totalPesticideRouting;
  const routeEfficiencyPercent =
    totalWaterRouting + totalPesticideRouting > 0
      ? Math.round((totalWaterRouting / (totalWaterRouting + totalPesticideRouting)) * 100)
      : 0;

  const healthScores = keys.map((key) => {
    const list = sensorsByDay.get(key) ?? [];
    return avg(list.map(calcHealthFromSensor));
  });

  const bestIndex = healthScores.indexOf(Math.max(...healthScores, 0));
  const worstIndex = healthScores.indexOf(Math.min(...healthScores, 0));
  const bestHealthDay = keys[bestIndex] ? dateLabelFromKey(keys[bestIndex]) : '-';
  const worstHealthDay = keys[worstIndex] ? dateLabelFromKey(keys[worstIndex]) : '-';
  const avgHealth = Math.round(avg(healthScores));
  const riskScore = Math.max(0, 100 - avgHealth);

  return {
    soilTrend,
    waterUsage,
    diseaseScansByDay,
    sprayApprovalsByDay,
    totalWaterRouting,
    totalPesticideRouting,
    totalFlushCycles,
    routeEfficiencyPercent,
    topAlertType: pickTopAlert(alertWeek),
    bestHealthDay,
    worstHealthDay,
    riskScore,
    recommendation,
  };
}

export function buildMonthlyReport(input: ReportCalculatorInput, insight: string): MonthlyReport {
  const days = 30;
  const now = Date.now();
  const sensors = input.sensors.filter((s) => now - toMs(s.timestamp) <= days * dayMs);
  const irrigation = input.irrigation.filter((s) => now - toMs(s.timestamp) <= days * dayMs);
  const disease = input.disease.filter((s) => now - toMs(s.timestamp) <= days * dayMs);
  const alerts = input.alerts.filter((s) => now - toMs(s.timestamp) <= days * dayMs);
  const pesticide = input.pesticideHistory.filter((s) => now - toMs(s.timestamp) <= days * dayMs);

  const weeklyBuckets = groupByDay(sensors, 30);
  const weekKeys = Array.from(weeklyBuckets.keys()).sort((a, b) => a.localeCompare(b)).slice(-4);
  const soilTrend = weekKeys.map((key, idx) => {
    const list = weeklyBuckets.get(key) ?? [];
    return { value: avg(list.map((s) => Number(s.avgSoil ?? 0))), label: `W${idx + 1}` };
  });

  const healthMovement = weekKeys.map((key, idx) => {
    const list = weeklyBuckets.get(key) ?? [];
    return { value: avg(list.map(calcHealthFromSensor)), label: `W${idx + 1}` };
  });

  const irrigationCycles = irrigation.filter((i) => Boolean(i.pumpWater)).length;
  const waterSavedLiters = Math.max(0, Math.round(irrigationCycles * 6));
  const pesticideUsage = pesticide.filter((p) => Boolean(p.approved)).length;
  const totalWaterRouting = irrigationCycles;
  const totalPesticideRouting = pesticideUsage;
  const totalFlushCycles = totalPesticideRouting;
  const routeEfficiencyPercent =
    totalWaterRouting + totalPesticideRouting > 0
      ? Math.round((totalWaterRouting / (totalWaterRouting + totalPesticideRouting)) * 100)
      : 0;

  const diseaseCounts: Record<string, number> = {};
  disease.forEach((d) => {
    const label = d.disease ?? 'Unknown';
    diseaseCounts[label] = (diseaseCounts[label] ?? 0) + 1;
  });
  const colors = ['#22c55e', '#f97316', '#0ea5e9', '#eab308', '#ef4444', '#8b5cf6'];
  const diseaseDistribution = Object.entries(diseaseCounts).map(([label, value], idx) => ({
    label,
    value,
    color: colors[idx % colors.length],
  }));

  const offlineAlerts = alerts.filter((a) => (a.type ?? '').toLowerCase().includes('offline')).length;
  const uptimePercent = Math.max(60, 100 - offlineAlerts * 5);
  const topIssue = pickTopAlert(alerts);

  return {
    soilTrend,
    irrigationCycles,
    waterSavedLiters,
    pesticideUsage,
    totalWaterRouting,
    totalPesticideRouting,
    totalFlushCycles,
    routeEfficiencyPercent,
    diseaseDistribution: diseaseDistribution.length ? diseaseDistribution : [{ label: 'Healthy', value: 1, color: '#22c55e' }],
    farmHealthMovement: healthMovement,
    uptimePercent,
    topIssue,
    savingsSummary: `Estimated water saved: ${waterSavedLiters} L`,
    insight,
  };
}
