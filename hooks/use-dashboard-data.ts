import { useQuery } from '@tanstack/react-query';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce } from '@/services/firebase';
import { logSensorSnapshotIfDue } from '@/services/history.service';
import { firebasePaths } from '@/constants/firebase-paths';
import { FarmRealtime, PesticideStatus, RouteState } from '@/types/farm';
import { FirebaseDeviceStatus, FirebaseSensorsCurrent } from '@/types/firebase';

const defaults: FarmRealtime = {
  temperature: 0,
  humidity: 0,
  soilMoisture1: 0,
  soilMoisture2: 0,
  avgSoilMoisture: 0,
  ph: null,
  tankWaterLevel: 0,
  waterPumpStatus: false,
  pesticidePumpStatus: false,
  waterValve: false,
  commonMotor: false,
  routeMode: 'IDLE',
  autoMode: true,
  deviceOnline: false,
  lastSync: new Date().toISOString(),
  offlineMode: false,
  routeState: 'IDLE',
  commonLineActive: false,
  flushActive: false,
  pesticideStatus: null,
};

type ControlsJson = {
  autoMode?: boolean;
};

type PesticideStatusJson = PesticideStatus | null | undefined;

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function readBool(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'on', 'yes', 'high', 'online', 'connected'].includes(normalized)) return true;
      if (['0', 'false', 'off', 'no', 'low', 'offline', 'disconnected'].includes(normalized)) return false;
    }
  }
  return undefined;
}

function readTimestamp(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return undefined;
}

function toMs(ts?: number | string) {
  const value = readTimestamp(ts);
  if (!value) return 0;
  return value < 10_000_000_000 ? value * 1000 : value;
}

function toIso(ts?: number | string) {
  const ms = toMs(ts);
  return ms ? new Date(ms).toISOString() : new Date().toISOString();
}

function sensorTimestamp(sensors: FirebaseSensorsCurrent) {
  return readTimestamp(sensors.timestamp, sensors.ts, sensors.updatedAt, sensors.lastSync);
}

const DEVICE_HEARTBEAT_TIMEOUT_MS = 90_000;
const SENSOR_FRESH_WINDOW_MS = 5 * 60 * 1000;

function isDeviceHeartbeatOnline(status?: FirebaseDeviceStatus | null) {
  const heartbeat = readTimestamp(status?.lastSeen, status?.timestamp, status?.updatedAt, status?.lastSync);
  if (!heartbeat) return false;
  const age = Date.now() - toMs(heartbeat);
  if (age < 0 || age > DEVICE_HEARTBEAT_TIMEOUT_MS) return false;
  const connection = String(status?.connection ?? status?.status ?? '').toLowerCase();
  if (readBool(status?.online, status?.connected) === true) return true;
  if (connection === 'connected' || connection === 'online' || connection === 'up' || connection === 'ok') return true;
  return true;
}

function inferDeviceOnline(sensors: FirebaseSensorsCurrent, mainStatus?: FirebaseDeviceStatus, camStatus?: FirebaseDeviceStatus) {
  const temp = readNumber(sensors.temperature, sensors.temp, sensors.temperatureC, sensors.dhtTemp, sensors.airTemperature);
  const humidity = readNumber(sensors.humidity, sensors.hum, sensors.humidityPct, sensors.dhtHumidity);
  const hasLiveReadings = temp != null || humidity != null;
  const timestamp = sensorTimestamp(sensors);
  const ageMs = Date.now() - toMs(timestamp);
  const hasFreshSensorUpdate = timestamp ? ageMs >= 0 && ageMs <= SENSOR_FRESH_WINDOW_MS : false;
  const hasRecentReadingWithoutTimestamp = !timestamp && hasLiveReadings && ((temp ?? 0) !== 0 || (humidity ?? 0) !== 0);
  const heartbeatOnline = isDeviceHeartbeatOnline(mainStatus) || isDeviceHeartbeatOnline(camStatus);
  return (hasLiveReadings && hasFreshSensorUpdate) || hasRecentReadingWithoutTimestamp || heartbeatOnline;
}

