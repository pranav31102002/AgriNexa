import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, InlineStatBadges, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useVillageFarms } from '@/hooks/useVillageFarms';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

export default function AdminLiveFarmsScreen() {
  const { palette } = useAdminTheme();
  const { data } = useVillageFarms();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'online' | 'offline'>('all');
  const farms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((farm) => {
      if (stateFilter === 'online' && !farm.online) return false;
      if (stateFilter === 'offline' && farm.online) return false;
      if (!q) return true;
      return [farm.farmName, farm.farmerName, farm.location].some((value) => value.toLowerCase().includes(q));
    });
  }, [data, search, stateFilter]);

  return (
    <AdminMobileShell title="Live Farms" subtitle="Phone-friendly farm monitoring with strong status chips and compact telemetry.">
      <AdminSectionHeader title="Farm Feed" subtitle="Search and inspect current farm-level telemetry from the live index." />

      <GlassCard>
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Search farm, farmer, or location" />
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'online', 'offline'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={stateFilter === value} onPress={() => setStateFilter(value)} />
          ))}
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
            <StatusBadge text={farm.pumpStatus ? 'PUMP ON' : 'PUMP OFF'} tone={farm.pumpStatus ? 'ok' : 'warn'} />
            <StatusBadge text={(farm.irrigationMode || farm.routeMode || 'IDLE').toUpperCase()} tone={farm.routeMode === 'IDLE' ? 'info' : 'ok'} />
            <StatusBadge text={farm.cameraAvailable ? 'CAMERA READY' : 'CAMERA N/A'} tone={farm.cameraAvailable ? 'ok' : 'warn'} />
          </InlineStatBadges>

          <View className="mt-4 gap-3">
            <DetailRow label="Tank Level" value={`${Math.round(farm.tankLevel)}%`} />
            <DetailRow label="Water Route" value={farm.waterRouteActive ? 'Active' : 'Off'} />
            <DetailRow label="Spray Route" value={farm.sprayRouteActive ? 'Active' : 'Off'} />
            <DetailRow label="Common Motor" value={farm.commonMotor ? 'On' : 'Off'} />
            <DetailRow label="Last Update" value={farm.lastSync ? new Date(farm.lastSync * 1000).toLocaleString() : 'No sync'} />
            <DetailRow label="Latest Alert" value={farm.latestAlert} />
          </View>
        </GlassCard>
      ))}
    </AdminMobileShell>
  );
}
