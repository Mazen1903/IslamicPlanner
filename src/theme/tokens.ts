import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Spacing scale per UI_SYSTEM.md §3
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Border radii scale per UI_SYSTEM.md §5
 */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  card: 16,
} as const;

export type RadiiKey = keyof typeof radii;

/**
 * Minimum touch target dimensions per UI_SYSTEM.md §9 and WCAG AA
 */
export const touchTargets = {
  min: 44,
  comfortable: 48,
} as const;

/**
 * Icon size scale
 */
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

export type IconSizeKey = keyof typeof iconSizes;

/**
 * Cross-platform shadow definitions per UI_SYSTEM.md §5
 */
export const shadows = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, // Color handles opacity in theme
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  } satisfies ViewStyle,
  bottomBar: {
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  } satisfies ViewStyle,
} as const;

/**
 * Semantic theme color tokens per UI_SYSTEM.md §2 and product rules
 */
export interface ThemeColors {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPressed: string;

  // Backgrounds & surfaces
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textOnPrimary: string;

  // Status
  success: string;
  warning: string;
  danger: string;
  error: string;
  info: string;
  completed: string;

  // Prayer identity tints
  prayerFajr: string;
  prayerDhuhr: string;
  prayerAsr: string;
  prayerMaghrib: string;
  prayerIsha: string;

  // Borders & dividers
  border: string;
  divider: string;

  // Shadows
  shadowColor: string;
  shadowElevated: string;

  // Controls & overlays
  overlay: string;
  tabInactive: string;
  tabActive: string;
  checkboxUnchecked: string;
  checkboxChecked: string;
  disabledBackground: string;
  disabledText: string;
}

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';

/**
 * Typography definition shape
 */
export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
}

export interface TypographyScale {
  displayLarge: TypographyStyle;
  displayMedium: TypographyStyle;
  displaySmall: TypographyStyle;
  headlineLarge: TypographyStyle;
  headlineMedium: TypographyStyle;
  bodyLarge: TypographyStyle;
  bodyMedium: TypographyStyle;
  bodySmall: TypographyStyle;
  labelLarge: TypographyStyle;
  labelMedium: TypographyStyle;
  labelSmall: TypographyStyle;
  caption: TypographyStyle;
}

/**
 * Unified application Theme shape
 */
export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  typography: TypographyScale;
  touchTargets: typeof touchTargets;
  iconSizes: typeof iconSizes;
}
