import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDeviceStatus } from '@/hooks/use-device-status';
import { useFarmAnalytics } from '@/hooks/useFarmAnalytics';
import { useWeather } from '@/hooks/useWeather';
import { useCropPlanner } from '@/hooks/useCropPlanner';
import { speakAnalyticsSummary, stopSpeech } from '@/services/speech.service';
import { AnalyticsSummary } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';

type KpiCard = {
  label: string;
  value: string;
  delta: number;
  spark: number[];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

type DayKey = typeof dayKeys[number];

type HeatRow = {
  label: string;
  values: number[];
};

function sparkData(values: number[]) {
  return values.map((value) => ({ value }));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function heatIntensity(value: number, max: number) {
  if (!max) return 0.1;
  return clamp(value / max, 0.1, 1);
}

function formatDelta(delta: number) {
  if (delta === 0) return '0%';
  return `${delta > 0 ? '+' : ''}${delta}%`;
}

const emptySummary: AnalyticsSummary = {
  kpi: {
    avgSoilMoisture: 0,
    waterRouteCycles: 0,
    sprayRouteCycles: 0,
    routeEfficiency: 0,
    deltaSoil: 0,
    deltaWater: 0,
    deltaSpray: 0,
    deltaEfficiency: 0,
  },
  heatmap: [
    { key: 'irrigation', values: Array.from({ length: 7 }, () => 0) },
    { key: 'spray', values: Array.from({ length: 7 }, () => 0) },
    { key: 'alerts', values: Array.from({ length: 7 }, () => 0) },
    { key: 'common', values: Array.from({ length: 7 }, () => 0) },
  ],
  donut: { water: 0, spray: 0 },
  insight: '',
  sparklines: {
    soil: Array.from({ length: 7 }, () => 0),
    water: Array.from({ length: 7 }, () => 0),
    spray: Array.from({ length: 7 }, () => 0),
    efficiency: Array.from({ length: 7 }, () => 0),
  },
};

export default function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const deviceStatus = useDeviceStatus();
  const { data } = useFarmAnalytics();
  const { data: weather } = useWeather();
  const { summary: cropSummary } = useCropPlanner();
  const [speaking, setSpeaking] = useState(false);

  const summary = data ?? emptySummary;
  const kpi = summary.kpi;

  const kpiCards: KpiCard[] = useMemo(
    () => [
      {
        label: t('analyticsKpiSoil'),
        value: `${kpi.avgSoilMoisture.toFixed(1)}%`,
        delta: kpi.deltaSoil,
        spark: summary.sparklines.soil,
        icon: 'sprout',
      },
      {
        label: t('analyticsKpiWater'),
        value: `${kpi.waterRouteCycles}`,
        delta: kpi.deltaWater,
        spark: summary.sparklines.water,
        icon: 'water',
      },
      {
        label: t('analyticsKpiSpray'),
        value: `${kpi.sprayRouteCycles}`,
        delta: kpi.deltaSpray,
        spark: summary.sparklines.spray,
        icon: 'spray-bottle',
      },
      {
        label: t('analyticsKpiEfficiency'),
        value: `${kpi.routeEfficiency}%`,
        delta: kpi.deltaEfficiency,
        spark: summary.sparklines.efficiency,
        icon: 'chart-donut',
      },
    ],
    [kpi, summary.sparklines, t]
  );

  const cropLifecycleKpis = [
    { label: 'Active Crops', value: cropSummary.activeCrops, icon: 'sprout', tone: '#10B981' },
    { label: 'Upcoming Sprays', value: cropSummary.upcomingSprays, icon: 'spray-bottle', tone: '#F97316' },
    { label: 'Upcoming Harvests', value: cropSummary.upcomingHarvests, icon: 'basket-outline', tone: '#0EA5E9' },
    { label: 'Disease Risk Crops', value: cropSummary.diseaseRiskCrops, icon: 'alert-octagon-outline', tone: '#EF4444' },
  ] as const;

  const heatMax = Math.max(
    ...summary.heatmap.flatMap((row) => row.values),
    1
  );

  const heatRows: HeatRow[] = [
    { label: t('irrigation'), values: summary.heatmap[0]?.values ?? [] },
    { label: t('sprayLabel'), values: summary.heatmap[1]?.values ?? [] },
    { label: t('alertsLabel'), values: summary.heatmap[2]?.values ?? [] },
    { label: t('commonMotorLabel'), values: summary.heatmap[3]?.values ?? [] },
  ];

  const onSpeak = async () => {
    if (speaking) {
      await stopSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await speakAnalyticsSummary(
      {
        efficiency: kpi.routeEfficiency,
        waterCycles: kpi.waterRouteCycles,
        sprayCycles: kpi.sprayRouteCycles,
      },
      () => setSpeaking(false)
    );
  };

  const cardWidth = Math.max((width - 56) / 2, 160);
  const sparkWidth = cardWidth - 32;

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#0f766e', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xl font-black text-white">{t('analyticsTitle')}</Text>
              <Text className="mt-1 text-xs text-cyan-100">{t('analyticsSubtitlePremium')}</Text>
            </View>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white/25" onPress={onSpeak}>
              <MaterialCommunityIcons name={speaking ? 'stop-circle-outline' : 'volume-high'} size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="mt-3 flex-row gap-2">
            <View className="rounded-full bg-emerald-500/25 px-3 py-1">
              <Text className="text-xs font-bold text-emerald-100">
                {deviceStatus.data?.mainOnline ? t('mainNodeOnline') : t('mainNodeOffline')}
              </Text>
            </View>
            <View className="rounded-full bg-sky-400/25 px-3 py-1">
              <Text className="text-xs font-bold text-sky-100">
                {deviceStatus.data?.camOnline ? t('visionNodeOnline') : t('visionNodeOffline')}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View className="flex-row flex-wrap justify-between gap-3">
        {kpiCards.map((card, idx) => (
          <View key={`${card.label}_${idx}`} style={{ width: cardWidth }}>
            <GlassCard className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
                  <MaterialCommunityIcons name={card.icon} size={18} color="#10b981" />
                </View>
                <View className="rounded-full bg-emerald-500/15 px-2 py-1">
                  <Text className="text-[11px] font-semibold text-emerald-600">{formatDelta(card.delta)}</Text>
                </View>
              </View>
              <Text className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500" style={muted}>
                {card.label}
              </Text>
              <Text className="mt-1 text-xl font-black text-slate-800" style={txt}>
                {card.value}
              </Text>
              <LineChart
                data={sparkData(card.spark)}
                width={sparkWidth}
                height={44}
                hideDataPoints
                isAnimated
                thickness={4}
                color="#22c55e"
                curved
                initialSpacing={0}
                spacing={Math.max(6, Math.floor(sparkWidth / Math.max(card.spark.length, 1)))}
                xAxisColor="transparent"
                yAxisColor="transparent"
                hideRules
                yAxisTextStyle={{ color: 'transparent' }}
                xAxisLabelTextStyle={{ color: 'transparent' }}
              />
            </GlassCard>
          </View>
        ))}
      </View>

      <GlassCard>
        <Text className="text-sm font-bold text-slate-800" style={txt}>
          Crop Lifecycle Intelligence
        </Text>
        <Text className="mt-1 text-[11px] text-slate-500" style={muted}>
          Active crop planning, spray windows, harvests, and disease-risk signals.
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {cropLifecycleKpis.map((item) => (
            <View
              key={item.label}
              className="min-w-[47%] flex-1 rounded-2xl border p-3"
              style={{ borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-semibold uppercase text-slate-500" style={muted}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons name={item.icon} size={17} color={item.tone} />
              </View>
              <Text className="mt-2 text-2xl font-black" style={txt}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-bold text-slate-800" style={txt}>
              {t('analyticsHeatmapTitle')}
            </Text>
            <Text className="mt-1 text-[11px] text-slate-500" style={muted}>
              {t('analyticsHeatmapSubtitle')}
            </Text>
          </View>
          <View className="rounded-full bg-emerald-500/15 px-3 py-1">
            <Text className="text-[11px] font-semibold text-emerald-600">{t('weekly')}</Text>
          </View>
        </View>

        <View className="mt-4">
          <View className="flex-row justify-between pl-16">
            {dayKeys.map((key) => (
              <Text key={key} className="text-[10px] font-semibold text-slate-500" style={muted}>
                {t(key as DayKey)}
              </Text>
            ))}
          </View>
          <View className="mt-3 gap-3">
            {heatRows.map((row) => (
              <View key={row.label} className="flex-row items-center">
                <Text className="w-14 text-[11px] font-semibold text-slate-500" style={muted}>
                  {row.label}
                </Text>
                <View className="flex-1 flex-row justify-between">
                  {row.values.map((value, idx) => (
                    <View
                      key={`${row.label}_${idx}`}
                      className="h-7 w-7 rounded-lg"
                      style={{ backgroundColor: `rgba(16,185,129,${heatIntensity(value, heatMax)})` }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>

      <GlassCard className="p-4">
        <Text className="text-sm font-bold text-slate-800" style={txt}>
          {t('analyticsDonutTitle')}
        </Text>
        <Text className="mt-1 text-[11px] text-slate-500" style={muted}>
          {t('analyticsDonutSubtitle')}
        </Text>
        <View className="mt-3 flex-row items-center justify-between">
          <PieChart
            donut
            radius={74}
            innerRadius={44}
            data={[
              { value: Math.max(summary.donut.water, 1), color: '#22c55e' },
              { value: Math.max(summary.donut.spray, 1), color: '#f97316' },
            ]}
            centerLabelComponent={() => (
              <View className="items-center">
                <Text className="text-xs font-semibold text-slate-500" style={muted}>
                  {t('weekly')}
                </Text>
                <Text className="text-base font-black" style={txt}>
                  {t('routing')}
                </Text>
              </View>
            )}
          />
          <View className="ml-4 flex-1 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold" style={txt}>{t('analyticsKpiWater')}</Text>
              <Text className="text-xs font-semibold" style={txt}>{summary.donut.water}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold" style={txt}>{t('analyticsKpiSpray')}</Text>
              <Text className="text-xs font-semibold" style={txt}>{summary.donut.spray}</Text>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-sm font-bold text-slate-800" style={txt}>
          {t('aiFarmInsight')}
        </Text>
        <Text className="mt-1 text-xs text-slate-500" style={muted}>
          {t('analyticsInsightLite', {
            efficiency: kpi.routeEfficiency,
            water: kpi.waterRouteCycles,
            spray: kpi.sprayRouteCycles,
          })}
        </Text>
        <Text className="mt-2 text-xs text-emerald-600">
          {weather?.guidance.shouldDelayIrrigation
            ? t('analyticsRainDelayInsight')
            : t('analyticsRoutineIrrigationInsight')}
        </Text>
      </GlassCard>
    </ScreenContainer>
  );
}
