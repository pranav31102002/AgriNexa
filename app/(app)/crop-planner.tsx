import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { CropPlannerFormInput, useCropPlanner } from '@/hooks/useCropPlanner';
import { computeCropState } from '@/services/crop/crop-engine';
import { getCropTemplateOptions } from '@/services/crop/template-engine';
import { CropPlannerItem, CropTemplateKey } from '@/types/crop';
import { localizeActionTitle, localizeAlertTitle, localizeCropName, localizeStageName, localizeTemplateKey, localizeTemplateName } from '@/utils/crop-localization';

function isoDateInput(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateInput(parsed);
}

function formatDateInput(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    const valid =
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day);
    return valid ? parsed : null;
  }

  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    const valid =
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day);
    return valid ? parsed : null;
  }

  return null;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function sameDay(left: Date | null, right: Date | null) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = firstDate.getDay();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leadingEmpty + 1;
    if (day < 1 || day > daysInMonth) return null;
    return new Date(year, month, day);
  });
}

function defaultForm(): CropPlannerFormInput {
  const today = formatDateInput(new Date());
  return {
    cropName: 'Tomato',
    variety: 'Hybrid Tomato',
    farmId: 'default',
    farmName: 'Main Farm',
    plantDate: today,
    expectedHarvestDate: '',
    templateKey: 'tomato',
  };
}

