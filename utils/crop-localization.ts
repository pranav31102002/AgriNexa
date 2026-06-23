import { TFunction } from 'i18next';
import { CropPlannerItem, CropScheduleItem, CropStageRange, CropTemplate, CropTemplateKey } from '@/types/crop';

function normalizeKey(value: string) {
  return value
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+(\w)/g, (_, letter: string) => letter.toUpperCase())
    .replace(/^\w/, (letter) => letter.toLowerCase());
}

export function localizeCropName(t: TFunction, crop: Pick<CropPlannerItem, 'templateKey' | 'cropName'>) {
  return t(`cropLifecycle.cropNames.${crop.templateKey}`, { defaultValue: crop.cropName });
}

export function localizeTemplateName(t: TFunction, template: Pick<CropTemplate, 'key' | 'cropName'>) {
  return t(`cropLifecycle.cropNames.${template.key}`, { defaultValue: template.cropName });
}

export function localizeTemplateKey(t: TFunction, key: CropTemplateKey, fallback: string) {
  return t(`cropLifecycle.cropNames.${key}`, { defaultValue: fallback });
}

export function localizeStageName(t: TFunction, stage: Pick<CropStageRange, 'name'>) {
  return t(`cropLifecycle.stageNames.${normalizeKey(stage.name)}`, { defaultValue: stage.name });
}

export function localizeActionTitle(t: TFunction, action: Pick<CropScheduleItem, 'title'> | null | undefined) {
  if (!action) return t('cropLifecycle.noAction');
  return t(`cropLifecycle.actionTitles.${normalizeKey(action.title)}`, { defaultValue: action.title });
}

export function localizeAlertTitle(t: TFunction, title: string) {
  return t(`cropLifecycle.actionTitles.${normalizeKey(title)}`, { defaultValue: title });
}
