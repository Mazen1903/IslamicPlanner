import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

export interface MinimalistMosqueSilhouetteProps {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
  testID?: string;
}

/**
 * Option A: Minimalist Mosque Silhouette
 * A serene, architectural vector mosque skyline with clean domes, graceful minarets,
 * and subtle twilight layered depth. Vector-rendered for crisp display at all screen scales.
 */
export function MinimalistMosqueSilhouette({
  width = 240,
  height = 95,
  color,
  style,
  testID = 'minimalist-mosque-silhouette',
}: MinimalistMosqueSilhouetteProps) {
  const { colors, isDark } = useTheme();
  const baseColor = color ?? (isDark ? colors.primaryLight : colors.primary);

  return (
    <View
      style={[styles.container, { width, height }, style]}
      testID={testID}
      importantForAccessibility="no"
      accessibilityElementsHidden={true}
    >
      <Svg width={width} height={height} viewBox="0 0 280 110" fill="none">
        <Defs>
          {/* Subtle gradient for foreground architecture */}
          <LinearGradient id="mosqueGradFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={baseColor} stopOpacity={isDark ? 0.35 : 0.28} />
            <Stop offset="100%" stopColor={baseColor} stopOpacity={isDark ? 0.55 : 0.45} />
          </LinearGradient>
          {/* Ambient soft background layer */}
          <LinearGradient id="mosqueGradBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={baseColor} stopOpacity={isDark ? 0.16 : 0.12} />
            <Stop offset="100%" stopColor={baseColor} stopOpacity={isDark ? 0.28 : 0.22} />
          </LinearGradient>
        </Defs>

        {/* ── Background Layer: Distant Minarets & Domes ── */}
        <Path
          d="M50 110 V55 C50 55 58 48 65 48 C72 48 80 55 80 55 V110 H50 Z"
          fill="url(#mosqueGradBack)"
        />
        <Path
          d="M200 110 V55 C200 55 208 48 215 48 C222 48 230 55 230 55 V110 H200 Z"
          fill="url(#mosqueGradBack)"
        />

        {/* ── Foreground Layer: Left Minaret ── */}
        {/* Minaret Spire & Crescent */}
        <Path
          d="M25 15 L24 22 H26 L25 15 Z"
          fill={baseColor}
          opacity={isDark ? 0.6 : 0.45}
        />
        <Circle cx="25" cy="14" r="1.5" fill={baseColor} opacity={isDark ? 0.6 : 0.45} />
        {/* Minaret Dome & Balcony */}
        <Path
          d="M22 26 C22 22 28 22 28 26 V32 H22 V26 Z"
          fill="url(#mosqueGradFront)"
        />
        <Path d="M20 32 H30 V34 H20 V32 Z" fill={baseColor} opacity={isDark ? 0.5 : 0.4} />
        {/* Minaret Tower */}
        <Path
          d="M22 34 L21 72 H29 L28 34 H22 Z"
          fill="url(#mosqueGradFront)"
        />
        {/* Lower Balcony */}
        <Path d="M19 72 H31 V75 H19 V72 Z" fill={baseColor} opacity={isDark ? 0.5 : 0.4} />
        {/* Minaret Base */}
        <Path
          d="M20 75 L18 110 H32 L30 75 H20 Z"
          fill="url(#mosqueGradFront)"
        />

        {/* ── Foreground Layer: Left Dome ── */}
        <Path
          d="M60 110 V68 C60 52 75 42 90 42 C105 42 120 52 120 68 V110 H60 Z"
          fill="url(#mosqueGradFront)"
        />
        {/* Dome Finial */}
        <Path d="M90 36 V42" stroke={baseColor} strokeWidth="1.5" opacity={isDark ? 0.6 : 0.45} />
        <Circle cx="90" cy="35" r="1.5" fill={baseColor} opacity={isDark ? 0.6 : 0.45} />

        {/* ── Foreground Layer: Grand Central Dome ── */}
        <Path
          d="M100 110 V62 C100 36 120 22 140 22 C160 22 180 36 180 62 V110 H100 Z"
          fill="url(#mosqueGradFront)"
        />
        {/* Central Dome Crescent Finial */}
        <Path d="M140 12 V22" stroke={baseColor} strokeWidth="2" opacity={isDark ? 0.8 : 0.6} />
        {/* Crescent Moon */}
        <Path
          d="M141.5 8 C139 8 137 10 137 12.5 C137 15 139 17 141.5 17 C140.2 16.2 139.4 14.8 139.4 13.2 C139.4 10.8 141.2 9 143 8.5 C142.5 8.2 142 8 141.5 8 Z"
          fill={baseColor}
          opacity={isDark ? 0.85 : 0.65}
        />
        {/* Main Arch Doorway Silhouette */}
        <Path
          d="M130 110 V90 C130 84 134 80 140 80 C146 80 150 84 150 90 V110 H130 Z"
          fill={isDark ? colors.background : colors.surface}
          opacity={isDark ? 0.35 : 0.6}
        />

        {/* ── Foreground Layer: Right Dome ── */}
        <Path
          d="M160 110 V68 C160 52 175 42 190 42 C205 42 220 52 220 68 V110 H160 Z"
          fill="url(#mosqueGradFront)"
        />
        {/* Dome Finial */}
        <Path d="M190 36 V42" stroke={baseColor} strokeWidth="1.5" opacity={isDark ? 0.6 : 0.45} />
        <Circle cx="190" cy="35" r="1.5" fill={baseColor} opacity={isDark ? 0.6 : 0.45} />

        {/* ── Foreground Layer: Right Minaret ── */}
        {/* Minaret Spire & Crescent */}
        <Path
          d="M255 15 L254 22 H256 L255 15 Z"
          fill={baseColor}
          opacity={isDark ? 0.6 : 0.45}
        />
        <Circle cx="255" cy="14" r="1.5" fill={baseColor} opacity={isDark ? 0.6 : 0.45} />
        {/* Minaret Dome & Balcony */}
        <Path
          d="M252 26 C252 22 258 22 258 26 V32 H252 V26 Z"
          fill="url(#mosqueGradFront)"
        />
        <Path d="M250 32 H260 V34 H250 V32 Z" fill={baseColor} opacity={isDark ? 0.5 : 0.4} />
        {/* Minaret Tower */}
        <Path
          d="M252 34 L251 72 H259 L258 34 H252 Z"
          fill="url(#mosqueGradFront)"
        />
        {/* Lower Balcony */}
        <Path d="M249 72 H261 V75 H249 V72 Z" fill={baseColor} opacity={isDark ? 0.5 : 0.4} />
        {/* Minaret Base */}
        <Path
          d="M250 75 L248 110 H262 L260 75 H250 Z"
          fill="url(#mosqueGradFront)"
        />

        {/* Base Foundation Bar */}
        <Path d="M10 108 H270 V110 H10 V108 Z" fill={baseColor} opacity={isDark ? 0.4 : 0.3} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});
