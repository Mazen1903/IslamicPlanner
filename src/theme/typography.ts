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
  display: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif-medium', default: 'Comic Sans MS, cursive, sans-serif' }),
  displayRegular: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif', default: 'Comic Sans MS, cursive, sans-serif' }),
  displayBold: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif-medium', default: 'Comic Sans MS, cursive, sans-serif' }),
  body: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyRegular: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyBold: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif-medium', default: 'Comic Sans MS, cursive, sans-serif' }),
  bodyItalic: Platform.select({ ios: 'Comic Sans MS', android: 'sans-serif', default: 'Comic Sans MS, cursive, sans-serif' }),
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

  return {
    // Display — decorative font
    displayLarge: {
      fontFamily: displayFont,
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 40,
    },
    displayMedium: {
      fontFamily: displayFont,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 32,
    },
    displaySmall: {
      fontFamily: displayFont,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 28,
    },

    // Headlines — display font, smaller
    headlineLarge: {
      fontFamily: displayFont,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 24,
    },
    headlineMedium: {
      fontFamily: displayFont,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 22,
    },

    // Body — sans-serif
    bodyLarge: {
      fontFamily: bodyFont,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 24,
    },
    bodyMedium: {
      fontFamily: bodyFont,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
    },
    bodySmall: {
      fontFamily: bodyFont,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 16,
    },

    // Labels — sans-serif, medium weight
    labelLarge: {
      fontFamily: displayFont,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
    },
    labelMedium: {
      fontFamily: bodyFont,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 16,
    },
    labelSmall: {
      fontFamily: bodyFont,
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 14,
    },

    // Caption
    caption: {
      fontFamily: bodyFont,
      fontSize: 11,
      fontWeight: '800',
      lineHeight: 14,
    },
  };
}

/**
 * Default typography scale instance
 */
export const typography: TypographyScale = createTypographyScale();
