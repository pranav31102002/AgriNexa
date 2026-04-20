import { AdminMetricCard, AdminSectionHeader, EmptyState, GlassCard, MiniTrend, StatusBadge, adminPalette } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Text, View } from 'react-native';

export default function AdminAnalyticsScreen() {
  const { data } = useAdminAnalytics();
  const problematicFarms = data?.problematicFarms ?? [];

  return (
    <AdminMobileShell title="Admin Analytics" subtitle="Decision-first mobile analytics with compact, readable charts.">
      <AdminSectionHeader title="Performance Snapshot" subtitle="Live platform trends for farms, scans, alerts, and irrigation." />

      <View className="flex-row flex-wrap justify-between gap-y-3">
        <AdminMetricCard label="Online Devices" value={`${data?.deviceSummary.online ?? 0}`} icon="access-point" />
        <AdminMetricCard label="Offline Devices" value={`${data?.deviceSummary.offline ?? 0}`} icon="access-point-off" tone="#F87171" />
        <AdminMetricCard label="Camera Available" value={`${data?.deviceSummary.cameraAvailable ?? 0}`} icon="camera-wireless" tone="#38BDF8" />
        <AdminMetricCard label="Problem Farms" value={`${problematicFarms.length ?? 0}`} icon="alert-decagram-outline" tone="#F59E0B" />
      </View>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: adminPalette.text }}>Active Farms Trend</Text>
        <MiniTrend points={data?.activeFarms ?? []} />
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: adminPalette.text }}>Disease Scan Trend</Text>
        <MiniTrend points={data?.diseaseScans ?? []} color="#A78BFA" />
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: adminPalette.text }}>Alert Trend</Text>
        <MiniTrend points={data?.alerts ?? []} color="#F87171" />
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: adminPalette.text }}>Irrigation Trend</Text>
        <MiniTrend points={data?.irrigation ?? []} color="#38BDF8" />
      </GlassCard>

      <GlassCard>
        <AdminSectionHeader title="Priority Farm Signals" subtitle="Top farms needing attention based on alerts and telemetry." />
        {!problematicFarms.length ? <EmptyState title="No problematic farms found" subtitle="Current data does not show any urgent farm-level issues." /> : null}
        {problematicFarms.map((farm) => (
          <View key={farm.farmId} className="mt-4 rounded-[22px] border p-4" style={{ borderColor: adminPalette.border, backgroundColor: adminPalette.bgSecondary }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-black" style={{ color: adminPalette.text }}>
                  {farm.farmName}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: adminPalette.muted }}>
                  {farm.farmerName}
                </Text>
              </View>
              <StatusBadge text={`SCORE ${farm.score}`} tone={farm.score >= 5 ? 'error' : 'warn'} />
            </View>
            <Text className="mt-3 text-sm" style={{ color: adminPalette.muted }}>
              {farm.issue}
            </Text>
          </View>
        ))}
      </GlassCard>
    </AdminMobileShell>
  );
}
