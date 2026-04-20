import '@/global.css';
import i18n from '@/locales/i18n';
import { useAppStore } from '@/store/use-app-store';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthSession } from '@/hooks/use-auth-session';
import { flushOfflineWrites } from '@/services/firebase';
import 'react-native-reanimated';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const selectedTheme = useAppStore((state) => state.themeMode);
  const selectedLanguage = useAppStore((state) => state.language);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
            staleTime: 5_000,
            gcTime: 5 * 60 * 1000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
    []
  );
  const isDark = selectedTheme === 'system' ? systemScheme === 'dark' : selectedTheme === 'dark';

  // Bootstrap Firebase auth state once at app root.
  useAuthSession();

  useEffect(() => {
    void i18n.changeLanguage(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    const timer = setInterval(() => {
      void flushOfflineWrites();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
