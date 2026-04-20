import { firebasePaths } from '@/constants/firebase-paths';
import { setRealtime } from '@/services/firebase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { logUserAction } from '@/services/audit-log.service';

export function useAlertsCenter() {
  const queryClient = useQueryClient();
  const snapshot = useAdminSnapshot();

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await setRealtime(`${firebasePaths.adminAlerts}/${id}/resolved`, true);
      await logUserAction({
        actionType: 'ADMIN_ALERT_RESOLVE',
        oldValue: false,
        newValue: true,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  return {
    ...snapshot,
    data: snapshot.data?.dashboard.alerts ?? [],
    acknowledgeAlert: acknowledgeMutation.mutateAsync,
    acknowledging: acknowledgeMutation.isPending,
  };
}

