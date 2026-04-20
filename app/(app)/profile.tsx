import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAppTheme } from '@/hooks/use-app-theme';
import { logout } from '@/services/auth';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce } from '@/services/firebase';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { translateRole } from '@/utils/farmer-localization';

type ProfileView = {
  name: string;
  email: string;
  phone: string;
  farmName: string;
  villageDistrict: string;
  role: 'admin' | 'farmer' | 'viewer';
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-slate-800">{value || '-'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setProfile = useAppStore((state) => state.setProfile);
  const setRole = useAppStore((state) => state.setRole);
  const [profile, setProfileView] = useState<ProfileView>({
    name: '',
    email: '',
    phone: '',
    farmName: '',
    villageDistrict: '',
    role: 'farmer',
  });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user?.uid) return;
      const saved = await getRealtimeOnce<any>(`${firebasePaths.userProfiles}/${user.uid}`);
      const cached = await getCache<ProfileView>(cacheKeys.profile);
      if (!mounted) return;

      const safeRole: ProfileView['role'] =
        saved?.role === 'admin'
          ? 'admin'
          : saved?.role === 'viewer'
            ? 'viewer'
            : saved?.role === 'farmer' || saved?.role === 'owner'
              ? 'farmer'
              : cached?.role === 'admin'
                ? 'admin'
                : cached?.role === 'viewer'
                  ? 'viewer'
                  : 'farmer';
      const merged: ProfileView = saved
        ? {
            name: saved?.name ?? user.displayName ?? '',
            email: saved?.email ?? user.email ?? '',
            phone: saved?.phone ?? '',
            farmName: saved?.farmName ?? '',
            villageDistrict: saved?.location ?? '',
            role: safeRole,
          }
        : cached ?? {
            name: user.displayName ?? '',
            email: user.email ?? '',
            phone: '',
            farmName: '',
            villageDistrict: '',
            role: safeRole,
          };

      setProfile({
        name: merged.name,
        email: merged.email,
        phone: merged.phone,
        farmName: merged.farmName,
        location: merged.villageDistrict,
        role: merged.role,
      });
      setRole(merged.role);
      setProfileView(merged);
      await setCache(cacheKeys.profile, merged);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [setProfile, setRole, user]);

  const onLogout = async () => {
    await logout();
    clearAuth();
    setProfile({ name: '', email: '', phone: '', farmName: '', location: '' });
    await setCache(cacheKeys.profile, null);
    router.replace('/(auth)/login' as never);
  };

  if (!user) return <Redirect href={'/(auth)/login' as never} />;

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#065f46', '#0ea5e9']} className="p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <MaterialCommunityIcons name="account" size={28} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-xl font-black text-white">{t('farmerProfile')}</Text>
              <Text className="text-xs text-emerald-100">{t('accountSynced')}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <GlassCard>
        <View className="gap-3">
          <InfoRow label={t('profileFullName')} value={profile.name} />
          <InfoRow label={t('email')} value={profile.email} />
          <InfoRow label={t('profileRole')} value={translateRole(profile.role, t)} />
          <InfoRow label={t('phone')} value={profile.phone} />
          <InfoRow label={t('farmName')} value={profile.farmName} />
          <InfoRow label={t('profileVillageDistrict')} value={profile.villageDistrict} />

          <Pressable className="items-center rounded-2xl bg-slate-700 px-4 py-3" onPress={onLogout}>
            <Text className="text-base font-bold text-white">{t('logout')}</Text>
          </Pressable>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
