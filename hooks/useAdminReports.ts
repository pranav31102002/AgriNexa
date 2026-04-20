import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';

export function useAdminReports() {
  const snapshot = useAdminSnapshot();
  return {
    ...snapshot,
    data: snapshot.data?.reports,
  };
}
