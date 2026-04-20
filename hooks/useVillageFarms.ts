import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';

export function useVillageFarms() {
  const snapshot = useAdminSnapshot();
  return {
    ...snapshot,
    data: snapshot.data?.dashboard.farms ?? [],
  };
}
