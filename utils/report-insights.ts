import { DailyReport, MonthlyReport, WeeklyReport } from '@/services/report/report-calculator';
import i18n from '@/locales/i18n';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

function resolveLang() {
  return (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);
}

export function formatReportNumber(value: number, digits = 0) {
  const lang = resolveLang();
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0
  );
}

export function getDailyInsight(): string {
  return i18n.t('reportsDailyInsight');
}

export function getWeeklyRecommendation(): string {
  return i18n.t('reportsWeeklyRecommendation');
}

export function getMonthlyInsight(): string {
  return i18n.t('reportsMonthlyInsight');
}

export function buildVoiceSummary(period: ReportPeriod, data: DailyReport | WeeklyReport | MonthlyReport): string {
  if (period === 'daily') {
    const daily = data as DailyReport;
    return i18n.t('reportsDailyVoice', {
      avgSoil: formatReportNumber(daily.avgSoilMoisture, 0),
      diseaseScans: formatReportNumber(daily.diseaseScans, 0),
      farmHealth: formatReportNumber(daily.avgFarmHealthScore, 0),
    });
  }
  if (period === 'weekly') {
    const weekly = data as WeeklyReport;
    return i18n.t('reportsWeeklyVoice', {
      riskScore: formatReportNumber(weekly.riskScore, 0),
      topAlert: weekly.topAlertType,
    });
  }
  const monthly = data as MonthlyReport;
  return i18n.t('reportsMonthlyVoice', {
    waterSaved: formatReportNumber(monthly.waterSavedLiters, 0),
    uptime: formatReportNumber(monthly.uptimePercent, 0),
  });
}
