import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/cards';
import { useAppTheme } from '@/hooks/use-app-theme';

type Props = {
  message: string;
  hint: string;
  onRemoveImage: () => void;
  autoDismissMs?: number;
};

export function ValidationAlertCard({ message, hint, onRemoveImage, autoDismissMs = 4000 }: Props) {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onRemoveImage();
      });
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onRemoveImage, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <GlassCard className="border border-red-400/80 py-3">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1 flex-row items-start">
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#EF4444" />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-black text-red-500">{message}</Text>
              <Text className="mt-1 text-xs text-slate-600" style={{ color: isDark ? '#CBD5E1' : '#64748B' }}>
                {hint}
              </Text>
            </View>
          </View>

          <Pressable className="rounded-full bg-slate-700/85 p-1.5" onPress={onRemoveImage}>
            <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
}
