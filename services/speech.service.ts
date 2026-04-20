import * as Speech from 'expo-speech';
import i18n from '@/locales/i18n';
import { useAppStore } from '@/store/use-app-store';
import { Lang } from '@/types';
import {
  AnalyticsSpeechData,
  buildAnalyticsSpeech,
  buildDashboardSpeech,
  buildDiseaseSpeech,
  buildIrrigationSpeech,
  DashboardSpeechData,
  DiseaseSpeechData,
  IrrigationSpeechData,
} from '@/services/voice/buildSpeechSummary';

type VoiceCandidate = {
  voiceId?: string;
  language: string;
};

const localePriority: Record<Lang, string[]> = {
  en: ['en-IN', 'en-US', 'en'],
  hi: ['hi-IN', 'hi'],
  mr: ['mr-IN', 'mr', 'hi-IN', 'hi'],
};

const femaleVoicePattern = /female|woman|heera|kalpana|sangeeta|aditi|priya|zira|neural/i;
const maleVoicePattern = /male|man|ravi|amit|david|mark/i;

function resolveActiveLang(): Lang {
  const storeLang = useAppStore.getState().language;
  const i18nLang = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2) as Lang;
  return (storeLang || i18nLang || 'en') as Lang;
}

function getPrefix(language: string) {
  return language.toLowerCase().split('-')[0];
}

export async function selectBestVoiceLocale(lang: Lang): Promise<VoiceCandidate[]> {
  const candidates = localePriority[lang] ?? localePriority.en;
  const voices = await Speech.getAvailableVoicesAsync();
  const ranked: VoiceCandidate[] = [];

  for (const locale of candidates) {
    const exact = voices.filter((v) => (v.language || '').toLowerCase() === locale.toLowerCase());
    const prefix = voices.filter((v) => getPrefix(v.language || '') === getPrefix(locale));
    const pool = exact.length ? exact : prefix;

    const female = pool.filter((v) => femaleVoicePattern.test(`${v.name} ${v.identifier}`));
    const neutral = pool.filter(
      (v) =>
        !femaleVoicePattern.test(`${v.name} ${v.identifier}`) &&
        !maleVoicePattern.test(`${v.name} ${v.identifier}`)
    );
    const male = pool.filter((v) => maleVoicePattern.test(`${v.name} ${v.identifier}`));

    [...female, ...neutral, ...male].forEach((v) => {
      ranked.push({ voiceId: v.identifier, language: locale });
    });

    // Always try the locale without forcing a specific voice before falling back.
    ranked.push({ language: locale });
  }

  return ranked;
}

async function speakWithFallback(text: string, lang: Lang, onDone?: () => void) {
  const voices = await selectBestVoiceLocale(lang);
  const isIndic = lang === 'hi' || lang === 'mr';

  const run = (index: number) => {
    const voice = voices[index];
    if (!voice) {
      onDone?.();
      return;
    }

    Speech.speak(text, {
      language: voice.language,
      voice: voice.voiceId,
      rate: isIndic ? 0.82 : 0.88,
      pitch: isIndic ? 1.0 : 1.03,
      onDone,
      onStopped: onDone,
      onError: () => run(index + 1),
    });
  };

  run(0);
}

export async function stopSpeech() {
  await Speech.stop();
}

export async function speakDashboardSummary(data: DashboardSpeechData, onDone?: () => void) {
  await stopSpeech();
  const lang = resolveActiveLang();
  const text = buildDashboardSpeech(lang, data);
  await speakWithFallback(text, lang, onDone);
}

export async function speakIrrigationSummary(data: IrrigationSpeechData, onDone?: () => void) {
  await stopSpeech();
  const lang = resolveActiveLang();
  const text = buildIrrigationSpeech(lang, data);
  await speakWithFallback(text, lang, onDone);
}

export async function speakDiseaseSummary(data: DiseaseSpeechData, onDone?: () => void) {
  await stopSpeech();
  const lang = resolveActiveLang();
  const text = buildDiseaseSpeech(lang, data);
  await speakWithFallback(text, lang, onDone);
}

export async function speakAnalyticsSummary(data: AnalyticsSpeechData, onDone?: () => void) {
  await stopSpeech();
  const lang = resolveActiveLang();
  const text = buildAnalyticsSpeech(lang, data);
  await speakWithFallback(text, lang, onDone);
}

export async function speakCustomSummary(text: string, onDone?: () => void) {
  await stopSpeech();
  const lang = resolveActiveLang();
  await speakWithFallback(text, lang, onDone);
}
