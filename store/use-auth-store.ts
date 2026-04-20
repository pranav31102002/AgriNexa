import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserProfile, UserRole } from '@/types';

type AuthState = {
  user: User | null;
  profile: Partial<UserProfile> | null;
  role: UserRole;
  isAdmin: boolean;
  isFarmer: boolean;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Partial<UserProfile> | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  role: 'farmer',
  isAdmin: false,
  isFarmer: true,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setRole: (role) =>
    set({
      role,
      isAdmin: role === 'admin',
      isFarmer: role === 'farmer',
    }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  clearAuth: () =>
    set({
      user: null,
      profile: null,
      role: 'farmer',
      isAdmin: false,
      isFarmer: true,
      loading: false,
      initialized: true,
    }),
}));
