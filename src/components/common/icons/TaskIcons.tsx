import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '@/theme';

export interface TaskIconProps {
  size?: number;
  color?: string;
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Exact Time / Time row clock icon
 */
export function ExactTimeClockIcon({
  size = 24,
  color,
  style,
  testID = 'task-icon-clock',
  accessibilityLabel = 'Clock',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons
        name="time-outline"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Prayer Window / Date row calendar icon
 */
export function PrayerCalendarIcon({
  size = 24,
  color,
  style,
  testID = 'task-icon-calendar',
  accessibilityLabel = 'Prayer Calendar',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="calendar-month-outline"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Anytime Today golden sun icon
 */
export function AnytimeSunIcon({
  size = 24,
  color,
  style,
  testID = 'task-icon-sun',
  accessibilityLabel = 'Anytime Today Sun',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="weather-sunny"
        size={size}
        color={color ?? colors.warning}
      />
    </View>
  );
}

/**
 * Repeat circular cycle arrows
 */
export function RepeatCycleIcon({
  size = 24,
  color,
  style,
  testID = 'task-icon-repeat',
  accessibilityLabel = 'Repeat Cycle',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="repeat"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * More options sliders / equalizer
 */
export function MoreOptionsSlidersIcon({
  size = 24,
  color,
  style,
  testID = 'task-icon-options',
  accessibilityLabel = 'More options',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Tilted pencil icon
 */
export function TaskPencilIcon({
  size = 20,
  color,
  style,
  testID = 'task-icon-pencil',
  accessibilityLabel = 'Task name',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="pencil-outline"
        size={size}
        color={color ?? colors.textSecondary}
      />
    </View>
  );
}

/**
 * Green shaded mosque icon
 */
export function TaskMosqueIcon({
  size = 28,
  color,
  style,
  testID = 'task-icon-mosque',
  accessibilityLabel = 'Relative to Prayer Mosque',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <FontAwesome5
        name="mosque"
        size={Math.round(size * 0.85)}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Emerald cog / gear icon
 */
export function MoreOptionsCogIcon({
  size = 26,
  color,
  style,
  testID = 'task-icon-cog',
  accessibilityLabel = 'More Options Cog',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="cog-outline"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Emerald bell icon
 */
export function ReminderBellIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-bell',
  accessibilityLabel = 'Reminder Bell',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons
        name="notifications-outline"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Coral priority flag icon
 */
export function PriorityFlagIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-flag',
  accessibilityLabel = 'Priority Flag',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons
        name="flag-outline"
        size={size}
        color={color ?? colors.danger}
      />
    </View>
  );
}

/**
 * Sky blue duration clock icon
 */
export function DurationClockIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-duration-clock',
  accessibilityLabel = 'Duration Clock',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons
        name="hourglass-outline"
        size={size}
        color={color ?? colors.info}
      />
    </View>
  );
}

/**
 * Amber/gold document sheet icon
 */
export function NotesDocumentIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-document',
  accessibilityLabel = 'Notes Document',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="file-document-outline"
        size={size}
        color={color ?? colors.warning}
      />
    </View>
  );
}

/**
 * Purple subtasks checklist icon
 */
export function SubtasksChecklistIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-subtasks',
  accessibilityLabel = 'Subtasks Checklist',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="format-list-checks"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Paperclip attachment icon
 */
export function AttachmentClipIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-attachment',
  accessibilityLabel = 'Attachment Clip',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="paperclip"
        size={size}
        color={color ?? colors.textSecondary}
      />
    </View>
  );
}

/**
 * Price tag icon
 */
export function TagsTagIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-tag',
  accessibilityLabel = 'Tags Tag',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="tag-outline"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}

/**
 * Private task eye icon
 */
export function PrivateEyeIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-eye',
  accessibilityLabel = 'Private Task Eye',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <Ionicons
        name="eye-outline"
        size={size}
        color={color ?? colors.danger}
      />
    </View>
  );
}

/**
 * Habit tracker repeat icon
 */
export function HabitRepeatIcon({
  size = 22,
  color,
  style,
  testID = 'task-icon-habit',
  accessibilityLabel = 'Habit Tracker Repeat',
}: TaskIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID={testID}
    >
      <MaterialCommunityIcons
        name="cached"
        size={size}
        color={color ?? colors.primary}
      />
    </View>
  );
}
