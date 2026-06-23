import { CropTemplate, CropTemplateKey } from '@/types/crop';

const buildSchedules = {
  spray: (days: number[]) =>
    days.map((day) => ({
      day,
      title: day >= 90 ? 'Harvest Preparation Alert' : 'Preventive Spray Alert',
      type: 'spray' as const,
      description: 'Review crop condition and spray only when weather is safe.',
    })),
  fertilizer: (days: number[]) =>
    days.map((day) => ({
      day,
      title: 'Fertilizer Alert',
      type: 'fertilizer' as const,
      description: 'Apply recommended fertilizer dose based on soil and crop condition.',
    })),
  harvest: (days: number[]) =>
    days.map((day) => ({
      day,
      title: day >= 100 ? 'Harvest Preparation Alert' : 'Harvest Readiness Check',
      type: 'harvest' as const,
      description: 'Prepare labour, crates, and market planning for harvest.',
    })),
};

export const cropTemplates: Record<CropTemplateKey, CropTemplate> = {
  tomato: {
    key: 'tomato',
    cropName: 'Tomato',
    defaultVarieties: ['Hybrid Tomato', 'Roma', 'Cherry Tomato'],
    stages: [
      { name: 'Seedling Stage', startDay: 0, endDay: 15 },
      { name: 'Vegetative Stage', startDay: 16, endDay: 30 },
      { name: 'Flowering Stage', startDay: 31, endDay: 50 },
      { name: 'Fruit Development', startDay: 51, endDay: 80 },
      { name: 'Harvest Ready', startDay: 81, endDay: 110 },
    ],
    spraySchedule: buildSchedules.spray([25]),
    fertilizerSchedule: buildSchedules.fertilizer([30]),
    harvestSchedule: [
      { day: 45, title: 'Flowering Alert', type: 'flowering', description: 'Monitor flowering and avoid stress.' },
      { day: 70, title: 'Fruit Development Alert', type: 'fruiting', description: 'Support fruit growth with balanced water and nutrition.' },
      ...buildSchedules.harvest([100]),
    ],
  },
  onion: {
    key: 'onion',
    cropName: 'Onion',
    defaultVarieties: ['Red Onion', 'White Onion'],
    stages: [
      { name: 'Nursery Stage', startDay: 0, endDay: 30 },
      { name: 'Vegetative Stage', startDay: 31, endDay: 60 },
      { name: 'Bulb Initiation', startDay: 61, endDay: 90 },
      { name: 'Bulb Development', startDay: 91, endDay: 120 },
      { name: 'Harvest Ready', startDay: 121, endDay: 150 },
    ],
    spraySchedule: buildSchedules.spray([35, 70, 105]),
    fertilizerSchedule: buildSchedules.fertilizer([30, 60, 90]),
    harvestSchedule: buildSchedules.harvest([135]),
  },
  rice: {
    key: 'rice',
    cropName: 'Rice',
    defaultVarieties: ['Basmati', 'Sona Masuri', 'IR64'],
    stages: [
      { name: 'Nursery Stage', startDay: 0, endDay: 25 },
      { name: 'Tillering Stage', startDay: 26, endDay: 55 },
      { name: 'Panicle Initiation', startDay: 56, endDay: 80 },
      { name: 'Grain Filling', startDay: 81, endDay: 110 },
      { name: 'Harvest Ready', startDay: 111, endDay: 135 },
    ],
    spraySchedule: buildSchedules.spray([40, 75]),
    fertilizerSchedule: buildSchedules.fertilizer([25, 50, 75]),
    harvestSchedule: buildSchedules.harvest([120]),
  },
  wheat: {
    key: 'wheat',
    cropName: 'Wheat',
    defaultVarieties: ['HD 2967', 'Lokwan'],
    stages: [
      { name: 'Germination', startDay: 0, endDay: 15 },
      { name: 'Tillering', startDay: 16, endDay: 45 },
      { name: 'Booting', startDay: 46, endDay: 70 },
      { name: 'Grain Filling', startDay: 71, endDay: 105 },
      { name: 'Harvest Ready', startDay: 106, endDay: 125 },
    ],
    spraySchedule: buildSchedules.spray([35, 65]),
    fertilizerSchedule: buildSchedules.fertilizer([20, 45]),
    harvestSchedule: buildSchedules.harvest([115]),
  },
  sugarcane: {
    key: 'sugarcane',
    cropName: 'Sugarcane',
    defaultVarieties: ['Co 86032', 'CoM 0265'],
    stages: [
      { name: 'Germination', startDay: 0, endDay: 45 },
      { name: 'Tillering', startDay: 46, endDay: 120 },
      { name: 'Grand Growth', startDay: 121, endDay: 270 },
      { name: 'Maturity', startDay: 271, endDay: 360 },
      { name: 'Harvest Ready', startDay: 361, endDay: 420 },
    ],
    spraySchedule: buildSchedules.spray([60, 120, 210]),
    fertilizerSchedule: buildSchedules.fertilizer([45, 90, 150]),
    harvestSchedule: buildSchedules.harvest([390]),
  },
  cotton: {
    key: 'cotton',
    cropName: 'Cotton',
    defaultVarieties: ['Bt Cotton', 'Desi Cotton'],
    stages: [
      { name: 'Seedling Stage', startDay: 0, endDay: 20 },
      { name: 'Vegetative Stage', startDay: 21, endDay: 45 },
      { name: 'Square Formation', startDay: 46, endDay: 70 },
      { name: 'Flowering and Boll', startDay: 71, endDay: 125 },
      { name: 'Picking Ready', startDay: 126, endDay: 170 },
    ],
    spraySchedule: buildSchedules.spray([35, 65, 95]),
    fertilizerSchedule: buildSchedules.fertilizer([30, 60]),
    harvestSchedule: buildSchedules.harvest([140]),
  },
  soybean: {
    key: 'soybean',
    cropName: 'Soybean',
    defaultVarieties: ['JS 335', 'MAUS 71'],
    stages: [
      { name: 'Germination', startDay: 0, endDay: 10 },
      { name: 'Vegetative Stage', startDay: 11, endDay: 35 },
      { name: 'Flowering Stage', startDay: 36, endDay: 55 },
      { name: 'Pod Filling', startDay: 56, endDay: 85 },
      { name: 'Harvest Ready', startDay: 86, endDay: 105 },
    ],
    spraySchedule: buildSchedules.spray([30, 55]),
    fertilizerSchedule: buildSchedules.fertilizer([20, 40]),
    harvestSchedule: buildSchedules.harvest([95]),
  },
  chilli: {
    key: 'chilli',
    cropName: 'Chilli',
    defaultVarieties: ['Green Chilli', 'Byadgi'],
    stages: [
      { name: 'Seedling Stage', startDay: 0, endDay: 30 },
      { name: 'Vegetative Stage', startDay: 31, endDay: 60 },
      { name: 'Flowering Stage', startDay: 61, endDay: 85 },
      { name: 'Fruit Development', startDay: 86, endDay: 130 },
      { name: 'Harvest Ready', startDay: 131, endDay: 170 },
    ],
    spraySchedule: buildSchedules.spray([40, 70, 105]),
    fertilizerSchedule: buildSchedules.fertilizer([35, 65, 95]),
    harvestSchedule: buildSchedules.harvest([145]),
  },
  brinjal: {
    key: 'brinjal',
    cropName: 'Brinjal',
    defaultVarieties: ['Purple Brinjal', 'Green Brinjal'],
    stages: [
      { name: 'Seedling Stage', startDay: 0, endDay: 30 },
      { name: 'Vegetative Stage', startDay: 31, endDay: 55 },
      { name: 'Flowering Stage', startDay: 56, endDay: 80 },
      { name: 'Fruit Development', startDay: 81, endDay: 120 },
      { name: 'Harvest Ready', startDay: 121, endDay: 160 },
    ],
    spraySchedule: buildSchedules.spray([35, 65, 95]),
    fertilizerSchedule: buildSchedules.fertilizer([30, 60, 90]),
    harvestSchedule: buildSchedules.harvest([135]),
  },
};

export function getCropTemplate(key: string | undefined) {
  return cropTemplates[(key as CropTemplateKey) || 'tomato'] ?? cropTemplates.tomato;
}

export function getCropTemplateOptions() {
  return Object.values(cropTemplates);
}
