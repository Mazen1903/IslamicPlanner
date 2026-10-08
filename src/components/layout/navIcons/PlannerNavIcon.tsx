import React from 'react';
import { View, Image, type StyleProp, type ViewStyle } from 'react-native';
import { JOURNAL_NAV_ASSETS } from '@/constants/journalIconAssets';

export interface NavIconProps {
  size?: number;
  color?: string;
  active?: boolean;
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Custom tactile icon for the Planner tab using illustrated asset.
 */
export function PlannerNavIcon({
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
        source={JOURNAL_NAV_ASSETS.planner}
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
