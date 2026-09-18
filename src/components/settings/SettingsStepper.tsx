import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface SettingsStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (value: number) => void;
  testID?: string;
}

export function SettingsStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  formatValue,
  onChange,
  testID,
}: SettingsStepperProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  const handleDecrement = () => {
    if (canDecrement) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChange(value + step);
    }
  };

  const formattedDisplay = formatValue
    ? formatValue(value)
    : unit
    ? `${value > 0 ? `+${value}` : value} ${unit}`
    : `${value > 0 ? `+${value}` : value}`;

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
        },
      ]}
      testID={testID}
    >
      <Text
        style={[
          typography.bodyMedium,
          { color: colors.textPrimary, flex: 1, fontWeight: '500' },
        ]}
      >
        {label}
      </Text>

      <View style={styles.controls}>
        <Pressable
          onPress={handleDecrement}
          disabled={!canDecrement}
          style={({ pressed }) => [
            styles.button,
            {
              width: touchTargets.min,
              height: touchTargets.min,
              borderRadius: radii.sm,
              backgroundColor: pressed && canDecrement ? colors.surfaceSecondary : 'transparent',
              opacity: canDecrement ? 1 : 0.3,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          testID={testID ? `${testID}-decrement` : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <View
            style={{
              width: 14,
              height: 2,
              borderRadius: 1,
              backgroundColor: colors.textPrimary,
            }}
          />
        </Pressable>

        <Text
          style={[
            typography.labelMedium,
            {
              color: colors.textPrimary,
              minWidth: 70,
              textAlign: 'center',
              fontWeight: '600',
            },
          ]}
          testID={testID ? `${testID}-value` : undefined}
        >
          {formattedDisplay}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={!canIncrement}
          style={({ pressed }) => [
            styles.button,
            {
              width: touchTargets.min,
              height: touchTargets.min,
              borderRadius: radii.sm,
              backgroundColor: pressed && canIncrement ? colors.surfaceSecondary : 'transparent',
              opacity: canIncrement ? 1 : 0.3,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          testID={testID ? `${testID}-increment` : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Icon name="plus" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
