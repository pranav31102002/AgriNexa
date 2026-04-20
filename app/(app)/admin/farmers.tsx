import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, InlineStatBadges, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminFarmers } from '@/hooks/useAdminFarmers';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function AdminFarmersScreen() {
  const { palette } = useAdminTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { data, toggleActive, isSavingActive } = useAdminFarmers(search);

  const filtered = (data ?? []).filter((farmer) => {
    if (statusFilter !== 'all' && farmer.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminMobileShell title="Farmer Management" subtitle="Search, filter, and review farmer accounts without altering the farmer UI.">
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
          </InlineStatBadges>

          <View className="mt-4 gap-3">
            <DetailRow label="Email" value={farmer.email || 'Not available'} />
            <DetailRow label="Phone" value={farmer.phone || 'Not available'} />
            <DetailRow label="Theme" value={farmer.theme.toUpperCase()} />
            <DetailRow label="Last Login" value={farmer.lastLogin ? new Date(farmer.lastLogin * 1000).toLocaleString() : 'Never'} />
            <DetailRow label="Session Seen" value={farmer.loginLastSeen ? new Date(farmer.loginLastSeen * 1000).toLocaleString() : 'No live session'} />
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
                void toggleActive({ uid: farmer.uid, active: !farmer.active, previousActive: farmer.active });
              }}
              disabled={isSavingActive}>
              <Text className="text-xs font-bold text-white">{farmer.active ? 'Disable' : 'Enable'}</Text>
            </Pressable>
          </View>
        </GlassCard>
      ))}
    </AdminMobileShell>
  );
}
