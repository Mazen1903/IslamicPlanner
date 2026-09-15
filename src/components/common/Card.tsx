import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'card' | 'sm' | 'md' | 'lg' | 'pill';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'card',
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CardProps) {
  const theme = useTheme();

  const paddingValues: Record<CardPadding, number> = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
  };

  const radiusValues: Record<CardRadius, number> = {
    card: theme.radii.card,
    sm: theme.radii.sm,
    md: theme.radii.md,
    lg: theme.radii.lg,
    pill: theme.radii.pill,
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.surfaceElevated,
          shadowColor: theme.colors.shadowElevated,
          ...theme.shadows.elevated,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadowColor,
          ...theme.shadows.card,
          borderColor: theme.colors.border,
          borderWidth: theme.isDark ? 1 : 0, // subtle border in dark mode for contrast
        };
    }
  };

  const baseStyle: ViewStyle = {
    borderRadius: radiusValues[radius],
    padding: paddingValues[padding],
    ...getVariantStyles(),
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.base,
          baseStyle,
          {
            opacity: pressed && !disabled ? 0.92 : 1,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, baseStyle, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});