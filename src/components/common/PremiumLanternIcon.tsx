import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Circle, Rect } from 'react-native-svg';

export interface PremiumLanternIconProps {
  size?: number;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * PremiumLanternIcon — An ornate, golden glowing Fanous (Islamic Lantern)
 * used as the bespoke premium identifier throughout the Islamic Planner app.
 */
export function PremiumLanternIcon({
  size = 20,
  glow = false,
  style,
  testID = 'premium-lantern-icon',
}: PremiumLanternIconProps) {
  const width = size;
  const height = Math.round(size * 1.25);

  return (
    <View style={[styles.container, { width, height }, style]} testID={testID} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 40 50" fill="none">
        <Defs>
          {/* Lustrous Polished Gold Gradient */}
          <LinearGradient id="gold_metallic" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FDE68A" />
            <Stop offset="30%" stopColor="#F59E0B" />
            <Stop offset="70%" stopColor="#D97706" />
            <Stop offset="100%" stopColor="#92400E" />
          </LinearGradient>

          {/* Core Radiant Flame Glow */}
          <RadialGradient id="lantern_glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#FFFBEB" stopOpacity="1" />
            <Stop offset="40%" stopColor="#FDE047" stopOpacity="0.85" />
            <Stop offset="75%" stopColor="#F59E0B" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </RadialGradient>

          {/* Glass Chamber Tint */}
          <LinearGradient id="glass_chamber" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.45" />
            <Stop offset="50%" stopColor="#FDE68A" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>

        {/* Ambient Outer Halo when glow is enabled */}
        {glow && (
          <Circle cx="20" cy="27" r="16" fill="url(#lantern_glow)" opacity={0.65} />
        )}

        {/* 1. Top Hanging Ring */}
        <Circle
          cx="20"
          cy="4.5"
          r="3"
          stroke="url(#gold_metallic)"
          strokeWidth="1.6"
          fill="none"
        />

        {/* 2. Spire & Finial */}
        <Path
          d="M 19 7 L 21 7 L 20.5 9 L 19.5 9 Z"
          fill="url(#gold_metallic)"
        />
        <Circle cx="20" cy="9.5" r="1.2" fill="#FDE68A" />

        {/* 3. Ornate Lantern Dome / Cap */}
        <Path
          d="M 20 10.5 C 24 12 28 14 30 17 L 10 17 C 12 14 16 12 20 10.5 Z"
          fill="url(#gold_metallic)"
        />
        {/* Dome Rim Trim */}
        <Rect x="8.5" y="17" width="23" height="2" rx="1" fill="#FDE68A" />

        {/* 4. Glass Chamber Body */}
        <Path
          d="M 10 19 L 30 19 L 27 34 L 13 34 Z"
          fill="url(#glass_chamber)"
        />

        {/* 5. Inner Warm Flame / Candle Noor */}
        <Circle cx="20" cy="26" r="4.5" fill="url(#lantern_glow)" />
        <Path
          d="M 20 22 C 21.2 24.5 22 26 22 27.5 C 22 28.8 21 29.8 20 29.8 C 19 29.8 18 28.8 18 27.5 C 18 26 18.8 24.5 20 22 Z"
          fill="#FFFBEB"
        />

        {/* 6. Geometric Lattice Ribs (Filigree) */}
        {/* Center Rib */}
        <Path d="M 20 19 L 20 34" stroke="url(#gold_metallic)" strokeWidth="1.2" />
        {/* Left Rib */}
        <Path d="M 15 19 L 16.5 34" stroke="url(#gold_metallic)" strokeWidth="1" strokeOpacity="0.85" />
        {/* Right Rib */}
        <Path d="M 25 19 L 23.5 34" stroke="url(#gold_metallic)" strokeWidth="1" strokeOpacity="0.85" />
        {/* Outer Frame Borders */}
        <Path d="M 10 19 L 13 34" stroke="url(#gold_metallic)" strokeWidth="1.2" />
        <Path d="M 30 19 L 27 34" stroke="url(#gold_metallic)" strokeWidth="1.2" />

        {/* 7. Lower Collar Trim */}
        <Rect x="11.5" y="34" width="17" height="2" rx="0.8" fill="#FDE68A" />

        {/* 8. Stepped Flared Pedestal Base */}
        <Path
          d="M 13 36 L 27 36 L 29 41 C 29 42 27 42.5 20 42.5 C 13 42.5 11 42 11 41 Z"
          fill="url(#gold_metallic)"
        />

        {/* 9. Bottom Hanging Teardrop Bauble */}
        <Circle cx="20" cy="45" r="1.5" fill="#FDE68A" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
