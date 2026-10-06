import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { LottiePriorityBadge } from '@/components/task/LottiePriorityBadge';
import { LottieFlameIcon } from '@/components/streak';
import type { FormState, FormAction } from '@/features/task-form/types';
import { ReminderSheet } from './ReminderSheet';
import { RepeatSheet } from './RepeatSheet';
import { PrioritySheet } from './PrioritySheet';
import { TrackStreakSheet } from './TrackStreakSheet';
import { NotesSheet } from './NotesSheet';
import { formatReminderSummary } from '@/domain/notification/reminderRule';

export interface TaskDetailsCardProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

export function getRecurrenceLabel(preset: string, specificDaysCount: number, calendar: string): string {
  switch (preset) {
    case 'NONE':
      return "Doesn't repeat";
    case 'DAILY':
      return 'Daily';
    case 'WEEKDAYS':
      return 'Weekdays (Mon - Fri)';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'SPECIFIC_DAYS':
      return `Specific days (${specificDaysCount} selected)`;
    case 'CUSTOM':
      return calendar === 'HIJRI' ? 'Custom (Hijri)' : 'Custom (Gregorian)';
    default:
      return "Doesn't repeat";
  }
}

export function getReminderSummary(val: number | null | number[], isAnytime = false, timeOfDay?: string | null): string {
  if (Array.isArray(val)) {
    return formatReminderSummary({ offsetsMinutes: val, timeOfDay: timeOfDay || undefined }, isAnytime);
  }
  if (val === null) {
    return isAnytime && timeOfDay ? formatReminderSummary({ timeOfDay }, true) : 'None';
  }
  if (val === 0) return 'At time of task';
  if (val === 60 || val === -60) return '1 hour before';
  if (val === 120 || val === -120) return '2 hours before';
  return `${Math.abs(val)} min before`;
}

export function getNotesSummary(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return 'Add extra details';
  const firstLine = trimmed.split('\n')[0];
  return firstLine.length > 22 ? `${firstLine.slice(0, 20)}...` : firstLine;
}

