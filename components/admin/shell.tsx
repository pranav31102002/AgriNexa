import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adminPalette } from '@/components/admin/panel';
import { useAppStore } from '@/store/use-app-store';

type NavItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: '/(app)/admin' | '/(app)/admin/farmers' | '/(app)/admin/live-farms' | '/(app)/admin/alerts' | '/(app)/admin/reports' | '/(app)/admin/analytics';
  match: string;
};

const navItems: NavItem[] = [
  { label: 'Home', icon: 'view-dashboard-outline', href: '/(app)/admin', match: '/(app)/admin' },
  { label: 'Farmers', icon: 'account-group-outline', href: '/(app)/admin/farmers', match: '/(app)/admin/farmers' },
  { label: 'Live', icon: 'access-point', href: '/(app)/admin/live-farms', match: '/(app)/admin/live-farms' },
  { label: 'Alerts', icon: 'alert-outline', href: '/(app)/admin/alerts', match: '/(app)/admin/alerts' },
  { label: 'Reports', icon: 'file-chart-outline', href: '/(app)/admin/reports', match: '/(app)/admin/reports' },
  { label: 'Stats', icon: 'chart-line', href: '/(app)/admin/analytics', match: '/(app)/admin/analytics' },
];

export function AdminMobileShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((state) => state.profile);
  const initials = (profile.name || 'Admin')
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: adminPalette.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: adminPalette.bg }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom + 104, 120),
          }}>
          <LinearGradient
            colors={['#163A29', '#0C1913', '#07110D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 32,
              borderWidth: 1,
              borderColor: adminPalette.border,
              padding: 18,
              marginBottom: 18,
            }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: '#123423' }}>
                  <Text className="text-[11px] font-black tracking-[1px]" style={{ color: '#7BE0A4' }}>
                    AGRINEXA ADMIN
                  </Text>
                </View>
                <Text className="mt-4 text-[28px] font-black leading-8" style={{ color: adminPalette.text }}>
                  {title}
                </Text>
                <Text className="mt-2 text-sm leading-5" style={{ color: adminPalette.muted }}>
                  {subtitle}
                </Text>
              </View>

              <Pressable
                className="rounded-[22px] border p-3"
                style={{ borderColor: adminPalette.border, backgroundColor: 'rgba(255,255,255,0.06)' }}
                onPress={() => router.push('/(app)/admin/account' as never)}>
                <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#1B9C5A' }}>
                  <Text className="text-sm font-black text-white">{initials || 'A'}</Text>
                </View>
                <Text className="mt-2 text-xs font-bold" style={{ color: adminPalette.text }}>
                  {profile.name || 'Admin User'}
                </Text>
                <Text className="text-[11px]" style={{ color: adminPalette.muted }}>
                  Profile
                </Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View className="gap-4">{children}</View>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 8),
            borderRadius: 30,
            borderWidth: 1,
            borderColor: adminPalette.border,
            backgroundColor: 'rgba(10, 23, 18, 0.96)',
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}>
          <View className="flex-row items-center justify-between">
            {navItems.map((item) => {
              const active = pathname === item.match;
              return (
                <Pressable
                  key={item.href}
                  className="flex-1 items-center rounded-2xl px-1 py-2"
                  style={{ backgroundColor: active ? '#163A29' : 'transparent' }}
                  onPress={() => router.replace(item.href as never)}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={active ? '#7BE0A4' : adminPalette.muted} />
                  <Text className="mt-1 text-[10px] font-bold" style={{ color: active ? '#EFFAF4' : adminPalette.muted }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
