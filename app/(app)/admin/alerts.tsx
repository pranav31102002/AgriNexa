import { AdminSearchInput, AdminSectionHeader, DetailRow, EmptyState, FilterChip, GlassCard, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAlertsCenter } from '@/hooks/useAlertsCenter';
import { AlertSeverity } from '@/types';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const severityTone: Record<AlertSeverity, 'error' | 'warn' | 'info'> = {
  critical: 'error',
  warning: 'warn',
  info: 'info',
};

export default function AdminAlertsScreen() {
  const { palette, criticalBorder, criticalSurface } = useAdminTheme();
  const { data, acknowledgeAlert, acknowledging } = useAlertsCenter();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const alerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (!q) return true;
      return [alert.farmName, alert.farmerName, alert.type, alert.reason, alert.details].some((value) => value.toLowerCase().includes(q));
    });
  }, [data, search, severityFilter, statusFilter]);

  return (
    <AdminMobileShell title="Alerts Center" subtitle="Critical-first alert management designed for compact mobile review.">
      <AdminSectionHeader title="Alert Queue" subtitle="Filter by severity, status, farm, or user context." />

      <GlassCard>
        <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Search farm, user, alert type, reason" />
        <View className="mt-4 flex-row flex-wrap gap-2">
          {(['all', 'critical', 'warning', 'info'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={severityFilter === value} onPress={() => setSeverityFilter(value)} />
          ))}
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(['all', 'open', 'resolved'] as const).map((value) => (
            <FilterChip key={value} label={value.toUpperCase()} active={statusFilter === value} onPress={() => setStatusFilter(value)} />
          ))}
        </View>
      </GlassCard>

      {!alerts.length ? <EmptyState title="No alerts match these filters" subtitle="Clear a chip or broaden the search to see more alert history." /> : null}

      {alerts.map((alert) => (
        <GlassCard key={alert.id}>
          <View
            className="rounded-[22px] border p-4"
            style={{
              borderColor: alert.severity === 'critical' && !alert.resolved ? criticalBorder : palette.border,
              backgroundColor: alert.severity === 'critical' && !alert.resolved ? criticalSurface : palette.bgSecondary,
            }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base font-black" style={{ color: palette.text }}>
                  {alert.type}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
                  {alert.farmName} | {alert.farmerName}
                </Text>
              </View>
              <View className="items-end gap-2">
                <StatusBadge text={alert.severity.toUpperCase()} tone={severityTone[alert.severity]} />
                <StatusBadge text={alert.resolved ? 'RESOLVED' : 'OPEN'} tone={alert.resolved ? 'ok' : 'warn'} />
              </View>
            </View>

            <View className="mt-4 gap-3">
              <DetailRow label="Reason" value={alert.reason} />
              <DetailRow label="Details" value={alert.details} />
              <DetailRow label="Time" value={alert.timestamp ? new Date(alert.timestamp * 1000).toLocaleString() : 'No timestamp'} />
            </View>

            {!alert.resolved ? (
              <Pressable
                className="mt-4 rounded-full px-4 py-3"
                style={{ backgroundColor: palette.accent }}
                disabled={acknowledging}
                onPress={() => {
                  void acknowledgeAlert(alert.id);
                }}>
                <Text className="text-center font-bold text-white">Mark Resolved</Text>
              </Pressable>
            ) : null}
          </View>
        </GlassCard>
      ))}
    </AdminMobileShell>
  );
}
