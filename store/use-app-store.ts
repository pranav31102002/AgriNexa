import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  ControlState,
  DiseasePrediction,
  DiseaseValidationStatus,
  Lang,
  ThemeMode,
  UserProfile,
  UserRole,
} from '@/types';

interface AppState {
  language: Lang;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  role: UserRole;
  diseaseValidationStatus: DiseaseValidationStatus;
  diseaseValidationMessage: string;
  localControl: ControlState;
  profile: UserProfile;
  cachedDiseasePrediction: DiseasePrediction | null;
  setLanguage: (value: Lang) => void;
  setThemeMode: (value: ThemeMode) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setRole: (value: UserRole) => void;
  setDiseaseValidation: (status: DiseaseValidationStatus, message?: string) => void;
  setLocalControl: (value: Partial<ControlState>) => void;
  setProfile: (value: Partial<UserProfile>) => void;
  setCachedDiseasePrediction: (value: DiseasePrediction | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      themeMode: 'system',
      notificationsEnabled: true,
      role: 'farmer',
      diseaseValidationStatus: 'idle',
      diseaseValidationMessage: '',
      cachedDiseasePrediction: null,
      localControl: {
        autoMode: true,
        waterPump: false,
        moistureThreshold: 45,
      },
      profile: {
        name: '',
        email: '',
        phone: '',
        farmName: '',
        location: '',
        role: 'farmer',
      },
      setLanguage: (value) => set({ language: value }),
      setThemeMode: (value) => set({ themeMode: value }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setRole: (value) => set({ role: value }),
      setDiseaseValidation: (status, message = '') =>
        set({ diseaseValidationStatus: status, diseaseValidationMessage: message }),
      setCachedDiseasePrediction: (value) => set({ cachedDiseasePrediction: value }),
      setLocalControl: (value) =>
        set((state) => ({
          localControl: { ...state.localControl, ...value },
        })),
      setProfile: (value) =>
        set((state) => ({
          profile: { ...state.profile, ...value },
        })),
    }),
    {
      name: 'smart-kisan-sathi-state',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
