import { Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { demoCases } from '@/constants/demo-cases';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function DemoCasesScreen() {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="flex-row items-center gap-2">
        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200/70'}`}
          onPress={() => router.replace('/(app)/settings' as never)}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={isDark ? '#F8FAFC' : '#0f172a'} />
        </Pressable>
        <Text className="text-lg font-bold" style={txt}>Demo Cases</Text>
      </View>

      <GlassCard>
        <Text className="text-xl font-black" style={txt}>Real Farm Demo Scenarios</Text>
        <Text className="mt-1 text-xs text-slate-500">Predefined practical scenarios for viva/demo walkthrough.</Text>
      </GlassCard>

      <View className="gap-2">
        {demoCases.map((item, index) => (
          <GlassCard key={item.title}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold" style={txt}>{index + 1}. {item.title}</Text>
                <Text className="mt-1 text-xs text-slate-500">{item.summary}</Text>
              </View>
              <StatusBadge text={item.status} tone="ok" />
            </View>
          </GlassCard>
        ))}
      </View>
    </ScreenContainer>
  );
}
