import { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAdminTheme } from '@/hooks/use-admin-theme';

export { useAdminTheme };

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { palette, surfaceShadow } = useAdminTheme();

  return (
    <View
      className={`rounded-[28px] border p-4 ${className}`}
      style={{
        borderColor: palette.border,
        backgroundColor: palette.card,
        shadowColor: surfaceShadow,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 7,
      }}>
      {children}
    </View>
  );
}

export function StatusBadge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'error' | 'info' }) {
  const { palette, isDark } = useAdminTheme();
  const map = {
    ok: { bg: palette.successSoft, fg: isDark ? '#53D48B' : '#15663E' },
    warn: { bg: palette.warningSoft, fg: isDark ? '#F6B84A' : '#9A6500' },
    error: { bg: palette.dangerSoft, fg: isDark ? '#F78A8A' : '#B64D57' },
    info: { bg: palette.infoSoft, fg: isDark ? '#6DD3FF' : '#1F7AB8' },
  } as const;

  return (
    <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: map[tone].bg }}>
      <Text className="text-[10px] font-extrabold tracking-[0.8px]" style={{ color: map[tone].fg }}>
        {text}
      </Text>
    </View>
  );
}

export function AdminSectionHeader({
  title,
  subtitle,
  actionLabel,
  onPress,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const { palette } = useAdminTheme();

  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[22px] font-black tracking-[0.2px]" style={{ color: palette.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm leading-5" style={{ color: palette.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onPress ? (
        <Pressable className="rounded-full px-4 py-2" style={{ backgroundColor: palette.cardElevated }} onPress={onPress}>
          <Text className="text-xs font-bold" style={{ color: palette.text }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminMetricCard({
  label,
  value,
  icon,
  tone,
  helper,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: string;
  helper?: string;
}) {
  const { palette } = useAdminTheme();
  const resolvedTone = tone ?? palette.accent;

  return (
    <GlassCard className="w-[48.5%]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: palette.muted }}>
            {label}
          </Text>
          <Text className="mt-2 text-[26px] font-black" style={{ color: palette.text }}>
            {value}
          </Text>
          {helper ? (
            <Text className="mt-1 text-[11px] leading-4" style={{ color: palette.muted }}>
              {helper}
            </Text>
          ) : null}
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${resolvedTone}22` }}>
          <MaterialCommunityIcons name={icon} size={20} color={resolvedTone} />
        </View>
      </View>
    </GlassCard>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { palette } = useAdminTheme();

  return (
    <Pressable
      className="rounded-full border px-3 py-2"
      style={{
        backgroundColor: active ? palette.accent : palette.cardElevated,
        borderColor: active ? palette.accent : palette.border,
      }}
      onPress={onPress}>
      <Text className="text-xs font-extrabold tracking-[0.6px]" style={{ color: active ? '#FFFFFF' : palette.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminSearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { palette } = useAdminTheme();

  return (
    <View className="flex-row items-center rounded-[22px] border px-4 py-3" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
      <MaterialCommunityIcons name="magnify" size={18} color={palette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        className="ml-3 flex-1"
        style={{ color: palette.text }}
      />
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  const { palette } = useAdminTheme();

  return (
    <GlassCard>
      <View className="rounded-[22px] border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
        <Text className="text-base font-bold" style={{ color: palette.text }}>
          {title}
        </Text>
        <Text className="mt-2 text-sm leading-5" style={{ color: palette.muted }}>
          {subtitle}
        </Text>
      </View>
    </GlassCard>
  );
}

export function MiniTrend({
  points,
  color,
}: {
  points: { label: string; value: number }[];
  color?: string;
}) {
  const { palette } = useAdminTheme();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 96, 220);
  const data = points.length ? points.map((point) => ({ value: point.value, label: point.label })) : [{ value: 0, label: '' }];
  const resolvedColor = color ?? palette.accent;

  return (
    <View className="mt-3">
      <LineChart
        data={data}
        width={chartWidth}
        height={120}
        areaChart
        curved
        color={resolvedColor}
        startFillColor={resolvedColor}
        endFillColor={resolvedColor}
        startOpacity={0.22}
        endOpacity={0.02}
        hideDataPoints={false}
        dataPointsColor={resolvedColor}
        dataPointsRadius={4}
        thickness={3}
        yAxisThickness={0}
        xAxisThickness={0}
        hideRules
        spacing={Math.max(Math.floor(chartWidth / Math.max(points.length, 2)), 26)}
        initialSpacing={6}
        endSpacing={6}
        xAxisLabelTextStyle={{ color: palette.muted, fontSize: 10 }}
        yAxisTextStyle={{ color: palette.muted, fontSize: 10 }}
        noOfSections={4}
        maxValue={Math.max(...points.map((point) => point.value), 1)}
        backgroundColor="transparent"
      />
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  const { palette } = useAdminTheme();

  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: palette.muted }}>
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-semibold" style={{ color: palette.text }}>
        {value}
      </Text>
    </View>
  );
}

export function InlineStatBadges({ children }: { children: ReactNode }) {
  return <View className="mt-3 flex-row flex-wrap gap-2">{children}</View>;
}

export function InfoTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { palette } = useAdminTheme();

  return (
    <View className="flex-1 rounded-[22px] border p-3" style={{ borderColor: palette.border, backgroundColor: palette.bgSecondary }}>
      <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: palette.muted }}>
        {label}
      </Text>
      <Text className="mt-2 text-lg font-black" style={{ color: tone ?? palette.text }}>
        {value}
      </Text>
    </View>
  );
}
