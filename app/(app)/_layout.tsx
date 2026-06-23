import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs, useSegments } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/constants/theme';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';

export default function AppLayout() {
  const { t } = useTranslation();
  const systemScheme = useColorScheme() ?? 'light';
  const selectedTheme = useAppStore((state) => state.themeMode);
  const colorScheme = selectedTheme === 'system' ? systemScheme : selectedTheme;
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const role = useAuthStore((state) => state.role);
  const isAdminRoute = segments.some((segment) => segment === 'admin');

  if (!initialized || loading) return null;
  if (!user) return <Redirect href={'/(auth)/login' as never} />;
  if (role === 'admin' && !isAdminRoute) return <Redirect href={'/(app)/admin' as never} />;
  if (role !== 'admin' && isAdminRoute) return <Redirect href={'/(app)/dashboard' as never} />;

  const tabBg = colorScheme === 'dark' ? palette.dark.card : '#F4FBF8';
  const active = palette.primary;
  const inactive = colorScheme === 'dark' ? '#9FB2AA' : '#5C6F67';
  const tabPaddingBottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: 'transparent',
          height: 56 + tabPaddingBottom,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
          display: isAdminRoute ? 'none' : 'flex',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="irrigation"
        options={{
          title: t('irrigation'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="water-pump" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="disease-ai"
        options={{
          title: t('diseaseAI'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('analytics'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="crop-planner" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="validation-report" options={{ href: null }} />
      <Tabs.Screen name="system-flow" options={{ href: null }} />
      <Tabs.Screen name="demo-cases" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
