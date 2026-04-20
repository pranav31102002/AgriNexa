import { useQuery } from '@tanstack/react-query';
import { fetchAdminSnapshot } from '@/services/admin.service';

export function useAdminSnapshot() {
  return useQuery({
    queryKey: ['admin-snapshot'],
    queryFn: fetchAdminSnapshot,
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  });
}
