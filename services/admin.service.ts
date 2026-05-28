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
const DEVICE_HEARTBEAT_TIMEOUT_MS = 90_000;
const FARM_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

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
  const ms = toMs(status.lastSeen);
  if (!ms) return false;
  if (Date.now() - ms > DEVICE_HEARTBEAT_TIMEOUT_MS) return false;
  return status.online === true;
}

async function safeGetRealtimeOnce<T>(path: string): Promise<T | null> {
  try {
    return await getRealtimeOnce<T>(path);
  } catch {
    return null;
  }
}

function isFarmerLoginOnline(profile?: Record<string, unknown> | null) {
  if (!profile) return false;
  const lastSeenOnline = isRecentTimestamp(profile.sessionLastSeen, FARM_ACTIVITY_WINDOW_MS);
  if (toBool(profile.sessionOnline) && lastSeenOnline) return true;
  return false;
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
  const platformOnline = sensorOnline || mainOnline || camOnline;
  const hasFarmSignalFields = raw?.online !== undefined || raw?.lastSync !== undefined;
  // If farm row says online or has fresh farm sync, trust it first.
  if (statusFlagOnline || farmLastSyncOnline) return true;
  // If farm row has no own signal fields, fallback to platform heartbeat.
  if (!hasFarmSignalFields) return platformOnline;
  // If farm signal is stale for a long time but platform heartbeat is live, surface as online.
  // This prevents "always offline" in Live tab when farmsIndex heartbeat write is delayed.
  const farmLastSyncMs = toMs(raw?.lastSync);
  const staleTooLong = !farmLastSyncMs || Date.now() - farmLastSyncMs > 30 * 60 * 1000;
  if (staleTooLong && platformOnline) return true;
  return false;
}

