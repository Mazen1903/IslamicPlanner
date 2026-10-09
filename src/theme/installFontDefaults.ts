import React from 'react';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type TextProps,
  type TextInputProps,
} from 'react-native';

export const APP_FONT_PATCHED = Symbol.for('islamic_planner.app_font_patched');

/**
 * Checks whether the global font defaults are currently patched on the real react-native module.
 */
export function isAppFontInstalled(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return Boolean(RN.Text && (RN.Text as any)[APP_FONT_PATCHED]);
}

const COMIC_BOLD = 'ComicSansMS-Bold';
const COMIC_REGULAR = 'ComicSansMS';
const COMIC_ITALIC = 'ComicSansMS-Italic';
const COMIC_BOLD_ITALIC = 'ComicSansMS-BoldItalic';

export interface FontOption {
  id: string;
  name: string;
  isPremium: boolean;
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'comic', name: 'Comic Sans', isPremium: false },
  { id: 'system', name: 'System', isPremium: false },
  { id: 'mali', name: 'Mali', isPremium: true },
  { id: 'kalam', name: 'Kalam', isPremium: true },
  { id: 'caveat', name: 'Caveat', isPremium: true },
];

export interface TextScaleOption {
  id: string;
  label: string;
  scale: number;
}

export const TEXT_SIZE_OPTIONS: TextScaleOption[] = [
  { id: 'small', label: 'Small', scale: 0.9 },
  { id: 'default', label: 'Default', scale: 1.0 },
  { id: 'large', label: 'Large', scale: 1.15 },
  { id: 'xlarge', label: 'Extra Large', scale: 1.3 },
];

export function normalizeFontId(fontId?: string | null): string {
  if (!fontId) return 'comic';
  const lower = fontId.toLowerCase().replace(/[\s-_]/g, '');
  if (lower.includes('system')) return 'system';
  if (lower.includes('mali')) return 'mali';
  if (lower.includes('kalam')) return 'kalam';
  if (lower.includes('caveat')) return 'caveat';
  return 'comic';
}

export function normalizeTextScale(scale?: number | string | null): number {
  if (scale === null || scale === undefined) return 1.0;
  if (typeof scale === 'number') {
    return Number.isFinite(scale) && scale > 0 ? scale : 1.0;
  }
  const lower = String(scale).toLowerCase();
  if (lower === 'small') return 0.9;
  if (lower === 'default' || lower === 'normal') return 1.0;
  if (lower === 'large') return 1.15;
  if (lower === 'xlarge' || lower === 'extralarge') return 1.3;
  const parsed = parseFloat(lower);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.0;
}

let activeFontFamily: string = 'comic';
let activeTextScale: number = 1.0;
const fontListeners = new Set<() => void>();

export function getActiveFontFamily(): string {
  return activeFontFamily;
}

