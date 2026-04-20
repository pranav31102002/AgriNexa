import { AdminMobileShell } from '@/components/admin/shell';
import { AdminSectionHeader, DetailRow, GlassCard, StatusBadge, adminPalette } from '@/components/admin/panel';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { logout } from '@/services/auth';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function AdminAccountScreen() {
  const profile = useAppStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);

  return (
    <AdminMobileShell title="Admin Profile" subtitle="Quick access to the active admin account and session controls.">
      <AdminSectionHeader title="Account" subtitle="Shared authentication remains the single source for both admin and farmer users." actionLabel="Home" onPress={() => router.replace('/(app)/admin' as never)} />

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black" style={{ color: adminPalette.text }}>
              {profile.name || user?.displayName || 'Admin User'}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminPalette.muted }}>
              {profile.email || user?.email || 'No email available'}
            </Text>
          </View>
          <StatusBadge text={role.toUpperCase()} tone="info" />
        </View>

        <View className="mt-5 gap-3">
          <DetailRow label="Farm Name" value={profile.farmName || 'Not linked'} />
          <DetailRow label="Location" value={profile.location || 'Not available'} />
          <DetailRow label="Phone" value={profile.phone || 'Not available'} />
          <DetailRow label="Auth UID" value={user?.uid ?? 'Unavailable'} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-bold" style={{ color: adminPalette.text }}>
          Session Actions
        </Text>
        <View className="mt-4 gap-3">
          <Pressable className="rounded-[22px] px-4 py-4" style={{ backgroundColor: adminPalette.cardElevated }} onPress={() => router.replace('/(app)/admin' as never)}>
            <Text className="text-center font-bold" style={{ color: adminPalette.text }}>
              Back to Dashboard
            </Text>
          </Pressable>
          <Pressable
            className="rounded-[22px] px-4 py-4"
            style={{ backgroundColor: '#3A171A' }}
            onPress={() => {
              void logout().then(() => router.replace('/(auth)/login' as never));
            }}>
            <Text className="text-center font-bold" style={{ color: '#F78A8A' }}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </GlassCard>
    </AdminMobileShell>
  );
}
