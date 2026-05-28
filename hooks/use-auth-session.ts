import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { watchAuth } from '@/services/auth';
import { useAuthStore } from '@/store/use-auth-store';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAppStore } from '@/store/use-app-store';
import { ThemeMode, UserProfile } from '@/types';
import { normalizeUserRole } from '@/types/userRole';

function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

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
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const startupLogoutDone = useRef(false);
  const heartbeatUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (startupLogoutDone.current) return;
    startupLogoutDone.current = true;

    let cancelled = false;
    let unsub = () => {};
    setLoading(true);

    void (async () => {
      unsub = watchAuth((nextUser) => {
        const safeUser = nextUser && !nextUser.isAnonymous ? nextUser : null;
        setUser(safeUser);

        if (!safeUser?.uid) {
          setAuthProfile(null);
          setAuthRole('farmer');
          setRole('farmer');
          setProfile({ name: '', email: '', phone: '', farmName: '', location: '', farmArea: '', farmDistrict: '', role: 'farmer' });
          setInitialized(true);
          setLoading(false);
          return;
        }

        void (async () => {
          try {
            const profile = await getRealtimeOnce<any>(`${firebasePaths.userProfiles}/${safeUser.uid}`);
            const role = normalizeUserRole(profile?.role);
            const theme = normalizeThemeMode(profile?.theme);
            const mergedProfile: Partial<UserProfile> = {
              name: profile?.name ?? safeUser.displayName ?? '',
              email: profile?.email ?? safeUser.email ?? '',
              phone: profile?.phone ?? '',
              farmName: profile?.farmName ?? '',
              location: profile?.location ?? '',
              farmArea: profile?.farmArea ?? profile?.farmVillage ?? profile?.location ?? '',
              farmDistrict: profile?.farmDistrict ?? '',
              role,
              theme,
            };

            if (cancelled) return;

            setAuthRole(role);
            setRole(role);
            setThemeMode(theme);
            setAuthProfile(mergedProfile);
            setProfile(mergedProfile);
            await setRealtime(`${firebasePaths.userProfiles}/${safeUser.uid}/sessionOnline`, true);
            await setRealtime(`${firebasePaths.userProfiles}/${safeUser.uid}/sessionLastSeen`, Math.floor(Date.now() / 1000));
            await setRealtime(`${firebasePaths.userProfiles}/${safeUser.uid}/lastLogin`, Math.floor(Date.now() / 1000));
          } catch {
            if (cancelled) return;

            const fallbackRole = normalizeUserRole(null);
            const mergedProfile: Partial<UserProfile> = {
              name: safeUser.displayName ?? '',
              email: safeUser.email ?? '',
              phone: '',
              farmName: '',
              location: '',
              farmArea: '',
              farmDistrict: '',
              role: fallbackRole,
              theme: 'system',
            };

            setAuthRole(fallbackRole);
            setRole(fallbackRole);
            setThemeMode('system');
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
  }, [setAuthProfile, setAuthRole, setInitialized, setLoading, setProfile, setRole, setThemeMode, setUser]);

  useEffect(() => {
    const uid = user?.uid ?? null;
    heartbeatUidRef.current = uid;

    if (!uid) return;

    const writePresence = async (online: boolean) => {
      const activeUid = heartbeatUidRef.current;
      if (!activeUid) return;

      const timestamp = Math.floor(Date.now() / 1000);
      await setRealtime(`${firebasePaths.userProfiles}/${activeUid}/sessionOnline`, online);
      await setRealtime(`${firebasePaths.userProfiles}/${activeUid}/sessionLastSeen`, timestamp);
    };

    void writePresence(true);

    const heartbeat = setInterval(() => {
      void writePresence(true);
    }, 30000);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      void writePresence(state === 'active');
    });

    return () => {
      clearInterval(heartbeat);
      appStateSubscription.remove();
      void writePresence(false);
    };
  }, [user?.uid]);

  return { user, loading, initialized };
}
