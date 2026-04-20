import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/use-auth-store';
import { useRoleRouting } from '@/hooks/useRoleRouting';

export default function AuthLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const { getPostLoginRoute } = useRoleRouting();

  if (!initialized || loading) return null;
  if (user) return <Redirect href={getPostLoginRoute() as never} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
