import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

export interface NavIconProps {
  size?: number;
  color: string;
  active?: boolean;
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Custom tactile icon for the Planner tab:
 * Serene mosque archway silhouette enclosing a focused checklist.
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
  const contrastColor = colors.textOnPrimary;

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      testID={testID}
      accessible={!decorative}
      accessibilityRole="image"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Mosque Arch Contour */}
        <Path
          d="M12 2C8.5 4.5 5 7 5 12V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V12C19 7 15.5 4.5 12 2Z"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={active ? 1.8 : 1.8}
          strokeLinejoin="round"
        />
        {/* Checklist rows inside arch */}
        <Path
          d="M8.5 11.5L10 13L14 9"
          stroke={active ? contrastColor : color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 16.5H15"
          stroke={active ? contrastColor : color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
