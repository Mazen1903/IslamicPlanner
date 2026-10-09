import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Duotone theme-aware vector icon for the More / Settings tab.
 */
export function MoreNavIcon({
  size = 24,
  color,
  active = false,
  decorative = true,
  style,
  testID,
}: NavIconProps) {
  const { colors } = useTheme();
  const strokeColor = color ?? (active ? colors.tabActive : colors.tabInactive);
  const fillColor = active ? colors.primaryLight : 'transparent';

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      testID={testID}
      accessible={!decorative}
      accessibilityRole="image"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* 4 squircle tiles */}
        <Rect
          x="3.5"
          y="3.5"
          width="7"
          height="7"
          rx="2.2"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.8}
        />
        <Rect
          x="13.5"
          y="3.5"
          width="7"
          height="7"
          rx="2.2"
          fill={active ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeWidth={1.8}
        />
        <Rect
          x="3.5"
          y="13.5"
          width="7"
          height="7"
          rx="2.2"
          fill={active ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeWidth={1.8}
        />
        <Rect
          x="13.5"
          y="13.5"
          width="7"
          height="7"
          rx="2.2"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.8}
        />
      </Svg>
    </View>
  );
}
