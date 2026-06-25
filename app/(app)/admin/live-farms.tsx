import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, InlineStatBadges, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { ActionFeedback } from '@/components/ui/action-feedback';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useAdminOperations } from '@/hooks/useAdminOperations';
import { useVillageFarms } from '@/hooks/useVillageFarms';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

export default function AdminLiveFarmsScreen() {
  const { palette } = useAdminTheme();
  const { data, dataHealth } = useVillageFarms();
  const { emergencyStopAll, emergencyStopping, syncNow, syncingNow } = useAdminOperations();
  const { approvals, requestApproval, requestingApproval, executeApproval, executingApproval } = useAdminApprovals();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [feedback, setFeedback] = useState<{ title: string; subtitle: string; variant: 'success' | 'warning' | 'info' } | null>(null);
  const farms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((farm) => {
      if (stateFilter === 'online' && !farm.online) return false;
      if (stateFilter === 'offline' && farm.online) return false;
      if (!q) return true;
      return [farm.farmName, farm.farmerName, farm.location].some((value) => value.toLowerCase().includes(q));
    });
  }, [data, search, stateFilter]);
  const emergencyStopApproval = approvals.find(
    (approval) => approval.status === 'pending' && approval.actionType === 'EMERGENCY_STOP_ALL' && approval.targetId === 'GLOBAL'
  );

  return (
    <>
      <AdminMobileShell title="Live Farms" subtitle="Phone-friendly farm monitoring with strong status chips and compact telemetry." dataHealth={dataHealth}>
      <AdminSectionHeader title="Farm Feed" subtitle="Search and inspect current farm-level telemetry from the live index." />

      <GlassCard>
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Search farm, farmer, or location" />
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'online', 'offline'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={stateFilter === value} onPress={() => setStateFilter(value)} />
          ))}
        </View>
        <View className="mt-4 flex-row gap-2">
          <Pressable
            className="flex-1 rounded-full px-4 py-3"
            style={{ backgroundColor: palette.cardElevated }}
            disabled={syncingNow}
            onPress={() => {
              void syncNow()
                .then(() => setFeedback({ title: 'Sync Complete', subtitle: 'Admin snapshot refreshed successfully.', variant: 'success' }))
                .catch(() => setFeedback({ title: 'Sync Failed', subtitle: 'Could not refresh admin snapshot. Try again.', variant: 'warning' }));
            }}>
            <Text className="text-center text-xs font-bold" style={{ color: palette.text }}>
              {syncingNow ? 'Syncing...' : 'Sync Now'}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-full px-4 py-3"
            style={{ backgroundColor: '#3A171A' }}
            disabled={emergencyStopping || requestingApproval || executingApproval}
            onPress={() => {
              if (!emergencyStopApproval) {
                Alert.alert('Request Approval', 'Create approval request for global emergency stop?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Request',
                    onPress: () => {
                      void requestApproval({
                        actionType: 'EMERGENCY_STOP_ALL',
                        targetId: 'GLOBAL',
                        summary: 'Global emergency stop for all active farm routes.',
                      })
                        .then(() => setFeedback({ title: 'Approval Requested', subtitle: 'Emergency stop now requires approve-and-execute.', variant: 'info' }))
                        .catch(() => setFeedback({ title: 'Request Failed', subtitle: 'Could not create approval request.', variant: 'warning' }));
                    },
                  },
                ]);
                return;
              }

              Alert.alert('Approve & Execute', 'Approval exists. Execute global emergency stop now?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Execute',
                  style: 'destructive',
                  onPress: () => {
                    void executeApproval({
                      approval: emergencyStopApproval,
                      executor: emergencyStopAll,
                    })
                      .then(() => setFeedback({ title: 'Emergency Stop Applied', subtitle: 'Approved action executed across all routes.', variant: 'warning' }))
                      .catch(() => setFeedback({ title: 'Execution Failed', subtitle: 'Could not execute approved emergency stop.', variant: 'warning' }));
                  },
                },
              ]);
            }}>
            <Text className="text-center text-xs font-bold text-white">
              {emergencyStopping || executingApproval
                ? 'Executing...'
                : requestingApproval
                  ? 'Requesting...'
                  : emergencyStopApproval
                    ? 'Approve & Stop'
                    : 'Request Stop Approval'}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      {!farms.length ? <EmptyState title="No farms available" subtitle="The current admin farm index does not have a row matching this filter." /> : null}

      {farms.map((farm) => (
        <GlassCard key={farm.farmId}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-black" style={{ color: palette.text }}>
                {farm.farmName}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
                {farm.farmerName} | {farm.location}
              </Text>
            </View>
            <StatusBadge text={farm.online ? 'ONLINE' : 'OFFLINE'} tone={farm.online ? 'ok' : 'error'} />
          </View>

          <InlineStatBadges>
            <StatusBadge text={farm.farmerLoginOnline ? 'LOGIN ONLINE' : 'LOGIN OFFLINE'} tone={farm.farmerLoginOnline ? 'ok' : 'warn'} />
            <StatusBadge text={farm.farmerRole.toUpperCase()} tone={farm.farmerRole === 'admin' ? 'info' : farm.farmerRole === 'viewer' ? 'warn' : 'ok'} />
            <StatusBadge text={`MOISTURE ${Math.round(farm.avgSoil)}%`} tone="info" />
            <StatusBadge text={`TEMP ${Math.round(farm.temperature)} C`} tone="info" />
            <StatusBadge text={`HUMIDITY ${Math.round(farm.humidity)}%`} tone="info" />
            <StatusBadge text={`PH ${farm.ph == null ? 'N/A' : farm.ph.toFixed(1)}`} tone="warn" />
            <StatusBadge text={`${farm.activeCrops} ACTIVE CROP${farm.activeCrops === 1 ? '' : 'S'}`} tone="ok" />
            <StatusBadge text={`${farm.cropAlertsDue} CROP TASK${farm.cropAlertsDue === 1 ? '' : 'S'}`} tone={farm.cropAlertsDue > 0 ? 'warn' : 'info'} />
            <StatusBadge text={farm.pumpStatus ? 'PUMP ON' : 'PUMP OFF'} tone={farm.pumpStatus ? 'ok' : 'warn'} />
            <StatusBadge text={(farm.irrigationMode || farm.routeMode || 'IDLE').toUpperCase()} tone={farm.routeMode === 'IDLE' ? 'info' : 'ok'} />
            <StatusBadge text={farm.cameraAvailable ? 'CAMERA READY' : 'CAMERA N/A'} tone={farm.cameraAvailable ? 'ok' : 'warn'} />
          </InlineStatBadges>

          <View className="mt-4 gap-3">
            <DetailRow label="Tank Level" value={`${Math.round(farm.tankLevel)}%`} />
            <DetailRow label="Water Route" value={farm.waterRouteActive ? 'Active' : 'Off'} />
            <DetailRow label="Spray Route" value={farm.sprayRouteActive ? 'Active' : 'Off'} />
            <DetailRow label="Common Motor" value={farm.commonMotor ? 'On' : 'Off'} />
            <DetailRow label="Selected Crop" value={farm.selectedCropName} />
            <DetailRow label="Crop Stage" value={`${farm.selectedCropStage} | Day ${farm.selectedCropAgeDays}`} />
            <DetailRow label="Next Crop Action" value={farm.nextCropActionDueInDays == null ? farm.nextCropAction : `${farm.nextCropAction} in ${farm.nextCropActionDueInDays} day${farm.nextCropActionDueInDays === 1 ? '' : 's'}`} />
            <DetailRow label="Harvest Plan" value={farm.harvestDueInDays == null ? 'Not planned' : `${farm.harvestDueInDays} day${farm.harvestDueInDays === 1 ? '' : 's'} remaining`} />
            <DetailRow label="Last Update" value={farm.lastSync ? new Date(farm.lastSync * 1000).toLocaleString() : 'No sync'} />
            <DetailRow label="Latest Alert" value={farm.latestAlert} />
          </View>
        </GlassCard>
      ))}
      </AdminMobileShell>
      {feedback ? <ActionFeedback title={feedback.title} subtitle={feedback.subtitle} variant={feedback.variant} onHide={() => setFeedback(null)} /> : null}
    </>
  );
}
