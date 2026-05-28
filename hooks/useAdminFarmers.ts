import { setRealtime } from '@/services/firebase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { logUserAction } from '@/services/audit-log.service';
import { useMemo } from 'react';

export function useAdminFarmers(search = '') {
  const queryClient = useQueryClient();
  const snapshot = useAdminSnapshot();
  const rows = useMemo(() => (snapshot.data?.dashboard.farmers ?? []).filter((row) => row.role === 'farmer'), [snapshot.data?.dashboard.farmers]);
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      !q
        ? rows
        : rows.filter((row) =>
            [row.name, row.location, row.phone, row.farmName, row.email].some((value) => value.toLowerCase().includes(q))
          ),
    [q, rows]
  );

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ uid, active, previousActive }: { uid: string; active: boolean; previousActive: boolean }) => {
      const saved = await setRealtime(`${firebasePaths.userProfiles}/${uid}/active`, active);
      if (!saved) {
        throw new Error('Unable to update the account status in Firebase.');
      }
      await logUserAction({
        actionType: 'ADMIN_ACCOUNT_STATUS_UPDATE',
        oldValue: previousActive,
        newValue: active,
        context: 'admin-farmers',
        targetId: uid,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  return {
    ...snapshot,
    data: filtered,
    toggleActive: toggleActiveMutation.mutateAsync as (params: { uid: string; active: boolean; previousActive: boolean }) => Promise<void>,
    isSavingActive: toggleActiveMutation.isPending,
  };
}