export function TaskDetailsCard({ state, dispatch }: TaskDetailsCardProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [showRepeatSheet, setShowRepeatSheet] = useState(false);
  const [showPrioritySheet, setShowPrioritySheet] = useState(false);
  const [showStreakSheet, setShowStreakSheet] = useState(false);

  const activeReminders = state.reminders && state.reminders.length > 0
    ? state.reminders
    : (state.reminderMinutes !== null ? [state.reminderMinutes < 0 ? state.reminderMinutes : -state.reminderMinutes] : []);
  const reminderSummaryText = getReminderSummary(
    activeReminders,
    state.scheduleMode === 'ANYTIME_TODAY',
    state.reminderTimeOfDay
  );
  const hasReminder = activeReminders.length > 0 || (state.scheduleMode === 'ANYTIME_TODAY' && !!state.reminderTimeOfDay);

  const repeatSummary = getRecurrenceLabel(
    state.recurrencePreset,
    state.specificDays.length,
    state.recurrenceCalendar
  );

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
        },
      ]}
      testID="task-details-card"
    >
      {/* 1. Reminder Row */}
      <Pressable
        onPress={() => setShowReminderSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Reminder: ${reminderSummaryText}`}
        testID="details-row-reminder"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: hasReminder ? colors.primaryLight : colors.surfaceSecondary,
              borderRadius: 12,
              marginEnd: spacing.md,
            },
          ]}
        >
          <Icon
            name="bell"
            size={42}
            color={hasReminder ? colors.primary : colors.textSecondary}
            decorative
          />
        </View>

        <View style={styles.rowTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
            Reminder
          </Text>
        </View>

        <View style={styles.rowRightControl}>
          <Text
            style={[
              typography.bodyMedium,
              {
                color: hasReminder ? colors.primary : colors.textSecondary,
                fontWeight: hasReminder ? '600' : '400',
                marginEnd: 4,
              },
            ]}
          >
            {reminderSummaryText}
          </Text>
          <Icon
            name="chevron-right"
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 2. Repeat Row */}
      <Pressable
        onPress={() => setShowRepeatSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Repeat: ${repeatSummary}`}
        testID="details-row-repeat"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor:
                state.recurrencePreset !== 'NONE'
                  ? colors.primaryLight
                  : colors.surfaceSecondary,
              borderRadius: 12,
              marginEnd: spacing.md,
            },
          ]}
        >
          <Icon
            name="refresh"
            size={42}
            color={state.recurrencePreset !== 'NONE' ? colors.primary : colors.textSecondary}
            decorative
          />
        </View>

        <View style={styles.rowTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
            Repeat
          </Text>
        </View>

        <View style={styles.rowRightControl}>
          <Text
            style={[
              typography.bodyMedium,
              {
                color: state.recurrencePreset !== 'NONE' ? colors.primary : colors.textSecondary,
                fontWeight: state.recurrencePreset !== 'NONE' ? '600' : '400',
                marginEnd: 4,
              },
            ]}
          >
            {repeatSummary}
          </Text>
          <Icon
            name="chevron-right"
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 3. Priority Row */}
      <Pressable
        onPress={() => setShowPrioritySheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Priority: ${state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}`}
        testID="details-row-priority"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor:
                state.priority === 'IMPORTANT'
                  ? colors.error + '24'
                  : colors.surfaceSecondary,
              borderRadius: 12,
              marginEnd: spacing.md,
            },
          ]}
        >
          <View style={{ opacity: state.priority === 'IMPORTANT' ? 1 : 0.45 }}>
            <LottiePriorityBadge
              size={36}
              testID="priority-lottie-badge"
              accessibilityLabel={`Priority: ${state.priority}`}
            />
          </View>
        </View>

        <View style={styles.rowTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
            Priority
          </Text>
        </View>

        <View style={styles.rowRightControl}>
          <Pressable
            onPress={() => setShowPrioritySheet(true)}
            accessibilityRole="button"
            accessibilityLabel={`Priority: ${state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}`}
            testID={state.priority === 'IMPORTANT' ? 'priority-important' : 'priority-normal'}
            style={({ pressed }) => [
              styles.priorityPill,
              state.priority === 'IMPORTANT' && shadows.card,
              {
                backgroundColor:
                  state.priority === 'IMPORTANT'
                    ? colors.error + '18'
                    : colors.surfaceSecondary,
                borderColor:
                  state.priority === 'IMPORTANT'
                    ? colors.error
                    : colors.border,
                borderRadius: radii.pill,
                paddingVertical: 5,
                paddingHorizontal: 12,
                minHeight: 32,
                marginEnd: 4,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                typography.labelMedium,
                {
                  color: state.priority === 'IMPORTANT' ? colors.error : colors.textPrimary,
                  fontWeight: state.priority === 'IMPORTANT' ? '700' : '500',
                },
              ]}
            >
              {state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}
            </Text>
          </Pressable>
          <Icon
            name="chevron-right"
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 4. Track Streak Row */}
      <Pressable
        onPress={() => setShowStreakSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Track Streak: ${state.streakEnabled ? 'Enabled' : 'Disabled'}`}
        testID="streak-option-row"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: state.streakEnabled ? colors.warning + '24' : colors.warning + '12',
              borderRadius: 12,
              marginEnd: spacing.md,
            },
          ]}
        >
          <View style={{ opacity: state.streakEnabled ? 1 : 0.5 }}>
            <LottieFlameIcon
              size={36}
              testID="streak-flame-icon"
              accessibilityLabel="Track streak flame"
            />
          </View>
        </View>

        <View style={styles.rowTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
            Track Streak
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {state.recurrencePreset !== 'NONE'
              ? 'Build consecutive daily completion streaks'
              : 'Requires repeat (turns on Daily repeat)'}
          </Text>
        </View>

        <Switch
          value={state.streakEnabled}
          onValueChange={val => {
            if (val && state.recurrencePreset === 'NONE') {
              Alert.alert(
                'Enable Daily Repeat?',
                'Streak tracking requires a repeating schedule. This will set the task to repeat daily.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Enable Daily',
                    onPress: () => {
                      dispatch({ type: 'SET_RECURRENCE_PRESET', payload: 'DAILY' });
                      dispatch({ type: 'SET_STREAK_ENABLED', payload: true });
                    },
                  },
                ]
              );
              return;
            }
            dispatch({ type: 'SET_STREAK_ENABLED', payload: val });
          }}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Track streak toggle"
          testID="track-streak-switch"
        />
      </Pressable>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 5. Notes Row */}
      <Pressable
        onPress={() => setShowNotesSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={`Notes: ${getNotesSummary(state.notes)}`}
        testID="details-row-notes"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor:
                state.notes.trim()
                  ? colors.primaryLight
                  : colors.surfaceSecondary,
              borderRadius: 12,
              marginEnd: spacing.md,
            },
          ]}
        >
          <Icon
            name="document"
            size={42}
            color={state.notes.trim() ? colors.primary : colors.textSecondary}
            decorative
          />
        </View>

        <View style={styles.rowTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
            Notes
          </Text>
        </View>

        <View style={styles.rowRightControl}>
          <Text
            style={[
              typography.bodyMedium,
              {
                color: state.notes.trim() ? colors.primary : colors.textSecondary,
                fontWeight: state.notes.trim() ? '600' : '400',
                marginEnd: 4,
              },
            ]}
            numberOfLines={1}
          >
            {getNotesSummary(state.notes)}
          </Text>
          <Icon
            name="chevron-right"
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Repeat Sheet Modal */}
      <RepeatSheet
        visible={showRepeatSheet}
        onClose={() => setShowRepeatSheet(false)}
        state={state}
        dispatch={dispatch}
      />

      {/* Priority Sheet Modal */}
      <PrioritySheet
        visible={showPrioritySheet}
        onClose={() => setShowPrioritySheet(false)}
        priority={state.priority}
        onSelectPriority={p => dispatch({ type: 'SET_PRIORITY', payload: p })}
      />

      {/* Track Streak Sheet Modal */}
      <TrackStreakSheet
        visible={showStreakSheet}
        onClose={() => setShowStreakSheet(false)}
        streakEnabled={state.streakEnabled}
        onToggleStreak={val => dispatch({ type: 'SET_STREAK_ENABLED', payload: val })}
        recurrencePreset={state.recurrencePreset}
        onSetRecurrencePreset={preset => dispatch({ type: 'SET_RECURRENCE_PRESET', payload: preset })}
      />

      {/* Notes Sheet Modal */}
      <NotesSheet
        visible={showNotesSheet}
        onClose={() => setShowNotesSheet(false)}
        notes={state.notes}
        onChangeNotes={text => dispatch({ type: 'SET_NOTES', payload: text })}
      />

      {/* Reminder Sheet Modal */}
      <ReminderSheet
        visible={showReminderSheet}
        onClose={() => setShowReminderSheet(false)}
        reminders={activeReminders}
        onAddReminder={(offset) => dispatch({ type: 'ADD_REMINDER', payload: offset })}
        onRemoveReminder={(offset) => dispatch({ type: 'REMOVE_REMINDER', payload: offset })}
        scheduleMode={state.scheduleMode}
        reminderTimeOfDay={state.reminderTimeOfDay}
        onSetReminderTimeOfDay={(timeStr) => dispatch({ type: 'SET_REMINDER_TIME_OF_DAY', payload: timeStr })}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rowRightControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 8,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    marginStart: 72,
  },
  priorityPill: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


