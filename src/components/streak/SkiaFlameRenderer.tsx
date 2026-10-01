import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  LinearGradient,
  vec,
  Group,
  Skia,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { getFlameColorTier, FLAME_COLORS } from './flameColorTiers';
import type { SvgFlameBadgeProps } from './SvgFlameBadge';

// Canonical iconic flame silhouette (Ionicons / SF Symbol canonical silhouette)
const OUTER_FLAME_PATH =
  Skia.Path.MakeFromSVGString(
    'M 208 495.84 C 180 480 128 432 128 336 c 0 -76 40 -128 64 -160 c 0 52 40 64 64 64 c 0 -64 48 -112 80 -144 c 32 48 96 128 96 240 c 0 96 -48 144 -80 160 C 328 512 236 512 208 495.84 Z'
  ) ?? Skia.Path.Make();

const INNER_FLAME_PATH =
  Skia.Path.MakeFromSVGString(
    'M 230 470 C 205 450 165 410 165 345 c 0 -55 30 -90 48 -112 c 0 35 25 45 42 45 c 0 -45 35 -75 50 -95 c 18 35 55 85 55 162 c 0 65 -30 100 -52 115 C 290 485 245 485 230 470 Z'
  ) ?? Skia.Path.Make();

export function SkiaFlameRenderer({ count, size = 28, testID = 'streak-flame-badge-skia' }: SvgFlameBadgeProps) {
  const tier = getFlameColorTier(count);
  const colors = FLAME_COLORS[tier];

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.97, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const width = size;
  const height = Math.round(size * 1.3);
  const countStr = count > 999 ? '999+' : count.toString();
  const fontSize = countStr.length >= 3 ? Math.round(size * 0.32) : Math.round(size * 0.38);

  const canvasScale = width / 320;

  return (
    <Animated.View
      style={[styles.container, { width, height }, animStyle]}
      accessibilityRole="text"
      accessibilityLabel={`Streak of ${count} days`}
      testID={testID}
    >
      <Canvas style={{ width, height }}>
        <Group
          transform={[
            { translateX: -120 * canvasScale },
            { translateY: -90 * canvasScale },
            { scale: canvasScale },
          ]}
        >
          {/* Outer Flame Body */}
          <Path path={OUTER_FLAME_PATH}>
            <LinearGradient
              start={vec(280, 90)}
              end={vec(280, 510)}
              colors={[colors.inner, colors.middle, colors.outer]}
            />
          </Path>

          {/* Subtle Inner Accent */}
          <Path path={INNER_FLAME_PATH} color="rgba(255, 255, 255, 0.18)" />
        </Group>
      </Canvas>

      {/* Number Centered Inside Flame Belly */}
      <View style={styles.numberOverlay} pointerEvents="none">
        <Text
          style={[
            styles.countText,
            {
              fontSize,
              color: colors.textColor,
            },
          ]}
          numberOfLines={1}
        >
          {countStr}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  numberOverlay: {
    position: 'absolute',
    top: '46%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});
