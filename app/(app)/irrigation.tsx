import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { ActionFeedback, FeedbackVariant } from '@/components/ui/action-feedback';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { firebasePaths } from '@/constants/firebase-paths';
import { useFarmRealtime } from '@/hooks/use-farm-realtime';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useWeather } from '@/hooks/useWeather';
import { logUserAction } from '@/services/audit-log.service';
import { getRealtimeOnce, setRealtime, updateRealtime } from '@/services/firebase';
import { logIrrigationHistory } from '@/services/history.service';
import { speakIrrigationSummary as speakIrrigationSummaryTts, stopSpeech } from '@/services/speech.service';
import { useAppStore } from '@/store/use-app-store';
import { buildIrrigationWeatherText, translateRainRisk } from '@/utils/farmer-localization';
import { irrigationAdviceTone, rainRiskTone } from '@/utils/weatherMapper';

type ControlsJson = {
  autoMode?: boolean;
  moistureThreshold?: number;
  pumpWater?: boolean;
  waterPump?: boolean;
  waterPumpStatus?: boolean;
  routeMode?: string;
  commandUpdatedAt?: number;
  notifications?: boolean;
  theme?: string;
  language?: string;
};

export default function IrrigationScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const queryClient = useQueryClient();
  const { data } = useFarmRealtime();
  const { data: weather } = useWeather();
  const role = useAppStore((state) => state.role);
  const localControl = useAppStore((state) => state.localControl);
  const setLocalControl = useAppStore((state) => state.setLocalControl);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    subtitle: string;
    variant?: FeedbackVariant;
  } | null>(null);
  const [waterStage, setWaterStage] = useState<'idle' | 'valve' | 'pump' | 'common'>('idle');

  const controlsQuery = useQuery({
    queryKey: ['controls'],
    queryFn: async () => {
      const dbControl = await getRealtimeOnce<ControlsJson>(firebasePaths.controls);
      return {
        autoMode: dbControl?.autoMode ?? localControl.autoMode,
        moistureThreshold: dbControl?.moistureThreshold ?? localControl.moistureThreshold,
        pumpWater: dbControl?.pumpWater ?? localControl.waterPump,
        notifications: dbControl?.notifications ?? true,
        theme: dbControl?.theme ?? 'system',
        language: dbControl?.language ?? 'EN',
      };
    },
    refetchInterval: 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<{ autoMode: boolean; moistureThreshold: number; pumpWater: boolean }>) => {
      const current = controlsQuery.data ?? {
        autoMode: true,
        moistureThreshold: 45,
        pumpWater: false,
        notifications: true,
        theme: 'system',
        language: 'EN',
      };
      const merged = { ...current, ...payload };
      const commandUpdatedAt = Math.floor(Date.now() / 1000);
      const routeMode = merged.pumpWater ? 'WATER' : 'IDLE';

      setLocalControl({
        autoMode: merged.autoMode,
        moistureThreshold: merged.moistureThreshold,
        waterPump: merged.pumpWater,
      });

      await updateRealtime(firebasePaths.controls, {
        ...merged,
        waterPump: merged.pumpWater,
        waterPumpStatus: merged.pumpWater,
        routeMode,
        commandUpdatedAt,
      });

      const avgSoilNow = data?.avgSoilMoisture ?? 0;
      const manualPumpCommand = merged.autoMode ? avgSoilNow < merged.moistureThreshold : merged.pumpWater;
      await setRealtime(firebasePaths.automationWater, {
        recommended: avgSoilNow < merged.moistureThreshold,
        pumpON: manualPumpCommand,
        pumpWater: manualPumpCommand,
        routeMode: manualPumpCommand ? 'WATER' : 'IDLE',
        reason: merged.autoMode
          ? avgSoilNow < merged.moistureThreshold
            ? 'AVG_SOIL_BELOW_THRESHOLD'
            : 'AVG_SOIL_ABOVE_THRESHOLD'
          : manualPumpCommand
            ? 'MANUAL_PUMP_ON'
            : 'MANUAL_PUMP_OFF',
        confidence: 0.98,
        modelVersion: 'RULE_V2',
        waterSavingPercent: Math.max(0, Math.round((merged.moistureThreshold - avgSoilNow) * -1.6 + 32)),
        lastRunDurationSec: manualPumpCommand ? 18 : 0,
        timestamp: commandUpdatedAt,
      });

      await logIrrigationHistory({
        autoMode: merged.autoMode,
        threshold: merged.moistureThreshold,
        pumpWater: merged.pumpWater,
        avgSoil: avgSoilNow,
      });

      return { current, merged };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['controls'] });
      const current = controlsQuery.data ?? {
        autoMode: true,
        moistureThreshold: 45,
        pumpWater: false,
        notifications: true,
        theme: 'system',
        language: 'EN',
      };
      const merged = { ...current, ...payload };
      queryClient.setQueryData(['controls'], merged);
      setLocalControl({
        autoMode: merged.autoMode,
        moistureThreshold: merged.moistureThreshold,
        waterPump: merged.pumpWater,
      });
      return { previous: current };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(['controls'], context.previous);
    },
  });

  const avgSoil = data?.avgSoilMoisture ?? 0;
  const threshold = controlsQuery.data?.moistureThreshold ?? localControl.moistureThreshold;
  const autoMode = controlsQuery.data?.autoMode ?? localControl.autoMode;
  const pumpWater = controlsQuery.data?.pumpWater ?? localControl.waterPump;
  const recommendOn = avgSoil < threshold;
  const routeState = data?.routeState ?? 'IDLE';
  const manualRouteLive = !autoMode && pumpWater && routeState === 'WATER';

  useEffect(() => {
    return () => {
      void stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (routeState !== 'WATER') {
      setWaterStage('idle');
      return;
    }

    setWaterStage('valve');
    const pumpTimer = setTimeout(() => setWaterStage('pump'), 500);
    const commonTimer = setTimeout(() => setWaterStage('common'), 1000);
    return () => {
      clearTimeout(pumpTimer);
      clearTimeout(commonTimer);
    };
  }, [routeState]);

  const onSpeakIrrigationSummary = async () => {
    if (isSpeaking) {
      await stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    await speakIrrigationSummaryTts(
      {
        avgSoilMoisture: Number(avgSoil),
        moistureThreshold: Number(threshold),
        tankWaterLevel: Number(data?.tankWaterLevel ?? 0),
        autoMode: Boolean(autoMode),
        pumpWater: Boolean(pumpWater),
        recommendOn,
        weatherSummary: weather
          ? {
              temperature: Number(weather.current.temperature ?? 0),
              shouldDelayIrrigation: Boolean(weather.guidance.shouldDelayIrrigation),
              rainExpected: Boolean(weather.guidance.rainExpectedWithin6h),
            }
          : undefined,
      },
      () => setIsSpeaking(false)
    );
  };

  const onToggleAutoMode = async (nextValue: boolean) => {
    const oldValue = autoMode;
    updateMutation.mutate({ autoMode: nextValue });
    await logUserAction({
      actionType: 'AUTO_MODE_TOGGLE',
      oldValue,
      newValue: nextValue,
    });
  };

  const onThresholdChange = async (value: number) => {
    const oldValue = threshold;
    updateMutation.mutate({ moistureThreshold: value });
    await logUserAction({
      actionType: 'THRESHOLD_CHANGE',
      oldValue,
      newValue: value,
    });
  };

  const onManualPumpToggle = async () => {
    const oldValue = pumpWater;
    const nextPumpWater = !pumpWater;
    updateMutation.mutate({
      autoMode: false,
      pumpWater: nextPumpWater,
    });
    await logUserAction({
      actionType: 'MANUAL_PUMP_TOGGLE',
      oldValue,
      newValue: nextPumpWater,
    });
    setFeedback({
      title: nextPumpWater ? t('manualIrrigationStarted') : t('manualIrrigationStopped'),
      subtitle: nextPumpWater ? t('waterLineActiveNow') : t('waterLineStopped'),
      variant: nextPumpWater ? 'success' : 'warning',
    });
  };

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="rounded-3xl bg-sky-700 p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-black text-white">{t('irrigationControl')}</Text>
            <Text className="mt-1 text-xs text-sky-100">{t('irrigationSubtitle')}</Text>
            <Text className="mt-3 text-3xl font-black text-white">{avgSoil.toFixed(1)}%</Text>
            <Text className="text-xs text-sky-100">{t('currentAvgSoil')}</Text>
          </View>
          <Pressable className="rounded-xl bg-white/20 p-2" onPress={onSpeakIrrigationSummary}>
            <MaterialCommunityIcons name={isSpeaking ? 'stop-circle-outline' : 'volume-high'} size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {role === 'viewer' ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-amber-600">{t('viewerIrrigationReadonly')}</Text>
        </GlassCard>
      ) : null}

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-slate-800" style={txt}>{t('automationMode')}</Text>
          <Switch
            value={autoMode}
            onValueChange={onToggleAutoMode}
            disabled={role === 'viewer'}
            trackColor={{ false: '#94A3B8', true: '#10B981' }}
            thumbColor={autoMode ? '#F8FAFC' : '#E2E8F0'}
          />
        </View>

        <View className="mt-4">
          <Text className="mb-1 text-sm text-slate-600" style={muted}>
            {t('moistureThreshold')}: {Math.round(threshold)}%
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={threshold}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="#D7E3DD"
            onSlidingComplete={onThresholdChange}
            disabled={role === 'viewer'}
          />
        </View>

        <View className="mt-3 flex-row gap-2">
          <StatusBadge
            text={
              recommendOn
                ? `${t('recommended')}: ${t('pump')} ${t('on')}`
                : `${t('recommended')}: ${t('pump')} ${t('off')}`
            }
            tone={recommendOn ? 'ok' : 'warn'}
          />
          <StatusBadge
            text={`${t('tank')} ${Math.round(data?.tankWaterLevel ?? 0)}%`}
            tone={(data?.tankWaterLevel ?? 0) < 20 ? 'error' : 'info'}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('waterRouteStatus')}</Text>
        {routeState === 'WATER' ? (
          <View className="gap-2">
            <Text className="text-sm text-slate-600" style={muted}>{t('waterValveOpened')}</Text>
            <Text className="text-sm text-slate-600" style={muted}>
              {waterStage === 'valve' ? t('waterPumpStarting') : t('waterPumpStarted')}
            </Text>
            <Text className="text-sm text-slate-600" style={muted}>
              {waterStage === 'common' ? t('commonLineActive') : t('commonLinePressurizing')}
            </Text>
            <Text className="text-sm font-semibold text-emerald-600">{t('irrigationActive')}</Text>
          </View>
        ) : (
          <Text className="text-sm text-slate-500" style={muted}>{t('routeIdle')}</Text>
        )}
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('weatherSuggestion')}</Text>
        <Text className="text-sm text-slate-600" style={muted}>
          {buildIrrigationWeatherText(weather, avgSoil, threshold, t)}
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <StatusBadge text={t('weatherRainChip', { risk: translateRainRisk(weather?.guidance.rainRisk, t) })} tone={rainRiskTone(weather?.guidance.rainRisk ?? 'LOW')} />
          <StatusBadge
            text={buildIrrigationWeatherText(weather, avgSoil, threshold, t)}
            tone={irrigationAdviceTone(Boolean(weather?.guidance.shouldDelayIrrigation))}
          />
        </View>
      </GlassCard>


      {role !== 'viewer' ? (
        <GlassCard>
          <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('manualPumpOverride')}</Text>
          <View className="mb-3 flex-row gap-2">
            <StatusBadge
              text={manualRouteLive ? t('manualRouteLive') : t('routeStopped')}
              tone={manualRouteLive ? 'ok' : 'info'}
            />
          </View>
          <Pressable
            className={`items-center rounded-2xl px-4 py-4 ${
              autoMode ? 'bg-slate-400' : pumpWater ? 'bg-red-600' : 'bg-emerald-600'
            }`}
            disabled={autoMode}
            onPress={onManualPumpToggle}>
            <Text className="text-lg font-black text-white">
              {autoMode
                ? t('disabledInAutomation')
                : pumpWater
                  ? `${t('turn')} ${t('pump')} ${t('off')}`
                  : `${t('turn')} ${t('pump')} ${t('on')}`}
            </Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {feedback ? (
        <ActionFeedback
          title={feedback.title}
          subtitle={feedback.subtitle}
          variant={feedback.variant ?? 'success'}
          onHide={() => setFeedback(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}

