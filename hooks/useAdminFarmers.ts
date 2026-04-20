import { setRealtime } from '@/services/firebase';
import { UserRole } from '@/types/userRole';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { logUserAction } from '@/services/audit-log.service';
import { useMemo } from 'react';

export function useAdminFarmers(search = '') {
  const queryClient = useQueryClient();
  const snapshot = useAdminSnapshot();
  const rows = snapshot.data?.dashboard.farmers ?? [];
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

  const changeRoleMutation = useMutation({
    mutationFn: async ({ uid, role, previousRole }: { uid: string; role: UserRole; previousRole: UserRole }) => {
      await setRealtime(`${firebasePaths.userProfiles}/${uid}/role`, role);
      await logUserAction({
        actionType: 'ADMIN_ROLE_UPDATE',
        oldValue: previousRole,
        newValue: role,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ uid, active, previousActive }: { uid: string; active: boolean; previousActive: boolean }) => {
      await setRealtime(`${firebasePaths.userProfiles}/${uid}/active`, active);
      await logUserAction({
        actionType: 'ADMIN_ACCOUNT_STATUS_UPDATE',
        oldValue: previousActive,
        newValue: active,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  return {
    ...snapshot,
    data: filtered,
    changeRole: changeRoleMutation.mutateAsync as (params: { uid: string; role: UserRole; previousRole: UserRole }) => Promise<void>,
    toggleActive: toggleActiveMutation.mutateAsync as (params: { uid: string; active: boolean; previousActive: boolean }) => Promise<void>,
    isSavingRole: changeRoleMutation.isPending,
    isSavingActive: toggleActiveMutation.isPending,
  };
}

