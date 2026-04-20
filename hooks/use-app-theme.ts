import { useColorScheme } from 'react-native';
import { palette } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export function useAppTheme() {
  const systemScheme = useColorScheme() ?? 'light';
  const selectedTheme = useAppStore((state) => state.themeMode);
  const scheme = selectedTheme === 'system' ? systemScheme : selectedTheme;

  return {
    scheme,
    background: scheme === 'dark' ? palette.dark.bg : palette.light.bg,
    card: scheme === 'dark' ? palette.dark.card : palette.light.card,
    text: scheme === 'dark' ? palette.dark.text : palette.light.text,
    muted: scheme === 'dark' ? palette.dark.muted : palette.light.muted,
  };
}