import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Custom tactile icon for the Journal tab:
 * Elegant open journal with bookmark ribbon and spiritual reflection sparkle.
 */
export function JournalNavIcon({
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
        {/* Open Book Wings */}
        <Path
          d="M12 7.5C10.5 6.5 8.5 6 6 6C4.5 6 3.2 6.3 2 7V19.5C3.2 18.8 4.5 18.5 6 18.5C8.5 18.5 10.5 19 12 20.2M12 7.5C13.5 6.5 15.5 6 18 6C19.5 6 20.8 6.3 22 7V19.5C20.8 18.8 19.5 18.5 18 18.5C15.5 18.5 13.5 19 12 20.2M12 7.5V20.2"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bookmark ribbon hanging down center */}
        <Path
          d="M12 7.5V13L10.5 11.5L9 13V6.5"
          fill={active ? contrastColor : color}
          stroke={active ? contrastColor : color}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        {/* Small top-right reflection sparkle */}
        <Path
          d="M20 3L20.5 4.5L22 5L20.5 5.5L20 7L19.5 5.5L18 5L19.5 4.5L20 3Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}
