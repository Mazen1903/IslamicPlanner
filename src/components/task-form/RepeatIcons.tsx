import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';

export interface CustomBadgeIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  decorative?: boolean;
}

const REPEAT_PNG = require('../../../assets/icons/task/doesnt_repeat.png');
const PRIORITY_PNG = require('../../../assets/icons/task/opt_priority.png');
const HABIT_PNG = require('../../../assets/icons/task/opt_habit.png');

/**
 * RepeatHeaderBadgeIcon
 * 44x44 rounded squircle with soft mint background and cycle arrows.
 */
export function RepeatHeaderBadgeIcon({
  size = 44,
  style,
  testID = 'repeat-header-badge-icon',
  accessibilityLabel = 'Repeat Header Icon',
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.badgeBase,
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
        source={REPEAT_PNG}
        style={{ width: size, height: size, borderRadius: radii.md }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * RepeatNoneBadgeIcon (Doesn't repeat / Single task)
 */
export function RepeatNoneBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
        style,
      ]}
    >
      <MaterialCommunityIcons name="pencil-outline" size={Math.round(size * 0.52)} color={color ?? colors.textSecondary} />
    </View>
  );
}

/**
 * RepeatDailyBadgeIcon (Repeats daily)
 */
export function RepeatDailyBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <MaterialCommunityIcons name="calendar-today" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * RepeatWeekdaysBadgeIcon (Monday to Friday)
 */
export function RepeatWeekdaysBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <MaterialCommunityIcons name="calendar-range" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * RepeatWeeklyBadgeIcon (Repeats weekly)
 */
export function RepeatWeeklyBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <MaterialCommunityIcons name="calendar-week" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * RepeatMonthlyBadgeIcon (Repeats monthly)
 */
export function RepeatMonthlyBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <MaterialCommunityIcons name="calendar-month" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * RepeatSpecificDaysBadgeIcon (Specific days of week)
 */
export function RepeatSpecificDaysBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <Ionicons name="moon-outline" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * RepeatCustomBadgeIcon (Custom advanced rules)
 */
export function RepeatCustomBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.primaryLight },
        style,
      ]}
    >
      <MaterialCommunityIcons name="calendar-star" size={Math.round(size * 0.52)} color={color ?? colors.primary} />
    </View>
  );
}

/**
 * PriorityHeaderBadgeIcon
 * 44x44 rounded squircle with soft red/amber background and priority flag.
 */
export function PriorityHeaderBadgeIcon({
  size = 44,
  style,
  testID = 'priority-header-badge-icon',
  accessibilityLabel = 'Priority Header Icon',
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.badgeBase,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceSecondary,
        },
        style,
      ]}
    >
      <Image
        source={PRIORITY_PNG}
        style={{ width: size, height: size, borderRadius: radii.md }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * PriorityNormalBadgeIcon
 */
export function PriorityNormalBadgeIcon({
  size = 36,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.surfaceSecondary },
        style,
      ]}
    >
      <MaterialCommunityIcons name="flag-outline" size={Math.round(size * 0.52)} color={colors.textSecondary} />
    </View>
  );
}

/**
 * PriorityImportantBadgeIcon
 */
export function PriorityImportantBadgeIcon({
  size = 36,
  style,
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        { width: size, height: size, borderRadius: radii.md, backgroundColor: colors.error + '1E' },
        style,
      ]}
    >
      <MaterialCommunityIcons name="flag" size={Math.round(size * 0.52)} color={colors.error} />
    </View>
  );
}

/**
 * TrackStreakHeaderBadgeIcon
 * 44x44 warm amber/orange squircle with habit/streak flame.
 */
export function TrackStreakHeaderBadgeIcon({
  size = 44,
  style,
  testID = 'track-streak-header-badge-icon',
  accessibilityLabel = 'Track Streak Header Icon',
  decorative = true,
}: CustomBadgeIconProps) {
  const { colors, radii } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.badgeBase,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: colors.warning + '20',
        },
        style,
      ]}
    >
      <Image
        source={HABIT_PNG}
        style={{ width: size, height: size, borderRadius: radii.md }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * TrackStreakFlameBadgeIcon
 */
export function TrackStreakFlameBadgeIcon({
  size = 48,
  active = false,
  style,
  decorative = true,
}: CustomBadgeIconProps & { active?: boolean }) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        {
          width: size,
          height: size,
          borderRadius: radii.lg,
          backgroundColor: active ? colors.warning + '30' : colors.surfaceSecondary,
        },
        style,
      ]}
    >
      <Ionicons
        name={active ? 'flame' : 'flame-outline'}
        size={Math.round(size * 0.56)}
        color={active ? colors.warning : colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badgeBase: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
