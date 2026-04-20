import i18n from '@/locales/i18n';
import { Lang } from '@/types';
import { RouteState } from '@/types/farm';
import { getRecommendationByClass } from '@/services/ai/recommendation-engine';
import { normalizeDiseaseClass } from '@/utils/normalizeDiseaseClass';

export type DashboardSpeechData = {
  temperature: number;
  humidity: number;
  avgSoilMoisture: number;
  tankWaterLevel: number;
  waterPumpStatus: boolean;
  autoMode: boolean;
  routeState: RouteState;
};

export type IrrigationSpeechData = {
  avgSoilMoisture: number;
  moistureThreshold: number;
  tankWaterLevel: number;
  autoMode: boolean;
  pumpWater: boolean;
  recommendOn: boolean;
};

export type DiseaseSpeechData = {
  diseaseName: string;
  confidence: number;
  pesticide: string;
  routeState?: RouteState;
};

export type AnalyticsSpeechData = {
  waterCycles: number;
  sprayCycles: number;
  efficiency: number;
};

type SpeechLabels = {
  dashboardTitle: string;
  irrigationTitle: string;
  temperature: string;
  humidity: string;
  soilMoisture: string;
  tankLevel: string;
  waterMotor: string;
  autoIrrigation: string;
  threshold: string;
  recommendation: string;
  diseaseDetected: string;
  pesticide: string;
  degreeC: string;
  percent: string;
  on: string;
  off: string;
  pumpOn: string;
  pumpOff: string;
  routeWater: string;
  routePesticide: string;
  routeFlush: string;
  routeIdle: string;
};

function resolveLang(locale: string): Lang {
  const short = (locale || i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);
  if (short === 'hi' || short === 'mr') return short as Lang;
  return 'en';
}

function getLocale(lang: Lang) {
  if (lang === 'hi') return 'hi-IN';
  if (lang === 'mr') return 'mr-IN';
  return 'en-IN';
}

