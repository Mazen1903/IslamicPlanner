import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const isInteractive = !disabled && !loading;

  // Size styling
  const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; minHeight: number }> = {
    sm: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      minHeight: theme.touchTargets.min,
    },
    md: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      minHeight: theme.touchTargets.min,
    },
    lg: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: theme.touchTargets.comfortable,
    },
  };

  const textTypography = {
    sm: theme.typography.labelSmall,
    md: theme.typography.labelLarge,
    lg: theme.typography.headlineMedium,
  }[size];

  // Resolve background and text colors based on variant and state
  const getVariantColors = (isPressed: boolean) => {
    if (!isInteractive) {
      return {
        background: variant === 'ghost' ? 'transparent' : theme.colors.disabledBackground,
        text: theme.colors.disabledText,
        border: 'transparent',
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          background: isPressed ? theme.colors.surfaceSecondary : theme.colors.primaryLight,
          text: theme.colors.primary,
          border: 'transparent',
        };
      case 'ghost':
        return {
          background: isPressed ? theme.colors.primaryLight : 'transparent',
          text: theme.colors.primary,
          border: 'transparent',
        };
      case 'destructive':
        return {
          background: isPressed ? theme.colors.danger : theme.colors.danger,
          text: theme.colors.textOnPrimary,
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          background: isPressed ? theme.colors.primaryPressed : theme.colors.primary,
          text: theme.colors.textOnPrimary,
          border: 'transparent',
        };
    }
  };

  return (
    <Pressable
      testID={testID}
      disabled={!isInteractive}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: !isInteractive,
        busy: loading,
      }}
      style={({ pressed }) => {
        const colors = getVariantColors(pressed);
        return [
          styles.base,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: theme.radii.pill,
            paddingVertical: sizeStyles[size].paddingVertical,
            paddingHorizontal: sizeStyles[size].paddingHorizontal,
            minHeight: sizeStyles[size].minHeight,
            minWidth: theme.touchTargets.min,
            opacity: pressed && isInteractive ? 0.92 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const colors = getVariantColors(pressed);

        if (loading) {
          return (
            <ActivityIndicator
              size="small"
              color={colors.text}
              accessibilityLabel="Loading"
            />
          );
        }

        return (
          <>
            {leftIcon && <>{leftIcon}</>}
            <Text
              style={[
                textTypography,
                styles.text,
                {
                  color: colors.text,
                  marginLeft: leftIcon ? theme.spacing.xs : 0,
                  marginRight: rightIcon ? theme.spacing.xs : 0,
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {rightIcon && <>{rightIcon}</>}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    textAlign: 'center',
  },
});