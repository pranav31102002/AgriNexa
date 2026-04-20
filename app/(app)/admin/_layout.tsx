import { useRoleRouting } from '@/hooks/useRoleRouting';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/use-auth-store';

export default function AdminLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const { canAccessAdminRoute } = useRoleRouting();

  if (!initialized || loading) return null;
  if (!user) return <Redirect href={'/(auth)/login' as never} />;
  if (!canAccessAdminRoute()) {
    return <Redirect href={'/(app)/dashboard' as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
