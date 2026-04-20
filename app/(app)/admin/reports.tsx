import { AdminSectionHeader, DetailRow, EmptyState, GlassCard, MiniTrend, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { useAdminReports } from '@/hooks/useAdminReports';
import { Text, View } from 'react-native';

export default function AdminReportsScreen() {
  const { palette } = useAdminTheme();
  const { data } = useAdminReports();
  const { data: analytics } = useAdminAnalytics();
  const farmSummary = data?.farmSummary ?? [];
  const userSummary = data?.userSummary ?? [];

  return (
    <AdminMobileShell title="Admin Reports" subtitle="Daily, weekly, and monthly reporting blocks optimized for phone screens.">
      <AdminSectionHeader title="Report Blocks" subtitle="Clean summaries for irrigation, disease scans, alerts, and system health." />

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>Daily Summary</Text>
        <View className="mt-4 gap-3">
          <DetailRow label="Avg Soil Moisture" value={`${Math.round(data?.daily?.avgSoilMoisture ?? 0)}%`} />
          <DetailRow label="Disease Scans" value={`${data?.daily?.diseaseScans ?? 0}`} />
          <DetailRow label="Spray Approvals" value={`${data?.daily?.sprayApprovals ?? 0}`} />
          <DetailRow label="Water Routing" value={`${data?.daily?.waterRoutingCycles ?? 0}`} />
          <DetailRow label="Irrigation Runtime" value={`${data?.daily?.irrigationRuntimeMin ?? 0} min`} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>Weekly Summary</Text>
        <View className="mt-4 gap-3">
          <DetailRow label="Total Irrigation" value={`${data?.weekly?.totalWaterRouting ?? 0}`} />
          <DetailRow label="Total Spray Routes" value={`${data?.weekly?.totalPesticideRouting ?? 0}`} />
          <DetailRow label="Top Alert Type" value={data?.weekly?.topAlertType ?? 'N/A'} />
          <DetailRow label="Risk Score" value={`${data?.weekly?.riskScore ?? 0}/100`} />
          <DetailRow label="Best Health Day" value={data?.weekly?.bestHealthDay ?? '-'} />
        </View>
        <MiniTrend points={analytics?.alerts ?? []} color="#F87171" />
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>Monthly Summary</Text>
        <View className="mt-4 gap-3">
          <DetailRow label="Irrigation Cycles" value={`${data?.monthly?.irrigationCycles ?? 0}`} />
          <DetailRow label="Water Saved" value={`${Math.round(data?.monthly?.waterSavedLiters ?? 0)} L`} />
          <DetailRow label="Pesticide Usage" value={`${data?.monthly?.pesticideUsage ?? 0}`} />
          <DetailRow label="Top Issue" value={data?.monthly?.topIssue ?? 'N/A'} />
          <DetailRow label="Uptime" value={`${Math.round(data?.monthly?.uptimePercent ?? 0)}%`} />
        </View>
        <MiniTrend points={analytics?.irrigation ?? []} color="#38BDF8" />
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>Farm-wise Summary</Text>
        {!farmSummary.length ? <EmptyState title="No farm summaries available" subtitle="The admin farm index does not currently expose farm rows." /> : null}
        {farmSummary.slice(0, 8).map((farm) => (
          <View key={farm.farmId} className="mt-4 rounded-[22px] border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-black" style={{ color: palette.text }}>
                {farm.farmName}
              </Text>
              <StatusBadge text={farm.online ? 'ONLINE' : 'OFFLINE'} tone={farm.online ? 'ok' : 'error'} />
            </View>
            <Text className="mt-2 text-xs" style={{ color: palette.muted }}>
              {farm.farmerName} | {farm.alerts} alerts | Avg soil {Math.round(farm.avgSoil)}%
            </Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>User-wise Summary</Text>
        {!userSummary.length ? <EmptyState title="No user summaries available" subtitle="User profiles are required at SmartKisanSathi/userProfiles." /> : null}
        {userSummary.slice(0, 8).map((user) => (
          <View key={user.uid} className="mt-4 rounded-[22px] border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-black" style={{ color: palette.text }}>
                {user.name}
              </Text>
              <StatusBadge text={user.role.toUpperCase()} tone={user.role === 'admin' ? 'info' : user.role === 'viewer' ? 'warn' : 'ok'} />
            </View>
            <Text className="mt-2 text-xs" style={{ color: palette.muted }}>
              {user.farmName || 'No farm linked'} | Last login {user.lastLogin ? new Date(user.lastLogin * 1000).toLocaleString() : 'Never'}
            </Text>
          </View>
        ))}
      </GlassCard>
    </AdminMobileShell>
  );
}
