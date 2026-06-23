export type CropTemplateKey =
  | 'tomato'
  | 'onion'
  | 'rice'
  | 'wheat'
  | 'sugarcane'
  | 'cotton'
  | 'soybean'
  | 'chilli'
  | 'brinjal';

export type CropAlertType = 'spray' | 'fertilizer' | 'flowering' | 'fruiting' | 'harvest' | 'disease-risk';
export type CropAlertPriority = 'low' | 'medium' | 'high';
export type CropStatus = 'active' | 'completed' | 'paused';

export type CropStageRange = {
  name: string;
  startDay: number;
  endDay: number;
};

export type CropScheduleItem = {
  day: number;
  title: string;
  type: CropAlertType;
  description: string;
};

export type CropTemplate = {
  key: CropTemplateKey;
  cropName: string;
  defaultVarieties: string[];
  stages: CropStageRange[];
  spraySchedule: CropScheduleItem[];
  fertilizerSchedule: CropScheduleItem[];
  harvestSchedule: CropScheduleItem[];
};

export type CropPlannerItem = {
  id: string;
  cropName: string;
  variety: string;
  farmId: string;
  farmName?: string;
  plantDate: string;
  expectedHarvestDate?: string;
  templateKey: CropTemplateKey;
  status: CropStatus;
  createdAt: number;
  updatedAt: number;
};

export type CropComputedState = {
  crop: CropPlannerItem;
  ageDays: number;
  currentStage: CropStageRange;
  daysRemaining: number;
  nextAction: CropScheduleItem | null;
  nextActionDueInDays: number | null;
  harvestDueInDays: number | null;
  diseaseRiskScore: number;
  diseaseRiskReason?: string;
  weatherAdvice?: string;
};

export type CropAlert = {
  id: string;
  cropId: string;
  cropName: string;
  title: string;
  type: CropAlertType;
  dueDate: string;
  dueInDays: number;
  completed: boolean;
  priority: CropAlertPriority;
  message: string;
  createdAt: number;
};

export type CropPlannerSummary = {
  activeCrops: number;
  upcomingSprays: number;
  upcomingHarvests: number;
  diseaseRiskCrops: number;
  upcomingAlerts: CropAlert[];
  selectedAlerts: CropAlert[];
  cropStates: CropComputedState[];
  selectedCropId: string | null;
  selectedCrop: CropComputedState | null;
  activeCrop: CropComputedState | null;
};

