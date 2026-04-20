import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';

export function useAdminAnalytics() {
  const snapshot = useAdminSnapshot();
  return {
    ...snapshot,
    data: snapshot.data?.analytics,
  };
}
