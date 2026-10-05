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

/**
 * Resolves the appropriate Comic Sans font family variant based on weight and style.
 */
export function resolveAppFontStyle(style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!style) {
    return {
      fontFamily: COMIC_BOLD,
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

  const isExplicitNormal = weight === 'normal' || weight === '400' || weight === '300' || weight === '100' || weight === '200';
  const isExplicitBold =
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900' ||
    weight === '600' ||
    weight === '500';

  let targetFont = COMIC_BOLD;

  if (isItalic && isExplicitBold) {
    targetFont = COMIC_BOLD_ITALIC;
  } else if (isItalic) {
    targetFont = COMIC_ITALIC;
  } else if (isExplicitNormal && rawFamily === COMIC_REGULAR) {
    targetFont = COMIC_REGULAR;
  } else if (rawFamily === COMIC_REGULAR && !isExplicitBold) {
    targetFont = COMIC_REGULAR;
  } else {
    // Default to Comic Sans Bold per user specification ("Comic Sans MS Extra Bold")
    targetFont = COMIC_BOLD;
  }

  // CRITICAL FIX FOR FONT FALLBACK BUG ON ANDROID & IOS:
  // When a dedicated bold font asset is used (such as ComicSansMS-Bold.ttf),
  // specifying an explicit fontWeight (such as '700' or '800') causes native font managers
  // (Android ReactFontManager & iOS CoreText) to seek a bold variant of the bold font file,
  // fail resolution, and immediately fall back to the phone's system font (Roboto / San Francisco).
  //
  // Therefore, whenever ComicSansMS-Bold is applied, fontWeight MUST be undefined.
  // The bold weight is already built directly into the font glyphs.
  const isDedicatedBoldAsset = targetFont === COMIC_BOLD || targetFont === COMIC_BOLD_ITALIC;
  const resolvedWeight = Platform.OS === 'android' || isDedicatedBoldAsset ? undefined : (isExplicitBold ? '700' : undefined);

  return [
    style,
    {
      fontFamily: targetFont,
      fontWeight: resolvedWeight,
      fontStyle: isItalic ? 'italic' : undefined,
    },
  ];
}

/**
 * Installs application-wide font defaults by wrapping Text and TextInput on the real react-native module.
 *
 * CRITICAL ARCHITECTURE NOTE:
 * `react-native/index.js` has no `__esModule` flag. When using `import * as RN from 'react-native'`,
 * Metro `importAll` and Babel `interopRequireWildcard` return a COPY of the module object.
 * Patching `ReactNative.Text` on that namespace copy does NOT reach files using `import { Text } from 'react-native'`.
 * Therefore, we must patch the real module exports object via `require('react-native')`.
 *
 * Ensures all text across the entire app uses Comic Sans MS and prevents Android from falling back
 * to the phone's system font on interaction.
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
        '[installFontDefaults] Critical: Global font patch did not apply to react-native module exports. Text components will not receive Comic Sans defaults.'
      );
    }
  }
}

// Auto-install immediately when module is loaded
installFontDefaults();

