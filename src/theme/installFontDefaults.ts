import React from 'react';
import * as ReactNative from 'react-native';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type TextProps,
  type TextInputProps,
} from 'react-native';

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
      fontWeight: Platform.OS === 'android' ? undefined : '700',
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

  // CRITICAL FIX FOR ANDROID FONT FALLBACK BUG:
  // On Android, if a custom font is used (such as ComicSansMS-Bold), specifying
  // ANY fontWeight (e.g. '700', '600', 'bold', 'normal') causes Android's
  // ReactFontManager to fail asset resolution and immediately fall back to the
  // phone's system font (e.g. Roboto or Samsung One).
  //
  // Therefore, whenever a custom font is applied on Android, fontWeight MUST be undefined!
  // The bold weight is already built into ComicSansMS-Bold.ttf.
  if (Platform.OS === 'android') {
    return [
      style,
      {
        fontFamily: targetFont,
        fontWeight: undefined,
        fontStyle: isItalic ? 'italic' : undefined,
      },
    ];
  }

  return [
    style,
    {
      fontFamily: targetFont,
      fontWeight: isExplicitBold ? '700' : undefined,
      fontStyle: isItalic ? 'italic' : undefined,
    },
  ];
}

let isInstalled = false;

/**
 * Installs application-wide font defaults by wrapping ReactNative.Text and ReactNative.TextInput.
 * Ensures all text across the entire app uses Comic Sans MS and prevents Android from falling back
 * to the phone's system font on interaction.
 */
export function installFontDefaults(): void {
  if (isInstalled) {
    return;
  }

  const OriginalText = ReactNative.Text;
  const OriginalTextInput = ReactNative.TextInput;

  if (!OriginalText || !OriginalTextInput) {
    return;
  }

  const PatchedText = React.forwardRef<any, TextProps>((props: TextProps, ref: any) => {
    const patchedStyle = resolveAppFontStyle(props.style);
    return React.createElement(OriginalText, {
      ...props,
      ref,
      style: patchedStyle,
    });
  });

  PatchedText.displayName = 'PatchedAppText';

  const PatchedTextInput = React.forwardRef<any, TextInputProps>((props: TextInputProps, ref: any) => {
    const patchedStyle = resolveAppFontStyle(props.style);
    return React.createElement(OriginalTextInput, {
      ...props,
      ref,
      style: patchedStyle,
    });
  });

  PatchedTextInput.displayName = 'PatchedAppTextInput';

  try {
    Object.defineProperty(ReactNative, 'Text', {
      value: PatchedText,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    Object.defineProperty(ReactNative, 'TextInput', {
      value: PatchedTextInput,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    isInstalled = true;
  } catch (err) {
    console.warn('[installFontDefaults] Failed to patch ReactNative Text/TextInput:', err);
  }
}

// Auto-install immediately when module is loaded
installFontDefaults();
