import React from 'react';
import { View, Image } from 'react-native';
import { JOURNAL_NAV_ASSETS } from '@/constants/journalIconAssets';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Custom tactile icon for the More / Settings tab using illustrated asset.
 */
export function MoreNavIcon({
  size = 24,
  active = false,
  decorative = true,
  style,
  testID,
}: NavIconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      testID={testID}
      accessible={!decorative}
      accessibilityRole="image"
    >
      <Image
        source={JOURNAL_NAV_ASSETS.more}
        style={{
          width: size,
          height: size,
          opacity: active ? 1 : 0.65,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
