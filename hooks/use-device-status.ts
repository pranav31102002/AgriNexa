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

function toMs(ts?: number) {
  if (!ts) return 0;
  return ts < 1e12 ? ts * 1000 : ts;
}

function hasConnectedState(status?: FirebaseDeviceStatus | null) {
  const connection = String(status?.connection ?? '').toLowerCase();
  return connection === 'connected' || connection === 'online' || connection === 'up';
}

function isOnline(status?: FirebaseDeviceStatus | null) {
  if (!status) return false;
  const ms = toMs(status.lastSeen);
  const hasFreshHeartbeat = ms > 0 && Date.now() - ms <= DEVICE_HEARTBEAT_TIMEOUT_MS;
  if (!hasFreshHeartbeat) return false;
  if (status.online === true) return true;
  if (hasConnectedState(status)) return true;
  return true;
}

function hasFreshSensorActivity(sensors?: FirebaseSensorsCurrent | null) {
  const ms = toMs(sensors?.timestamp);
  return ms > 0 && Date.now() - ms <= SENSOR_FRESH_WINDOW_MS;
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: ['device-status'],
    queryFn: async (): Promise<DeviceStatusSnapshot> => {
      const [main, cam, sensors] = await Promise.all([
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
        getRealtimeOnce<FirebaseSensorsCurrent>(firebasePaths.sensorsCurrent),
      ]);
      const sensorFresh = hasFreshSensorActivity(sensors);
      return {
        main: main ?? null,
        cam: cam ?? null,
        mainOnline: isOnline(main) || sensorFresh,
        camOnline: isOnline(cam),
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });
}
