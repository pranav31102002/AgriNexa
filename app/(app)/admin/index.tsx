import { AdminMetricCard, AdminSectionHeader, DetailRow, GlassCard, InfoTile, InlineStatBadges, MiniTrend, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useCropPlanner } from '@/hooks/useCropPlanner';
import { speakCustomSummary } from '@/services/speech.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAppStore } from '@/store/use-app-store';

export default function AdminDashboardScreen() {
  const { data, dataHealth } = useAdminDashboard();
  const { data: analytics } = useAdminAnalytics();
  const { summary: cropSummary } = useCropPlanner();
  const language = useAppStore((state) => state.language);
  const { palette, criticalBorder } = useAdminTheme();

  const global = data?.global;
  const summary = data?.summary;
  const recentAlerts = (data?.alerts ?? []).slice(0, 3);
  const liveFarms = (data?.farms ?? []).slice(0, 3);
  const priorityFarms = (analytics?.problematicFarms ?? []).slice(0, 3);
  const summaryText =
    language === 'hi'
      ? `${global?.farmsOnline ?? 0} farms online, ${summary?.activeAlerts ?? 0} alerts active, and ${summary?.todayDiseaseScans ?? 0} disease scans today.`
      : language === 'mr'
        ? `${global?.farmsOnline ?? 0} farms online, ${summary?.activeAlerts ?? 0} alerts active, and ${summary?.todayDiseaseScans ?? 0} disease scans today.`
        : `${global?.farmsOnline ?? 0} farms online, ${summary?.activeAlerts ?? 0} alerts active, and ${summary?.todayDiseaseScans ?? 0} disease scans today.`;

  return (
    <AdminMobileShell title="Command Center" subtitle="Premium mobile operations view for your full AgriNexa network." dataHealth={dataHealth}>
      <AdminSectionHeader title="Platform Snapshot" subtitle="Fast decisions, live signals, and shared auth-safe routing." />

      <View className="flex-row flex-wrap justify-between gap-y-3">
        <AdminMetricCard label="Total Farmers" value={`${summary?.totalFarmers ?? 0}`} icon="account-group" />
        <AdminMetricCard label="Farmers Online" value={`${summary?.loggedInFarmers ?? 0}`} icon="account-check-outline" tone="#1B9C5A" />
        <AdminMetricCard label="Total Farms" value={`${summary?.totalFarms ?? 0}`} icon="sprout" />
        <AdminMetricCard label="Viewers" value={`${summary?.totalViewers ?? 0}`} icon="account-eye" tone="#E8A200" />
        <AdminMetricCard label="Active Alerts" value={`${summary?.activeAlerts ?? 0}`} icon="alert-circle-outline" tone="#F87171" />
        <AdminMetricCard label="Online Devices" value={`${summary?.onlineDevices ?? 0}`} icon="access-point" />
        <AdminMetricCard label="Offline Devices" value={`${summary?.offlineDevices ?? 0}`} icon="access-point-off" tone="#F87171" />
        <AdminMetricCard label="Disease Scans Today" value={`${summary?.todayDiseaseScans ?? 0}`} icon="leaf-maple" />
        <AdminMetricCard
          label="Pending Spray Approvals"
          value={summary?.pendingSprayApprovals == null ? 'N/A' : `${summary.pendingSprayApprovals}`}
          icon="spray-bottle"
          tone="#A78BFA"
        />
      </View>

      <GlassCard>
        <AdminSectionHeader title="Crop Lifecycle Intelligence" subtitle="Active crop load, upcoming alerts, harvest forecast, and disease-risk watchlist." />
        <View className="mt-4 flex-row flex-wrap gap-3">
          <InfoTile label="Active Crops" value={`${cropSummary.activeCrops}`} tone={palette.accent} />
          <InfoTile label="Upcoming Alerts" value={`${cropSummary.upcomingAlerts.length}`} tone={palette.info} />
          <InfoTile label="Harvest Forecast" value={`${cropSummary.upcomingHarvests}`} tone="#0EA5E9" />
          <InfoTile label="Disease Risk Crops" value={`${cropSummary.diseaseRiskCrops}`} tone="#F87171" />
        </View>
        {cropSummary.upcomingAlerts.length ? (
          <View className="mt-4 gap-2">
            {cropSummary.upcomingAlerts.slice(0, 3).map((alert) => (
              <View
                key={alert.id}
                className="rounded-[18px] border p-3"
                style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-xs font-black" style={{ color: palette.text }}>
                    {alert.cropName}: {alert.title}
                  </Text>
                  <StatusBadge
                    text={alert.priority.toUpperCase()}
                    tone={alert.priority === 'high' ? 'error' : alert.priority === 'medium' ? 'warn' : 'info'}
                  />
                </View>
                <Text className="mt-1 text-xs" style={{ color: palette.muted }}>
                  {alert.message}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </GlassCard>

      <GlassCard>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-black" style={{ color: palette.text }}>
              Irrigation Activity
            </Text>
            <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
              Compact weekly activity trend for admin decisions.
            </Text>
          </View>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: palette.cardElevated }}
            onPress={() => {
              void speakCustomSummary(summaryText);
            }}>
            <MaterialCommunityIcons name="volume-high" size={20} color={palette.text} />
          </Pressable>
        </View>
        <MiniTrend points={analytics?.irrigation ?? []} color={palette.info} />
        <View className="mt-4 flex-row gap-3">
          <InfoTile label="Route Efficiency" value={`${Math.round(global?.avgRouteEfficiency ?? 0)}%`} tone={palette.accent} />
          <InfoTile label="Total Route Cycles" value={`${global?.totalRouteCycles ?? 0}`} tone={palette.text} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-lg font-black" style={{ color: palette.text }}>
          Quick Actions
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {[
            { label: 'Farmers', icon: 'account-group-outline', href: '/(app)/admin/farmers', tone: '#1B9C5A' },
            { label: 'Live Farms', icon: 'access-point', href: '/(app)/admin/live-farms', tone: '#38BDF8' },
            { label: 'Alerts', icon: 'alert-outline', href: '/(app)/admin/alerts', tone: '#F59E0B' },
            { label: 'Approvals', icon: 'shield-check-outline', href: '/(app)/admin/approvals', tone: '#6366F1' },
            { label: 'Reports', icon: 'file-chart-outline', href: '/(app)/admin/reports', tone: '#A78BFA' },
          ].map((item) => (
            <Pressable
              key={item.href}
              className="min-w-[47%] flex-1 rounded-[24px] border p-4"
              style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}
              onPress={() => router.push(item.href as never)}>
              <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.tone}20` }}>
                <MaterialCommunityIcons name={item.icon as never} size={20} color={item.tone} />
              </View>
              <Text className="mt-3 text-sm font-black" style={{ color: palette.text }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <AdminSectionHeader title="Recent Alerts" subtitle="Critical issues stay surfaced for quick response." actionLabel="View All" onPress={() => router.push('/(app)/admin/alerts' as never)} />
        <View className="mt-4 gap-3">
          {recentAlerts.map((alert) => (
            <View key={alert.id} className="rounded-[22px] border p-4" style={{ borderColor: alert.severity === 'critical' ? criticalBorder : palette.border, backgroundColor: palette.bgSecondary }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-black" style={{ color: palette.text }}>
                  {alert.type}
                </Text>
                <StatusBadge text={alert.severity.toUpperCase()} tone={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warn' : 'info'} />
              </View>
              <Text className="mt-2 text-sm" style={{ color: palette.muted }}>
                {alert.farmName} | {alert.farmerName}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: palette.muted }}>
                {alert.reason}
              </Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <AdminSectionHeader title="Live Farm Preview" subtitle="Operational highlights from the latest farm index." actionLabel="Open Live" onPress={() => router.push('/(app)/admin/live-farms' as never)} />
        <View className="mt-4 gap-3">
          {liveFarms.map((farm) => (
            <View key={farm.farmId} className="rounded-[22px] border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-black" style={{ color: palette.text }}>
                    {farm.farmName}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: palette.muted }}>
                    {farm.farmerName}
                  </Text>
                </View>
                <StatusBadge text={farm.online ? 'ONLINE' : 'OFFLINE'} tone={farm.online ? 'ok' : 'error'} />
              </View>
              <InlineStatBadges>
                <StatusBadge text={`SOIL ${Math.round(farm.avgSoil)}%`} tone="info" />
                <StatusBadge text={`TEMP ${Math.round(farm.temperature)} C`} tone="info" />
                <StatusBadge text={farm.pumpStatus ? 'PUMP ON' : 'PUMP OFF'} tone={farm.pumpStatus ? 'ok' : 'warn'} />
              </InlineStatBadges>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <AdminSectionHeader title="Priority Farms" subtitle="Farm-level attention list generated from alerts and device health." actionLabel="Analytics" onPress={() => router.push('/(app)/admin/analytics' as never)} />
        <View className="mt-4 gap-3">
          {priorityFarms.map((farm) => (
            <View key={farm.farmId} className="rounded-[22px] border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-black" style={{ color: palette.text }}>
                    {farm.farmName}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: palette.muted }}>
                    {farm.farmerName}
                  </Text>
                </View>
                <StatusBadge text={`SCORE ${farm.score}`} tone={farm.score >= 5 ? 'error' : 'warn'} />
              </View>
              <View className="mt-3">
                <DetailRow label="Issue" value={farm.issue} />
              </View>
            </View>
          ))}
        </View>
      </GlassCard>
    </AdminMobileShell>
  );
}
