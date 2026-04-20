import { DiseaseClass } from '@/types';

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

export function normalizeDiseaseClass(rawLabel: string): DiseaseClass | null {
  const label = normalizeToken(rawLabel);
  if (!label) return null;

  if (includesAny(label, ['spider mites', 'spider mite', 'mites', 'mite'])) return 'Spider Mites';
  if (includesAny(label, ['target spot', 'targetspot']) || (label.includes('target') && label.includes('spot'))) {
    return 'Target Spot';
  }
  if (includesAny(label, ['leaf mold', 'mold', 'mildew'])) return 'Leaf Mold';
  if (includesAny(label, ['late blight'])) return 'Late Blight';
  if (includesAny(label, ['early blight'])) return 'Early Blight';
  if (label.includes('blight')) return 'Early Blight';
  const healthyLike = includesAny(label, ['healthy', 'no disease', 'disease free']);
  const plantLike = includesAny(label, ['tomato', 'leaf', 'plant', 'crop', 'foliage']);
  if (healthyLike && plantLike) return 'Healthy';

  return null;
}
