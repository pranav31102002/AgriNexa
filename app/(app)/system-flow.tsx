import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const flow = [
  { icon: 'access-point', title: 'Sensors', subtitle: 'Temp, Humidity, Soil, Tank' },
  { icon: 'database', title: 'Firebase', subtitle: 'Realtime sync + history logs' },
  { icon: 'cellphone', title: 'Expo App', subtitle: 'Dashboard + control + offline cache' },
  { icon: 'leaf-circle', title: 'Roboflow AI', subtitle: 'Tomato disease prediction' },
  { icon: 'water-pump', title: 'Pump Relay', subtitle: 'Water and spray actuation' },
] as const;

export default function SystemFlowScreen() {
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
        <Text className="text-lg font-bold" style={txt}>System Flow</Text>
      </View>

      <GlassCard>
        <Text className="text-xl font-black" style={txt}>System Flow Architecture</Text>
        <Text className="mt-1 text-xs text-slate-500">Sensors {'->'} Firebase {'->'} Expo App {'->'} Roboflow {'->'} Pump</Text>
      </GlassCard>

      <View className="gap-2">
        {flow.map((item, index) => (
          <GlassCard key={item.title}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="rounded-xl bg-emerald-100 p-2">
                  <MaterialCommunityIcons name={item.icon as any} size={22} color="#065f46" />
                </View>
                <View>
                  <Text className="text-sm font-bold" style={txt}>{item.title}</Text>
                  <Text className="text-xs text-slate-500">{item.subtitle}</Text>
                </View>
              </View>
              {index < flow.length - 1 ? <MaterialCommunityIcons name="arrow-down" size={20} color="#64748b" /> : null}
            </View>
          </GlassCard>
        ))}
      </View>
    </ScreenContainer>
  );
}
