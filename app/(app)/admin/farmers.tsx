import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, InlineStatBadges, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useAdminFarmers } from '@/hooks/useAdminFarmers';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

export default function AdminFarmersScreen() {
  const { palette } = useAdminTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { data, toggleActive, isSavingActive, dataHealth } = useAdminFarmers(search);
  const { approvals, requestApproval, requestingApproval, executeApproval, executingApproval } = useAdminApprovals();

  const filtered = (data ?? []).filter((farmer) => {
    if (statusFilter !== 'all' && farmer.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminMobileShell title="Farmer Management" subtitle="Search, filter, and review farmer accounts without altering the farmer UI." dataHealth={dataHealth}>
      <AdminSectionHeader title="Directory" subtitle="Compact admin cards for farmer accounts, farm linkage, and device visibility." />

      <GlassCard>
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Search name, farm, location, email, or phone" />
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={statusFilter === value} onPress={() => setStatusFilter(value)} />
          ))}
        </View>
      </GlassCard>

      {!filtered.length ? <EmptyState title="No farmers match the current filters" subtitle="Try a broader search or switch the account status chips." /> : null}

      {filtered.map((farmer) => (
        <GlassCard key={farmer.uid}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-black" style={{ color: palette.text }}>
                {farmer.name}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
                {farmer.farmName || 'No farm linked'} | {farmer.location || 'No location'}
              </Text>
            </View>
            <View className="items-end gap-2">
              <StatusBadge text="FARMER" tone="ok" />
              <StatusBadge text={farmer.active ? 'ACTIVE' : 'INACTIVE'} tone={farmer.active ? 'ok' : 'error'} />
            </View>
          </View>

          <InlineStatBadges>
            <StatusBadge text={farmer.loginOnline ? 'LOGIN ONLINE' : 'LOGIN OFFLINE'} tone={farmer.loginOnline ? 'ok' : 'warn'} />
            <StatusBadge text={farmer.deviceOnline ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'} tone={farmer.deviceOnline ? 'ok' : 'error'} />
            <StatusBadge text={`${farmer.farmCount} FARM${farmer.farmCount === 1 ? '' : 'S'}`} tone="info" />
            <StatusBadge text={`${farmer.linkedDeviceCount} DEVICES`} tone="warn" />
            <StatusBadge text={`${Math.round(farmer.routeEfficiency)}% EFF`} tone="info" />
            <StatusBadge text={`${farmer.activeCrops} CROP${farmer.activeCrops === 1 ? '' : 'S'}`} tone="ok" />
            <StatusBadge text={`${farmer.cropAlertsDue} CROP TASK${farmer.cropAlertsDue === 1 ? '' : 'S'}`} tone={farmer.cropAlertsDue > 0 ? 'warn' : 'info'} />
          </InlineStatBadges>

          <View className="mt-4 gap-3">
            <DetailRow label="Email" value={farmer.email || 'Not available'} />
            <DetailRow label="Phone" value={farmer.phone || 'Not available'} />
            <DetailRow label="Theme" value={farmer.theme.toUpperCase()} />
            <DetailRow label="Last Login" value={farmer.lastLogin ? new Date(farmer.lastLogin * 1000).toLocaleString() : 'Never'} />
            <DetailRow label="Session Seen" value={farmer.loginLastSeen ? new Date(farmer.loginLastSeen * 1000).toLocaleString() : 'No live session'} />
            <DetailRow label="Selected Crop" value={farmer.selectedCropName} />
            <DetailRow label="Crop Stage" value={`${farmer.selectedCropStage} | Day ${farmer.selectedCropAgeDays}`} />
            <DetailRow label="Next Crop Action" value={farmer.nextCropActionDueInDays == null ? farmer.nextCropAction : `${farmer.nextCropAction} in ${farmer.nextCropActionDueInDays} day${farmer.nextCropActionDueInDays === 1 ? '' : 's'}`} />
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Pressable
              className="rounded-full px-4 py-3"
              style={{ backgroundColor: palette.accent }}
              onPress={() => router.push(`/(app)/admin/farmer-profile?uid=${encodeURIComponent(farmer.uid)}` as never)}>
              <Text className="text-xs font-bold text-white">Farmer Profile</Text>
            </Pressable>
            <Pressable
              className="rounded-full px-4 py-3"
              style={{ backgroundColor: farmer.active ? '#3A171A' : '#163A29' }}
              onPress={() => {
                if (!farmer.active) {
                  Alert.alert('Enable Farmer Account', `Enable access for ${farmer.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Enable',
                      onPress: () => {
                        void toggleActive({ uid: farmer.uid, active: true, previousActive: farmer.active });
                      },
                    },
                  ]);
                  return;
                }

                const pendingDisableApproval = approvals.find(
                  (approval) =>
                    approval.status === 'pending' &&
                    approval.actionType === 'DISABLE_FARMER_ACCOUNT' &&
                    approval.targetId === farmer.uid
                );

                if (!pendingDisableApproval) {
                  Alert.alert('Request Disable Approval', `Request approval to disable ${farmer.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Request',
                      onPress: () => {
                        void requestApproval({
                          actionType: 'DISABLE_FARMER_ACCOUNT',
                          targetId: farmer.uid,
                          summary: `Disable farmer account for ${farmer.name}.`,
                        });
                      },
                    },
                  ]);
                  return;
                }

                Alert.alert(
                  'Approve & Disable',
                  `Pending approval exists. Disable access for ${farmer.name} now?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disable',
                      style: 'destructive',
                      onPress: () => {
                        void executeApproval({
                          approval: pendingDisableApproval,
                          executor: async () => toggleActive({ uid: farmer.uid, active: false, previousActive: farmer.active }),
                        });
                      },
                    },
                  ]
                );
              }}
              disabled={isSavingActive || requestingApproval || executingApproval}>
              <Text className="text-xs font-bold text-white">
                {farmer.active
                  ? approvals.some(
                        (approval) =>
                          approval.status === 'pending' &&
                          approval.actionType === 'DISABLE_FARMER_ACCOUNT' &&
                          approval.targetId === farmer.uid
                      )
                    ? 'Approve Disable'
                    : 'Request Disable'
                  : 'Enable'}
              </Text>
            </Pressable>
          </View>
        </GlassCard>
      ))}
    </AdminMobileShell>
  );
}
