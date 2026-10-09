import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Duotone theme-aware vector icon for the Calendar tab.
 */
export function CalendarNavIcon({
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
        {/* Calendar Body */}
        <Rect
          x="3.5"
          y="4.5"
          width="17"
          height="16"
          rx="3"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.8}
        />
        {/* Top binder rings */}
        <Path
          d="M8 2.5v3M16 2.5v3"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Header divider */}
        <Path
          d="M3.5 9h17"
          stroke={strokeColor}
          strokeWidth={1.6}
        />
        {/* Grid dots */}
        <Circle cx="8" cy="12.5" r="1.15" fill={strokeColor} />
        <Circle cx="12" cy="12.5" r="1.15" fill={strokeColor} />
        <Circle cx="16" cy="12.5" r="1.15" fill={strokeColor} />
        <Circle cx="8" cy="16" r="1.15" fill={strokeColor} />
        <Circle cx="12" cy="16" r="1.4" fill={active ? strokeColor : colors.primary} />
        <Circle cx="16" cy="16" r="1.15" fill={strokeColor} />
      </Svg>
    </View>
  );
}
