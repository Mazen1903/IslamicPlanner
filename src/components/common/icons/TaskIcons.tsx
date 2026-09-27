import React from 'react';
import { View, Image, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';

export interface TaskIconProps {
  size?: number;
  color?: string;
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: any;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export const TASK_FORM_ICONS = {
  exactTime: require('../../../../assets/icons/task/exact_time.png') as ImageSourcePropType,
  relativePrayer: require('../../../../assets/icons/task/relative_prayer.png') as ImageSourcePropType,
  prayerWindow: require('../../../../assets/icons/task/prayer_window.png') as ImageSourcePropType,
  anytimeToday: require('../../../../assets/icons/task/anytime_today.png') as ImageSourcePropType,
  date: require('../../../../assets/icons/task/date.png') as ImageSourcePropType,
  time: require('../../../../assets/icons/task/time.png') as ImageSourcePropType,
  doesntRepeat: require('../../../../assets/icons/task/doesnt_repeat.png') as ImageSourcePropType,
  moreOptions: require('../../../../assets/icons/task/more_options.png') as ImageSourcePropType,
  optReminder: require('../../../../assets/icons/task/opt_reminder.png') as ImageSourcePropType,
  optPriority: require('../../../../assets/icons/task/opt_priority.png') as ImageSourcePropType,
  optDuration: require('../../../../assets/icons/task/opt_duration.png') as ImageSourcePropType,
  optNotes: require('../../../../assets/icons/task/opt_notes.png') as ImageSourcePropType,
  optSubtasks: require('../../../../assets/icons/task/opt_subtasks.png') as ImageSourcePropType,
  optAttachment: require('../../../../assets/icons/task/opt_attachment.png') as ImageSourcePropType,
  optTags: require('../../../../assets/icons/task/opt_tags.png') as ImageSourcePropType,
  optPrivate: require('../../../../assets/icons/task/opt_private.png') as ImageSourcePropType,
  optHabit: require('../../../../assets/icons/task/opt_habit.png') as ImageSourcePropType,
};

function createTaskImageIcon({
  source,
  label,
  defaultTestID,
  defaultSize = 28,
}: {
  source: ImageSourcePropType;
  label: string;
  defaultTestID: string;
  defaultSize?: number;
}) {
  return function TaskImageIconComponent({
    size = defaultSize,
    style,
    testID = defaultTestID,
    accessibilityLabel = label,
    accessibilityRole = 'image',
    importantForAccessibility,
  }: TaskIconProps) {
    return (
      <View
        accessible={accessibilityRole !== 'none'}
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        importantForAccessibility={importantForAccessibility}
        testID={testID}
      >
        <Image
          source={source}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    );
  };
}

/**
 * Exact Time schedule mode clock icon
 */
export const ExactTimeClockIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.exactTime,
  label: 'Clock',
  defaultTestID: 'task-icon-clock',
  defaultSize: 28,
});

/**
 * Prayer Window schedule mode calendar icon
 */
export const PrayerCalendarIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.prayerWindow,
  label: 'Prayer Calendar',
  defaultTestID: 'task-icon-calendar',
  defaultSize: 28,
});

/**
 * Anytime Today golden sun icon
 */
export const AnytimeSunIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.anytimeToday,
  label: 'Anytime Today Sun',
  defaultTestID: 'task-icon-sun',
  defaultSize: 28,
});

/**
 * Repeat circular cycle arrows (Doesn't repeat)
 */
export const RepeatCycleIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.doesntRepeat,
  label: 'Repeat Cycle',
  defaultTestID: 'task-icon-repeat',
  defaultSize: 28,
});

/**
 * More options sliders / equalizer
 */
export const MoreOptionsSlidersIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.moreOptions,
  label: 'More options',
  defaultTestID: 'task-icon-options',
  defaultSize: 28,
});

/**
 * Relative to Prayer Mosque icon
 */
export const TaskMosqueIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.relativePrayer,
  label: 'Relative to Prayer Mosque',
  defaultTestID: 'task-icon-mosque',
  defaultSize: 28,
});

/**
 * Date row calendar icon for DatePickerInput
 */
export const TaskDateCalendarIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.date,
  label: 'Date',
  defaultTestID: 'task-icon-date',
  defaultSize: 28,
});

/**
 * Time row clock icon for TimePickerInput
 */
export const TaskTimeClockIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.time,
  label: 'Time',
  defaultTestID: 'task-icon-time',
  defaultSize: 28,
});

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
 * Reminder bell squircle icon
 */
export const ReminderBellIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optReminder,
  label: 'Reminder Bell',
  defaultTestID: 'task-icon-bell',
  defaultSize: 40,
});

/**
 * Priority flag squircle icon
 */
export const PriorityFlagIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optPriority,
  label: 'Priority Flag',
  defaultTestID: 'task-icon-flag',
  defaultSize: 40,
});

/**
 * Duration clock squircle icon
 */
export const DurationClockIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optDuration,
  label: 'Duration Clock',
  defaultTestID: 'task-icon-duration-clock',
  defaultSize: 40,
});

/**
 * Notes document squircle icon
 */
export const NotesDocumentIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optNotes,
  label: 'Notes Document',
  defaultTestID: 'task-icon-document',
  defaultSize: 40,
});

/**
 * Subtasks checklist squircle icon
 */
export const SubtasksChecklistIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optSubtasks,
  label: 'Subtasks Checklist',
  defaultTestID: 'task-icon-subtasks',
  defaultSize: 40,
});

/**
 * Attachment clip squircle icon
 */
export const AttachmentClipIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optAttachment,
  label: 'Attachment Clip',
  defaultTestID: 'task-icon-attachment',
  defaultSize: 40,
});

/**
 * Tags tag squircle icon
 */
export const TagsTagIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optTags,
  label: 'Tags Tag',
  defaultTestID: 'task-icon-tag',
  defaultSize: 40,
});

/**
 * Private task eye squircle icon
 */
export const PrivateEyeIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optPrivate,
  label: 'Private Task Eye',
  defaultTestID: 'task-icon-eye',
  defaultSize: 40,
});

/**
 * Habit tracker repeat squircle icon
 */
export const HabitRepeatIcon = createTaskImageIcon({
  source: TASK_FORM_ICONS.optHabit,
  label: 'Habit Tracker Repeat',
  defaultTestID: 'task-icon-habit',
  defaultSize: 40,
});
