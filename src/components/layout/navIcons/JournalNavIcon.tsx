import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { NavIconProps } from './PlannerNavIcon';

/**
 * Duotone theme-aware vector icon for the Journal tab.
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
        {/* Book cover / pages */}
        <Path
          d="M4.5 19.5V5a2.5 2.5 0 0 1 2.5-2.5H19a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a2.5 2.5 0 0 1-2.5-2.5z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Spine line */}
        <Path
          d="M7 2.5v19"
          stroke={strokeColor}
          strokeWidth={1.5}
        />
        {/* Bookmark ribbon */}
        <Path
          d="M12 2.5v7l2-1.5 2 1.5v-7"
          fill={active ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* Note / writing lines */}
        <Path
          d="M10 14.5h6M10 17.5h4"
          stroke={strokeColor}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
