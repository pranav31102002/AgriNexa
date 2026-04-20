import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, Share, Text, View, useWindowDimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useFarmReports } from '@/hooks/use-farm-reports';
import { stopSpeech, speakCustomSummary } from '@/services/speech.service';
import { buildVoiceSummary, formatReportNumber, ReportPeriod } from '@/utils/report-insights';

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 items-center rounded-full px-4 py-2 ${active ? 'bg-emerald-600' : 'bg-slate-200/70'}`}
      onPress={onPress}>
      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 text-xl font-black text-slate-800">{value}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 96, 240);
  const { data, isLoading, isError, error } = useFarmReports();
  const [tab, setTab] = useState<ReportPeriod>('daily');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const selected = data ? data[tab] : null;
  const axisTextColor = isDark ? '#F8FAFC' : '#334155';
  const axisLineColor = isDark ? '#E2E8F0' : '#CBD5E1';
  const gridColor = isDark ? 'rgba(248,250,252,0.35)' : '#D1D5DB';

  const onSpeak = async () => {
    if (!selected) return;
    if (isSpeaking) {
      await stopSpeech();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    const text = buildVoiceSummary(tab, selected);
    await speakCustomSummary(text, () => setIsSpeaking(false));
  };

  const onShare = async () => {
    if (!selected) return;
    const message = buildVoiceSummary(tab, selected);
    await Share.share({ message });
  };

  const daily = tab === 'daily' && data ? data.daily : null;
  const weekly = tab === 'weekly' && data ? data.weekly : null;
  const monthly = tab === 'monthly' && data ? data.monthly : null;

  const weeklySoilTrend = weekly?.soilTrend ?? [];
  const weeklyWaterUsage = weekly?.waterUsage ?? [];
  const weeklyDiseaseTrend = weekly?.diseaseScansByDay ?? [];
  const monthlySoilTrend = monthly?.soilTrend ?? [];

  const donutData = useMemo(() => monthly?.diseaseDistribution ?? [], [monthly]);

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#0f766e', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
          <View className="flex-row items-start justify-between">
          <View>
              <Text className="text-xl font-black text-white">{t('farmReports')}</Text>
              <Text className="mt-1 text-xs text-cyan-100">{t('farmReportsSubtitle')}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white/25" onPress={onSpeak}>
                <MaterialCommunityIcons name={isSpeaking ? 'stop-circle-outline' : 'volume-high'} size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-white/25" onPress={onShare}>
                <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View className="flex-row gap-2 rounded-full bg-slate-100/70 p-1">
        <SegmentButton active={tab === 'daily'} label={t('daily')} onPress={() => setTab('daily')} />
        <SegmentButton active={tab === 'weekly'} label={t('weekly')} onPress={() => setTab('weekly')} />
        <SegmentButton active={tab === 'monthly'} label={t('monthly')} onPress={() => setTab('monthly')} />
      </View>

      {data?.offlineSnapshot ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-amber-600">{t('offlineSnapshot')}</Text>
        </GlassCard>
      ) : null}

      {isLoading ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-slate-600" style={muted}>{t('loadingReport')}</Text>
        </GlassCard>
      ) : null}

      {isError ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-red-600">{t('realtimeReadError')}</Text>
          <Text className="text-xs text-slate-500" style={muted}>{String(error)}</Text>
        </GlassCard>
      ) : null}

      {daily ? (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <KPI label={t('avgSoilMoisture')} value={`${formatReportNumber(daily.avgSoilMoisture, 1)}%`} />
            <KPI label={t('temperature')} value={`${formatReportNumber(daily.avgTemperature, 1)}°C`} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('humidity')} value={`${formatReportNumber(daily.avgHumidity, 0)}%`} />
            <KPI label={t('pumpCycles')} value={formatReportNumber(daily.pumpOnCycles, 0)} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('irrigationRuntime')} value={`${formatReportNumber(daily.irrigationRuntimeMin, 0)} min`} />
            <KPI label={t('tankLowAlerts')} value={formatReportNumber(daily.tankLowAlerts, 0)} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('diseaseScans')} value={formatReportNumber(daily.diseaseScans, 0)} />
            <KPI label={t('sprayApprovals')} value={formatReportNumber(daily.sprayApprovals, 0)} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('waterRouteCycles')} value={formatReportNumber(daily.waterRoutingCycles, 0)} />
            <KPI label={t('pesticideRouteCycles')} value={formatReportNumber(daily.pesticideRoutingCycles, 0)} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('flushCycles')} value={formatReportNumber(daily.flushCycles, 0)} />
            <KPI label={t('routeEfficiency')} value={`${formatReportNumber(daily.routeEfficiencyPercent, 0)}%`} />
          </View>
          <GlassCard>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('avgFarmHealth')}</Text>
            <Text className="mt-1 text-2xl font-black text-emerald-600">{formatReportNumber(daily.avgFarmHealthScore, 0)}/100</Text>
          </GlassCard>
          <GlassCard>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('insight')}</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{daily.insight}</Text>
          </GlassCard>
        </View>
      ) : null}

      {weekly ? (
        <View className="gap-3">
          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('weeklySoilTrend')}</Text>
            <LineChart
              curved
              data={weeklySoilTrend}
              width={chartWidth}
              initialSpacing={10}
              endSpacing={10}
              spacing={Math.max(18, Math.floor((chartWidth - 20) / Math.max(weeklySoilTrend.length, 1)))}
              color="#0ea5e9"
              startFillColor="#0ea5e9"
              endFillColor="#22c55e"
              startOpacity={0.25}
              endOpacity={0.05}
              thickness={3}
              dataPointsColor="#0284c7"
              yAxisTextStyle={{ color: axisTextColor }}
              xAxisLabelTextStyle={{ color: axisTextColor }}
              xAxisColor={axisLineColor}
              yAxisColor={axisLineColor}
              rulesColor={gridColor}
            />
          </GlassCard>

          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('waterUsageTrend')}</Text>
            <BarChart
              data={weeklyWaterUsage}
              width={chartWidth}
              initialSpacing={10}
              endSpacing={10}
              barWidth={20}
              spacing={Math.max(16, Math.floor((chartWidth - 20) / Math.max(weeklyWaterUsage.length, 1)) - 6)}
              roundedTop
              barBorderRadius={6}
              xAxisColor={axisLineColor}
              yAxisColor={axisLineColor}
              noOfSections={3}
              yAxisTextStyle={{ color: axisTextColor }}
              xAxisLabelTextStyle={{ color: axisTextColor }}
              rulesColor={gridColor}
            />
          </GlassCard>

          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('diseaseScanTrend')}</Text>
            <LineChart
              curved
              data={weeklyDiseaseTrend}
              width={chartWidth}
              initialSpacing={10}
              endSpacing={10}
              spacing={Math.max(18, Math.floor((chartWidth - 20) / Math.max(weeklyDiseaseTrend.length, 1)))}
              color="#f59e0b"
              dataPointsColor="#f59e0b"
              yAxisTextStyle={{ color: axisTextColor }}
              xAxisLabelTextStyle={{ color: axisTextColor }}
              xAxisColor={axisLineColor}
              yAxisColor={axisLineColor}
              rulesColor={gridColor}
            />
          </GlassCard>

          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('weeklySummary')}</Text>
            <View className="gap-2">
              <Text style={muted}>{t('topAlertType')}: {weekly.topAlertType}</Text>
              <Text style={muted}>{t('bestHealthDay')}: {weekly.bestHealthDay}</Text>
              <Text style={muted}>{t('worstHealthDay')}: {weekly.worstHealthDay}</Text>
              <Text style={muted}>{t('weeklyRiskScore')}: {formatReportNumber(weekly.riskScore, 0)}</Text>
              <Text style={muted}>{t('waterRouteCycles')}: {formatReportNumber(weekly.totalWaterRouting, 0)}</Text>
              <Text style={muted}>{t('pesticideRouteCycles')}: {formatReportNumber(weekly.totalPesticideRouting, 0)}</Text>
              <Text style={muted}>{t('flushCycles')}: {formatReportNumber(weekly.totalFlushCycles, 0)}</Text>
              <Text style={muted}>{t('routeEfficiency')}: {formatReportNumber(weekly.routeEfficiencyPercent, 0)}%</Text>
            </View>
          </GlassCard>

          <GlassCard>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('recommendation')}</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{weekly.recommendation}</Text>
          </GlassCard>
        </View>
      ) : null}

      {monthly ? (
        <View className="gap-3">
          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('monthlyTrend')}</Text>
            <LineChart
              curved
              data={monthlySoilTrend}
              width={chartWidth}
              initialSpacing={10}
              endSpacing={10}
              spacing={Math.max(18, Math.floor((chartWidth - 20) / Math.max(monthlySoilTrend.length, 1)))}
              color="#22c55e"
              startFillColor="#22c55e"
              endFillColor="#0ea5e9"
              startOpacity={0.2}
              endOpacity={0.05}
              thickness={3}
              dataPointsColor="#16a34a"
              yAxisTextStyle={{ color: axisTextColor }}
              xAxisLabelTextStyle={{ color: axisTextColor }}
              xAxisColor={axisLineColor}
              yAxisColor={axisLineColor}
              rulesColor={gridColor}
            />
          </GlassCard>

          <GlassCard>
            <Text className="mb-2 text-base font-bold text-slate-800" style={txt}>{t('diseaseDistribution')}</Text>
            <View className="flex-row items-center justify-between">
              <PieChart donut radius={80} innerRadius={46} data={donutData} />
              <View className="ml-3 flex-1 gap-2">
                {donutData.slice(0, 4).map((item) => (
                  <View key={item.label} className="flex-row items-center justify-between rounded-xl px-2 py-1" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}>
                    <Text className="text-xs font-semibold" style={txt}>{item.label}</Text>
                    <Text className="text-xs font-bold" style={txt}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>

          <View className="flex-row gap-3">
            <KPI label={t('irrigationCycles')} value={formatReportNumber(monthly.irrigationCycles, 0)} />
            <KPI label={t('waterSaved')} value={`${formatReportNumber(monthly.waterSavedLiters, 0)} L`} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('pesticideUsage')} value={formatReportNumber(monthly.pesticideUsage, 0)} />
            <KPI label={t('uptime')} value={`${formatReportNumber(monthly.uptimePercent, 0)}%`} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('waterRouteCycles')} value={formatReportNumber(monthly.totalWaterRouting, 0)} />
            <KPI label={t('pesticideRouteCycles')} value={formatReportNumber(monthly.totalPesticideRouting, 0)} />
          </View>
          <View className="flex-row gap-3">
            <KPI label={t('flushCycles')} value={formatReportNumber(monthly.totalFlushCycles, 0)} />
            <KPI label={t('routeEfficiency')} value={`${formatReportNumber(monthly.routeEfficiencyPercent, 0)}%`} />
          </View>

          <GlassCard>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('topIssue')}</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{monthly.topIssue}</Text>
          </GlassCard>
          <GlassCard>
            <Text className="text-sm font-semibold text-slate-700" style={txt}>{t('insight')}</Text>
            <Text className="mt-1 text-xs text-slate-500" style={muted}>{monthly.insight}</Text>
          </GlassCard>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
