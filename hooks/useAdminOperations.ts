import { firebasePaths } from '@/constants/firebase-paths';
import { logUserAction } from '@/services/audit-log.service';
import { setRealtime } from '@/services/firebase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function stopAllRouting() {
  const now = Math.floor(Date.now() / 1000);
  const waterSaved = await setRealtime(`${firebasePaths.controls}/pumpWater`, false);
  const spraySaved = await setRealtime(`${firebasePaths.pesticide}/approval`, {
    approved: false,
    stop: true,
    reason: 'ADMIN_EMERGENCY_STOP',
    timestamp: now,
  });
  const actionSaved = await setRealtime(`${firebasePaths.logsActions}/${Date.now()}_admin_emergency_stop`, {
    type: 'ADMIN_EMERGENCY_STOP',
    routeMode: 'ALL_STOP',
    farmStatus: 'MANUAL_OVERRIDE',
    severity: 'critical',
    timestamp: now,
  });

  if (!waterSaved || !spraySaved || !actionSaved) {
    throw new Error('Emergency stop could not be fully saved to Firebase.');
  }

  await logUserAction({
    actionType: 'ADMIN_EMERGENCY_STOP',
    oldValue: 'ROUTES_RUNNING_OR_UNKNOWN',
    newValue: 'ALL_ROUTES_STOPPED',
    context: 'admin-live-farms',
  });
}

export function useAdminOperations() {
  const queryClient = useQueryClient();

  const emergencyStopMutation = useMutation({
    mutationFn: stopAllRouting,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
      void queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-snapshot'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['admin-snapshot'], type: 'all' });
    },
  });

  return {
    emergencyStopAll: emergencyStopMutation.mutateAsync,
    emergencyStopping: emergencyStopMutation.isPending,
    syncNow: manualSyncMutation.mutateAsync,
    syncingNow: manualSyncMutation.isPending,
  };
}
