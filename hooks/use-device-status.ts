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

type CameraActivityStatus = {
  latestImageTimestamp?: number | string;
  lastImageTimestamp?: number | string;
  imageTimestamp?: number | string;
  latestImageBase64?: string;
  scanStatus?:
    | {
        online?: boolean | number | string;
        connected?: boolean | number | string;
        status?: string;
        connection?: string;
        timestamp?: number | string;
        updatedAt?: number | string;
        lastSeen?: number | string;
      }
    | string
    | null;
  status?: {
    cameraOnline?: boolean | number | string;
    online?: boolean | number | string;
    connected?: boolean | number | string;
    timestamp?: number | string;
    updatedAt?: number | string;
    lastSeen?: number | string;
  } | null;
};

const DEVICE_HEARTBEAT_TIMEOUT_MS = 90_000;
const SENSOR_FRESH_WINDOW_MS = 5 * 60 * 1000;
const CAMERA_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

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

function hasConnectedState(status?: Pick<FirebaseDeviceStatus, 'connection' | 'status'> | null) {
  const connection = String(status?.connection ?? status?.status ?? '').trim().toLowerCase();
  return connection === 'connected' || connection === 'online' || connection === 'up' || connection === 'ok';
}

function isOnline(status?: FirebaseDeviceStatus | null) {
  if (!status) return false;

  const explicitOnline = readBool(status.online, status.connected);
  const heartbeat = readTimestamp(
    status.lastSeen,
    status.lastHeartbeat,
    status.heartbeat,
    status.timestamp,
    status.updatedAt,
    status.lastSync,
    status.latestImageTimestamp,
    status.lastImageTimestamp
  );
  const ms = toMs(heartbeat);
  const hasFreshHeartbeat = ms > 0 && Date.now() - ms <= DEVICE_HEARTBEAT_TIMEOUT_MS;

  if (hasFreshHeartbeat && explicitOnline !== false) return true;
  if (!heartbeat && explicitOnline === true) return true;
  if (!heartbeat && hasConnectedState(status)) return true;
  return false;
}

function hasFreshSensorActivity(sensors?: FirebaseSensorsCurrent | null) {
  const timestamp = readTimestamp(sensors?.timestamp, sensors?.ts, sensors?.updatedAt, sensors?.lastSync);
  const ms = toMs(timestamp);
  return ms > 0 && Date.now() - ms <= SENSOR_FRESH_WINDOW_MS;
}

function hasFreshCameraActivity(camera?: CameraActivityStatus | null) {
  if (!camera) return false;

  const scanStatus = typeof camera.scanStatus === 'object' && camera.scanStatus ? camera.scanStatus : null;
  const status = typeof camera.status === 'object' && camera.status ? camera.status : null;
  const explicitOnline = readBool(
    scanStatus?.online,
    scanStatus?.connected,
    status?.cameraOnline,
    status?.online,
    status?.connected
  );
  const connectedState =
    hasConnectedState(scanStatus) ||
    hasConnectedState(status ? { connection: undefined, status: String(status.online ?? status.connected ?? '') } : null);
  const timestamp = readTimestamp(
    camera.latestImageTimestamp,
    camera.lastImageTimestamp,
    camera.imageTimestamp,
    scanStatus?.timestamp,
    scanStatus?.updatedAt,
    scanStatus?.lastSeen,
    status?.timestamp,
    status?.updatedAt,
    status?.lastSeen
  );
  const ms = toMs(timestamp);
  const freshTimestamp = ms > 0 && Date.now() - ms <= CAMERA_ACTIVITY_WINDOW_MS;
  const hasImage = String(camera.latestImageBase64 ?? '').trim().length > 100;

  if (freshTimestamp && explicitOnline !== false) return true;
  if (explicitOnline === true && (!timestamp || freshTimestamp)) return true;
  if (connectedState && (!timestamp || freshTimestamp)) return true;
  return hasImage && freshTimestamp;
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: ['device-status'],
    queryFn: async (): Promise<DeviceStatusSnapshot> => {
      const [main, waterController, cam, sensors, cameraActivity] = await Promise.all([
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
        getRealtimeOnce<FirebaseDeviceStatus>('SmartKisanSathi/deviceStatus/waterController'),
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
        getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
        getRealtimeOnce<CameraActivityStatus>(firebasePaths.pesticide),
      ]);
      const mainStatus = main ?? waterController ?? null;
      const sensorFresh = hasFreshSensorActivity(sensors);
      const camFresh = hasFreshCameraActivity(cameraActivity);

      return {
        main: mainStatus,
        cam: cam ?? null,
        mainOnline: isOnline(mainStatus) || sensorFresh,
        camOnline: isOnline(cam) || camFresh,
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });
}
