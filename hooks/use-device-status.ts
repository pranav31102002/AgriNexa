import { useQuery } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce } from '@/services/firebase';
import { FirebaseDeviceStatus } from '@/types/firebase';

export type DeviceStatusSnapshot = {
  main: FirebaseDeviceStatus | null;
  cam: FirebaseDeviceStatus | null;
  mainOnline: boolean;
  camOnline: boolean;
};

function isOnline(status?: FirebaseDeviceStatus | null) {
  if (!status) return false;
  if (status.online) return true;
  if (!status.lastSeen) return false;
  const ms = status.lastSeen < 1e12 ? status.lastSeen * 1000 : status.lastSeen;
  return Date.now() - ms <= 300_000;
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: ['device-status'],
    queryFn: async (): Promise<DeviceStatusSnapshot> => {
      const [main, cam] = await Promise.all([
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusMain),
        getRealtimeOnce<FirebaseDeviceStatus>(firebasePaths.deviceStatusCam),
      ]);
      return {
        main: main ?? null,
        cam: cam ?? null,
        mainOnline: isOnline(main),
        camOnline: isOnline(cam),
      };
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });
}
