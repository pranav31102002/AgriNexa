import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce } from '@/services/firebase';
import {
  AdminAlert,
  AdminAnalyticsPayload,
  AdminCommandSummary,
  AdminDashboardPayload,
  AdminFarmerRow,
  AdminGlobalAnalytics,
  AdminReportsPayload,
  FarmStatus,
} from '@/types';
import { normalizeUserRole } from '@/types/userRole';
import { DailyReport, MonthlyReport, WeeklyReport } from '@/services/report/report-calculator';
import { FirebaseDeviceStatus, FirebaseSensorsCurrent } from '@/types/firebase';

type RealtimeMap = Record<string, any>;

type AdminSnapshot = {
  dashboard: AdminDashboardPayload;
  analytics: AdminAnalyticsPayload;
  reports: AdminReportsPayload;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string' && value.trim().length) return value.trim();
  return fallback;
}

function toBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function toTimestamp(value: unknown) {
  const parsed = toNumber(value, 0);
  if (!parsed) return 0;
  return parsed < 1e12 ? parsed : Math.floor(parsed / 1000);
}

function toMs(value: unknown) {
  const ts = toTimestamp(value);
  return ts ? ts * 1000 : 0;
}

function isRecentTimestamp(value: unknown, windowMs = 300_000) {
  const ms = toMs(value);
  return ms > 0 && Date.now() - ms <= windowMs;
}

function isOnline(status?: FirebaseDeviceStatus | null) {
  if (!status) return false;
  if (status.online) return true;
  return isRecentTimestamp(status.lastSeen);
}

function isFarmerLoginOnline(profile?: Record<string, unknown> | null) {
  if (!profile) return false;
  if (toBool(profile.sessionOnline)) return true;
  return isRecentTimestamp(profile.sessionLastSeen);
}

function inferFarmOnline(
  raw: Record<string, unknown>,
  sensorsCurrent: FirebaseSensorsCurrent | null,
  mainStatus: FirebaseDeviceStatus | null,
  camStatus: FirebaseDeviceStatus | null
) {
  const mainOnline = isOnline(mainStatus);
  const camOnline = isOnline(camStatus);
  const farmLastSyncOnline = isRecentTimestamp(raw?.lastSync);
  const sensorOnline = isRecentTimestamp(sensorsCurrent?.timestamp);
  const statusFlagOnline = toBool(raw?.online);
  return statusFlagOnline || farmLastSyncOnline || sensorOnline || mainOnline || camOnline;
}

function buildAlert(id: string, raw: Record<string, unknown>): AdminAlert {
  const severity = raw?.severity === 'critical' || raw?.severity === 'warning' ? raw.severity : 'info';
  const resolved = toBool(raw?.resolved);
  const reason = toText(raw?.reason, toText(raw?.title, 'No reason provided'));
  const details = toText(raw?.details, toText(raw?.message, reason));

  return {
    id,
    severity,
    farmName: toText(raw?.farmName, 'Unknown Farm'),
    farmerName: toText(raw?.farmerName, 'Unknown Farmer'),
    type: toText(raw?.type, 'LOW_MOISTURE') as AdminAlert['type'],
    timestamp: toTimestamp(raw?.timestamp),
    resolved,
    status: resolved ? 'resolved' : 'open',
    reason,
    details,
    userUid: toText(raw?.uid ?? raw?.userUid),
    farmId: toText(raw?.farmId),
  };
}

