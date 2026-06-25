import { AdminSectionHeader, DetailRow, EmptyState, GlassCard, InfoTile, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { AdminMobileShell } from '@/components/admin/shell';
import { useAdminSnapshot } from '@/hooks/useAdminSnapshot';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function AdminFarmerProfileScreen() {
  const { palette } = useAdminTheme();
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const { data, dataHealth } = useAdminSnapshot();
  const farmer = data?.dashboard.farmers.find((row) => row.uid === uid);

  return (
    <AdminMobileShell title="Farmer Profile" subtitle="Selected farmer details from the admin directory without changing farmer-side screens." dataHealth={dataHealth}>
      <AdminSectionHeader
        title="Profile Overview"
        subtitle="Review the selected farmer account details and current status."
        actionLabel="Back"
        onPress={() => router.replace('/(app)/admin/farmers' as never)}
      />

      {!farmer ? (
        <EmptyState title="Farmer profile not found" subtitle="Return to the Farmers tab and choose a valid farmer card." />
      ) : (
        <>
          <GlassCard>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-2xl font-black" style={{ color: palette.text }}>
                  {farmer.name}
                </Text>
                <Text className="mt-2 text-sm leading-5" style={{ color: palette.muted }}>
                  {farmer.farmName || 'No farm linked'} | {farmer.location || 'No location'}
                </Text>
              </View>
              <View className="items-end gap-2">
                <StatusBadge text={farmer.role.toUpperCase()} tone={farmer.role === 'admin' ? 'info' : farmer.role === 'viewer' ? 'warn' : 'ok'} />
                <StatusBadge text={farmer.active ? 'ACTIVE' : 'INACTIVE'} tone={farmer.active ? 'ok' : 'error'} />
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <InfoTile label="Farms" value={`${farmer.farmCount}`} tone={palette.accent} />
              <InfoTile label="Devices" value={`${farmer.linkedDeviceCount}`} />
              <InfoTile label="Route Eff." value={`${Math.round(farmer.routeEfficiency)}%`} />
              <InfoTile label="Crops" value={`${farmer.activeCrops}`} tone={palette.accent} />
            </View>
          </GlassCard>

          <GlassCard>
            <View className="gap-3">
              <DetailRow label="Email" value={farmer.email || 'Not available'} />
              <DetailRow label="Phone" value={farmer.phone || 'Not available'} />
              <DetailRow label="Theme" value={farmer.theme.toUpperCase()} />
              <DetailRow label="Login Status" value={farmer.loginOnline ? 'Online' : 'Offline'} />
              <DetailRow label="Device Status" value={farmer.deviceOnline ? 'Online' : 'Offline'} />
              <DetailRow label="Selected Crop" value={farmer.selectedCropName} />
              <DetailRow label="Crop Stage" value={`${farmer.selectedCropStage} | Day ${farmer.selectedCropAgeDays}`} />
              <DetailRow label="Crop Tasks Due" value={`${farmer.cropAlertsDue}`} />
              <DetailRow label="Next Crop Action" value={farmer.nextCropActionDueInDays == null ? farmer.nextCropAction : `${farmer.nextCropAction} in ${farmer.nextCropActionDueInDays} day${farmer.nextCropActionDueInDays === 1 ? '' : 's'}`} />
              <DetailRow label="Harvest Plan" value={farmer.harvestDueInDays == null ? 'Not planned' : `${farmer.harvestDueInDays} day${farmer.harvestDueInDays === 1 ? '' : 's'} remaining`} />
              <DetailRow label="Last Login" value={farmer.lastLogin ? new Date(farmer.lastLogin * 1000).toLocaleString() : 'Never'} />
              <DetailRow label="Session Seen" value={farmer.loginLastSeen ? new Date(farmer.loginLastSeen * 1000).toLocaleString() : 'No live session'} />
            </View>
          </GlassCard>
        </>
      )}
    </AdminMobileShell>
  );
}
