import { useQuery } from '@tanstack/react-query';
import { fetchAdminSnapshot } from '@/services/admin.service';

export const ADMIN_AUTO_REFRESH_MS = 5000;

export function useAdminSnapshot() {
  return useQuery({
    queryKey: ['admin-snapshot'],
    queryFn: fetchAdminSnapshot,
    refetchInterval: ADMIN_AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 2000,
  });
}