function buildAlerts(raw: RealtimeMap | null) {
  return Object.entries(raw ?? {})
    .map(([id, value]) => buildAlert(id, value ?? {}))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function buildAlertIndexes(alerts: AdminAlert[]) {
  const latestByFarm = new Map<string, AdminAlert>();
  const countByFarm = new Map<string, number>();
  const unresolvedByFarm = new Map<string, { critical: number; warnings: number }>();

  alerts.forEach((alert) => {
    const keys = [alert.farmId, alert.farmName].filter(Boolean) as string[];

    keys.forEach((key) => {
      if (!latestByFarm.has(key)) latestByFarm.set(key, alert);
      countByFarm.set(key, (countByFarm.get(key) ?? 0) + 1);

      if (alert.resolved) return;

      const current = unresolvedByFarm.get(key) ?? { critical: 0, warnings: 0 };
      if (alert.severity === 'critical') current.critical += 1;
      if (alert.severity === 'warning') current.warnings += 1;
      unresolvedByFarm.set(key, current);
    });
  });

  return { latestByFarm, countByFarm, unresolvedByFarm };
}

function buildFarm(
  farmId: string,
  raw: Record<string, unknown>,
  profile: Record<string, unknown> | null,
  sensorsCurrent: FirebaseSensorsCurrent | null,
  mainStatus: FirebaseDeviceStatus | null,
  camStatus: FirebaseDeviceStatus | null,
  latestAlert?: AdminAlert
): FarmStatus {
  const camOnline = isOnline(camStatus);
  const farmOnline = inferFarmOnline(raw, sensorsCurrent, mainStatus, camStatus);
  const farmerRole = normalizeUserRole(profile?.role);

  return {
    farmId,
    farmerUid: toText(raw?.uid ?? raw?.farmerUid),
    farmerName: toText(raw?.farmerName, 'Unknown Farmer'),
    farmName: toText(raw?.farmName, 'Unnamed Farm'),
    location: toText(raw?.location, 'Unknown Location'),
    farmerRole,
    farmerLoginOnline: isFarmerLoginOnline(profile),
    avgSoil: toNumber(raw?.avgSoil ?? sensorsCurrent?.avgSoil),
    temperature: toNumber(raw?.temperature ?? sensorsCurrent?.temperature),
    humidity: toNumber(raw?.humidity ?? sensorsCurrent?.humidity),
    ph: Number.isFinite(Number(raw?.ph)) ? Number(raw?.ph) : null,
    tankLevel: toNumber(raw?.tankLevel ?? sensorsCurrent?.tankLevel),
    routeMode: toText(raw?.routeMode ?? sensorsCurrent?.routeMode, 'IDLE'),
    irrigationMode: toText(raw?.irrigationMode ?? raw?.routeMode ?? sensorsCurrent?.routeMode, 'IDLE'),
    pumpStatus: toBool(raw?.pumpStatus ?? raw?.waterRouteActive ?? sensorsCurrent?.pumpWater),
    waterRouteActive: toBool(raw?.waterRouteActive ?? sensorsCurrent?.pumpWater),
    sprayRouteActive: toBool(raw?.sprayRouteActive ?? sensorsCurrent?.pumpSpray),
    commonMotor: toBool(raw?.commonMotor ?? sensorsCurrent?.commonMotor),
    online: farmOnline,
    cameraAvailable: toBool(raw?.cameraAvailable, camOnline),
    latestAlert: latestAlert?.reason || toText(raw?.latestAlert, 'No active alert'),
    lastSync: toTimestamp(raw?.lastSync ?? sensorsCurrent?.timestamp),
  };
}

function buildTrend(labels: string[], values: number[]) {
  return labels.map((label, index) => ({
    label,
    value: toNumber(values[index]),
  }));
}

function alertTrend(alerts: AdminAlert[]) {
  const buckets = Array.from({ length: 7 }, (_, index) => ({
    label: `${index + 1}d`,
    value: 0,
  }));

  alerts.forEach((alert) => {
    const ts = toMs(alert.timestamp);
    if (!ts) return;
    const diff = Math.floor((Date.now() - ts) / DAY_MS);
    if (diff >= 0 && diff < 7) {
      buckets[6 - diff].value += 1;
    }
  });

  return buckets;
}

function buildProblematicFarms(
  farms: FarmStatus[],
  unresolvedByFarm: Map<string, { critical: number; warnings: number }>
) {
  return farms
    .map((farm) => {
      const unresolved = unresolvedByFarm.get(farm.farmId) ?? unresolvedByFarm.get(farm.farmName) ?? { critical: 0, warnings: 0 };
      const critical = unresolved.critical;
      const warnings = unresolved.warnings;
      const score =
        critical * 5 +
        warnings * 2 +
        (farm.online ? 0 : 4) +
        (farm.avgSoil < 30 ? 3 : 0) +
        (farm.tankLevel < 20 ? 2 : 0);

      return {
        farmId: farm.farmId,
        farmName: farm.farmName,
        farmerName: farm.farmerName,
        score,
        issue: !farm.online
          ? 'Device offline'
          : critical > 0
            ? 'Critical alerts open'
            : farm.avgSoil < 30
              ? 'Low soil moisture'
              : farm.tankLevel < 20
                ? 'Low tank level'
                : farm.latestAlert,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function inferPendingSprayApprovals(rawApproval: Record<string, unknown> | null) {
  if (!rawApproval) return null;
  const approved = toBool(rawApproval.approved);
  const stop = toBool(rawApproval.stop);
  if (!approved && !stop) return 1;
  return 0;
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const [
    profilesRaw,
    globalRaw,
    alertsRaw,
    farmsIndexRaw,
    sensorsCurrent,
    mainStatus,
    camStatus,
    dailyReport,
    weeklyReport,
    monthlyReport,
    pesticideApproval,
  ] = await Promise.all([
    getRealtimeOnce<RealtimeMap>(firebasePaths.userProfiles),
    getRealtimeOnce<RealtimeMap>(firebasePaths.adminGlobalAnalytics),
    getRealtimeOnce<RealtimeMap>(firebasePaths.adminAlerts),
    getRealtimeOnce<RealtimeMap>(firebasePaths.adminFarmsIndex),
    getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
    getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
    getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
    getRealtimeOnce<DailyReport>(firebasePaths.reportsDaily),
    getRealtimeOnce<WeeklyReport>(firebasePaths.reportsWeekly),
    getRealtimeOnce<MonthlyReport>(firebasePaths.reportsMonthly),
    getRealtimeOnce<Record<string, unknown>>(`${firebasePaths.pesticide}/approval`),
  ]);

  const alerts = buildAlerts(alertsRaw);
  const { latestByFarm, countByFarm, unresolvedByFarm } = buildAlertIndexes(alerts);

  const farms = Object.entries(farmsIndexRaw ?? {}).map(([farmId, value]) => {
    const farmerUid = toText(value?.uid ?? value?.farmerUid);
    const profile = (profilesRaw?.[farmerUid] ?? null) as Record<string, unknown> | null;

    return buildFarm(
      farmId,
      value ?? {},
      profile,
      sensorsCurrent,
      mainStatus,
      camStatus,
      latestByFarm.get(farmId) ?? latestByFarm.get(toText(value?.farmName))
    );
  });

  const farmsByUser = new Map<string, FarmStatus[]>();
  farms.forEach((farm) => {
    if (!farm.farmerUid) return;
    const existing = farmsByUser.get(farm.farmerUid) ?? [];
    existing.push(farm);
    farmsByUser.set(farm.farmerUid, existing);
  });

  const farmerRows: AdminFarmerRow[] = Object.entries(profilesRaw ?? {}).map(([uid, profile]) => {
    const linkedFarms = farmsByUser.get(uid) ?? [];
    const role = normalizeUserRole(profile?.role);
    const active = toBool(profile?.active, true);
    const loginOnline = isFarmerLoginOnline(profile);
    const primaryFarm = linkedFarms[0];
    const linkedDeviceCount = linkedFarms.reduce((count, farm) => count + 1 + (farm.cameraAvailable ? 1 : 0), 0);

    return {
      uid,
      name: toText(profile?.name, 'Unknown User'),
      email: toText(profile?.email),
      phone: toText(profile?.phone),
      farmName: toText(profile?.farmName || primaryFarm?.farmName),
      location: toText(profile?.location || primaryFarm?.location),
      role,
      theme: toText(profile?.theme, 'system'),
      active,
      lastLogin: toTimestamp(profile?.lastLogin),
      loginOnline,
      loginLastSeen: toTimestamp(profile?.sessionLastSeen),
      routeEfficiency: toNumber(globalRaw?.avgRouteEfficiency ?? dailyReport?.routeEfficiencyPercent ?? weeklyReport?.routeEfficiencyPercent),
      deviceOnline: linkedFarms.some((farm) => farm.online),
      farmCount: linkedFarms.length || (profile?.farmName ? 1 : 0),
      linkedDeviceCount,
      status: active ? 'active' : 'inactive',
    };
  });

  const totalFarms = farms.length || new Set(farmerRows.map((row) => row.farmName).filter(Boolean)).size;
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  const totalFarmers = farmerRows.filter((row) => row.role === 'farmer').length;
  const totalViewers = farmerRows.filter((row) => row.role === 'viewer').length;
  const totalAdmins = farmerRows.filter((row) => row.role === 'admin').length;
  const mainDeviceKnown = Boolean(mainStatus);
  const camDeviceKnown = Boolean(camStatus) || farms.some((farm) => farm.cameraAvailable);
  const onlineDevices = [isOnline(mainStatus), isOnline(camStatus)].filter(Boolean).length;
  const totalKnownDevices = Number(mainDeviceKnown) + Number(camDeviceKnown);
  const offlineDevices = Math.max(totalKnownDevices - onlineDevices, 0);
  const farmsOnline = farms.filter((farm) => farm.online).length;

  const summary: AdminCommandSummary = {
    totalFarmers,
    totalFarms,
    totalViewers,
    totalAdmins,
    activeAlerts,
    onlineDevices,
    offlineDevices,
    todayDiseaseScans: toNumber(dailyReport?.diseaseScans ?? globalRaw?.todayDiseaseScans ?? globalRaw?.totalDiseaseScans),
    irrigationActivity: toNumber(dailyReport?.waterRoutingCycles ?? dailyReport?.pumpOnCycles ?? weeklyReport?.totalWaterRouting),
    pendingSprayApprovals: inferPendingSprayApprovals(pesticideApproval),
  };

  const global: AdminGlobalAnalytics = {
    activeFarms: toNumber(globalRaw?.activeFarms, totalFarms),
    farmsOnline,
    totalAlerts: toNumber(globalRaw?.totalAlerts, activeAlerts),
    totalDiseaseScans: toNumber(globalRaw?.totalDiseaseScans, summary.todayDiseaseScans),
    avgRouteEfficiency: toNumber(
      globalRaw?.avgRouteEfficiency,
      dailyReport?.routeEfficiencyPercent ?? weeklyReport?.routeEfficiencyPercent ?? monthlyReport?.routeEfficiencyPercent
    ),
    totalRouteCycles: toNumber(
      globalRaw?.totalRouteCycles,
      (dailyReport?.waterRoutingCycles ?? 0) + (dailyReport?.pesticideRoutingCycles ?? 0)
    ),
    totalDiseaseAlerts: toNumber(
      globalRaw?.totalDiseaseAlerts,
      alerts.filter((alert) => alert.type === 'DISEASE_HIGH').length
    ),
    topDisease: toText(globalRaw?.topDisease, monthlyReport?.diseaseDistribution?.[0]?.label ?? 'N/A'),
  };

  const activeFarmLabels = weeklyReport?.soilTrend?.map((point) => point.label) ?? ['Now'];
  const activeFarmValues = activeFarmLabels.map((_, index, list) =>
    list.length === 1 ? global.activeFarms : Math.max(global.activeFarms - (list.length - index - 1), 0)
  );

  const analytics: AdminAnalyticsPayload = {
    activeFarms: buildTrend(activeFarmLabels, activeFarmValues),
    diseaseScans: buildTrend(
      weeklyReport?.diseaseScansByDay?.map((point) => point.label) ?? ['Today'],
      weeklyReport?.diseaseScansByDay?.map((point) => point.value) ?? [summary.todayDiseaseScans]
    ),
    alerts: alertTrend(alerts),
    irrigation: buildTrend(
      weeklyReport?.waterUsage?.map((point) => point.label) ?? ['Today'],
      weeklyReport?.waterUsage?.map((point) => point.value) ?? [summary.irrigationActivity]
    ),
    deviceSummary: {
      online: summary.onlineDevices,
      offline: summary.offlineDevices,
      cameraAvailable: farms.some((farm) => farm.cameraAvailable) || isOnline(camStatus) ? 1 : 0,
    },
    problematicFarms: buildProblematicFarms(farms, unresolvedByFarm),
  };

  const reports: AdminReportsPayload = {
    daily: dailyReport ?? null,
    weekly: weeklyReport ?? null,
    monthly: monthlyReport ?? null,
    farmSummary: farms.map((farm) => ({
      farmId: farm.farmId,
      farmName: farm.farmName,
      farmerName: farm.farmerName,
      alerts: countByFarm.get(farm.farmId) ?? countByFarm.get(farm.farmName) ?? 0,
      online: farm.online,
      avgSoil: farm.avgSoil,
    })),
    userSummary: farmerRows.map((row) => ({
      uid: row.uid,
      name: row.name,
      role: row.role,
      farmName: row.farmName,
      lastLogin: row.lastLogin,
    })),
  };

  return {
    dashboard: {
      global,
      alerts,
      farms,
      farmers: farmerRows,
      summary,
    },
    analytics,
    reports,
  };
}
