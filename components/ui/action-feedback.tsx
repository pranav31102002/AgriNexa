import { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';

export type FeedbackVariant = 'success' | 'info' | 'warning';

type ActionFeedbackProps = {
  title: string;
  subtitle: string;
  variant?: FeedbackVariant;
  durationMs?: number;
  onHide?: () => void;
};

const variantIcons: Record<FeedbackVariant, string> = {
  success: 'check-circle-outline',
  info: 'information-outline',
  warning: 'alert-circle-outline',
};

const lightColors: Record<FeedbackVariant, { bg: string; border: string; icon: string; title: string; subtitle: string }> = {
  success: { bg: '#ECFDF3', border: '#22C55E', icon: '#16A34A', title: '#0F172A', subtitle: '#475569' },
  info: { bg: '#EFF6FF', border: '#38BDF8', icon: '#0284C7', title: '#0F172A', subtitle: '#475569' },
  warning: { bg: '#FFF7ED', border: '#F59E0B', icon: '#B45309', title: '#0F172A', subtitle: '#7C2D12' },
};

const darkColors: Record<FeedbackVariant, { bg: string; border: string; icon: string; title: string; subtitle: string }> = {
  success: { bg: '#10281D', border: '#22C55E', icon: '#4ADE80', title: '#F8FAFC', subtitle: '#CBD5E1' },
  info: { bg: '#0B1C2D', border: '#38BDF8', icon: '#7DD3FC', title: '#F8FAFC', subtitle: '#CBD5E1' },
  warning: { bg: '#2A1C0B', border: '#F59E0B', icon: '#FBBF24', title: '#F8FAFC', subtitle: '#CBD5E1' },
};

export function ActionFeedback({
  title,
  subtitle,
  variant = 'success',
  durationMs = 2500,
  onHide,
}: ActionFeedbackProps) {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const colors = useMemo(() => (isDark ? darkColors[variant] : lightColors[variant]), [isDark, variant]);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) onHide?.();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onHide, opacity, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        opacity,
        transform: [{ translateY }],
      }}>
      <View
        style={{
          borderRadius: 18,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: 1,
          paddingVertical: 12,
          paddingHorizontal: 14,
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              height: 38,
              width: 38,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
            }}>
            <MaterialCommunityIcons name={variantIcons[variant] as any} size={22} color={colors.icon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.title }}>{title}</Text>
            <Text style={{ fontSize: 12, color: colors.subtitle, marginTop: 2 }}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
