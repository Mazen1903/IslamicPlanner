import { iconSizes, radii, shadows, spacing, touchTargets, type Theme, type ThemeColors } from './tokens';
import { typography } from './typography';

export const lightColors: ThemeColors = {
  // Brand
  primary: '#1B7A4D', // Deep Islamic green
  primaryLight: '#E8F5EE', // Pale mint surface
  primaryDark: '#145C3A',
  primaryPressed: '#145C3A',

  // Backgrounds & Surfaces
  background: '#FAFBFC', // Warm white
  surface: '#FFFFFF', // Card/sheet surface
  surfaceSecondary: '#F4F7F5', // Pale mint-tinted secondary surface
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1D21', // Near-black
  textSecondary: '#5F6B7A', // Muted gray
  textTertiary: '#687483', // Hint text — WCAG AA 4.59:1 on bg, 4.76:1 on surface (M21)
  textMuted: '#8E99A8',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#2E8B57',
  warning: '#D4A017',
  danger: '#C0392B',
  error: '#C0392B',
  dangerPressed: '#962D22', // WCAG AA 7.79:1 vs textOnPrimary #FFFFFF (M21)
  dangerSurface: '#FEE7E7', // WCAG AA 4.61:1 vs danger #C0392B (M21)
  info: '#2980B9',
  completed: '#2E8B57',

  // Prayer identity (subtle accent overlays)
  prayerFajr: '#F0E6FF', // Dawn lavender
  prayerDhuhr: '#FFF8E1', // Daylight warm
  prayerAsr: '#FFF3E0', // Afternoon amber
  prayerMaghrib: '#FFE0E6', // Sunset rose
  prayerIsha: '#E8EAF6', // Night indigo-gray

  // Borders & Dividers
  border: '#E8ECF0',
  divider: '#F0F2F5',

  // Shadows
  shadowColor: 'rgba(0, 0, 0, 0.06)',
  shadowElevated: 'rgba(0, 0, 0, 0.12)',

  // Controls & Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  tabInactive: '#687483', // WCAG AA 4.59:1 on bg, 4.76:1 on surface (M21)
  tabActive: '#1B7A4D',
  checkboxUnchecked: '#CBD2DC',
  checkboxChecked: '#1B7A4D',
  disabledBackground: '#E8ECF0',
  disabledText: '#A0AAB8',
};

export const lightTheme: Theme = {
  isDark: false,
  colors: lightColors,
  spacing,
  radii,
  shadows,
  typography,
  touchTargets,
  iconSizes,
};
