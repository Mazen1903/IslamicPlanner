import React from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface SettingsToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
}

export function SettingsToggle({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  icon,
  testID,
}: SettingsToggleProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  const trackColor = {
    false: colors.checkboxUnchecked, // ADR-029: off-state uses checkboxUnchecked, not raw literal
    true: colors.primary,
  };

  const thumbColor = Platform.select({
    ios: undefined,
    default: value ? colors.surface : colors.textSecondary,
  });

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: touchTargets.min,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      testID={testID}
    >
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              marginRight: spacing.md,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.sm,
              width: 32,
              height: 32,
            },
          ]}
        >
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.textPrimary, fontWeight: '500' },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={trackColor}
        thumbColor={thumbColor}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        testID={testID ? `${testID}-switch` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
});
