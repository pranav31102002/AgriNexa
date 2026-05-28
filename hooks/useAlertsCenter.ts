import { firebasePaths } from '@/constants/firebase-paths';
import { setRealtime } from '@/services/firebase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { logUserAction } from '@/services/audit-log.service';
import { pushLocalNotification } from '@/utils/notifications';

export function useAlertsCenter() {
  const queryClient = useQueryClient();
  const snapshot = useAdminSnapshot();

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = Math.floor(Date.now() / 1000);
      await setRealtime(`${firebasePaths.adminAlerts}/${id}/resolved`, true);
      await setRealtime(`${firebasePaths.adminAlerts}/${id}/incidentStatus`, 'resolved');
      await setRealtime(`${firebasePaths.adminAlerts}/${id}/resolvedAt`, now);
      await logUserAction({
        actionType: 'ADMIN_ALERT_RESOLVE',
        oldValue: false,
        newValue: true,
        context: 'admin-alerts',
        targetId: id,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  const incidentMutation = useMutation({
    mutationFn: async (params: { id: string; patch: Record<string, unknown>; actionType: string; oldValue: unknown; newValue: unknown }) => {
      const saved = await Promise.all(
        Object.entries(params.patch).map(([key, value]) => setRealtime(`${firebasePaths.adminAlerts}/${params.id}/${key}`, value))
      );
      if (saved.some((ok) => !ok)) throw new Error('Failed to persist incident update.');
      await logUserAction({
        actionType: params.actionType,
        oldValue: params.oldValue,
        newValue: params.newValue,
        context: 'admin-alerts',
        targetId: params.id,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] });
    },
  });

  const policyMutation = useMutation({
    mutationFn: async () => {
      const alerts = snapshot.data?.dashboard.alerts ?? [];
      const now = Math.floor(Date.now() / 1000);
      const breachedOpen = alerts.filter((alert) => !alert.resolved && alert.slaBreached);
      let escalatedCount = 0;

      for (const alert of breachedOpen) {
        const nextLevel = Math.min(alert.escalationLevel + 1, 3);
        const patch: Record<string, unknown> = {
          incidentStatus: 'escalated',
          escalationLevel: nextLevel,
          policyLastRunAt: now,
        };
        if (!alert.acknowledgedAt) patch.acknowledgedAt = now;

        const saved = await Promise.all(
          Object.entries(patch).map(([key, value]) => setRealtime(`${firebasePaths.adminAlerts}/${alert.id}/${key}`, value))
        );
        if (saved.every(Boolean)) {
          escalatedCount += 1;
          await logUserAction({
            actionType: 'ADMIN_SLA_AUTO_ESCALATE',
            oldValue: `L${alert.escalationLevel}`,
            newValue: `L${nextLevel}`,
            context: 'admin-alert-policy',
            targetId: alert.id,
          });
        }
      }

      if (escalatedCount > 0) {
        await pushLocalNotification('AgriNexa Admin Policy', `${escalatedCount} alert(s) auto-escalated due to SLA breach.`);
      }

      return {
        escalatedCount,
        breachedCount: breachedOpen.length,
      };
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
    updateIncident: incidentMutation.mutateAsync,
    updatingIncident: incidentMutation.isPending,
    runSlaPolicy: policyMutation.mutateAsync,
    runningSlaPolicy: policyMutation.isPending,
  };
}