export function setActiveFontFamily(fontId: string): void {
  activeFontFamily = normalizeFontId(fontId);
  fontListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function getActiveTextScale(): number {
  return activeTextScale;
}

export function setActiveTextScale(scale: number | string): void {
  activeTextScale = normalizeTextScale(scale);
  fontListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function subscribeFontSettings(listener: () => void): () => void {
  fontListeners.add(listener);
  return () => {
    fontListeners.delete(listener);
  };
}

export function useAppFontSettings() {
  const [fontFamily, setFontFamilyState] = React.useState<string>(getActiveFontFamily());
  const [textScale, setTextScaleState] = React.useState<number>(getActiveTextScale());

  React.useEffect(() => {
    const unsub = subscribeFontSettings(() => {
      setFontFamilyState(getActiveFontFamily());
      setTextScaleState(getActiveTextScale());
    });
    return unsub;
  }, []);

  const setFontFamily = React.useCallback((newFont: string) => {
    setActiveFontFamily(newFont);
  }, []);

  const setTextScale = React.useCallback((newScale: number | string) => {
    setActiveTextScale(newScale);
  }, []);

  return {
    fontFamily,
    textScale,
    setFontFamily,
    setTextScale,
  };
}

/**
 * Known vector icon font family identifiers that should never be overridden.
 */
const KNOWN_ICON_FONTS = new Set([
  'Ionicons',
  'ionicons',
  'MaterialCommunityIcons',
  'Material Design Icons',
  'Material Icons',
  'FontAwesome',
  'FontAwesome5Free-Solid',
  'FontAwesome5Free-Regular',
  'FontAwesome5Brands-Regular',
  'FontAwesome6Free-Solid',
  'FontAwesome6Free-Regular',
  'FontAwesome6Brands-Regular',
  'Feather',
  'feather',
  'anticon',
  'octicons',
  'SimpleLineIcons',
  'Entypo',
  'EvilIcons',
  'Zocial',
  'Foundation',
]);

function isIconFont(fontFamily?: string): boolean {
  if (!fontFamily) return false;
  if (KNOWN_ICON_FONTS.has(fontFamily)) return true;
  const lower = fontFamily.toLowerCase();
  return (
    lower.includes('icon') ||
    lower.includes('fontawesome') ||
    lower.includes('material') ||
    lower.includes('feather') ||
    lower.includes('glyph') ||
    lower.includes('vector')
  );
}

function getResolvedFontForFamily(
  family: string,
  isItalic: boolean,
  isExplicitBold: boolean,
  isExplicitNormal: boolean,
  rawFamily?: string
): string | undefined {
  switch (family) {
    case 'system':
      return undefined;
    case 'mali':
      if (isItalic && isExplicitBold) return 'Mali-BoldItalic';
      if (isItalic) return 'Mali-Italic';
      if (isExplicitNormal) return 'Mali-Regular';
      return 'Mali-Bold';
    case 'kalam':
      if (isExplicitNormal && !isExplicitBold) return 'Kalam-Regular';
      return 'Kalam-Bold';
    case 'caveat':
      if (isExplicitNormal && !isExplicitBold) return 'Caveat_400Regular';
      return 'Caveat_700Bold';
    case 'comic':
    default:
      if (isItalic && isExplicitBold) {
        return COMIC_BOLD_ITALIC;
      } else if (isItalic) {
        return COMIC_ITALIC;
      } else if (isExplicitNormal && rawFamily === COMIC_REGULAR) {
        return COMIC_REGULAR;
      } else if (rawFamily === COMIC_REGULAR && !isExplicitBold) {
        return COMIC_REGULAR;
      } else {
        return COMIC_BOLD;
      }
  }
}

/**
 * Resolves the appropriate font family variant and text scaling based on weight, style, and active settings.
 */
export function resolveAppFontStyle(style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const currentFont = getActiveFontFamily();
  const currentScale = getActiveTextScale();

  if (!style) {
    if (currentFont === 'system') {
      return {};
    }
    return {
      fontFamily: getResolvedFontForFamily(currentFont, false, true, false),
      fontWeight: undefined,
    };
  }

  const flattened: TextStyle = (StyleSheet.flatten(style) || {}) as TextStyle;
  const rawFamily = flattened.fontFamily;

  // Never alter icon fonts
  if (isIconFont(rawFamily)) {
    return style;
  }

  // Preserve explicit monospace fonts
  if (rawFamily && (rawFamily.includes('Mono') || rawFamily.includes('monospace') || rawFamily.includes('Courier'))) {
    return style;
  }

  const weight = flattened.fontWeight;
  const isItalic = flattened.fontStyle === 'italic';

  const isExplicitNormal =
    weight === 'normal' || weight === '400' || weight === '300' || weight === '100' || weight === '200';
  const isExplicitBold =
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900' ||
    weight === '600' ||
    weight === '500';

  const cleaned: TextStyle = { ...flattened };

  // Scale fontSize and lineHeight if active scale !== 1.0
  if (currentScale !== 1.0) {
    if (typeof flattened.fontSize === 'number') {
      cleaned.fontSize = Math.round(flattened.fontSize * currentScale * 10) / 10;
    }
    if (typeof flattened.lineHeight === 'number') {
      cleaned.lineHeight = Math.round(flattened.lineHeight * currentScale * 10) / 10;
    }
  }

  if (currentFont === 'system') {
    return cleaned;
  }

  const targetFont = getResolvedFontForFamily(currentFont, isItalic, isExplicitBold, isExplicitNormal, rawFamily);
  if (!targetFont) {
    return cleaned;
  }

  // CRITICAL FIX FOR FONT FALLBACK BUG ON ANDROID & IOS:
  // When a dedicated bold font asset is used, specifying an explicit fontWeight
  // causes native font managers to fail resolution and revert to system font.
  const isDedicatedBoldAsset = targetFont.includes('Bold') || targetFont.includes('700');
  const resolvedWeight =
    Platform.OS === 'android' || isDedicatedBoldAsset ? undefined : isExplicitBold ? '700' : undefined;

  cleaned.fontFamily = targetFont;
  if (resolvedWeight === undefined) {
    delete cleaned.fontWeight;
  } else {
    cleaned.fontWeight = resolvedWeight;
  }
  if (isItalic) {
    cleaned.fontStyle = 'italic';
  } else {
    delete cleaned.fontStyle;
  }

  return cleaned;
}

/**
 * Installs application-wide font defaults by wrapping Text and TextInput on the real react-native module.
 */
export function installFontDefaults(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');

  if (!RN || !RN.Text || !RN.TextInput) {
    return;
  }

  // Idempotence: skip if already patched on the real module
  if ((RN.Text as any)[APP_FONT_PATCHED]) {
    return;
  }

  const OriginalText = RN.Text;
  const OriginalTextInput = RN.TextInput;

  const PatchedText = React.forwardRef<any, TextProps>((props: TextProps, ref: any) => {
    const patchedStyle = resolveAppFontStyle(props.style);
    return React.createElement(OriginalText, {
      ...props,
      ref,
      style: patchedStyle,
    });
  });

  (PatchedText as any)[APP_FONT_PATCHED] = true;
  PatchedText.displayName = 'PatchedAppText';

  // Hoist static properties from OriginalText
  for (const key of Object.getOwnPropertyNames(OriginalText)) {
    if (key !== 'length' && key !== 'name' && key !== 'prototype' && key !== 'displayName') {
      try {
        const desc = Object.getOwnPropertyDescriptor(OriginalText, key);
        if (desc) {
          Object.defineProperty(PatchedText, key, desc);
        }
      } catch {
        // ignore non-configurable
      }
    }
  }

  const PatchedTextInput = React.forwardRef<any, TextInputProps>((props: TextInputProps, ref: any) => {
    const patchedStyle = resolveAppFontStyle(props.style);
    return React.createElement(OriginalTextInput, {
      ...props,
      ref,
      style: patchedStyle,
    });
  });

  (PatchedTextInput as any)[APP_FONT_PATCHED] = true;
  PatchedTextInput.displayName = 'PatchedAppTextInput';

  // Hoist static properties from OriginalTextInput (such as State)
  for (const key of Object.getOwnPropertyNames(OriginalTextInput)) {
    if (key !== 'length' && key !== 'name' && key !== 'prototype' && key !== 'displayName') {
      try {
        const desc = Object.getOwnPropertyDescriptor(OriginalTextInput, key);
        if (desc) {
          Object.defineProperty(PatchedTextInput, key, desc);
        }
      } catch {
        // ignore non-configurable
      }
    }
  }

  try {
    Object.defineProperty(RN, 'Text', {
      value: PatchedText,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    Object.defineProperty(RN, 'TextInput', {
      value: PatchedTextInput,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (err) {
    console.warn('[installFontDefaults] Failed to patch ReactNative Text/TextInput:', err);
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const verifyRN = require('react-native');
    if (!verifyRN.Text || !(verifyRN.Text as any)[APP_FONT_PATCHED]) {
      console.error(
        '[installFontDefaults] Critical: Global font patch did not apply to react-native module exports.'
      );
    }
  }
}

// Auto-install immediately when module is loaded
installFontDefaults();