function TimelineDot({ active }: { active: boolean }) {
  return (
    <View className="items-center">
      <View className={`h-4 w-4 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <View className="h-8 w-[2px] bg-slate-300" />
    </View>
  );
}

function CalendarPickerModal({
  visible,
  title,
  value,
  locale,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  value: string;
  locale: string;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const selectedDate = parseDateInput(value);
  const [monthDate, setMonthDate] = useState(selectedDate ?? new Date());

  useEffect(() => {
    if (visible) setMonthDate(selectedDate ?? new Date());
  }, [selectedDate, visible]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthDate);
  const weekdays = useMemo(() => {
    const base = new Date(2026, 5, 21);
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + index))
    );
  }, [locale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50 px-4 pb-6">
        <View className="rounded-3xl bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-black text-slate-900">{title}</Text>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <MaterialCommunityIcons name="close" size={18} color="#0F172A" />
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50" onPress={() => setMonthDate((date) => addMonths(date, -1))}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#047857" />
            </Pressable>
            <Text className="text-sm font-black text-slate-800">{monthTitle}</Text>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50" onPress={() => setMonthDate((date) => addMonths(date, 1))}>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#047857" />
            </Pressable>
          </View>

          <View className="mt-4 flex-row">
            {weekdays.map((day) => (
              <Text key={day} className="flex-1 text-center text-[11px] font-black text-slate-500">
                {day}
              </Text>
            ))}
          </View>

          <View className="mt-2 flex-row flex-wrap">
            {calendarDays.map((date, index) => {
              const selected = sameDay(date, selectedDate);
              const today = sameDay(date, new Date());
              return (
                <Pressable
                  key={`${date?.toISOString() ?? 'empty'}_${index}`}
                  className="aspect-square w-[14.285%] items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: selected ? '#059669' : today ? '#D1FAE5' : 'transparent',
                  }}
                  disabled={!date}
                  onPress={() => {
                    if (!date) return;
                    onSelect(date);
                    onClose();
                  }}>
                  <Text className="text-sm font-bold" style={{ color: selected ? '#FFFFFF' : date ? '#0F172A' : 'transparent' }}>
                    {date?.getDate() ?? ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CropPlannerScreen() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const inputStyle = {
    color: isDark ? '#F8FAFC' : '#0F172A',
    borderColor: isDark ? 'rgba(148,163,184,0.35)' : '#D1D5DB',
    backgroundColor: isDark ? 'rgba(15,23,42,0.45)' : '#FFFFFF',
  };

  const { crops, summary, selectedCrop, setSelectedCropId, saveCrop, deleteCrop, saving } = useCropPlanner();
  const templates = useMemo(() => getCropTemplateOptions(), []);
  const [form, setForm] = useState<CropPlannerFormInput>(() => ({
    ...defaultForm(),
    cropName: localizeTemplateKey(t, 'tomato', 'Tomato'),
  }));
  const [editForm, setEditForm] = useState<CropPlannerFormInput | null>(null);
  const [calendarField, setCalendarField] = useState<'plantDate' | 'expectedHarvestDate' | null>(null);
  const [editCalendarField, setEditCalendarField] = useState<'plantDate' | 'expectedHarvestDate' | null>(null);

  const formTemplate = templates.find((template) => template.key === form.templateKey) ?? templates[0];
  const selectedTemplate = templates.find((template) => template.key === selectedCrop?.crop.templateKey) ?? formTemplate;
  const activeCrop = selectedCrop;
  const locale = i18n.resolvedLanguage?.startsWith('hi')
    ? 'hi-IN'
    : i18n.resolvedLanguage?.startsWith('mr')
      ? 'mr-IN'
      : 'en-IN';

  const updateForm = (patch: Partial<CropPlannerFormInput>) => setForm((current) => ({ ...current, ...patch }));
  const updateEditForm = (patch: Partial<CropPlannerFormInput>) =>
    setEditForm((current) => (current ? { ...current, ...patch } : current));

  const selectTemplate = (key: CropTemplateKey) => {
    const template = templates.find((item) => item.key === key) ?? templates[0];
    updateForm({ templateKey: key, cropName: localizeTemplateName(t, template), variety: template.defaultVarieties[0] ?? '' });
  };

  const onSubmit = async () => {
    const plantDate = parseDateInput(form.plantDate);
    const expectedHarvestDate = form.expectedHarvestDate ? parseDateInput(form.expectedHarvestDate) : null;

    if (!plantDate || (form.expectedHarvestDate && !expectedHarvestDate)) {
      Alert.alert(t('cropLifecycle.invalidDateTitle'), t('cropLifecycle.invalidDateMessage'));
      return;
    }

    await saveCrop({
      ...form,
      cropName: form.cropName.trim(),
      variety: form.variety.trim(),
      farmId: form.farmId.trim() || 'default',
      plantDate: plantDate.toISOString(),
      expectedHarvestDate: expectedHarvestDate ? expectedHarvestDate.toISOString() : '',
    });
    setForm({
      ...defaultForm(),
      cropName: localizeTemplateKey(t, 'tomato', 'Tomato'),
    });
  };

  const onEdit = (crop: CropPlannerItem) => {
    setEditForm({
      id: crop.id,
      cropName: crop.cropName,
      variety: crop.variety,
      farmId: crop.farmId,
      farmName: crop.farmName,
      plantDate: isoDateInput(crop.plantDate),
      expectedHarvestDate: isoDateInput(crop.expectedHarvestDate ?? ''),
      templateKey: crop.templateKey,
    });
  };

  const onSaveEdit = async () => {
    if (!editForm?.id) return;
    const plantDate = parseDateInput(editForm.plantDate);
    const expectedHarvestDate = editForm.expectedHarvestDate ? parseDateInput(editForm.expectedHarvestDate) : null;

    if (!plantDate || (editForm.expectedHarvestDate && !expectedHarvestDate)) {
      Alert.alert(t('cropLifecycle.invalidDateTitle'), t('cropLifecycle.invalidDateMessage'));
      return;
    }

    await saveCrop({
      ...editForm,
      cropName: editForm.cropName.trim(),
      variety: editForm.variety.trim(),
      farmId: editForm.farmId.trim() || 'default',
      plantDate: plantDate.toISOString(),
      expectedHarvestDate: expectedHarvestDate ? expectedHarvestDate.toISOString() : '',
    });
    setEditForm(null);
  };

  const onDelete = (crop: CropPlannerItem) => {
    Alert.alert(t('cropLifecycle.deleteCrop'), t('cropLifecycle.deleteCropMessage', { crop: crop.cropName }), [
      { text: t('cropLifecycle.cancel'), style: 'cancel' },
      { text: t('cropLifecycle.delete'), style: 'destructive', onPress: () => void deleteCrop(crop) },
    ]);
  };

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="overflow-hidden rounded-3xl bg-emerald-700 p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-black text-white">{t('cropLifecycle.title')}</Text>
            <Text className="mt-1 text-xs text-emerald-100">{t('cropLifecycle.subtitle')}</Text>
          </View>
          <Pressable className="rounded-xl bg-white/20 p-2" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>



      <GlassCard>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-wider" style={muted}>{t('cropLifecycle.currentCrop')}</Text>
            <Text className="mt-1 text-lg font-black" style={txt}>{selectedCrop ? localizeCropName(t, selectedCrop.crop) : t('cropLifecycle.noCropAdded')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {summary.cropStates.length ? summary.cropStates.map((state) => {
            const selected = state.crop.id === selectedCrop?.crop.id;
            return (
              <Pressable
                key={state.crop.id}
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: selected ? '#059669' : isDark ? '#1F2937' : '#E5E7EB' }}
                onPress={() => void setSelectedCropId(state.crop.id)}>
                <Text className="text-xs font-bold" style={{ color: selected ? '#FFFFFF' : txt.color }}>{localizeCropName(t, state.crop)}</Text>
              </Pressable>
            );
          }) : (
            <Text className="text-sm" style={muted}>{t('cropLifecycle.noCropAdded')}</Text>
          )}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-black" style={txt}>{selectedCrop ? localizeCropName(t, selectedCrop.crop) : t('cropLifecycle.activeCrop')}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <StatusBadge text={selectedCrop ? t('cropLifecycle.daysOld', { days: selectedCrop.ageDays }) : t('cropLifecycle.noCropAdded')} tone="info" />
          <StatusBadge text={selectedCrop ? localizeStageName(t, selectedCrop.currentStage) : t('cropLifecycle.noAction')} tone="ok" />
          <StatusBadge text={selectedCrop?.nextAction ? localizeActionTitle(t, selectedCrop.nextAction) : t('cropLifecycle.noTaskScheduled')} tone="info" />
          <StatusBadge text={selectedCrop?.nextActionDueInDays === 0 ? t('cropLifecycle.today') : t('cropLifecycle.dueInDays', { days: selectedCrop?.nextActionDueInDays ?? 0 })} tone={(selectedCrop?.nextActionDueInDays ?? 99) <= 2 ? 'warn' : 'info'} />
        </View>
        {selectedCrop?.weatherAdvice ? <Text className="mt-3 text-xs font-semibold text-amber-600">{selectedCrop.weatherAdvice}</Text> : null}
      </GlassCard>

      <View className="flex-row flex-wrap gap-3">
        <GlassCard className="min-w-[47%] flex-1">
          <Text className="text-xs uppercase tracking-wider" style={muted}>{t('cropLifecycle.activeCrops')}</Text>
          <Text className="mt-1 text-2xl font-black" style={txt}>{summary.activeCrops}</Text>
        </GlassCard>
        <GlassCard className="min-w-[47%] flex-1">
          <Text className="text-xs uppercase tracking-wider" style={muted}>{t('cropLifecycle.upcomingSprays')}</Text>
          <Text className="mt-1 text-2xl font-black" style={txt}>{summary.upcomingSprays}</Text>
        </GlassCard>
        <GlassCard className="min-w-[47%] flex-1">
          <Text className="text-xs uppercase tracking-wider" style={muted}>{t('cropLifecycle.upcomingHarvests')}</Text>
          <Text className="mt-1 text-2xl font-black" style={txt}>{summary.upcomingHarvests}</Text>
        </GlassCard>
      </View>

      <GlassCard>
        <Text className="text-base font-black" style={txt}>{t('cropLifecycle.addCrop')}</Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {templates.map((template) => (
            <Pressable
              key={template.key}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: form.templateKey === template.key ? '#059669' : isDark ? '#1F2937' : '#E5E7EB' }}
              onPress={() => selectTemplate(template.key)}>
              <Text className="text-xs font-bold" style={{ color: form.templateKey === template.key ? '#FFFFFF' : txt.color }}>
                {localizeTemplateName(t, template)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 gap-3">
          <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={form.cropName} onChangeText={(cropName) => updateForm({ cropName })} placeholder={t('cropLifecycle.cropName')} placeholderTextColor="#94A3B8" />
          <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={form.variety} onChangeText={(variety) => updateForm({ variety })} placeholder={t('cropLifecycle.cropVariety')} placeholderTextColor="#94A3B8" />
          <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={form.farmName} onChangeText={(farmName) => updateForm({ farmName })} placeholder={t('cropLifecycle.farm')} placeholderTextColor="#94A3B8" />
          <Pressable className="flex-row items-center justify-between rounded-xl border px-3 py-3" style={inputStyle} onPress={() => setCalendarField('plantDate')}>
            <Text className="text-sm" style={{ color: form.plantDate ? inputStyle.color : '#94A3B8' }}>
              {form.plantDate || t('cropLifecycle.plantDatePlaceholder')}
            </Text>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#059669" />
          </Pressable>
          <Pressable className="flex-row items-center justify-between rounded-xl border px-3 py-3" style={inputStyle} onPress={() => setCalendarField('expectedHarvestDate')}>
            <Text className="text-sm" style={{ color: form.expectedHarvestDate ? inputStyle.color : '#94A3B8' }}>
              {form.expectedHarvestDate || t('cropLifecycle.harvestDatePlaceholder')}
            </Text>
            <View className="flex-row items-center gap-2">
              {form.expectedHarvestDate ? (
                <Pressable
                  className="h-7 w-7 items-center justify-center rounded-full bg-slate-500/10"
                  onPress={(event) => {
                    event.stopPropagation();
                    updateForm({ expectedHarvestDate: '' });
                  }}>
                  <MaterialCommunityIcons name="close" size={15} color="#64748B" />
                </Pressable>
              ) : null}
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#059669" />
            </View>
          </Pressable>
          <Text className="text-[11px]" style={muted}>{t('cropLifecycle.dateHelp')}</Text>
        </View>

        <Pressable className="mt-4 flex-row items-center justify-center rounded-xl bg-emerald-600 px-4 py-3" onPress={onSubmit} disabled={saving}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
          <Text className="ml-2 text-sm font-black text-white">{saving ? t('cropLifecycle.saving') : t('cropLifecycle.addCrop')}</Text>
        </Pressable>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-black" style={txt}>{t('cropLifecycle.cropTimeline')}</Text>
        <View className="mt-4">
          {selectedTemplate.stages.map((stage) => {
            const active = activeCrop?.crop.templateKey === selectedTemplate.key && activeCrop.ageDays >= stage.startDay && activeCrop.ageDays <= stage.endDay;
            return (
              <View key={stage.name} className="flex-row items-start">
                <TimelineDot active={active} />
                <View className="ml-3 flex-1 pb-5">
                  <Text className="text-sm font-black" style={txt}>{localizeStageName(t, stage)}</Text>
                  <Text className="mt-1 text-xs" style={muted}>{t('cropLifecycle.dayRange', { start: stage.startDay, end: stage.endDay })}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-black" style={txt}>{t('cropLifecycle.upcomingTasks')}</Text>
        <View className="mt-3 gap-3">
          {summary.selectedAlerts.length ? summary.selectedAlerts.slice(0, 6).map((alert) => (
            <View key={alert.id} className="rounded-2xl border p-3" style={{ borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#E5E7EB' }}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-black" style={txt}>{localizeAlertTitle(t, alert.title)}</Text>
                <StatusBadge text={alert.priority.toUpperCase()} tone={alert.priority === 'high' ? 'error' : alert.priority === 'medium' ? 'warn' : 'info'} />
              </View>
              <Text className="mt-1 text-xs" style={muted}>
                {selectedCrop ? localizeCropName(t, selectedCrop.crop) : alert.cropName} | {alert.dueInDays === 0 ? t('cropLifecycle.dueToday') : t('cropLifecycle.dueInDays', { days: alert.dueInDays })}
              </Text>
              <Text className="mt-2 text-xs font-semibold text-emerald-600">{alert.message}</Text>
            </View>
          )) : (
            <Text className="text-sm" style={muted}>{t('cropLifecycle.noUpcomingTasks')}</Text>
          )}
        </View>
      </GlassCard>

      <GlassCard>
        <Text className="text-base font-black" style={txt}>{t('cropLifecycle.activeCropRecords')}</Text>
        <View className="mt-3 gap-3">
          {crops.length ? crops.map((crop) => {
            const state = computeCropState(crop);
            const selected = crop.id === selectedCrop?.crop.id;
            return (
              <View key={crop.id} className="rounded-2xl border p-3" style={{ borderColor: selected ? '#059669' : isDark ? 'rgba(148,163,184,0.25)' : '#E5E7EB' }}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-black" style={txt}>{localizeCropName(t, crop)}</Text>
                    <Text className="mt-1 text-xs" style={muted}>{crop.variety} | {t('cropLifecycle.daysOld', { days: state.ageDays })} | {localizeStageName(t, state.currentStage)}</Text>
                  </View>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <Pressable
                    className="flex-row items-center rounded-full bg-emerald-500/15 px-3 py-2"
                    onPress={() => void setSelectedCropId(crop.id)}>
                    <MaterialCommunityIcons name={selected ? 'check-circle-outline' : 'cursor-pointer'} size={16} color="#059669" />
                    <Text className="ml-1 text-xs font-black text-emerald-600">
                      {selected ? t('cropLifecycle.selectedCrop') : t('cropLifecycle.selectCrop')}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-row items-center rounded-full bg-sky-500/15 px-3 py-2"
                    onPress={() => onEdit(crop)}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#0284C7" />
                    <Text className="ml-1 text-xs font-black text-sky-600">{t('cropLifecycle.updateCrop')}</Text>
                  </Pressable>
                  <Pressable
                    className="flex-row items-center rounded-full bg-red-500/15 px-3 py-2"
                    onPress={() => onDelete(crop)}>
                    <MaterialCommunityIcons name="delete-outline" size={16} color="#DC2626" />
                    <Text className="ml-1 text-xs font-black text-red-600">{t('cropLifecycle.delete')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }) : (
            <Text className="text-sm" style={muted}>{t('cropLifecycle.noCropAdded')}</Text>
          )}
        </View>
      </GlassCard>

      <Modal visible={Boolean(editForm)} transparent animationType="fade" onRequestClose={() => setEditForm(null)}>
        <View className="flex-1 justify-end bg-black/50 px-4 pb-6">
          <View className="rounded-3xl p-4" style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-black" style={txt}>{t('cropLifecycle.editCrop')}</Text>
              <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-slate-500/10" onPress={() => setEditForm(null)}>
                <MaterialCommunityIcons name="close" size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
              </Pressable>
            </View>

            {editForm ? (
              <View className="mt-4 gap-3">
                <View className="flex-row flex-wrap gap-2">
                  {templates.map((template) => (
                    <Pressable
                      key={template.key}
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: editForm.templateKey === template.key ? '#059669' : isDark ? '#1F2937' : '#E5E7EB' }}
                      onPress={() => updateEditForm({ templateKey: template.key, cropName: localizeTemplateName(t, template), variety: template.defaultVarieties[0] ?? '' })}>
                      <Text className="text-xs font-bold" style={{ color: editForm.templateKey === template.key ? '#FFFFFF' : txt.color }}>
                        {localizeTemplateName(t, template)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={editForm.cropName} onChangeText={(cropName) => updateEditForm({ cropName })} placeholder={t('cropLifecycle.cropName')} placeholderTextColor="#94A3B8" />
                <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={editForm.variety} onChangeText={(variety) => updateEditForm({ variety })} placeholder={t('cropLifecycle.cropVariety')} placeholderTextColor="#94A3B8" />
                <TextInput className="rounded-xl border px-3 py-3 text-sm" style={inputStyle} value={editForm.farmName} onChangeText={(farmName) => updateEditForm({ farmName })} placeholder={t('cropLifecycle.farm')} placeholderTextColor="#94A3B8" />
                <Pressable className="flex-row items-center justify-between rounded-xl border px-3 py-3" style={inputStyle} onPress={() => setEditCalendarField('plantDate')}>
                  <Text className="text-sm" style={{ color: editForm.plantDate ? inputStyle.color : '#94A3B8' }}>
                    {editForm.plantDate || t('cropLifecycle.plantDatePlaceholder')}
                  </Text>
                  <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#059669" />
                </Pressable>
                <Pressable className="flex-row items-center justify-between rounded-xl border px-3 py-3" style={inputStyle} onPress={() => setEditCalendarField('expectedHarvestDate')}>
                  <Text className="text-sm" style={{ color: editForm.expectedHarvestDate ? inputStyle.color : '#94A3B8' }}>
                    {editForm.expectedHarvestDate || t('cropLifecycle.harvestDatePlaceholder')}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {editForm.expectedHarvestDate ? (
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full bg-slate-500/10"
                        onPress={(event) => {
                          event.stopPropagation();
                          updateEditForm({ expectedHarvestDate: '' });
                        }}>
                        <MaterialCommunityIcons name="close" size={15} color="#64748B" />
                      </Pressable>
                    ) : null}
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#059669" />
                  </View>
                </Pressable>

                <Pressable className="flex-row items-center justify-center rounded-xl bg-emerald-600 px-4 py-3" onPress={onSaveEdit} disabled={saving}>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
                  <Text className="ml-2 text-sm font-black text-white">{saving ? t('cropLifecycle.saving') : t('cropLifecycle.saveCrop')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <CalendarPickerModal
        visible={calendarField === 'plantDate'}
        title={t('cropLifecycle.selectPlantDate')}
        value={form.plantDate}
        locale={locale}
        onClose={() => setCalendarField(null)}
        onSelect={(date) => updateForm({ plantDate: formatDateInput(date) })}
      />
      <CalendarPickerModal
        visible={calendarField === 'expectedHarvestDate'}
        title={t('cropLifecycle.selectHarvestDate')}
        value={form.expectedHarvestDate ?? ''}
        locale={locale}
        onClose={() => setCalendarField(null)}
        onSelect={(date) => updateForm({ expectedHarvestDate: formatDateInput(date) })}
      />
      <CalendarPickerModal
        visible={editCalendarField === 'plantDate'}
        title={t('cropLifecycle.selectPlantDate')}
        value={editForm?.plantDate ?? ''}
        locale={locale}
        onClose={() => setEditCalendarField(null)}
        onSelect={(date) => updateEditForm({ plantDate: formatDateInput(date) })}
      />
      <CalendarPickerModal
        visible={editCalendarField === 'expectedHarvestDate'}
        title={t('cropLifecycle.selectHarvestDate')}
        value={editForm?.expectedHarvestDate ?? ''}
        locale={locale}
        onClose={() => setEditCalendarField(null)}
        onSelect={(date) => updateEditForm({ expectedHarvestDate: formatDateInput(date) })}
      />
    </ScreenContainer>
  );
}
