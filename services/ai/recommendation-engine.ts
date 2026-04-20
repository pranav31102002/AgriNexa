import { DISEASE_RECOMMENDATIONS } from '@/constants/disease-recommendations';
import { DiseaseClass, DiseaseRecommendation } from '@/types';
import { normalizeDiseaseClass } from '@/utils/normalizeDiseaseClass';

export type RecommendationResult = {
  disease: DiseaseClass;
  recommendation: DiseaseRecommendation;
};

export function getRecommendationByClass(disease: DiseaseClass): DiseaseRecommendation {
  return DISEASE_RECOMMENDATIONS[disease];
}

export function resolveRecommendation(rawLabel: string): RecommendationResult | null {
  const disease = normalizeDiseaseClass(rawLabel);
  if (!disease) return null;
  return {
    disease,
    recommendation: DISEASE_RECOMMENDATIONS[disease],
  };
}
