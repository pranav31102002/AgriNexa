import { useQuery } from '@tanstack/react-query';
import { fetchAdminSnapshot } from '@/services/admin.service';

export const ADMIN_AUTO_REFRESH_MS = 5000;
const ADMIN_STALE_THRESHOLD_MS = ADMIN_AUTO_REFRESH_MS * 3;

export type AdminDataHealth = {
  status: 'syncing' | 'live' | 'stale';
  ageMs: number;
  lastUpdatedAt: number | null;
  staleAfterMs: number;
};

export function useAdminSnapshot() {
  const query = useQuery({
    queryKey: ['admin-snapshot'],
    queryFn: fetchAdminSnapshot,
    refetchInterval: ADMIN_AUTO_REFRESH_MS,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 2000,
    retry: 2,
  });

  const lastUpdatedAt = query.dataUpdatedAt || null;
  const ageMs = lastUpdatedAt ? Math.max(Date.now() - lastUpdatedAt, 0) : Number.POSITIVE_INFINITY;
  const health: AdminDataHealth = query.isFetching && !query.data
    ? { status: 'syncing', ageMs: 0, lastUpdatedAt, staleAfterMs: ADMIN_STALE_THRESHOLD_MS }
    : ageMs <= ADMIN_STALE_THRESHOLD_MS
      ? { status: 'live', ageMs, lastUpdatedAt, staleAfterMs: ADMIN_STALE_THRESHOLD_MS }
      : { status: 'stale', ageMs, lastUpdatedAt, staleAfterMs: ADMIN_STALE_THRESHOLD_MS };

  return {
    ...query,
    dataHealth: health,
    isDataStale: health.status === 'stale',
  };
}
