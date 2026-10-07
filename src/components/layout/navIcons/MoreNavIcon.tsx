import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Custom tactile icon for the More tab:
 * 4-squircle geometric Islamic grid with tactile rounded corners.
 */
export function MoreNavIcon({
  size = 24,
  color,
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
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Top-Left */}
        <Rect
          x="3.5"
          y="3.5"
          width="7"
          height="7"
          rx="2.5"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
        />
        {/* Top-Right */}
        <Rect
          x="13.5"
          y="3.5"
          width="7"
          height="7"
          rx="2.5"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
        />
        {/* Bottom-Left */}
        <Rect
          x="3.5"
          y="13.5"
          width="7"
          height="7"
          rx="2.5"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
        />
        {/* Bottom-Right */}
        <Rect
          x="13.5"
          y="13.5"
          width="7"
          height="7"
          rx="2.5"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
        />
      </Svg>
    </View>
  );
}
