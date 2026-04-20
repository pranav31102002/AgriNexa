import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import i18n from '@/locales/i18n';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAppTheme } from '@/hooks/use-app-theme';
import { logUserAction } from '@/services/audit-log.service';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { useAppStore } from '@/store/use-app-store';
import { ensureNotificationPermission } from '@/utils/notifications';
import { Lang, ThemeMode } from '@/types';

const thresholdSchema = z.object({
  moistureThreshold: z
    .string()
    .min(1)
    .refine((value) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 10 && n <= 90;
    }),
});

type ThresholdForm = z.infer<typeof thresholdSchema>;

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const localControl = useAppStore((state) => state.localControl);
  const setLocalControl = useAppStore((state) => state.setLocalControl);

  const thresholdForm = useForm<ThresholdForm>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { moistureThreshold: String(localControl.moistureThreshold) },
  });

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  const writeControlsPartial = async (partial: Record<string, unknown>) => {
    const current = (await getRealtimeOnce<any>(firebasePaths.controls)) ?? {};
    await setRealtime(firebasePaths.controls, {
      autoMode: current.autoMode ?? localControl.autoMode,
      moistureThreshold: current.moistureThreshold ?? localControl.moistureThreshold,
      pumpWater: current.pumpWater ?? localControl.waterPump,
      notifications: current.notifications ?? notificationsEnabled,
      theme: current.theme ?? themeMode,
      language: current.language ?? language.toUpperCase(),
      ...partial,
    });
  };

  const onSaveThreshold = thresholdForm.handleSubmit(async (payload) => {
    const moistureThreshold = Number(payload.moistureThreshold);
    await logUserAction({
      actionType: 'THRESHOLD_CHANGE',
      oldValue: localControl.moistureThreshold,
      newValue: moistureThreshold,
    });
    setLocalControl({ moistureThreshold });
    await writeControlsPartial({ moistureThreshold });
  });

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="flex-row items-center gap-2">
        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200/70'}`}
          onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={isDark ? '#F8FAFC' : '#0f172a'} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-800" style={txt}>
          {t('settings')}
        </Text>
      </View>

      <GlassCard>
        <Text className="text-sm font-semibold text-slate-700" style={txt}>
          {t('settings')}
        </Text>
        <Text className="text-xs text-slate-500" style={muted}>Language, theme, controls and notifications.</Text>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('language')}</Text>
        <View className="flex-row gap-2">
          {(['en', 'hi', 'mr'] as Lang[]).map((lang) => (
            <Pressable
              key={lang}
              className={`rounded-full px-4 py-2 ${language === lang ? 'bg-green-600' : 'bg-slate-300'}`}
              onPress={() => {
                void logUserAction({ actionType: 'LANGUAGE_CHANGE', oldValue: language, newValue: lang });
                setLanguage(lang);
                void writeControlsPartial({ language: lang.toUpperCase() });
              }}>
              <Text className={`font-semibold ${language === lang ? 'text-white' : 'text-slate-700'}`}>{lang.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('themeMode')}</Text>
        <View className="flex-row gap-2">
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              className={`rounded-full px-4 py-2 ${themeMode === mode ? 'bg-blue-600' : 'bg-slate-300'}`}
              onPress={() => {
                void logUserAction({ actionType: 'THEME_CHANGE', oldValue: themeMode, newValue: mode });
                setThemeMode(mode);
                void writeControlsPartial({ theme: mode });
              }}>
              <Text className={`font-semibold ${themeMode === mode ? 'text-white' : 'text-slate-700'}`}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('thresholdSettings')}</Text>
        <Controller
          control={thresholdForm.control}
          name="moistureThreshold"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              className="rounded-xl border px-3 py-2"
              style={{
                borderColor: isDark ? '#334155' : '#e2e8f0',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#e2e8f0' : '#0f172a',
              }}
              placeholder="Enter moisture threshold (10-90)"
            />
          )}
        />
        {thresholdForm.formState.errors.moistureThreshold ? (
          <Text className="mt-1 text-xs text-red-600">Threshold must be between 10 and 90.</Text>
        ) : null}
        <Pressable className="mt-3 items-center rounded-xl bg-green-700 px-4 py-2" onPress={onSaveThreshold}>
          <Text className="font-semibold text-white">Save Threshold</Text>
        </Pressable>
      </GlassCard>

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-800" style={txt}>{t('notifications')}</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={async (value) => {
              setNotificationsEnabled(value);
              await writeControlsPartial({ notifications: value });
              if (value) await ensureNotificationPermission();
            }}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>Viva Utilities</Text>
        <View className="gap-2">
          <Pressable className="items-center rounded-xl bg-teal-700 px-4 py-3" onPress={() => router.push('/(app)/validation-report' as never)}>
            <Text className="font-semibold text-white">Validation Report</Text>
          </Pressable>
          <Pressable className="items-center rounded-xl bg-cyan-700 px-4 py-3" onPress={() => router.push('/(app)/system-flow' as never)}>
            <Text className="font-semibold text-white">System Flow</Text>
          </Pressable>
          <Pressable className="items-center rounded-xl bg-indigo-700 px-4 py-3" onPress={() => router.push('/(app)/demo-cases' as never)}>
            <Text className="font-semibold text-white">Demo Cases</Text>
          </Pressable>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
