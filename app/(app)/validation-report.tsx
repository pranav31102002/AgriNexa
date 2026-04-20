import { BarChart } from 'react-native-gifted-charts';
import { Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { validationReportData } from '@/constants/validation-report-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ValidationReportScreen() {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };

  const chartData = validationReportData.metrics.map((m) => ({
    value: m.value,
    label: m.label.replace(' Accuracy', '').replace(' Performance', ''),
    frontColor: m.value >= 90 ? '#16a34a' : m.value >= 80 ? '#0ea5e9' : '#f59e0b',
  }));

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <View className="flex-row items-center gap-2">
        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200/70'}`}
          onPress={() => router.replace('/(app)/settings' as never)}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={isDark ? '#F8FAFC' : '#0f172a'} />
        </Pressable>
        <Text className="text-lg font-bold" style={txt}>Validation Report</Text>
      </View>

      <GlassCard>
        <Text className="text-xl font-black" style={txt}>Field Validation Report</Text>
        <Text className="mt-1 text-xs text-slate-500">Static validation evidence for external viva and demo confidence.</Text>
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold" style={txt}>Performance Matrix (%)</Text>
        <BarChart
          data={chartData}
          roundedTop
          noOfSections={5}
          barBorderRadius={6}
          xAxisLabelTextStyle={{ color: isDark ? '#F8FAFC' : '#334155', fontSize: 10 }}
          yAxisTextStyle={{ color: isDark ? '#F8FAFC' : '#334155', fontSize: 10 }}
          xAxisColor={isDark ? '#E2E8F0' : '#CBD5E1'}
          yAxisColor={isDark ? '#E2E8F0' : '#CBD5E1'}
          rulesColor={isDark ? 'rgba(248,250,252,0.35)' : '#D1D5DB'}
        />
      </GlassCard>

      <GlassCard>
        <Text className="mb-2 text-base font-bold" style={txt}>Validation Notes</Text>
        <View className="gap-2">
          {validationReportData.notes.map((note, index) => (
            <View key={`${note}_${index}`} className="rounded-xl bg-slate-100 p-2">
              <Text className="text-xs text-slate-700">{index + 1}. {note}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
