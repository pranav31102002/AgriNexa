import { palette as appPalette } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type AdminPalette = {
  bg: string;
  bgSecondary: string;
  card: string;
  cardElevated: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  info: string;
  warning: string;
  danger: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
};

const darkPalette: AdminPalette = {
  bg: '#07110D',
  bgSecondary: '#0A1712',
  card: '#0F1D18',
  cardElevated: '#132720',
  border: 'rgba(150, 194, 173, 0.14)',
  text: '#EFFAF4',
  muted: '#93A99E',
  accent: appPalette.primary,
  accentSoft: '#153A27',
  info: '#38BDF8',
  warning: '#F59E0B',
  danger: '#F87171',
  successSoft: '#143524',
  warningSoft: '#3C2A10',
  dangerSoft: '#3A171A',
  infoSoft: '#102D38',
};

const lightPalette: AdminPalette = {
  bg: '#F4FAF7',
  bgSecondary: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#ECF6F0',
  border: 'rgba(24, 53, 43, 0.10)',
  text: '#18352B',
  muted: '#617A71',
  accent: appPalette.primary,
  accentSoft: '#DCEFE3',
  info: '#1F7AB8',
  warning: '#C78300',
  danger: '#C95A63',
  successSoft: '#DCEFE3',
  warningSoft: '#F8E8BF',
  dangerSoft: '#F8E0E3',
  infoSoft: '#D9ECF8',
};

export function useAdminTheme() {
  const theme = useAppTheme();
  const isDark = theme.scheme === 'dark';
  const colors = isDark ? darkPalette : lightPalette;

  return {
    scheme: theme.scheme,
    isDark,
    palette: colors,
    surfaceShadow: isDark ? '#000000' : '#103528',
    headerGradient: isDark ? ['#163A29', '#0C1913', '#07110D'] : ['#F9FFFC', '#EEF8F2', '#DCEFE4'],
    headerBadgeBg: isDark ? '#123423' : '#DCEFE3',
    headerBadgeText: isDark ? '#7BE0A4' : '#15663E',
    profilePanelBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
    navBackground: isDark ? 'rgba(7, 17, 13, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    navActiveBackground: isDark ? '#163A29' : '#DCEFE3',
    navActiveIcon: isDark ? '#7BE0A4' : '#15663E',
    navActiveText: isDark ? '#EFFAF4' : '#18352B',
    criticalSurface: isDark ? '#221114' : '#FDF1F2',
    criticalBorder: isDark ? '#5C2228' : '#E8BCC2',
  };
}
