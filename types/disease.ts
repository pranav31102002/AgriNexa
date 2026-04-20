export type DiseaseClass =
  | 'Healthy'
  | 'Early Blight'
  | 'Late Blight'
  | 'Leaf Mold'
  | 'Target Spot'
  | 'Spider Mites';

export type DiseaseRecommendation = {
  pesticide: string;
  why: string;
  organicAlternative: string;
  dosage: string;
  harvestInterval: string;
  frequency: string;
  severityNote: string;
  spray: boolean;
};
