import { useAuthStore } from '@/store/use-auth-store';

const ADMIN_HOME = '/(app)/admin' as const;
const FARMER_HOME = '/(app)/dashboard' as const;

export function useRoleRouting() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);

  const isAuthenticated = Boolean(user);
  const isAdmin = role === 'admin';
  const isFarmer = role === 'farmer';
  const isViewer = role === 'viewer';
  const sessionResolved = initialized && !loading;

  const getPostLoginRoute = () => (isAdmin ? ADMIN_HOME : FARMER_HOME);
  const canAccessAdminRoute = () => sessionResolved && isAuthenticated && isAdmin;
  const canAccessFarmerTabs = () => sessionResolved && isAuthenticated && (isFarmer || isViewer);
  const isReadOnlyViewer = () => isViewer;

  return {
    role,
    isAuthenticated,
    isAdmin,
    isFarmer,
    isViewer,
    sessionResolved,
    getPostLoginRoute,
    canAccessAdminRoute,
    canAccessFarmerTabs,
    isReadOnlyViewer,
  };
}
