import React from 'react';
import { StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface AppBackButtonProps {
  onPress?: () => void;
  accessibilityLabel?: string;
  label?: string;
  directional?: boolean;
  size?: number;
  iconSize?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'subtle' | 'ghost';
}

/**
 * Universal squircle back button used across all screens and sheets in the app.
 * Provides tactile feedback, full RTL directional awareness, and adherence to theme tokens.
 */
export function AppBackButton({
  onPress,
  accessibilityLabel,
  label = 'Go back',
  directional = true,
  size = 38,
  iconSize = 22,
  testID = 'app-back-button',
  style,
  variant = 'subtle',
}: AppBackButtonProps) {
  const { colors, touchTargets } = useTheme();
  const effectiveLabel = accessibilityLabel ?? label;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={effectiveLabel}
      testID={testID}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [
        styles.button,
        {
          width: Math.max(size, touchTargets.min),
          height: Math.max(size, touchTargets.min),
          borderRadius: Math.round(size * 0.28),
          backgroundColor:
            variant === 'elevated'
              ? (pressed ? colors.primaryPressed : colors.primary)
              : (pressed ? colors.surfaceSecondary : colors.surface),
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderColor: variant === 'elevated' ? colors.primary : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <Icon
        name="chevron-left"
        size={iconSize}
        color={variant === 'elevated' ? colors.textOnPrimary : colors.textPrimary}
        directional={directional}
        decorative
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
