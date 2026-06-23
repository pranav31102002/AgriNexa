import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { useAppTheme } from '@/hooks/use-app-theme';
import { CropComputedState } from '@/types/crop';
import { localizeCropName, localizeStageName } from '@/utils/crop-localization';

type ActiveCropCardProps = {
  cropState?: CropComputedState | null;
  cropStates?: CropComputedState[];
};

export function ActiveCropCard({ cropState, cropStates }: ActiveCropCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };
  const states = cropStates?.length ? cropStates : cropState ? [cropState] : [];
  const visibleStates = states.slice(0, 3);

  return (
    <GlassCard>
      <Pressable onPress={() => router.push('/(app)/crop-planner' as never)}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs uppercase tracking-wider text-slate-500" style={muted}>
              {t('cropLifecycle.activeCrops')}
            </Text>
            <Text className="mt-1 text-2xl font-black text-slate-800" style={txt}>
              {states.length ? `${states.length}` : t('cropLifecycle.addCrop')}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-emerald-600">
              {states.length ? t('cropLifecycle.farmSummary') : t('cropLifecycle.startTracking')}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
            <MaterialCommunityIcons name="sprout" size={24} color={isDark ? '#6EE7B7' : '#047857'} />
          </View>
        </View>

        {visibleStates.length ? (
          <View className="mt-4 gap-2">
            {visibleStates.map((state) => (
              <View key={state.crop.id} className="flex-row items-center justify-between rounded-2xl border px-3 py-2" style={{ borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#E5E7EB' }}>
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-black" style={txt}>{localizeCropName(t, state.crop)}</Text>
                  <Text className="mt-0.5 text-xs" style={muted}>{t('cropLifecycle.daysOld', { days: state.ageDays })} | {localizeStageName(t, state.currentStage)}</Text>
                </View>
                <StatusBadge text={state.nextActionDueInDays === 0 ? t('cropLifecycle.today') : t('cropLifecycle.dayCount', { count: state.nextActionDueInDays ?? 0 })} tone={(state.nextActionDueInDays ?? 99) <= 2 ? 'warn' : 'info'} />
              </View>
            ))}
            <Text className="text-xs font-black text-emerald-600">{t('cropLifecycle.viewAll')}</Text>
          </View>
        ) : (
          <Text className="mt-2 text-xs text-slate-500" style={muted}>{t('cropLifecycle.emptyCardHint')}</Text>
        )}
      </Pressable>
    </GlassCard>
  );
}
