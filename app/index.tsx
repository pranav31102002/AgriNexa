import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthStore } from '@/store/use-auth-store';
import { useRoleRouting } from '@/hooks/useRoleRouting';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const { getPostLoginRoute } = useRoleRouting();

  if (!initialized || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0f766e" />
        <Text className="mt-2 text-sm text-slate-600">Restoring session...</Text>
      </View>
    );
  }

  if (user) return <Redirect href={getPostLoginRoute() as never} />;
  return <Redirect href={'/(auth)/login' as never} />;
}
