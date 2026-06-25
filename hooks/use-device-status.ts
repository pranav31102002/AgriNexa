import { useQuery } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce } from '@/services/firebase';
import { FirebaseDeviceStatus, FirebaseSensorsCurrent } from '@/types/firebase';

export type DeviceStatusSnapshot = {
  main: FirebaseDeviceStatus | null;
  cam: FirebaseDeviceStatus | null;
  mainOnline: boolean;
  camOnline: boolean;
};

const DEVICE_HEARTBEAT_TIMEOUT_MS = 90_000;
const SENSOR_FRESH_WINDOW_MS = 5 * 60 * 1000;

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

function toMs(ts?: number | string) {
  const value = readTimestamp(ts);
  if (!value) return 0;
  return value < 1e12 ? value * 1000 : value;
}

function hasConnectedState(status?: FirebaseDeviceStatus | null) {
  const connection = String(status?.connection ?? status?.status ?? '').toLowerCase();
  return connection === 'connected' || connection === 'online' || connection === 'up' || connection === 'ok';
}

function isOnline(status?: FirebaseDeviceStatus | null) {
  if (!status) return false;
  const heartbeat = readTimestamp(status.lastSeen, status.timestamp, status.updatedAt, status.lastSync);
  const ms = toMs(heartbeat);
  const hasFreshHeartbeat = ms > 0 && Date.now() - ms <= DEVICE_HEARTBEAT_TIMEOUT_MS;
  if (!hasFreshHeartbeat) return false;
  if (readBool(status.online, status.connected) === true) return true;
  if (hasConnectedState(status)) return true;
  return true;
}

function hasFreshSensorActivity(sensors?: FirebaseSensorsCurrent | null) {
  const timestamp = readTimestamp(sensors?.timestamp, sensors?.ts, sensors?.updatedAt, sensors?.lastSync);
  const ms = toMs(timestamp);
  return ms > 0 && Date.now() - ms <= SENSOR_FRESH_WINDOW_MS;
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: ['device-status'],
    queryFn: async (): Promise<DeviceStatusSnapshot> => {
      const [main, waterController, cam, sensors] = await Promise.all([
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
        getRealtimeOnce<FirebaseDeviceStatus>('SmartKisanSathi/deviceStatus/waterController'),
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
        getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
      ]);
      const mainStatus = main ?? waterController ?? null;
      const sensorFresh = hasFreshSensorActivity(sensors);
      return {
        main: mainStatus,
        cam: cam ?? null,
        mainOnline: isOnline(mainStatus) || sensorFresh,
        camOnline: isOnline(cam),
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });
}
