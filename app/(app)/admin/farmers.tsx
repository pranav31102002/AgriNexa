import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, InlineStatBadges, StatusBadge, adminPalette } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminFarmers } from '@/hooks/useAdminFarmers';
import { UserRole } from '@/types/userRole';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const roleTone: Record<UserRole, 'ok' | 'warn' | 'info'> = {
  admin: 'info',
  farmer: 'ok',
  viewer: 'warn',
};

export default function AdminFarmersScreen() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { data, changeRole, toggleActive, isSavingActive, isSavingRole } = useAdminFarmers(search);

  const filtered = (data ?? []).filter((farmer) => {
    if (roleFilter !== 'all' && farmer.role !== roleFilter) return false;
    if (statusFilter !== 'all' && farmer.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminMobileShell title="Farmer Management" subtitle="Search, filter, and review user roles without altering the farmer UI.">
      <AdminSectionHeader title="Directory" subtitle="Compact admin cards for user role, farm linkage, and device visibility." />

      <GlassCard>
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Search name, farm, location, email, or phone" />
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'farmer', 'viewer', 'admin'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={roleFilter === value} onPress={() => setRoleFilter(value)} />
          ))}
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={statusFilter === value} onPress={() => setStatusFilter(value)} />
          ))}
        </View>
      </GlassCard>

      {!filtered.length ? <EmptyState title="No users match the current filters" subtitle="Try a broader search or switch role and status chips." /> : null}

      {filtered.map((farmer) => (
        <GlassCard key={farmer.uid}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-black" style={{ color: adminPalette.text }}>
                {farmer.name}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminPalette.muted }}>
                {farmer.farmName || 'No farm linked'} | {farmer.location || 'No location'}
              </Text>
            </View>
            <View className="items-end gap-2">
              <StatusBadge text={farmer.role.toUpperCase()} tone={roleTone[farmer.role]} />
              <StatusBadge text={farmer.active ? 'ACTIVE' : 'INACTIVE'} tone={farmer.active ? 'ok' : 'error'} />
            </View>
          </View>

          <InlineStatBadges>
            <StatusBadge text={farmer.deviceOnline ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'} tone={farmer.deviceOnline ? 'ok' : 'error'} />
            <StatusBadge text={`${farmer.farmCount} FARM${farmer.farmCount === 1 ? '' : 'S'}`} tone="info" />
            <StatusBadge text={`${farmer.linkedDeviceCount} DEVICES`} tone="warn" />
            <StatusBadge text={`${Math.round(farmer.routeEfficiency)}% EFF`} tone="info" />
          </InlineStatBadges>

          <View className="mt-4 gap-3">
            <DetailRow label="Email" value={farmer.email || 'Not available'} />
            <DetailRow label="Phone" value={farmer.phone || 'Not available'} />
            <DetailRow label="Last Login" value={farmer.lastLogin ? new Date(farmer.lastLogin * 1000).toLocaleString() : 'Never'} />
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Pressable className="rounded-full px-4 py-3" style={{ backgroundColor: '#163A29' }} onPress={() => router.push(`/(app)/admin/account` as never)}>
              <Text className="text-xs font-bold text-white">Admin Profile</Text>
            </Pressable>
            <Pressable
              className="rounded-full px-4 py-3"
              style={{ backgroundColor: '#102D38' }}
              onPress={() => {
                void changeRole({ uid: farmer.uid, role: 'admin', previousRole: farmer.role });
              }}
              disabled={isSavingRole || farmer.role === 'admin'}>
              <Text className="text-xs font-bold text-white">Make Admin</Text>
            </Pressable>
            <Pressable
              className="rounded-full px-4 py-3"
              style={{ backgroundColor: '#143524' }}
              onPress={() => {
                void changeRole({ uid: farmer.uid, role: 'farmer', previousRole: farmer.role });
              }}
              disabled={isSavingRole || farmer.role === 'farmer'}>
              <Text className="text-xs font-bold text-white">Set Farmer</Text>
            </Pressable>
            <Pressable
              className="rounded-full px-4 py-3"
              style={{ backgroundColor: '#3C2A10' }}
              onPress={() => {
                void changeRole({ uid: farmer.uid, role: 'viewer', previousRole: farmer.role });
              }}
              disabled={isSavingRole || farmer.role === 'viewer'}>
              <Text className="text-xs font-bold text-white">Set Viewer</Text>
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
