import { DISEASE_RECOMMENDATIONS } from '@/constants/disease-recommendations';
import { DiseasePrediction } from '@/types';
import { normalizeDiseaseClass } from '@/utils/normalizeDiseaseClass';
import axios from 'axios';

type RawPred = { class?: string; confidence?: number };

class LeafValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LeafValidationError';
    this.code = code;
  }
}

function toPercent(confidence: unknown): number {
  const raw = Number(confidence ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isClearlyNonLeafLabel(label: string): boolean {
  const token = normalizeToken(label);
  if (!token) return true;

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

  return nonLeafHints.some((hint) => token.includes(hint));
}

function getPredictions(raw: any): RawPred[] {
  if (Array.isArray(raw?.predictions)) return raw.predictions as RawPred[];
  if (raw?.top?.class) return [raw.top as RawPred];
  if (Array.isArray(raw?.predicted_classes) && raw.predicted_classes[0]) {
    return [{ class: raw.predicted_classes[0], confidence: raw?.confidence }];
  }
  return [];
}

function buildPrediction(raw: any, imageUrl: string): DiseasePrediction {
  const preds = getPredictions(raw);
  if (!preds.length) {
    throw new LeafValidationError('EMPTY_RESPONSE', 'Model response was empty. Please try again.');
  }

  const top = preds
    .map((p) => ({
      label: String(p.class ?? 'Unknown'),
      confidence: toPercent(p.confidence),
    }))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (isClearlyNonLeafLabel(top.label)) {
    throw new LeafValidationError('NON_LEAF_INVALID', 'Wrong object detected in photo');
  }

  const disease = normalizeDiseaseClass(top.label);
  const confidence = top.confidence;

  if (!disease) {
    throw new LeafValidationError('NON_LEAF_INVALID', 'Wrong object detected in photo');
  }
  if (confidence < 35) {
    throw new LeafValidationError('LOW_CONFIDENCE', 'Low confidence on crop leaf image. Please retake photo.');
  }
  if (disease === 'Healthy' && confidence < 60) {
    throw new LeafValidationError('LOW_CONFIDENCE', 'Low confidence on crop leaf image. Please retake photo.');
  }

  const map = DISEASE_RECOMMENDATIONS[disease];
  return {
    disease,
    confidence,
    solution: map.pesticide,
    spray: map.spray,
    imageUrl,
    timestamp: new Date().toISOString(),
  };
}

function getConfig() {
  const apiKey = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
  const apiBase = process.env.EXPO_PUBLIC_ROBOFLOW_API_URL || 'https://serverless.roboflow.com';
  const modelId = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID || 'tomato-zllzj-3edii/2';

  if (!apiKey) throw new Error('Roboflow API key is missing');
  return { apiKey, apiBase, modelId };
}

export async function predictDisease(imageUrl: string): Promise<DiseasePrediction> {
  const { apiKey, apiBase, modelId } = getConfig();
  const endpoint = `${apiBase}/${modelId}`;
  const response = await axios.post(`${endpoint}?api_key=${apiKey}&image=${encodeURIComponent(imageUrl)}`);
  return buildPrediction(response.data, imageUrl);
}

export async function predictDiseaseFromUri(uri: string): Promise<DiseasePrediction> {
  const { apiKey, apiBase, modelId } = getConfig();
  const endpoint = `${apiBase}/${modelId}`;

  if (/^https?:\/\//i.test(uri)) return predictDisease(uri);

  const asFile = async (field: 'file' | 'image') => {
    const form = new FormData();
    form.append(field, {
      uri,
      name: 'leaf.jpg',
      type: 'image/jpeg',
    } as any);

    return axios.post(`${endpoint}?api_key=${apiKey}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  };

  try {
    const res = await asFile('file');
    return buildPrediction(res.data, uri);
  } catch (error) {
    if (error instanceof LeafValidationError) throw error;
    const res = await asFile('image');
    return buildPrediction(res.data, uri);
  }
}

export async function predictDiseaseFromBase64(base64: string): Promise<DiseasePrediction> {
  const { apiKey, apiBase, modelId } = getConfig();
  const endpoint = `${apiBase}/${modelId}`;
  const cleaned = base64.replace(/^data:image\/\w+;base64,/, '').trim();
  const response = await axios.post(`${endpoint}?api_key=${apiKey}&image=${encodeURIComponent(cleaned)}`);
  return buildPrediction(response.data, cleaned);
}

export function toLeafValidationError(error: unknown): { code: string; message: string } {
  if (error instanceof LeafValidationError) {
    if (error.code === 'NON_LEAF_INVALID') return { code: error.code, message: error.message };
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: 'Prediction failed. Please retry with a clear crop leaf image.' };
}

export async function testRoboflowHealth(): Promise<boolean> {
  const { apiKey, apiBase, modelId } = getConfig();
  const res = await axios.get(`${apiBase}/${modelId}?api_key=${apiKey}`);
  return res.status >= 200 && res.status < 400;
}
