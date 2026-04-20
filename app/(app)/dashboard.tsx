import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFarmRealtime } from '@/hooks/use-farm-realtime';
import { useDeviceStatus } from '@/hooks/use-device-status';
import { speakDashboardSummary as speakDashboardSummaryTts, stopSpeech } from '@/services/speech.service';
import { triggerAlertIfNeeded } from '@/services/alerts.service';
import { useAppStore } from '@/store/use-app-store';
import { getFarmHealthScoreWithRisk } from '@/utils/farm-health';

function ProgressRing({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View className="h-20 w-20 items-center justify-center rounded-full border-[7px] border-cyan-500/70 bg-cyan-50">
      <Text className="text-lg font-black text-cyan-800">{safe}%</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const { data, isLoading, isRefetching, isError, error } = useFarmRealtime();
  const { data: deviceStatus } = useDeviceStatus();
  const cachedPrediction = useAppStore((state) => state.cachedDiseasePrediction);
  const [now, setNow] = useState(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);

  const avgSoil = data?.avgSoilMoisture ?? 0;
  const diseaseRisk = useMemo(() => {
    if (!cachedPrediction || cachedPrediction.disease === 'Healthy') return 0;
    return Math.max(0, Math.min(100, cachedPrediction.confidence));
  }, [cachedPrediction]);

  const farmHealth = useMemo(() => {
    if (!data) return { score: 0, label: 'Critical' as const };
    return getFarmHealthScoreWithRisk(data, diseaseRisk);
  }, [data, diseaseRisk]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      void stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const lastSyncMs = new Date(data.lastSync).getTime();
    const offlineLong = !data.deviceOnline && Date.now() - lastSyncMs > 15 * 60 * 1000;

    if (data.tankWaterLevel < 20) {
      void triggerAlertIfNeeded({
        key: 'tank_low',
        type: 'TANK_LOW',
        severity: 'high',
        title: 'Low Tank Level',
        message: 'Tank level is below 20%. Please refill water tank.',
      });
    }

    if (avgSoil < 30) {
      void triggerAlertIfNeeded({
        key: 'soil_dry',
        type: 'SOIL_DRY',
        severity: 'high',
        title: 'Soil Too Dry',
        message: 'Average soil moisture is low. Irrigation is recommended.',
      });
    }

    if (offlineLong) {
      void triggerAlertIfNeeded({
        key: 'device_offline_long',
        type: 'DEVICE_OFFLINE_15M',
        severity: 'high',
        title: 'Device Offline',
        message: 'Device has been offline for more than 15 minutes.',
      });
    }

    if (data.pesticidePumpStatus && data.tankWaterLevel <= 5) {
      void triggerAlertIfNeeded({
        key: 'pesticide_empty',
        type: 'PESTICIDE_TANK_EMPTY',
        severity: 'high',
        title: 'Pesticide Tank Empty',
        message: 'Pesticide tank appears empty. Refill before spray operation.',
      });
    }
  }, [avgSoil, data]);

  useEffect(() => {
    if (!cachedPrediction) return;
    if (cachedPrediction.confidence > 90 && cachedPrediction.disease !== 'Healthy') {
      void triggerAlertIfNeeded({
        key: 'disease_high_confidence',
        type: 'DISEASE_HIGH_CONFIDENCE',
        severity: 'high',
        title: 'Disease Detected',
        message: `${cachedPrediction.disease} detected with high confidence (${cachedPrediction.confidence.toFixed(1)}%).`,
      });
    }
  }, [cachedPrediction]);

  const onSpeakDashboardSummary = async () => {
    if (isSpeaking) {
      await stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    await speakDashboardSummaryTts(
      {
        temperature: Number(data?.temperature ?? 0),
        humidity: Number(data?.humidity ?? 0),
        avgSoilMoisture: Number(avgSoil),
        tankWaterLevel: Number(data?.tankWaterLevel ?? 0),
        waterPumpStatus: Boolean(data?.waterPumpStatus),
        autoMode: Boolean(data?.autoMode),
        routeState: data?.routeState ?? 'IDLE',
      },
      () => setIsSpeaking(false)
    );
  };

  const routeState = data?.routeState ?? 'IDLE';
  const routeChipLabel =
    routeState === 'WATER'
      ? t('routeWatering')
      : routeState === 'PESTICIDE'
        ? t('routeSpraying')
        : routeState === 'FLUSH'
          ? t('routeFlushing')
          : t('routeIdle');

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="overflow-hidden rounded-3xl bg-emerald-700 p-5">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-black text-white">Smart Kisan Sathi</Text>
            <Text className="mt-1 text-xs text-emerald-100">{t('dashboardSubtitle')}</Text>
            <Text className="mt-2 text-[11px] font-semibold text-emerald-50">
              {now.toLocaleDateString()} | {now.toLocaleTimeString()}
            </Text>
            <Text className="mt-1 text-[11px] font-semibold text-emerald-100">
              {isRefetching ? 'Syncing live data...' : 'Live data active'}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable className="rounded-xl bg-white/20 p-2" onPress={onSpeakDashboardSummary}>
              <MaterialCommunityIcons name={isSpeaking ? 'stop-circle-outline' : 'volume-high'} size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable className="rounded-xl bg-white/20 p-2" onPress={() => router.push('/(app)/settings' as never)}>
              <MaterialCommunityIcons name="cog-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <View className="mt-3 flex-col gap-2">
          <View className="flex-row flex-wrap gap-2">
            <StatusBadge text={deviceStatus?.mainOnline ? t('mainNodeOnline') : t('mainNodeOffline')} tone={deviceStatus?.mainOnline ? 'ok' : 'error'} />
            <StatusBadge text={deviceStatus?.camOnline ? t('visionNodeOnline') : t('visionNodeOffline')} tone={deviceStatus?.camOnline ? 'ok' : 'error'} />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatusBadge text={data?.autoMode ? t('autoMode') : t('manualMode')} tone="info" />
            <StatusBadge
              text={routeChipLabel}
              tone={routeState === 'IDLE' ? 'info' : routeState === 'FLUSH' ? 'warn' : 'ok'}
            />
          </View>
        </View>
      </View>

      {data?.offlineMode ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-amber-600">Offline mode: showing last synced farm data</Text>
        </GlassCard>
      ) : null}

      <GlassCard>
        <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>Farm Health Score</Text>
        <Text className="mt-1 text-3xl font-black text-slate-800" style={txt}>{farmHealth.score}/100</Text>
        <Text className="mt-1 text-xs font-semibold text-emerald-600">{farmHealth.label}</Text>
      </GlassCard>

      <GlassCard>
        <Pressable className="flex-row items-center justify-between" onPress={() => router.push('/(app)/reports' as never)}>
          <View>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('farmReports')}</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{t('farmReportsSubtitle')}</Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20">
            <MaterialCommunityIcons name="file-chart-outline" size={20} color={isDark ? '#F8FAFC' : '#166534'} />
          </View>
        </Pressable>
      </GlassCard>

      <View className="flex-row gap-3">
        <GlassCard className="flex-1">
          <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>{t('temperature')}</Text>
          <Text className="mt-1 text-3xl font-black text-slate-800" style={txt}>{data?.temperature ?? 0} C</Text>
        </GlassCard>
        <GlassCard className="flex-1">
          <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>{t('humidity')}</Text>
          <Text className="mt-1 text-3xl font-black text-slate-800" style={txt}>{data?.humidity ?? 0}%</Text>
        </GlassCard>
      </View>

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>{t('avgSoilMoisture')}</Text>
            <Text className="mt-1 text-3xl font-black text-slate-800" style={txt}>{avgSoil.toFixed(1)}%</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{t('soilHealthHint')}</Text>
          </View>
          <View className="h-20 w-24 items-end justify-center">
            <View className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <View className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, avgSoil))}%` }} />
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>{t('tankLevel')}</Text>
            <Text className="mt-1 text-2xl font-black text-slate-800" style={txt}>{Math.round(data?.tankWaterLevel ?? 0)}%</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{t('tankHint')}</Text>
          </View>
          <ProgressRing value={data?.tankWaterLevel ?? 0} />
        </View>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <StatusBadge
            text={t('waterRouteActive')}
            tone={routeState === 'WATER' ? 'ok' : 'info'}
          />
          <StatusBadge
            text={t('pesticideRouteActive')}
            tone={routeState === 'PESTICIDE' ? 'ok' : 'info'}
          />
          <StatusBadge
            text={t('commonLineActive')}
            tone={data?.commonMotor ? 'ok' : 'info'}
          />
          <StatusBadge
            text={t('flushActive')}
            tone={data?.flushActive ? 'warn' : 'info'}
          />
          {routeState === 'IDLE' ? (
            <StatusBadge text={t('routeIdle')} tone="info" />
          ) : null}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('latestAlertSync')}</Text>
        <Text className="mt-1 text-xs text-slate-500" style={muted}>
          {(data?.tankWaterLevel ?? 0) < 20 ? t('lowTankDetected') : t('allSystemsStable')}
        </Text>
        <Text className="mt-2 text-xs text-slate-400" style={muted}>{t('lastSync')}: {new Date(data?.lastSync ?? '').toLocaleString()}</Text>
      </GlassCard>

      {isError ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-red-600">{t('realtimeReadError')}</Text>
          <Text className="mt-1 text-xs text-slate-600" style={muted}>{String(error)}</Text>
          <Text className="mt-1 text-xs text-slate-500" style={muted}>{t('expectedPath')}: SmartKisanSathi/sensors/current</Text>
        </GlassCard>
      ) : null}

      {isLoading ? <Text className="text-center text-slate-500" style={muted}>{t('loadingSensorData')}</Text> : null}
    </ScreenContainer>
  );
}
