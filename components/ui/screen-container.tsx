import { ReactElement, ReactNode } from 'react';
import { RefreshControlProps, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  backgroundColor: string;
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  centerContent?: boolean;
};

export function ScreenContainer({ backgroundColor, children, refreshControl, centerContent = false }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor }}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 28, 36),
          flexGrow: centerContent ? 1 : undefined,
          justifyContent: centerContent ? 'center' : undefined,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-4">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
