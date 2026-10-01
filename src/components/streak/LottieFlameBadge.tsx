import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { getFlameColorTier, FLAME_COLORS, type FlameTier } from './flameColorTiers';

const flameTier1 = require('../../assets/lottie/flame-tier1.json');
const flameTier2 = require('../../assets/lottie/flame-tier2.json');
const flameTier3 = require('../../assets/lottie/flame-tier3.json');
const flameTier4 = require('../../assets/lottie/flame-tier4.json');

const FLAME_ANIMATIONS: Record<FlameTier, any> = {
  WARM: flameTier1,
  BRIGHT: flameTier2,
  HOT: flameTier3,
  ELECTRIC: flameTier4,
};

export interface LottieFlameBadgeProps {
  count: number;
  size?: number;
  testID?: string;
}

/**
 * LottieFlameBadge – fluid Lottie flame animation with streak count centered inside.
 * Dynamically switches between the 4 custom color palettes based on streak tier:
 * - 1–7 days: Flame animation 1 (Warm Gold)
 * - 8–30 days: Flame animation 2 (Bright Orange)
 * - 31–99 days: Flame animation 3 (Crimson Fire)
 * - 100+ days: Flame animation 4 (Sunset Berry)
 */
export function LottieFlameBadge({
  count,
  size = 36,
  testID,
}: LottieFlameBadgeProps) {
  const animRef = useRef<LottieView>(null);
  const tier = getFlameColorTier(count);
  const colors = FLAME_COLORS[tier];
  const animationSource = FLAME_ANIMATIONS[tier];

  // Responsive font size so 1-, 2-, and 3-digit streaks fit comfortably
  const fontSize =
    count >= 100
      ? Math.max(9, size * 0.28)
      : count >= 10
      ? Math.max(10, size * 0.32)
      : Math.max(11, size * 0.36);

  // The 800x800 Lottie canvas has the visible flame centered at roughly ~390px tall.
  // Scaling LottieView to size * 2.0 ensures the flame body fills the badge container.
  const lottieDimension = size * 2.0;
  const containerHeight = size * 1.2;
  const lottieTopOffset = (containerHeight - lottieDimension) / 2;
  const lottieLeftOffset = (size - lottieDimension) / 2;

  return (
    <View
      testID={testID ?? 'streak-flame-badge'}
      style={[
        styles.container,
        {
          width: size,
          height: containerHeight,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Streak of ${count} days`}
    >

      {/* Lottie fluid flame corresponding to streak tier */}
      <View style={styles.lottieClipper} pointerEvents="none">
        <LottieView
          ref={animRef}
          source={animationSource}
          autoPlay
          loop
          renderMode="HARDWARE"
          style={{
            width: lottieDimension,
            height: lottieDimension,
            position: 'absolute',
            top: lottieTopOffset,
            left: lottieLeftOffset,
          }}
          speed={1.0}
        />
      </View>

      {/* Streak number positioned in the flame's lower belly */}
      <View style={styles.countOverlay} pointerEvents="none">
        <Text
          style={[
            styles.countText,
            {
              fontSize,
              color: '#FFFFFF',
              textShadowColor: 'rgba(0, 0, 0, 0.75)',
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 3,
            },
          ]}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieClipper: {
    ...StyleSheet.absoluteFill,
    overflow: 'visible',
  },
  countOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: '10%',
  },
  countText: {
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
