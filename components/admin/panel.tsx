import { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';

export const adminPalette = {
  bg: '#07110D',
  bgSecondary: '#0A1712',
  card: '#0F1D18',
  cardElevated: '#132720',
  border: 'rgba(150, 194, 173, 0.14)',
  text: '#EFFAF4',
  muted: '#93A99E',
  accent: '#1B9C5A',
  accentSoft: '#153A27',
  info: '#38BDF8',
  warning: '#F59E0B',
  danger: '#F87171',
};

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-[28px] border p-4 ${className}`}
      style={{
        borderColor: adminPalette.border,
        backgroundColor: adminPalette.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
        elevation: 7,
      }}>
      {children}
    </View>
  );
}

export function StatusBadge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'error' | 'info' }) {
  const map = {
    ok: { bg: '#143524', fg: '#53D48B' },
    warn: { bg: '#3C2A10', fg: '#F6B84A' },
    error: { bg: '#3A171A', fg: '#F78A8A' },
    info: { bg: '#102D38', fg: '#6DD3FF' },
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
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[22px] font-black tracking-[0.2px]" style={{ color: adminPalette.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm leading-5" style={{ color: adminPalette.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onPress ? (
        <Pressable className="rounded-full px-4 py-2" style={{ backgroundColor: adminPalette.cardElevated }} onPress={onPress}>
          <Text className="text-xs font-bold" style={{ color: adminPalette.text }}>
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
  tone = adminPalette.accent,
  helper,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: string;
  helper?: string;
}) {
  return (
    <GlassCard className="w-[48.5%]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: adminPalette.muted }}>
            {label}
          </Text>
          <Text className="mt-2 text-[26px] font-black" style={{ color: adminPalette.text }}>
            {value}
          </Text>
          {helper ? (
            <Text className="mt-1 text-[11px] leading-4" style={{ color: adminPalette.muted }}>
              {helper}
            </Text>
          ) : null}
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tone}22` }}>
          <MaterialCommunityIcons name={icon} size={20} color={tone} />
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
  return (
    <Pressable
      className="rounded-full border px-3 py-2"
      style={{
        backgroundColor: active ? adminPalette.accent : adminPalette.cardElevated,
        borderColor: active ? adminPalette.accent : adminPalette.border,
      }}
      onPress={onPress}>
      <Text className="text-xs font-extrabold tracking-[0.6px]" style={{ color: active ? '#FFFFFF' : adminPalette.muted }}>
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
  return (
    <View className="flex-row items-center rounded-[22px] border px-4 py-3" style={{ borderColor: adminPalette.border, backgroundColor: adminPalette.bgSecondary }}>
      <MaterialCommunityIcons name="magnify" size={18} color={adminPalette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={adminPalette.muted}
        className="ml-3 flex-1"
        style={{ color: adminPalette.text }}
      />
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <GlassCard>
      <View className="rounded-[22px] border p-4" style={{ borderColor: adminPalette.border, backgroundColor: adminPalette.bgSecondary }}>
        <Text className="text-base font-bold" style={{ color: adminPalette.text }}>
          {title}
        </Text>
        <Text className="mt-2 text-sm leading-5" style={{ color: adminPalette.muted }}>
          {subtitle}
        </Text>
      </View>
    </GlassCard>
  );
}

export function MiniTrend({
  points,
  color = adminPalette.accent,
}: {
  points: { label: string; value: number }[];
  color?: string;
}) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 96, 220);
  const data = points.length ? points.map((point) => ({ value: point.value, label: point.label })) : [{ value: 0, label: '' }];

  return (
    <View className="mt-3">
      <LineChart
        data={data}
        width={chartWidth}
        height={120}
        areaChart
        curved
        color={color}
        startFillColor={color}
        endFillColor={color}
        startOpacity={0.22}
        endOpacity={0.02}
        hideDataPoints={false}
        dataPointsColor={color}
        dataPointsRadius={4}
        thickness={3}
        yAxisThickness={0}
        xAxisThickness={0}
        hideRules
        spacing={Math.max(Math.floor(chartWidth / Math.max(points.length, 2)), 26)}
        initialSpacing={6}
        endSpacing={6}
        xAxisLabelTextStyle={{ color: adminPalette.muted, fontSize: 10 }}
        yAxisTextStyle={{ color: adminPalette.muted, fontSize: 10 }}
        noOfSections={4}
        maxValue={Math.max(...points.map((point) => point.value), 1)}
        backgroundColor="transparent"
      />
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: adminPalette.muted }}>
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-semibold" style={{ color: adminPalette.text }}>
        {value}
      </Text>
    </View>
  );
}

export function InlineStatBadges({ children }: { children: ReactNode }) {
  return <View className="mt-3 flex-row flex-wrap gap-2">{children}</View>;
}

export function InfoTile({ label, value, tone = adminPalette.text }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-1 rounded-[22px] border p-3" style={{ borderColor: adminPalette.border, backgroundColor: adminPalette.bgSecondary }}>
      <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: adminPalette.muted }}>
        {label}
      </Text>
      <Text className="mt-2 text-lg font-black" style={{ color: tone }}>
        {value}
      </Text>
    </View>
  );
}