function deriveRouteState(
  sensors: FirebaseSensorsCurrent,
  pesticideStatus?: PesticideStatusJson
): { routeState: RouteState; flushActive: boolean; commonLineActive: boolean } {
  const reason = String(pesticideStatus?.reason ?? '').toUpperCase();
  const flushActive = reason.includes('FLUSH') || reason.includes('CLEAN');
  const pesticideActive = Boolean(readBool(sensors.pumpSpray, sensors.pesticidePump, sensors.pesticidePumpStatus));
  const waterActive = Boolean(readBool(sensors.pumpWater, sensors.waterPump, sensors.waterPumpStatus));
  const routeMode = String(sensors.routeMode ?? sensors.routeState ?? '').toUpperCase();

  let routeState: RouteState = 'IDLE';
  if (routeMode === 'FLUSH') routeState = 'FLUSH';
  else if (routeMode === 'PESTICIDE') routeState = 'PESTICIDE';
  else if (routeMode === 'WATER') routeState = 'WATER';
  else if (flushActive) routeState = 'FLUSH';
  else if (pesticideActive) routeState = 'PESTICIDE';
  else if (waterActive) routeState = 'WATER';

  const commonLineActive = readBool(sensors.commonMotor) ?? routeState !== 'IDLE';
  return { routeState, flushActive, commonLineActive };
}

function mapToSensor(
  sensors: FirebaseSensorsCurrent,
  controls?: ControlsJson,
  mainStatus?: FirebaseDeviceStatus,
  camStatus?: FirebaseDeviceStatus,
  pesticideStatus?: PesticideStatusJson
): FarmRealtime {
  const route = deriveRouteState(sensors, pesticideStatus);
  const soil1 = readNumber(sensors.soil1, sensors.soilMoisture1) ?? defaults.soilMoisture1;
  const soil2 = readNumber(sensors.soil2, sensors.soilMoisture2) ?? defaults.soilMoisture2;

  return {
    temperature: readNumber(sensors.temperature, sensors.temp, sensors.temperatureC, sensors.dhtTemp, sensors.airTemperature) ?? defaults.temperature,
    humidity: readNumber(sensors.humidity, sensors.hum, sensors.humidityPct, sensors.dhtHumidity) ?? defaults.humidity,
    soilMoisture1: soil1,
    soilMoisture2: soil2,
    avgSoilMoisture: readNumber(sensors.avgSoil, sensors.avgSoilMoisture, sensors.soilAvg, (soil1 + soil2) / 2) ?? defaults.avgSoilMoisture,
    ph: readNumber(sensors.ph, sensors.pH, sensors.waterPh, sensors.waterPH, sensors.soilPh, sensors.soilPH) ?? defaults.ph,
    tankWaterLevel: readNumber(sensors.tankLevel, sensors.tankWaterLevel, sensors.waterLevel) ?? defaults.tankWaterLevel,
    waterPumpStatus: readBool(sensors.pumpWater, sensors.waterPump, sensors.waterPumpStatus) ?? defaults.waterPumpStatus,
    pesticidePumpStatus: readBool(sensors.pumpSpray, sensors.pesticidePump, sensors.pesticidePumpStatus) ?? defaults.pesticidePumpStatus,
    waterValve: readBool(sensors.waterValve) ?? defaults.waterValve,
    commonMotor: readBool(sensors.commonMotor) ?? defaults.commonMotor,
    routeMode: String(sensors.routeMode ?? sensors.routeState ?? defaults.routeMode),
    autoMode: readBool(controls?.autoMode) ?? defaults.autoMode,
    deviceOnline: inferDeviceOnline(sensors, mainStatus, camStatus),
    lastSync: toIso(sensorTimestamp(sensors)),
    offlineMode: false,
    routeState: route.routeState,
    commonLineActive: route.commonLineActive,
    flushActive: route.flushActive,
    pesticideStatus: pesticideStatus ?? null,
  };
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-current'],
    queryFn: async () => {
      try {
        const [sensors, controls, mainStatus, waterControllerStatus, camStatus, pesticideStatus] = await Promise.all([
          getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
          getRealtimeOnce<ControlsJson>(firebasePaths.controls),
          getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
          getRealtimeOnce<FirebaseDeviceStatus>('SmartKisanSathi/deviceStatus/waterController'),
          getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
          getRealtimeOnce<PesticideStatusJson>(`${firebasePaths.pesticide}/status`),
        ]);

        if (!sensors) {
          throw new Error('Missing path: SmartKisanSathi/sensors/current');
        }

        const next = mapToSensor(
          sensors,
          controls ?? undefined,
          mainStatus ?? waterControllerStatus ?? undefined,
          camStatus ?? undefined,
          pesticideStatus ?? undefined
        );
        await setCache(cacheKeys.dashboard, next);
        await logSensorSnapshotIfDue(next);
        return next;
      } catch {
        const cached = await getCache<FarmRealtime>(cacheKeys.dashboard);
        if (cached) {
          return { ...cached, offlineMode: true } satisfies FarmRealtime;
        }
        return { ...defaults, offlineMode: true } satisfies FarmRealtime;
      }
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 2000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
