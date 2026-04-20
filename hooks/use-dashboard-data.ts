import { useQuery } from '@tanstack/react-query';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce } from '@/services/firebase';
import { logSensorSnapshotIfDue } from '@/services/history.service';
import { firebasePaths } from '@/constants/firebase-paths';
import { SensorCurrent } from '@/types';
import { FarmRealtime, PesticideStatus, RouteState } from '@/types/farm';
import { FirebaseDeviceStatus, FirebaseSensorsCurrent } from '@/types/firebase';

const defaults: FarmRealtime = {
  temperature: 0,
  humidity: 0,
  soilMoisture1: 0,
  soilMoisture2: 0,
  avgSoilMoisture: 0,
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

function toIso(ts?: number) {
  if (!ts) return new Date().toISOString();
  const ms = ts < 10_000_000_000 ? ts * 1000 : ts;
  return new Date(ms).toISOString();
}

function toMs(ts?: number) {
  if (!ts) return 0;
  return ts < 10_000_000_000 ? ts * 1000 : ts;
}

function inferDeviceOnline(sensors: FirebaseSensorsCurrent, mainStatus?: FirebaseDeviceStatus, camStatus?: FirebaseDeviceStatus) {
  const temp = Number(sensors.temperature);
  const humidity = Number(sensors.humidity);
  const hasLiveReadings = Number.isFinite(temp) && Number.isFinite(humidity);
  const ageMs = Date.now() - toMs(sensors.timestamp);
  const hasFreshSensorUpdate = sensors.timestamp ? ageMs >= 0 && ageMs <= 300_000 : false;
  const hasRecentReadingWithoutTimestamp = !sensors.timestamp && hasLiveReadings && (temp !== 0 || humidity !== 0);

  const waterLastSeen = toMs(mainStatus?.lastSeen);
  const camLastSeen = toMs(camStatus?.lastSeen);
  const lastSeenFresh =
    (waterLastSeen > 0 && Date.now() - waterLastSeen <= 300_000) ||
    (camLastSeen > 0 && Date.now() - camLastSeen <= 300_000);

  const statusOnline = Boolean(mainStatus?.online || camStatus?.online);
  return (hasLiveReadings && hasFreshSensorUpdate) || hasRecentReadingWithoutTimestamp || statusOnline || lastSeenFresh;
}

function deriveRouteState(
  sensors: FirebaseSensorsCurrent,
  pesticideStatus?: PesticideStatusJson
): { routeState: RouteState; flushActive: boolean; commonLineActive: boolean } {
  const reason = String(pesticideStatus?.reason ?? '').toUpperCase();
  const flushActive = reason.includes('FLUSH') || reason.includes('CLEAN');
  const pesticideActive = Boolean(sensors.pumpSpray);
  const waterActive = Boolean(sensors.pumpWater);
  const routeMode = String(sensors.routeMode ?? '').toUpperCase();

  let routeState: RouteState = 'IDLE';
  if (routeMode === 'FLUSH') {
    routeState = 'FLUSH';
  } else if (routeMode === 'PESTICIDE') {
    routeState = 'PESTICIDE';
  } else if (routeMode === 'WATER') {
    routeState = 'WATER';
  } else if (flushActive) {
    routeState = 'FLUSH';
  } else if (pesticideActive) {
    routeState = 'PESTICIDE';
  } else if (waterActive) {
    routeState = 'WATER';
  }

  const commonLineActive = typeof sensors.commonMotor === 'boolean' ? sensors.commonMotor : routeState !== 'IDLE';
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
  return {
    temperature: Number(sensors.temperature ?? defaults.temperature),
    humidity: Number(sensors.humidity ?? defaults.humidity),
    soilMoisture1: Number(sensors.soil1 ?? defaults.soilMoisture1),
    soilMoisture2: Number(sensors.soil2 ?? defaults.soilMoisture2),
    avgSoilMoisture: Number(
      sensors.avgSoil ?? ((Number(sensors.soil1 ?? 0) + Number(sensors.soil2 ?? 0)) / 2)
    ),
    tankWaterLevel: Number(sensors.tankLevel ?? defaults.tankWaterLevel),
    waterPumpStatus: Boolean(sensors.pumpWater ?? defaults.waterPumpStatus),
    pesticidePumpStatus: Boolean(sensors.pumpSpray ?? defaults.pesticidePumpStatus),
    waterValve: Boolean(sensors.waterValve ?? defaults.waterValve),
    commonMotor: Boolean(sensors.commonMotor ?? defaults.commonMotor),
    routeMode: String(sensors.routeMode ?? defaults.routeMode),
    autoMode: Boolean(controls?.autoMode ?? defaults.autoMode),
    deviceOnline: inferDeviceOnline(sensors, mainStatus, camStatus),
    lastSync: toIso(sensors.timestamp),
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
        const [sensors, controls, mainStatus, camStatus, pesticideStatus] = await Promise.all([
          getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
          getRealtimeOnce<ControlsJson>(firebasePaths.controls),
          getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
          getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
          getRealtimeOnce<PesticideStatusJson>(`${firebasePaths.pesticide}/status`),
        ]);

        if (!sensors) {
          throw new Error('Missing path: SmartKisanSathi/sensors/current');
        }

        const next = mapToSensor(
          sensors,
          controls ?? undefined,
          mainStatus ?? undefined,
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
