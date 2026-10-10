import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useHeroArt, useTheme } from '@/theme';

export interface HeroArtworkProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Pinned header hero artwork component positioned consistently in the top-right
 * of all screen headers (Today, Planner, Add Task, Journal, Settings).
 * Half of the artwork overflows outside the screen bounds so only the
 * lower-left portion (palm tree, crescent moon, left minaret, central dome) is visible.
 */
export function HeroArtwork({ style, testID = 'header-hero-artwork' }: HeroArtworkProps) {
  const heroArt = useHeroArt();
  const { isDark } = useTheme();

  return (
    <View
      style={[styles.container, style]}
      pointerEvents="none"
      importantForAccessibility="no"
      accessibilityElementsHidden={true}
      testID={testID}
    >
      <Image
        source={heroArt}
        style={[styles.image, { opacity: isDark ? 0.88 : 0.95 }]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Header mosque artwork"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -6,
    right: -48,
    width: 210,
    height: 130,
    zIndex: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  image: {
    width: 210,
    height: 130,
  },
});
