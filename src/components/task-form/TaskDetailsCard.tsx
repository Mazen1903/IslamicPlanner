import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { LottiePriorityBadge } from '@/components/task/LottiePriorityBadge';
import { LottieFlameIcon } from '@/components/streak';
import type { FormState, FormAction, RecurrencePreset } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';
import { ReminderSheet } from './ReminderSheet';
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

const REPEAT_PRESETS: { preset: RecurrencePreset; label: string }[] = [
  { preset: 'NONE', label: 'Never' },
  { preset: 'DAILY', label: 'Daily' },
  { preset: 'WEEKDAYS', label: 'Weekdays' },
  { preset: 'WEEKLY', label: 'Weekly' },
  { preset: 'MONTHLY', label: 'Monthly' },
  { preset: 'SPECIFIC_DAYS', label: 'Specific days' },
  { preset: 'CUSTOM', label: 'Custom' },
];

const ALL_WEEKDAYS: { iso: ISOWeekday; label: string }[] = [
  { iso: 1, label: 'M' },
  { iso: 2, label: 'T' },
  { iso: 3, label: 'W' },
  { iso: 4, label: 'T' },
  { iso: 5, label: 'F' },
  { iso: 6, label: 'S' },
  { iso: 7, label: 'S' },
];

type ExpandedRow = 'reminder' | 'repeat' | 'notes' | null;

export function TaskDetailsCard({ state, dispatch }: TaskDetailsCardProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);

  const activeReminders = state.reminders && state.reminders.length > 0
    ? state.reminders
    : (state.reminderMinutes !== null ? [state.reminderMinutes < 0 ? state.reminderMinutes : -state.reminderMinutes] : []);
  const reminderSummaryText = getReminderSummary(
    activeReminders,
    state.scheduleMode === 'ANYTIME_TODAY',
    state.reminderTimeOfDay
  );
  const hasReminder = activeReminders.length > 0 || (state.scheduleMode === 'ANYTIME_TODAY' && !!state.reminderTimeOfDay);

  const isRepeatOpen = expandedRow === 'repeat';
  const isNotesOpen = expandedRow === 'notes';

  const toggleRow = (row: 'repeat' | 'notes') => {
    setExpandedRow(prev => (prev === row ? null : row));
  };

  const handleSelectPreset = (preset: RecurrencePreset) => {
    dispatch({ type: 'SET_RECURRENCE_PRESET', payload: preset });
    if (preset === 'CUSTOM') {
      setShowCustomModal(true);
    }
  };

  const toggleSpecificDay = (iso: ISOWeekday) => {
    const existing = state.specificDays;
    const updated = existing.includes(iso)
      ? existing.filter(d => d !== iso)
      : [...existing, iso];
    dispatch({ type: 'SET_SPECIFIC_DAYS', payload: updated });
  };

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
        onPress={() => toggleRow('repeat')}
        accessibilityRole="button"
        accessibilityState={{ expanded: isRepeatOpen }}
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
            name={isRepeatOpen ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Expanded Repeat Drawer */}
      {isRepeatOpen && (
        <View
          style={[
            styles.drawerContent,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.md,
              marginHorizontal: spacing.sm,
              marginBottom: spacing.sm,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Frequency:
          </Text>
          {/* Wrapping Preset Chips */}
          <View style={styles.wrappingChipsContainer}>
            {REPEAT_PRESETS.map(item => {
              const isSelected = state.recurrencePreset === item.preset;
              return (
                <Pressable
                  key={item.preset}
                  onPress={() => handleSelectPreset(item.preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Repeat: ${item.label}`}
                  testID={`repeat-preset-${item.preset.toLowerCase()}`}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && shadows.card,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      minHeight: 34,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Inline Specific Days Controls */}
          {state.recurrencePreset === 'SPECIFIC_DAYS' && (
            <View
              style={[
                styles.specificDaysContainer,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  marginTop: spacing.sm,
                },
              ]}
              testID="specific-days-controls"
            >
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                Select days of the week:
              </Text>
              <View style={styles.weekdayRow}>
                {ALL_WEEKDAYS.map(w => {
                  const isDaySelected = state.specificDays.includes(w.iso);
                  return (
                    <Pressable
                      key={w.iso}
                      onPress={() => toggleSpecificDay(w.iso)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isDaySelected }}
                      accessibilityLabel={`Repeat on weekday ${w.iso}`}
                      testID={`weekday-toggle-${w.iso}`}
                      style={[
                        styles.weekdayCircle,
                        isDaySelected && shadows.card,
                        {
                          backgroundColor: isDaySelected ? colors.primary : colors.surfaceSecondary,
                          borderColor: isDaySelected ? colors.primary : colors.border,
                          borderRadius: radii.pill,
                          width: 36,
                          height: 36,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.labelMedium,
                          {
                            color: isDaySelected ? colors.textOnPrimary : colors.textPrimary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {w.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Edit Custom Schedule shortcut button when CUSTOM is selected */}
          {state.recurrencePreset === 'CUSTOM' && (
            <Pressable
              onPress={() => setShowCustomModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Configure custom repeat rules"
              testID="open-custom-recurrence-modal"
              style={({ pressed }) => [
                styles.customConfigureButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  padding: spacing.sm,
                  marginTop: spacing.sm,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>
                Edit Custom Recurrence Rules...
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 3. Priority Row (Inline Pill) */}
      <View
        style={[
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
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

        <Pressable
          onPress={() =>
            dispatch({
              type: 'SET_PRIORITY',
              payload: state.priority === 'IMPORTANT' ? 'NORMAL' : 'IMPORTANT',
            })
          }
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
      </View>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 4. Track Streak Row (Inline Switch) */}
      <View
        style={[
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
          },
        ]}
        testID="streak-option-row"
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
      </View>

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 5. Notes Row */}
      <Pressable
        onPress={() => toggleRow('notes')}
        accessibilityRole="button"
        accessibilityState={{ expanded: isNotesOpen }}
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
            name={isNotesOpen ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={colors.textTertiary}
            directional
            decorative
          />
        </View>
      </Pressable>

      {/* Expanded Notes TextInput Drawer */}
      {isNotesOpen && (
        <View
          style={[
            styles.drawerContent,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.md,
              marginHorizontal: spacing.sm,
              marginBottom: spacing.sm,
              padding: spacing.md,
            },
          ]}
        >
          <TextInput
            value={state.notes}
            onChangeText={text => dispatch({ type: 'SET_NOTES', payload: text })}
            placeholder="Add notes..."
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Task notes"
            testID="task-notes-input"
            multiline={true}
            numberOfLines={3}
            style={[
              styles.notesInput,
              typography.bodyMedium,
              {
                borderColor: colors.border,
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                padding: spacing.md,
              },
            ]}
          />
        </View>
      )}

      {/* Custom Recurrence Modal */}
      <CustomRecurrenceModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        state={state}
        dispatch={dispatch}
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
  drawerContent: {
    overflow: 'hidden',
  },
  wrappingChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityPill: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specificDaysContainer: {
    borderWidth: 1,
    width: '100%',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  weekdayCircle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customConfigureButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
