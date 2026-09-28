import { Platform } from 'react-native';
import * as Font from 'expo-font';
import type { TypographyScale } from './tokens';

/**
 * Custom font family identifiers per UI_SYSTEM.md §4.1
 */
export const fontNames = {
  display: 'ComicSansMS-Bold',
  displayRegular: 'ComicSansMS',
  displayBold: 'ComicSansMS-Bold',
  body: 'ComicSansMS-Bold',
  bodyRegular: 'ComicSansMS',
  bodyBold: 'ComicSansMS-Bold',
  bodyItalic: 'ComicSansMS-BoldItalic',
  mono: 'JetBrainsMono',
} as const;

/**
 * System fallback font families per platform
 */
export const fallbackFonts = {
  display: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS-Bold', default: 'Comic Sans MS, cursive, sans-serif' }),
  displayRegular: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS', default: 'Comic Sans MS, cursive, sans-serif' }),
  displayBold: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS-Bold', default: 'Comic Sans MS, cursive, sans-serif' }),
  body: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS-Bold', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyRegular: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyBold: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS-Bold', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyItalic: Platform.select({ ios: 'Comic Sans MS', android: 'ComicSansMS-BoldItalic', default: 'Comic Sans MS, cursive, sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
} as const;

/**
 * Resolves a font family, using the custom font if loaded or gracefully falling back to system font
 */
export function getFontFamily(fontKey: keyof typeof fontNames): string {
  const desired = fontNames[fontKey];
  if (Font.isLoaded(desired)) {
    return desired;
  }
  if (process.env.NODE_ENV !== 'test') {
    return desired;
  }
  return fallbackFonts[fontKey];
}

/**
 * Generates the full typography scale based on active font families per UI_SYSTEM.md §4.2
 */
export function createTypographyScale(resolvedFontFamilies?: {
  display?: string;
  body?: string;
  mono?: string;
}): TypographyScale {
  const displayFont = resolvedFontFamilies?.display ?? getFontFamily('display');
  const bodyFont = resolvedFontFamilies?.body ?? getFontFamily('body');

  // On Android, passing a numeric or 'bold' fontWeight alongside custom font assets
  // causes ReactFontManager to fail resolution and revert to the device's system font.
  // Since ComicSansMS-Bold is already bold at the font level, we omit fontWeight on Android.
  const boldWeight = Platform.OS === 'android' ? undefined : '700';
  const mediumWeight = Platform.OS === 'android' ? undefined : '600';
  const regularWeight = Platform.OS === 'android' ? undefined : '400';

  return {
    // Display — decorative font
    displayLarge: {
      fontFamily: displayFont,
      fontSize: 32,
      fontWeight: boldWeight,
      lineHeight: 40,
    },
    displayMedium: {
      fontFamily: displayFont,
      fontSize: 24,
      fontWeight: boldWeight,
      lineHeight: 32,
    },
    displaySmall: {
      fontFamily: displayFont,
      fontSize: 20,
      fontWeight: boldWeight,
      lineHeight: 28,
    },

    // Headlines — display font, smaller
    headlineLarge: {
      fontFamily: displayFont,
      fontSize: 18,
      fontWeight: boldWeight,
      lineHeight: 24,
    },
    headlineMedium: {
      fontFamily: displayFont,
      fontSize: 16,
      fontWeight: boldWeight,
      lineHeight: 22,
    },

    // Body — sans-serif
    bodyLarge: {
      fontFamily: bodyFont,
      fontSize: 16,
      fontWeight: regularWeight,
      lineHeight: 24,
    },
    bodyMedium: {
      fontFamily: bodyFont,
      fontSize: 14,
      fontWeight: regularWeight,
      lineHeight: 20,
    },
    bodySmall: {
      fontFamily: bodyFont,
      fontSize: 12,
      fontWeight: regularWeight,
      lineHeight: 16,
    },

    // Labels — sans-serif, medium weight
    labelLarge: {
      fontFamily: displayFont,
      fontSize: 14,
      fontWeight: mediumWeight,
      lineHeight: 20,
    },
    labelMedium: {
      fontFamily: bodyFont,
      fontSize: 12,
      fontWeight: mediumWeight,
      lineHeight: 16,
    },
    labelSmall: {
      fontFamily: bodyFont,
      fontSize: 10,
      fontWeight: mediumWeight,
      lineHeight: 14,
    },

    // Caption
    caption: {
      fontFamily: bodyFont,
      fontSize: 11,
      fontWeight: regularWeight,
      lineHeight: 14,
    },
  };
}

/**
 * Default typography scale instance
 */
export const typography: TypographyScale = createTypographyScale();
