import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';

export interface NavIconProps {
  size?: number;
  color?: string;
  active?: boolean;
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Duotone theme-aware vector icon for the Planner tab.
 */
export function PlannerNavIcon({
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
        {/* Clipboard back */}
        <Path
          d="M19 4h-3V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Clip */}
        <Rect
          x="9"
          y="2"
          width="6"
          height="3.5"
          rx="1"
          fill={active ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeWidth={1.6}
        />
        {/* Checkmark */}
        <Path
          d="M7.5 12l2.5 2.5 5.5-5.5"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Horizontal task line */}
        <Path
          d="M8 17.5h8"
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