function buildAlert(id: string, raw: Record<string, unknown>): AdminAlert {
  const severity = raw?.severity === 'critical' || raw?.severity === 'warning' ? raw.severity : 'info';
  const resolved = toBool(raw?.resolved);
  const reason = toText(raw?.reason, toText(raw?.title, 'No reason provided'));
  const details = toText(raw?.details, toText(raw?.message, reason));
  const alertTs = toTimestamp(raw?.timestamp);
  const acknowledgedAt = toTimestamp(raw?.acknowledgedAt);
  const escalationLevelRaw = toNumber(raw?.escalationLevel, 0);
  const escalationLevel = escalationLevelRaw >= 3 ? 3 : escalationLevelRaw >= 2 ? 2 : escalationLevelRaw >= 1 ? 1 : 0;
  const incidentStatusRaw = toText(raw?.incidentStatus, resolved ? 'resolved' : acknowledgedAt ? 'acknowledged' : 'open');
  const incidentStatus: AdminAlert['incidentStatus'] =
    incidentStatusRaw === 'acknowledged' || incidentStatusRaw === 'escalated' || incidentStatusRaw === 'resolved'
      ? incidentStatusRaw
      : 'open';
  const slaWindowSec = severity === 'critical' ? 15 * 60 : severity === 'warning' ? 45 * 60 : 2 * 60 * 60;
  const slaDeadline = toTimestamp(raw?.slaDeadline) || (alertTs ? alertTs + slaWindowSec : 0);
  const slaBreached = !resolved && slaDeadline > 0 && Math.floor(Date.now() / 1000) > slaDeadline;
  const resolvedAt = toTimestamp(raw?.resolvedAt);

  return {
    id,
    severity,
    farmName: toText(raw?.farmName, 'Unknown Farm'),
    farmerName: toText(raw?.farmerName, 'Unknown Farmer'),
    type: toText(raw?.type, 'LOW_MOISTURE') as AdminAlert['type'],
    timestamp: alertTs,
    resolved,
    status: resolved ? 'resolved' : 'open',
    reason,
    details,
    userUid: toText(raw?.uid ?? raw?.userUid),
    farmId: toText(raw?.farmId),
    acknowledgedAt,
    incidentStatus: resolved ? 'resolved' : incidentStatus,
    escalationLevel,
    slaDeadline,
    slaBreached,
    resolvedAt,
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

function toActivityLabel(type: string, routeMode: string, farmStatus: string) {
  const normalized = type.toUpperCase();
  if (normalized.includes('WATER') || routeMode === 'WATER') return 'Water route started';
  if (normalized.includes('SPRAY') || routeMode === 'SPRAY') return 'Spray route active';
  if (normalized.includes('EMERGENCY_STOP')) return 'Emergency stop triggered';
  if (normalized.includes('ALERT')) return 'Farm alert generated';
  if (normalized.includes('DISEASE')) return 'Disease scan completed';
  if (farmStatus.toUpperCase().includes('OFFLINE')) return 'Device offline event';
  return 'Farm action recorded';
}

function buildRecentActivity(rawActions: RealtimeMap | null) {
  return Object.entries(rawActions ?? {})
    .map(([id, value]) => {
      const timestamp = toTimestamp(value?.timestamp);
      const severity = value?.severity === 'critical' || value?.severity === 'warning' ? value.severity : 'info';
      const type = toText(value?.type, 'ACTION');
      const routeMode = toText(value?.routeMode, 'IDLE').toUpperCase();
      const farmStatus = toText(value?.farmStatus, 'UNKNOWN');
      return {
        id,
        timestamp,
        severity,
        label: toActivityLabel(type, routeMode, farmStatus),
      };
    })
    .filter((item) => item.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
}

function computeDeltaPercent(points: Array<{ value: number }>) {
  if (points.length < 2) return 0;
  const split = Math.max(Math.floor(points.length / 2), 1);
  const previous = points.slice(0, split);
  const recent = points.slice(split);
  const prevAvg = previous.reduce((sum, point) => sum + point.value, 0) / Math.max(previous.length, 1);
  const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / Math.max(recent.length, 1);
  if (prevAvg <= 0) return recentAvg > 0 ? 100 : 0;
  return Math.round(((recentAvg - prevAvg) / prevAvg) * 100);
}

function buildActionQueue(params: { offlineDevices: number; activeAlerts: number; lowSoilFarms: number; criticalFarms: number }) {
  const queue: string[] = [];
  if (params.offlineDevices > 0) queue.push(`Inspect ${params.offlineDevices} offline device(s) and confirm heartbeat recovery.`);
  if (params.activeAlerts > 0) queue.push(`Resolve ${params.activeAlerts} open alert(s), prioritizing critical severity.`);
  if (params.lowSoilFarms > 0) queue.push(`Review irrigation automation for ${params.lowSoilFarms} low-moisture farm(s).`);
  if (params.criticalFarms > 0) queue.push(`Escalate ${params.criticalFarms} high-risk farm(s) to field operations.`);
  if (!queue.length) queue.push('All farm systems stable. Continue routine monitoring and daily sync checks.');
  return queue;
}

function buildInsightSummary(params: { irrigationDelta: number; scansDelta: number; alertsDelta: number; activeAlerts: number }) {
  if (params.activeAlerts === 0 && params.alertsDelta <= 0) {
    return `Alerts are stable with no active critical pressure. Irrigation trend ${params.irrigationDelta >= 0 ? 'increased' : 'decreased'} by ${Math.abs(params.irrigationDelta)}% this week.`;
  }
  if (params.alertsDelta > 0) {
    return `Alert activity rose by ${params.alertsDelta}% this week. Prioritize risk triage while irrigation moved ${params.irrigationDelta >= 0 ? 'up' : 'down'} by ${Math.abs(params.irrigationDelta)}%.`;
  }
  return `Disease scan activity changed by ${params.scansDelta}% and irrigation shifted by ${params.irrigationDelta}%. Continue active monitoring of open alerts.`;
}

function buildSlaComplianceTrend(alerts: AdminAlert[]) {
  const days = Array.from({ length: 7 }, (_, index) => index);
  const nowSec = Math.floor(Date.now() / 1000);
  return days.map((offset) => {
    const dayStart = nowSec - (6 - offset) * 24 * 60 * 60;
    const dayEnd = dayStart + 24 * 60 * 60;
    const dayAlerts = alerts.filter((alert) => alert.timestamp >= dayStart && alert.timestamp < dayEnd);
    if (!dayAlerts.length) return { label: `${offset + 1}d`, value: 100 };
    const compliant = dayAlerts.filter((alert) => !alert.slaBreached).length;
    return { label: `${offset + 1}d`, value: Math.round((compliant / dayAlerts.length) * 100) };
  });
}

function buildIncidentOps(alerts: AdminAlert[]) {
  const ackDurationsMin = alerts
    .filter((alert) => alert.acknowledgedAt > 0 && alert.timestamp > 0 && alert.acknowledgedAt >= alert.timestamp)
    .map((alert) => (alert.acknowledgedAt - alert.timestamp) / 60);
  const resolveDurationsMin = alerts
    .filter((alert) => alert.resolvedAt > 0 && alert.timestamp > 0 && alert.resolvedAt >= alert.timestamp)
    .map((alert) => (alert.resolvedAt - alert.timestamp) / 60);
  const mttaMinutes = ackDurationsMin.length
    ? Math.round(ackDurationsMin.reduce((sum, value) => sum + value, 0) / ackDurationsMin.length)
    : 0;
  const mttrMinutes = resolveDurationsMin.length
    ? Math.round(resolveDurationsMin.reduce((sum, value) => sum + value, 0) / resolveDurationsMin.length)
    : 0;
  const slaCompliancePct = alerts.length ? Math.round((alerts.filter((alert) => !alert.slaBreached).length / alerts.length) * 100) : 100;

  return {
    mttaMinutes,
    mttrMinutes,
    slaCompliancePct,
    escalationFunnel: {
      open: alerts.filter((alert) => alert.incidentStatus === 'open').length,
      acknowledged: alerts.filter((alert) => alert.incidentStatus === 'acknowledged').length,
      escalated: alerts.filter((alert) => alert.incidentStatus === 'escalated').length,
      resolved: alerts.filter((alert) => alert.incidentStatus === 'resolved').length,
    },
    escalationLevels: {
      l0: alerts.filter((alert) => alert.escalationLevel === 0).length,
      l1: alerts.filter((alert) => alert.escalationLevel === 1).length,
      l2: alerts.filter((alert) => alert.escalationLevel === 2).length,
      l3: alerts.filter((alert) => alert.escalationLevel === 3).length,
    },
    slaComplianceTrend: buildSlaComplianceTrend(alerts),
  };
}

function buildFallbackFarmFromProfile(
  uid: string,
  profile: Record<string, unknown>,
  sensorsCurrent: FirebaseSensorsCurrent | null,
  mainStatus: FirebaseDeviceStatus | null,
  camStatus: FirebaseDeviceStatus | null
): FarmStatus {
  const farmName = toText(profile?.farmName, 'Unnamed Farm');
  const location = toText(profile?.location || profile?.farmArea || profile?.farmVillage, 'Unknown Location');
  const farmerName = toText(profile?.name, 'Unknown Farmer');
  const farmerRole = normalizeUserRole(profile?.role);
  const fallbackRaw: Record<string, unknown> = {
    uid,
    farmName,
    farmerName,
    location,
    online: toBool(profile?.sessionOnline, false),
    lastSync: profile?.sessionLastSeen ?? profile?.lastLogin ?? sensorsCurrent?.timestamp ?? 0,
  };

  return buildFarm(`profile_${uid}`, fallbackRaw, profile, sensorsCurrent, mainStatus, camStatus);
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
    actionLogsRaw,
  ] = await Promise.all([
    safeGetRealtimeOnce<RealtimeMap>(firebasePaths.userProfiles),
    safeGetRealtimeOnce<RealtimeMap>(firebasePaths.adminGlobalAnalytics),
    safeGetRealtimeOnce<RealtimeMap>(firebasePaths.adminAlerts),
    safeGetRealtimeOnce<RealtimeMap>(firebasePaths.adminFarmsIndex),
    safeGetRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
    safeGetRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
    safeGetRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
    safeGetRealtimeOnce<DailyReport>(firebasePaths.reportsDaily),
    safeGetRealtimeOnce<WeeklyReport>(firebasePaths.reportsWeekly),
    safeGetRealtimeOnce<MonthlyReport>(firebasePaths.reportsMonthly),
    safeGetRealtimeOnce<Record<string, unknown>>(`${firebasePaths.pesticide}/approval`),
    safeGetRealtimeOnce<RealtimeMap>(firebasePaths.logsActions),
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

  const existingFarmers = new Set(farms.map((farm) => farm.farmerUid).filter(Boolean));
  const fallbackFarms = Object.entries(profilesRaw ?? {})
    .filter(([uid, profile]) => normalizeUserRole(profile?.role) === 'farmer' && !existingFarmers.has(uid))
    .map(([uid, profile]) => buildFallbackFarmFromProfile(uid, (profile ?? {}) as Record<string, unknown>, sensorsCurrent, mainStatus, camStatus));

  const mergedFarms = [...farms, ...fallbackFarms];

  const farmsByUser = new Map<string, FarmStatus[]>();
  mergedFarms.forEach((farm) => {
    if (!farm.farmerUid) return;
    const existing = farmsByUser.get(farm.farmerUid) ?? [];
    existing.push(farm);
    farmsByUser.set(farm.farmerUid, existing);
  });

  const indexFarmByUser = new Map<string, Record<string, unknown>>();
  Object.values(farmsIndexRaw ?? {}).forEach((value) => {
    const uid = toText(value?.uid ?? value?.farmerUid);
    if (!uid || indexFarmByUser.has(uid)) return;
    indexFarmByUser.set(uid, (value ?? {}) as Record<string, unknown>);
  });

  const farmerRows: AdminFarmerRow[] = Object.entries(profilesRaw ?? {}).map(([uid, profile]) => {
    const linkedFarms = farmsByUser.get(uid) ?? [];
    const role = normalizeUserRole(profile?.role);
    const active = toBool(profile?.active, true);
    const loginOnline = isFarmerLoginOnline(profile);
    const primaryFarm = linkedFarms[0];
    const indexFarm = indexFarmByUser.get(uid);
    const linkedDeviceCount = linkedFarms.reduce((count, farm) => count + 1 + (farm.cameraAvailable ? 1 : 0), 0);
    const inferredDeviceOnline = linkedFarms.some((farm) => farm.online) || isRecentTimestamp(indexFarm?.lastSync, 300_000) || toBool(indexFarm?.online);

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
      deviceOnline: inferredDeviceOnline,
      farmCount: linkedFarms.length || (profile?.farmName ? 1 : 0),
      linkedDeviceCount,
      status: active ? 'active' : 'inactive',
    };
  });

  const totalFarms = mergedFarms.length || new Set(farmerRows.map((row) => row.farmName).filter(Boolean)).size;
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  const totalFarmers = farmerRows.filter((row) => row.role === 'farmer').length;
  const loggedInFarmers = farmerRows.filter((row) => row.role === 'farmer' && row.loginOnline).length;
  const totalViewers = farmerRows.filter((row) => row.role === 'viewer').length;
  const totalAdmins = farmerRows.filter((row) => row.role === 'admin').length;
  const mainDeviceKnown = Boolean(mainStatus);
  const camDeviceKnown = Boolean(camStatus) || mergedFarms.some((farm) => farm.cameraAvailable);
  const onlineDevices = [isOnline(mainStatus), isOnline(camStatus)].filter(Boolean).length;
  const totalKnownDevices = Number(mainDeviceKnown) + Number(camDeviceKnown);
  const offlineDevices = Math.max(totalKnownDevices - onlineDevices, 0);
  const farmsOnline = mergedFarms.filter((farm) => farm.online).length;

  const summary: AdminCommandSummary = {
    totalFarmers,
    loggedInFarmers,
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
    problematicFarms: buildProblematicFarms(mergedFarms, unresolvedByFarm),
    insightSummary: '',
    weeklyDeltas: {
      alertsPct: 0,
      irrigationPct: 0,
      scansPct: 0,
    },
    actionQueue: [],
    recentActivity: buildRecentActivity(actionLogsRaw),
    incidentOps: {
      mttaMinutes: 0,
      mttrMinutes: 0,
      slaCompliancePct: 100,
      escalationFunnel: { open: 0, acknowledged: 0, escalated: 0, resolved: 0 },
      escalationLevels: { l0: 0, l1: 0, l2: 0, l3: 0 },
      slaComplianceTrend: [],
    },
  };
  const alertsPct = computeDeltaPercent(analytics.alerts);
  const irrigationPct = computeDeltaPercent(analytics.irrigation);
  const scansPct = computeDeltaPercent(analytics.diseaseScans);
  const lowSoilFarms = mergedFarms.filter((farm) => farm.avgSoil < 30).length;
  const criticalFarms = analytics.problematicFarms.filter((farm) => farm.score >= 5).length;
  analytics.weeklyDeltas = { alertsPct, irrigationPct, scansPct };
  analytics.actionQueue = buildActionQueue({
    offlineDevices: summary.offlineDevices,
    activeAlerts: summary.activeAlerts,
    lowSoilFarms,
    criticalFarms,
  });
  analytics.insightSummary = buildInsightSummary({
    irrigationDelta: irrigationPct,
    scansDelta: scansPct,
    alertsDelta: alertsPct,
    activeAlerts: summary.activeAlerts,
  });
  analytics.incidentOps = buildIncidentOps(alerts);

  const reports: AdminReportsPayload = {
    daily: dailyReport ?? null,
    weekly: weeklyReport ?? null,
    monthly: monthlyReport ?? null,
    farmSummary: mergedFarms.map((farm) => ({
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
      farms: mergedFarms,
      farmers: farmerRows,
      summary,
    },
    analytics,
    reports,
  };
}
