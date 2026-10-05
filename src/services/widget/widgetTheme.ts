import { ISLAMIC_THEMES_MAP } from '@/theme/islamicThemes';
import { lightColors } from '@/theme/lightTheme';
import { darkColors } from '@/theme/darkTheme';
import type { ThemeColors } from '@/theme/tokens';
import type { WidgetPalette, WidgetTheme, HexColor } from './types';
import { DEFAULT_LIGHT_PALETTE, DEFAULT_DARK_PALETTE } from './types';

/**
 * Parses a hex color string into [r, g, b] (0-255).
 */
function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  return null;
}

/**
 * Converts a number to a 2-digit uppercase hex string.
 */
function toHex2(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Converts any CSS color (hex, rgb, rgba) to an opaque 6-digit hex color (#RRGGBB).
 * If the color contains alpha, it is composited over the provided background hex color.
 */
export function toOpaqueHex(color: string, bgHex = '#FFFFFF'): HexColor {
  if (!color || typeof color !== 'string') {
    return bgHex as HexColor;
  }

  const trimmed = color.trim();

  // 1. Direct 6-digit hex without alpha
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase() as HexColor;
  }

  // 2. 3-digit hex (#RGB)
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase() as HexColor;
  }

  // 3. 8-digit hex (#RRGGBBAA)
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    const r = parseInt(trimmed.slice(1, 3), 16);
    const g = parseInt(trimmed.slice(3, 5), 16);
    const b = parseInt(trimmed.slice(5, 7), 16);
    const a = parseInt(trimmed.slice(7, 9), 16) / 255;
    const bgRgb = parseHex(bgHex) ?? [255, 255, 255];
    const outR = r * a + bgRgb[0] * (1 - a);
    const outG = g * a + bgRgb[1] * (1 - a);
    const outB = b * a + bgRgb[2] * (1 - a);
    return `#${toHex2(outR)}${toHex2(outG)}${toHex2(outB)}` as HexColor;
  }

  // 4. rgba(r, g, b, a) or rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;

    if (a >= 1) {
      return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}` as HexColor;
    }

    const bgRgb = parseHex(bgHex) ?? [255, 255, 255];
    const outR = r * a + bgRgb[0] * (1 - a);
    const outG = g * a + bgRgb[1] * (1 - a);
    const outB = b * a + bgRgb[2] * (1 - a);
    return `#${toHex2(outR)}${toHex2(outG)}${toHex2(outB)}` as HexColor;
  }

  return bgHex as HexColor;
}

/**
 * Converts a ThemeColors map into an opaque WidgetPalette.
 */
export function colorsToWidgetPalette(colors: ThemeColors): WidgetPalette {
  const background = toOpaqueHex(colors.background, '#FFFFFF');
  const surface = toOpaqueHex(colors.surface, background);
  const textPrimary = toOpaqueHex(colors.textPrimary, background);
  const textSecondary = toOpaqueHex(colors.textSecondary, background);
  const accent = toOpaqueHex(colors.primary, background);
  const onAccent = toOpaqueHex(colors.textOnPrimary, accent);
  const important = toOpaqueHex(colors.warning, background);
  const divider = toOpaqueHex(colors.divider, background);

  return {
    background,
    surface,
    textPrimary,
    textSecondary,
    accent,
    onAccent,
    important,
    divider,
    brandGreen: accent,
    text: textPrimary,
    textMuted: textSecondary,
    separator: divider,
    importantAccent: important,
  };
}

export interface ResolveWidgetThemeParams {
  themeMode?: string | null;
  islamicThemeId?: string | null;
}

/**
 * Resolves the widget theme based on persisted user settings and selected Islamic theme.
 */
export function resolveWidgetTheme(params?: ResolveWidgetThemeParams): WidgetTheme {
  const islamicId = params?.islamicThemeId;
  const themeMode = params?.themeMode?.toUpperCase();

  // 1. If an Islamic theme is selected, use it as a FIXED palette
  if (islamicId && ISLAMIC_THEMES_MAP[islamicId]) {
    const islamicTheme = ISLAMIC_THEMES_MAP[islamicId];
    const palette = colorsToWidgetPalette(islamicTheme.colors);
    return {
      mode: 'FIXED',
      light: palette,
      dark: palette,
    };
  }

  // 2. Explicit LIGHT mode
  if (themeMode === 'LIGHT') {
    const light = colorsToWidgetPalette(lightColors);
    return {
      mode: 'FIXED',
      light,
      dark: light,
    };
  }

  // 3. Explicit DARK mode
  if (themeMode === 'DARK') {
    const dark = colorsToWidgetPalette(darkColors);
    return {
      mode: 'FIXED',
      light: dark,
      dark,
    };
  }

  // 4. Default / SYSTEM mode: provides both light and dark palettes
  return {
    mode: 'SYSTEM',
    light: colorsToWidgetPalette(lightColors),
    dark: colorsToWidgetPalette(darkColors),
  };
}
