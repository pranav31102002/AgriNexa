import { AdminMobileShell } from '@/components/admin/shell';
import { AdminSectionHeader, DetailRow, GlassCard, StatusBadge, useAdminTheme } from '@/components/admin/panel';
import { firebasePaths } from '@/constants/firebase-paths';
import { logUserAction } from '@/services/audit-log.service';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { logout } from '@/services/auth';
import { setRealtime } from '@/services/firebase';
import { router } from 'expo-router';
import { ThemeMode } from '@/types';
import { Pressable, Text, View } from 'react-native';

export default function AdminAccountScreen() {
  const { palette } = useAdminTheme();
  const profile = useAppStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const setProfile = useAppStore((state) => state.setProfile);

  const updateTheme = async (nextTheme: ThemeMode) => {
    if (!user?.uid || themeMode === nextTheme) return;

    await logUserAction({
      actionType: 'THEME_CHANGE',
      oldValue: themeMode,
      newValue: nextTheme,
    });

    setThemeMode(nextTheme);
    setProfile({ theme: nextTheme });
    await setRealtime(`${firebasePaths.userProfiles}/${user.uid}/theme`, nextTheme);
    await setRealtime(`${firebasePaths.controls}/theme`, nextTheme);
  };

  return (
    <AdminMobileShell title="Admin Profile" subtitle="Quick access to the active admin account and session controls.">
      <AdminSectionHeader title="Account" subtitle="Shared authentication remains the single source for both admin and farmer users." actionLabel="Home" onPress={() => router.replace('/(app)/admin' as never)} />

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black" style={{ color: palette.text }}>
              {profile.name || user?.displayName || 'Admin User'}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: palette.muted }}>
              {profile.email || user?.email || 'No email available'}
            </Text>
          </View>
          <StatusBadge text={role.toUpperCase()} tone="info" />
        </View>

        <View className="mt-5 gap-3">
          <DetailRow label="Farm Name" value={profile.farmName || 'Not linked'} />
          <DetailRow label="Location" value={profile.location || 'Not available'} />
          <DetailRow label="Phone" value={profile.phone || 'Not available'} />
          <DetailRow label="Theme" value={themeMode.toUpperCase()} />
          <DetailRow label="Auth UID" value={user?.uid ?? 'Unavailable'} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-bold" style={{ color: palette.text }}>
          Theme
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((item) => {
            const active = themeMode === item;
            return (
              <Pressable
                key={item}
                className="rounded-full px-4 py-3"
                style={{ backgroundColor: active ? palette.accent : palette.cardElevated }}
                onPress={() => {
                  void updateTheme(item);
                }}>
                <Text className="text-xs font-bold" style={{ color: active ? '#FFFFFF' : palette.text }}>
                  {item.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-bold" style={{ color: palette.text }}>
          Session Actions
        </Text>
        <View className="mt-4 gap-3">
          <Pressable className="rounded-[22px] px-4 py-4" style={{ backgroundColor: palette.cardElevated }} onPress={() => router.replace('/(app)/admin' as never)}>
            <Text className="text-center font-bold" style={{ color: palette.text }}>
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
