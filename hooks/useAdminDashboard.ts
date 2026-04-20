import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';

export function useAdminDashboard() {
  const snapshot = useAdminSnapshot();
  return {
    ...snapshot,
    data: snapshot.data?.dashboard,
  };
}

