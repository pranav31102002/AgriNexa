import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { palette, shadow } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';

  return (
    <View
      className={`rounded-2xl p-4 ${className}`}
      style={{
        borderWidth: 1,
        borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.45)',
        backgroundColor: isDark ? 'rgba(26,35,33,0.94)' : 'rgba(255,255,255,0.9)',
        ...shadow,
      }}>
      {children}
    </View>
  );
}

export function StatusBadge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'error' | 'info' }) {
  const map = {
    ok: palette.success,
    warn: palette.warning,
    error: palette.danger,
    info: palette.info,
  } as const;

  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: map[tone] }}>
      <Text className="text-xs font-bold text-white">{text}</Text>
    </View>
  );
}
