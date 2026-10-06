import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';

export interface ReminderIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  decorative?: boolean;
}

const REMINDER_PNG = require('../../../assets/icons/task/opt_reminder.png');
const STEPPER_PLUS_PNG = require('../../../assets/icons/settings/stepper_plus.png');
const STEPPER_MINUS_PNG = require('../../../assets/icons/settings/stepper_minus.png');

/**
 * 1. ReminderHeaderBadgeIcon
 * Beautiful rounded squircle badge matching the app's task form design language.
 */
export function ReminderHeaderBadgeIcon({
  size = 44,
  style,
  testID = 'reminder-header-badge-icon',
  accessibilityLabel = 'Reminder Header Icon',
  decorative = true,
}: ReminderIconProps) {
  const { colors, radii } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.headerBadge,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: colors.primaryLight,
        },
        style,
      ]}
    >
      <Image
        source={REMINDER_PNG}
        style={{ width: size, height: size, borderRadius: radii.md }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * 2. ReminderCardBadgeIcon
 * Rounded pastel badge displayed alongside each active reminder row.
 */
export function ReminderCardBadgeIcon({
  size = 36,
  color,
  style,
  testID = 'reminder-card-badge-icon',
  accessibilityLabel = 'Reminder Alert',
  decorative = true,
}: ReminderIconProps) {
  const { colors, radii } = useTheme();
  const iconColor = color ?? colors.primary;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.cardBadge,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: colors.primaryLight,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="bell-ring-outline"
        size={Math.round(size * 0.55)}
        color={iconColor}
      />
    </View>
  );
}

/**
 * 3. ReminderEmptyStateIcon
 * Large, friendly pastel illustration for the empty state when no alerts exist yet.
 */
export function ReminderEmptyStateIcon({
  size = 64,
  style,
  testID = 'reminder-empty-state-icon',
  accessibilityLabel = 'No Reminders Set',
  decorative = true,
}: ReminderIconProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.emptyBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="bell-sleep-outline"
        size={Math.round(size * 0.52)}
        color={colors.primary}
      />
      <View
        style={[
          styles.emptySparkle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
          },
        ]}
      >
        <Ionicons name="sparkles" size={12} color={colors.primary} />
      </View>
    </View>
  );
}

/**
 * 4. ReminderStepperMinusIcon
 * Tactile stepper button for decrementing reminder time.
 */
export function ReminderStepperMinusIcon({
  size = 40,
  style,
  testID = 'reminder-stepper-minus-icon',
  accessibilityLabel = 'Decrease value',
  decorative = true,
}: ReminderIconProps) {
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.stepperButtonContainer,
        { width: size, height: size },
        style,
      ]}
    >
      <Image
        source={STEPPER_MINUS_PNG}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * 5. ReminderStepperPlusIcon
 * Tactile stepper button for incrementing reminder time.
 */
export function ReminderStepperPlusIcon({
  size = 40,
  style,
  testID = 'reminder-stepper-plus-icon',
  accessibilityLabel = 'Increase value',
  decorative = true,
}: ReminderIconProps) {
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.stepperButtonContainer,
        { width: size, height: size },
        style,
      ]}
    >
      <Image
        source={STEPPER_PLUS_PNG}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * 6. ReminderUnitIcon
 * Unit badge indicator for 'at_time' | 'minutes' | 'hours' | 'days'.
 */
export function ReminderUnitIcon({
  unit,
  size = 16,
  color,
  style,
  decorative = true,
}: {
  unit: 'at_time' | 'minutes' | 'hours' | 'days';
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  decorative?: boolean;
}) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.textSecondary;

  let iconName: any = 'clock-outline';
  let lib: 'mci' | 'ionicons' = 'mci';

  if (unit === 'at_time') {
    iconName = 'bell-check-outline';
    lib = 'mci';
  } else if (unit === 'minutes') {
    iconName = 'timer-outline';
    lib = 'mci';
  } else if (unit === 'hours') {
    iconName = 'clock-time-four-outline';
    lib = 'mci';
  } else if (unit === 'days') {
    iconName = 'calendar-outline';
    lib = 'ionicons';
  }

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {lib === 'mci' ? (
        <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
      ) : (
        <Ionicons name={iconName} size={size} color={iconColor} />
      )}
    </View>
  );
}

/**
 * 7. ReminderTrashIcon
 * Clean trash icon for removing reminders from the active list.
 */
export function ReminderTrashIcon({
  size = 18,
  color,
  style,
  testID = 'reminder-trash-icon',
  accessibilityLabel = 'Delete reminder',
  decorative = true,
}: ReminderIconProps) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.danger;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Ionicons name="trash-outline" size={size} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptySparkle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
