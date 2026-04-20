import { useEffect, useRef } from 'react';
import { logout, watchAuth } from '@/services/auth';
import { useAuthStore } from '@/store/use-auth-store';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAppStore } from '@/store/use-app-store';
import { normalizeUserRole } from '@/types/userRole';

export function useAuthSession() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const initialized = useAuthStore((state) => state.initialized);
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthProfile = useAuthStore((state) => state.setProfile);
  const setAuthRole = useAuthStore((state) => state.setRole);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setProfile = useAppStore((state) => state.setProfile);
  const setRole = useAppStore((state) => state.setRole);
  const startupLogoutDone = useRef(false);

  useEffect(() => {
    if (startupLogoutDone.current) return;
    startupLogoutDone.current = true;

    let cancelled = false;
    let unsub = () => {};
    setLoading(true);

    void (async () => {
      try {
        // Force a fresh credential entry on every cold app open instead of restoring a persisted Firebase session.
        await logout();
      } catch {
        // If there is no active session to clear, continue into the normal auth listener flow.
      }

      if (cancelled) return;

      unsub = watchAuth((nextUser) => {
        const safeUser = nextUser && !nextUser.isAnonymous ? nextUser : null;
        setUser(safeUser);

        if (!safeUser?.uid) {
          setAuthProfile(null);
          setAuthRole('farmer');
          setRole('farmer');
          setProfile({ name: '', email: '', phone: '', farmName: '', location: '', role: 'farmer' });
          setInitialized(true);
          setLoading(false);
          return;
        }

        void (async () => {
          try {
            const profile = await getRealtimeOnce<any>(`${firebasePaths.userProfiles}/${safeUser.uid}`);
            const role = normalizeUserRole(profile?.role);
            const mergedProfile = {
              name: profile?.name ?? safeUser.displayName ?? '',
              email: profile?.email ?? safeUser.email ?? '',
              phone: profile?.phone ?? '',
              farmName: profile?.farmName ?? '',
              location: profile?.location ?? '',
              role,
            };

            if (cancelled) return;

            setAuthRole(role);
            setRole(role);
            setAuthProfile(mergedProfile);
            setProfile(mergedProfile);
            await setRealtime(`${firebasePaths.userProfiles}/${safeUser.uid}/lastLogin`, Math.floor(Date.now() / 1000));
          } catch {
            if (cancelled) return;

            const fallbackRole = normalizeUserRole(null);
            const mergedProfile = {
              name: safeUser.displayName ?? '',
              email: safeUser.email ?? '',
              phone: '',
              farmName: '',
              location: '',
              role: fallbackRole,
            };

            setAuthRole(fallbackRole);
            setRole(fallbackRole);
            setAuthProfile(mergedProfile);
            setProfile(mergedProfile);
          } finally {
            if (cancelled) return;
            setInitialized(true);
            setLoading(false);
          }
        })();
      });
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [setAuthProfile, setAuthRole, setInitialized, setLoading, setProfile, setRole, setUser]);

  return { user, loading, initialized };
}
