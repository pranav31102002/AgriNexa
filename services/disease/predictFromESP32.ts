import axios, { AxiosError } from 'axios';
import { diseaseSolutions } from '@/constants/disease';
import { DiseaseClass, DiseasePrediction } from '@/types';
import { normalizeDiseaseClass } from '@/utils/normalizeDiseaseClass';

type RoboflowPrediction = {
  class?: string;
  confidence?: number;
};

type RoboflowResponse = {
  predictions?: RoboflowPrediction[];
  top?: RoboflowPrediction;
  predicted_classes?: string[];
  confidence?: number;
};

export function cleanBase64Image(raw: string): string {
  const clean = raw.replace(/^"|"$/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
  return clean;
}

function toPercent(confidence: unknown): number {
  const raw = Number(confidence ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isClearlyNonLeafLabel(rawLabel: string): boolean {
  const label = normalizeToken(rawLabel);
  if (!label) return true;

  const nonLeafHints = [
    'laptop',
    'computer',
    'keyboard',
    'screen',
    'monitor',
    'mobile',
    'phone',
    'table',
    'desk',
    'wall',
    'floor',
    'sky',
    'shoe',
    'foot',
    'face',
    'human',
    'person',
    'hand',
    'finger',
    'body',
    'bottle',
    'chair',
    'household',
  ];

  return nonLeafHints.some((hint) => label.includes(hint));
}

function getTopPrediction(raw: RoboflowResponse) {
  const preds = Array.isArray(raw.predictions) ? raw.predictions : [];
  if (!preds.length && raw.top?.class) {
    return { label: String(raw.top.class), confidence: toPercent(raw.top.confidence) };
  }
  if (!preds.length && raw.predicted_classes?.[0]) {
    return { label: String(raw.predicted_classes[0]), confidence: toPercent(raw.confidence) };
  }
  return preds
    .map((p) => ({ label: String(p.class ?? 'Unknown'), confidence: toPercent(p.confidence) }))
    .sort((a, b) => b.confidence - a.confidence)[0];
}

export function getPesticideSolution(disease: DiseaseClass) {
  return diseaseSolutions[disease];
}

function getConfig() {
  const apiKey = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
  const apiBase = process.env.EXPO_PUBLIC_ROBOFLOW_API_URL || 'https://serverless.roboflow.com';
  const modelId = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID || 'tomato-zllzj-3edii/2';
  if (!apiKey) throw new Error('Roboflow API key is missing');
  return { apiKey, apiBase, modelId };
}

export async function predictDiseaseFromBase64(rawBase64: string): Promise<DiseasePrediction> {
  const cleaned = cleanBase64Image(rawBase64);
  if (cleaned.length <= 100) {
    throw new Error('Captured image corrupted. Please scan again.');
  }

  const { apiKey, apiBase, modelId } = getConfig();
  const endpoint = `${apiBase}/${modelId}?api_key=${apiKey}`;

  try {
    const response = await axios.post<RoboflowResponse>(endpoint, cleaned, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    });

    const top = getTopPrediction(response.data);
    if (isClearlyNonLeafLabel(top?.label ?? '')) {
      throw new Error('Wrong object detected in photo');
    }

    const disease = normalizeDiseaseClass(top?.label ?? '');
    if (!disease) {
      throw new Error('Wrong object detected in photo');
    }

    const confidence = top?.confidence ?? 0;
    if (confidence < 35) {
      throw new Error('Low confidence on crop leaf image. Please retake photo.');
    }
    if (disease === 'Healthy' && confidence < 60) {
      throw new Error('Low confidence on crop leaf image. Please retake photo.');
    }

    const solution = getPesticideSolution(disease);
    return {
      disease,
      confidence,
      solution: solution.solution,
      spray: solution.spray,
      imageUrl: '',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 400) {
      throw new Error('Invalid camera image format. Please rescan the crop leaf.');
    }
    throw err as Error;
  }
}
