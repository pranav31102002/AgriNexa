import { DiseaseClass } from '@/types';
import { DISEASE_RECOMMENDATIONS } from '@/constants/disease-recommendations';

export const diseaseSolutions: Record<DiseaseClass, { solution: string; spray: boolean }> = {
  Healthy: { solution: DISEASE_RECOMMENDATIONS.Healthy.pesticide, spray: DISEASE_RECOMMENDATIONS.Healthy.spray },
  'Early Blight': { solution: DISEASE_RECOMMENDATIONS['Early Blight'].pesticide, spray: DISEASE_RECOMMENDATIONS['Early Blight'].spray },
  'Late Blight': { solution: DISEASE_RECOMMENDATIONS['Late Blight'].pesticide, spray: DISEASE_RECOMMENDATIONS['Late Blight'].spray },
  'Leaf Mold': { solution: DISEASE_RECOMMENDATIONS['Leaf Mold'].pesticide, spray: DISEASE_RECOMMENDATIONS['Leaf Mold'].spray },
  'Target Spot': { solution: DISEASE_RECOMMENDATIONS['Target Spot'].pesticide, spray: DISEASE_RECOMMENDATIONS['Target Spot'].spray },
  'Spider Mites': { solution: DISEASE_RECOMMENDATIONS['Spider Mites'].pesticide, spray: DISEASE_RECOMMENDATIONS['Spider Mites'].spray },
};

export const diseaseClasses: DiseaseClass[] = [
  'Healthy',
  'Early Blight',
  'Late Blight',
  'Leaf Mold',
  'Target Spot',
  'Spider Mites',
];

export const acceptedDiseaseClasses = diseaseClasses;
