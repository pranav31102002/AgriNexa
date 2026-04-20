import { useQuery } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { getRealtimeOnce } from '@/services/firebase';
import {
  buildDailyReport,
  buildMonthlyReport,
  buildWeeklyReport,
  DailyReport,
  HistoryAlert,
  HistoryDisease,
  HistoryIrrigation,
  HistoryPesticide,
  HistorySensor,
  MonthlyReport,
  WeeklyReport,
} from '@/services/report/report-calculator';
import { getDailyInsight, getMonthlyInsight, getWeeklyRecommendation } from '@/utils/report-insights';
import { useAppStore } from '@/store/use-app-store';

export type FarmReportsPayload = {
  daily: DailyReport;
  weekly: WeeklyReport;
  monthly: MonthlyReport;
  offlineSnapshot: boolean;
};

export function useFarmReports() {
  const language = useAppStore((state) => state.language);
  return useQuery({
    queryKey: ['farm-reports', language],
    queryFn: async (): Promise<FarmReportsPayload> => {
      try {
        const [dailyReport, weeklyReport, monthlyReport] = await Promise.all([
          getRealtimeOnce<DailyReport>(firebasePaths.reportsDaily),
          getRealtimeOnce<WeeklyReport>(firebasePaths.reportsWeekly),
          getRealtimeOnce<MonthlyReport>(firebasePaths.reportsMonthly),
        ]);

        if (dailyReport && weeklyReport && monthlyReport) {
          const data: FarmReportsPayload = {
            daily: dailyReport,
            weekly: weeklyReport,
            monthly: monthlyReport,
            offlineSnapshot: false,
          };
          await setCache(cacheKeys.reports, data);
          return data;
        }

        const [sensorsRaw, irrigationRaw, diseaseRaw, alertsRaw, pesticideRaw] = await Promise.all([
          getRealtimeOnce<Record<string, HistorySensor>>(firebasePaths.historySensors),
          getRealtimeOnce<Record<string, HistoryIrrigation>>(firebasePaths.historyIrrigation),
          getRealtimeOnce<Record<string, HistoryDisease>>(firebasePaths.historyDisease),
          getRealtimeOnce<Record<string, HistoryAlert>>(firebasePaths.historyAlerts),
          getRealtimeOnce<Record<string, HistoryPesticide>>(firebasePaths.pesticideHistory),
        ]);

        const payload = {
          sensors: Object.values(sensorsRaw ?? {}),
          irrigation: Object.values(irrigationRaw ?? {}),
          disease: Object.values(diseaseRaw ?? {}),
          alerts: Object.values(alertsRaw ?? {}),
          pesticideHistory: Object.values(pesticideRaw ?? {}),
        };

        const daily = buildDailyReport(payload, getDailyInsight());
        const weekly = buildWeeklyReport(payload, getWeeklyRecommendation());
        const monthly = buildMonthlyReport(payload, getMonthlyInsight());
        const data: FarmReportsPayload = { daily, weekly, monthly, offlineSnapshot: false };
        await setCache(cacheKeys.reports, data);
        return data;
      } catch (error) {
        const cached = await getCache<FarmReportsPayload>(cacheKeys.reports);
        if (cached) {
          return { ...cached, offlineSnapshot: true };
        }
        throw error;
      }
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    staleTime: 15000,
  });
}
