import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Custom tactile icon for the Calendar tab:
 * Monthly calendar card with Islamic crescent moon accent.
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
  const contrastColor = colors.textOnPrimary;

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
          stroke={color}
          strokeWidth={1.8}
          fill={active ? color : 'none'}
        />
        {/* Top Header Line */}
        <Path
          d="M3.5 9H20.5"
          stroke={active ? contrastColor : color}
          strokeWidth={1.5}
        />
        {/* Binder Pins */}
        <Path
          d="M8 2.5V5M16 2.5V5"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        {/* Date grid dots */}
        <Path
          d="M8 13H8.01M12 13H12.01M8 17H8.01M12 17H12.01"
          stroke={active ? contrastColor : color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Crescent Moon accent on bottom-right corner */}
        <Path
          d="M17.8 13C16.8 13 16 13.8 16 14.8C16 15.8 16.8 16.6 17.8 16.6C17.2 17.5 16 17.8 15 17.2C14.2 16.6 13.8 15.5 14.2 14.5C14.6 13.5 15.6 12.8 16.7 12.8C17.1 12.8 17.5 12.9 17.8 13Z"
          fill={active ? contrastColor : color}
        />
      </Svg>
    </View>
  );
}
