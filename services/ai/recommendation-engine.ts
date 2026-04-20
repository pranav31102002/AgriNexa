import i18n from '@/locales/i18n';
import { DiseaseClass, DiseaseRecommendation } from '@/types';
import { localizeDiseaseRecommendation } from '@/utils/farmer-localization';
import { normalizeDiseaseClass } from '@/utils/normalizeDiseaseClass';

export type RecommendationResult = {
  disease: DiseaseClass;
  recommendation: DiseaseRecommendation;
};

export function getRecommendationByClass(disease: DiseaseClass): DiseaseRecommendation {
  return localizeDiseaseRecommendation(disease, i18n.t.bind(i18n));
}

export function resolveRecommendation(rawLabel: string): RecommendationResult | null {
  const disease = normalizeDiseaseClass(rawLabel);
  if (!disease) return null;
  return {
    disease,
    recommendation: getRecommendationByClass(disease),
  };
}
