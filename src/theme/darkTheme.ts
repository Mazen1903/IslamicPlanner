import { iconSizes, radii, shadows, spacing, touchTargets, type Theme, type ThemeColors } from './tokens';
import { typography } from './typography';

export const darkColors: ThemeColors = {
  // Brand
  primary: '#4CAF75', // Brighter green for dark mode
  primaryLight: '#1A2F23', // Dark green tint surface
  primaryDark: '#388E5E',
  primaryPressed: '#388E5E',

  // Backgrounds & Surfaces
  background: '#0F1114', // Deep charcoal, not pure black
  surface: '#1A1D22', // Card surface
  surfaceSecondary: '#16191E',
  surfaceElevated: '#242830', // Modal/elevated surface

  // Text
  textPrimary: '#E8ECF0',
  textSecondary: '#8E99A8',
  textTertiary: '#7E90A2', // WCAG AA: 5.76:1 on bg, 5.15:1 on surface, 4.50:1 on surfaceElevated (M21)
  textMuted: '#5F6B7A', // Intentional de-emphasis only — WCAG 1.4.3 exempt (M21 audit)
  textOnPrimary: '#0F1114',

  // Status
  success: '#4CAF75',
  warning: '#F0C040',
  danger: '#E85050', // WCAG AA 4.58:1 on surface (M21)
  error: '#E85050', // WCAG AA 4.58:1 on surface (M21)
  dangerPressed: '#D95050', // WCAG AA 4.69:1 vs textOnPrimary #0F1114 (M21)
  dangerSurface: '#2D1515', // WCAG AA 4.63:1 vs danger #E85050 (M21)
  info: '#5DADE2',
  completed: '#4CAF75',

  // Prayer identity (subtle, muted for dark)
  prayerFajr: '#1A1530',
  prayerDhuhr: '#1F1A10',
  prayerAsr: '#1F1710',
  prayerMaghrib: '#1F1015',
  prayerIsha: '#10121F',

  // Borders & Dividers
  border: '#2A2E36',
  divider: '#1F2328',

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowElevated: 'rgba(0, 0, 0, 0.5)',

  // Controls & Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  tabInactive: '#7E90A2', // WCAG AA 5.15:1 on surface (M21)
  tabActive: '#4CAF75',
  checkboxUnchecked: '#3A3F48',
  checkboxChecked: '#4CAF75',
  disabledBackground: '#2A2E36',
  disabledText: '#5F6B7A',
};

export const darkTheme: Theme = {
  isDark: true,
  colors: darkColors,
  spacing,
  radii,
  shadows,
  typography,
  touchTargets,
  iconSizes,
};