export function formatLocalizedNumber(value: number, locale: string, digits = 1) {
  const lang = resolveLang(locale);
  const resolvedLocale = getLocale(lang);
  return new Intl.NumberFormat(resolvedLocale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function getLabels(lang: Lang): SpeechLabels {
  return {
    dashboardTitle: i18n.t('dashboard', { lng: lang }),
    irrigationTitle: i18n.t('irrigationControl', { lng: lang }),
    temperature: i18n.t('voice.temperature', { lng: lang }),
    humidity: i18n.t('voice.humidity', { lng: lang }),
    soilMoisture: i18n.t('voice.soil', { lng: lang }),
    tankLevel: i18n.t('voice.tank', { lng: lang }),
    waterMotor: i18n.t('voice.motor', { lng: lang }),
    autoIrrigation: i18n.t('voice.auto', { lng: lang }),
    threshold: i18n.t('voice.threshold', { lng: lang }),
    recommendation: i18n.t('voice.recommendation', { lng: lang }),
    diseaseDetected: i18n.t('voice.diseaseDetected', { lng: lang }),
    pesticide: i18n.t('voice.pesticide', { lng: lang }),
    degreeC: i18n.t('voice.degreeC', { lng: lang }),
    percent: i18n.t('voice.percent', { lng: lang }),
    on: i18n.t('voice.on', { lng: lang }),
    off: i18n.t('voice.off', { lng: lang }),
    pumpOn: i18n.t('voice.pumpOn', { lng: lang }),
    pumpOff: i18n.t('voice.pumpOff', { lng: lang }),
    routeWater: i18n.t('voice.routeWater', { lng: lang }),
    routePesticide: i18n.t('voice.routePesticide', { lng: lang }),
    routeFlush: i18n.t('voice.routeFlush', { lng: lang }),
    routeIdle: i18n.t('voice.routeIdle', { lng: lang }),
  };
}

function boolToText(flag: boolean, labels: SpeechLabels) {
  return flag ? labels.on : labels.off;
}

function normalizeSpeech(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function routeToSpeech(route: RouteState, labels: SpeechLabels) {
  if (route === 'WATER') return labels.routeWater;
  if (route === 'PESTICIDE') return labels.routePesticide;
  if (route === 'FLUSH') return labels.routeFlush;
  return labels.routeIdle;
}

export function buildDashboardSpeech(locale: string, data: DashboardSpeechData): string {
  const lang = resolveLang(locale);
  if (lang === 'hi') return buildHindiDashboardSpeech(locale, data);
  if (lang === 'mr') return buildMarathiDashboardSpeech(locale, data);
  return buildEnglishDashboardSpeech(locale, data);
}

export function buildIrrigationSpeech(locale: string, data: IrrigationSpeechData): string {
  const lang = resolveLang(locale);
  const labels = getLabels(lang);
  const soil = formatLocalizedNumber(data.avgSoilMoisture, lang, 0);
  const threshold = formatLocalizedNumber(data.moistureThreshold, lang, 0);
  const tank = formatLocalizedNumber(data.tankWaterLevel, lang, 0);
  const pump = boolToText(data.pumpWater, labels);
  const auto = boolToText(data.autoMode, labels);
  const recommendation = data.recommendOn ? labels.pumpOn : labels.pumpOff;

  if (lang === 'hi') {
    const text = normalizeSpeech(
      `${labels.irrigationTitle}. ${labels.soilMoisture} ${soil} ${labels.percent} है। ${labels.threshold} ${threshold} ${labels.percent} है। ${labels.tankLevel} ${tank} ${labels.percent} है। ${labels.autoIrrigation} ${auto} है। ${labels.waterMotor} ${pump} है। ${labels.recommendation} ${recommendation}.`
    );
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Speech HI Irrigation]', text);
    }
    return text;
  }

  if (lang === 'mr') {
    const text = normalizeSpeech(
      `${labels.irrigationTitle}. ${labels.soilMoisture} ${soil} ${labels.percent} आहे. ${labels.threshold} ${threshold} ${labels.percent} आहे. ${labels.tankLevel} ${tank} ${labels.percent} आहे. ${labels.autoIrrigation} ${auto} आहे. ${labels.waterMotor} ${pump} आहे. ${labels.recommendation} ${recommendation}.`
    );
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Speech MR Irrigation]', text);
    }
    return text;
  }

  return `${labels.irrigationTitle}. ${labels.soilMoisture} is ${soil} ${labels.percent}. ${labels.threshold} is ${threshold} ${labels.percent}. ${labels.tankLevel} is ${tank} ${labels.percent}. ${labels.autoIrrigation} is ${auto}. ${labels.waterMotor} is ${pump}. ${labels.recommendation} ${recommendation}.`;
}

export function buildDiseaseSpeech(locale: string, data: DiseaseSpeechData): string {
  const lang = resolveLang(locale);
  const labels = getLabels(lang);
  const confidence = formatLocalizedNumber(data.confidence, lang, 1);
  const routeText = data.routeState ? ` ${routeToSpeech(data.routeState, labels)}.` : '';
  const normalized = normalizeDiseaseClass(data.diseaseName);
  const recommendation = normalized ? getRecommendationByClass(normalized) : null;
  const pesticide = recommendation?.pesticide ?? data.pesticide;
  const frequency = recommendation?.frequency ?? '';

  if (lang === 'hi') {
    return normalizeSpeech(
      `${labels.diseaseDetected} ${data.diseaseName}। ${labels.pesticide} ${pesticide}। ${frequency ? `दोहराएं: ${frequency}. ` : ''}विश्वास ${confidence} ${labels.percent} है.${routeText}`
    );
  }

  if (lang === 'mr') {
    return normalizeSpeech(
      `${labels.diseaseDetected} ${data.diseaseName}. ${labels.pesticide} ${pesticide}. ${frequency ? `पुन्हा: ${frequency}. ` : ''}आत्मविश्वास ${confidence} ${labels.percent} आहे.${routeText}`
    );
  }

  return `${labels.diseaseDetected} ${data.diseaseName}. ${labels.pesticide} ${pesticide}. ${frequency ? `Repeat: ${frequency}. ` : ''}Confidence is ${confidence} ${labels.percent}.${routeText}`;
}

export function buildAnalyticsSpeech(locale: string, data: AnalyticsSpeechData): string {
  const lang = resolveLang(locale);
  const water = formatLocalizedNumber(data.waterCycles, lang, 0);
  const spray = formatLocalizedNumber(data.sprayCycles, lang, 0);
  const efficiency = formatLocalizedNumber(data.efficiency, lang, 0);

  if (lang === 'hi') {
    const text = normalizeSpeech(
      `इस सप्ताह पानी मार्ग चक्र ${water} रहे। स्प्रे मार्ग चक्र ${spray} रहे। रूट दक्षता ${efficiency} प्रतिशत रही।`
    );
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Speech HI Analytics]', text);
    }
    return text;
  }

  if (lang === 'mr') {
    const text = normalizeSpeech(
      `या आठवड्यात पाणी मार्ग चक्र ${water} होते. फवारणी मार्ग चक्र ${spray} होते. मार्ग कार्यक्षमता ${efficiency} टक्के होती.`
    );
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Speech MR Analytics]', text);
    }
    return text;
  }

  return `This week water route cycles were ${water}, spray route cycles were ${spray}, and route efficiency was ${efficiency} percent.`;
}

function buildEnglishDashboardSpeech(locale: string, data: DashboardSpeechData): string {
  const labels = getLabels('en');
  const temp = formatLocalizedNumber(data.temperature, locale, 1);
  const humidity = formatLocalizedNumber(data.humidity, locale, 0);
  const soil = formatLocalizedNumber(data.avgSoilMoisture, locale, 0);
  const tank = formatLocalizedNumber(data.tankWaterLevel, locale, 0);
  const pump = boolToText(data.waterPumpStatus, labels);
  const auto = boolToText(data.autoMode, labels);
  const route = routeToSpeech(data.routeState, labels);

  return `${labels.dashboardTitle}. ${labels.temperature} is ${temp} ${labels.degreeC}. ${labels.humidity} is ${humidity} ${labels.percent}. ${labels.soilMoisture} is ${soil} ${labels.percent}. ${labels.waterMotor} is ${pump}. ${labels.tankLevel} is ${tank} ${labels.percent}. ${route}. ${labels.autoIrrigation} is ${auto}.`;
}

function buildHindiDashboardSpeech(locale: string, data: DashboardSpeechData): string {
  const labels = getLabels('hi');
  const temp = formatLocalizedNumber(data.temperature, locale, 1);
  const humidity = formatLocalizedNumber(data.humidity, locale, 0);
  const soil = formatLocalizedNumber(data.avgSoilMoisture, locale, 0);
  const tank = formatLocalizedNumber(data.tankWaterLevel, locale, 0);
  const pump = boolToText(data.waterPumpStatus, labels);
  const auto = boolToText(data.autoMode, labels);
  const route = routeToSpeech(data.routeState, labels);

  const text = normalizeSpeech(
    `खेत की वर्तमान स्थिति यह है। ${labels.temperature} ${temp} ${labels.degreeC} है। ${labels.humidity} ${humidity} ${labels.percent} है। ${labels.soilMoisture} ${soil} ${labels.percent} है। ${labels.waterMotor} ${pump} है। ${labels.tankLevel} ${tank} ${labels.percent} है। ${route}। ${labels.autoIrrigation} ${auto} है।`
  );
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Speech HI]', text);
  }
  return text;
}

function buildMarathiDashboardSpeech(locale: string, data: DashboardSpeechData): string {
  const labels = getLabels('mr');
  const temp = formatLocalizedNumber(data.temperature, locale, 1);
  const humidity = formatLocalizedNumber(data.humidity, locale, 0);
  const soil = formatLocalizedNumber(data.avgSoilMoisture, locale, 0);
  const tank = formatLocalizedNumber(data.tankWaterLevel, locale, 0);
  const pump = boolToText(data.waterPumpStatus, labels);
  const auto = boolToText(data.autoMode, labels);
  const route = routeToSpeech(data.routeState, labels);

  const text = normalizeSpeech(
    `शेताची सद्यस्थिती अशी आहे. ${labels.temperature} ${temp} ${labels.degreeC} आहे. ${labels.humidity} ${humidity} ${labels.percent} आहे. ${labels.soilMoisture} ${soil} ${labels.percent} आहे. ${labels.waterMotor} ${pump} आहे. ${labels.tankLevel} ${tank} ${labels.percent} आहे. ${route}। ${labels.autoIrrigation} ${auto} आहे.`
  );
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Speech MR]', text);
  }
  return text;
}
