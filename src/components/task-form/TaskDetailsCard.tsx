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
import type { TaskPriority } from '@/domain/task/types';
import { formatReminderSummary } from '@/domain/notification/reminderRule';
import {
  ReminderInlinePanel,
  RepeatInlinePanel,
  PriorityInlinePanel,
  TrackStreakInlinePanel,
  NotesInlinePanel,
} from './details';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';
import { PaywallSheet } from '@/components/premium/PaywallSheet';

export interface TaskDetailsCardProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  onOpenReminderSettings?: () => void;
}

export type OpenRowKey = 'REMINDER' | 'REPEAT' | 'PRIORITY' | 'STREAK' | 'NOTES';

export function getRecurrenceLabel(preset: string, specificDaysCount: number, calendar: string): string {
  switch (preset) {
    case 'NONE':
      return "Doesn't repeat";
    case 'DAILY':
      return 'Daily';
    case 'EVERY_OTHER_DAY':
      return 'Every other day';
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

export function TaskDetailsCard({ state, dispatch, onOpenReminderSettings }: TaskDetailsCardProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const { gate, paywallVisible, closePaywall, onPurchaseSuccess, isPremium, gatedFeature } = usePremiumGate();

  const [openRow, setOpenRow] = useState<OpenRowKey | null>(null);

  const toggleRow = (row: OpenRowKey) => {
    setOpenRow(prev => (prev === row ? null : row));
  };

  const handleSelectPriority = (p: TaskPriority) => {
    if (p === 'IMPORTANT') {
      // Applied only when entitled, or after a successful purchase.
      gate('PRIORITY', () => dispatch({ type: 'SET_PRIORITY', payload: 'IMPORTANT' }));
      return;
    }
    // Downgrading is always allowed so existing tasks never get stuck.
    dispatch({ type: 'SET_PRIORITY', payload: p });
  };

  const enableStreak = () => {
    if (state.recurrencePreset === 'NONE') {
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
    dispatch({ type: 'SET_STREAK_ENABLED', payload: true });
  };

  const handleToggleStreak = (val: boolean) => {
    if (!val) {
      dispatch({ type: 'SET_STREAK_ENABLED', payload: false });
      return;
    }
    gate('TRACK_STREAK', enableStreak);
  };

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
        onPress={() => toggleRow('REMINDER')}
        accessibilityRole="button"
        accessibilityLabel={`Reminder: ${reminderSummaryText}`}
        testID="details-row-reminder"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: openRow === 'REMINDER' ? colors.primaryLight + '30' : 'transparent',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'transparent',
              borderRadius: 12,
              marginEnd: spacing.md,
              opacity: hasReminder ? 1 : 0.55,
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
            name={openRow === 'REMINDER' ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={openRow === 'REMINDER' ? colors.primary : colors.textTertiary}
            directional={openRow !== 'REMINDER'}
            decorative
          />
        </View>
      </Pressable>

      {/* Reminder Inline Panel */}
      {openRow === 'REMINDER' && (
        <View
          style={[
            styles.inlinePanelContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
          testID="reminder-sheet"
        >
          <ReminderInlinePanel
            reminders={activeReminders}
            onAddReminder={offset => dispatch({ type: 'ADD_REMINDER', payload: offset })}
            onRemoveReminder={offset => dispatch({ type: 'REMOVE_REMINDER', payload: offset })}
            scheduleMode={state.scheduleMode}
            reminderTimeOfDay={state.reminderTimeOfDay}
            onSetReminderTimeOfDay={timeStr => dispatch({ type: 'SET_REMINDER_TIME_OF_DAY', payload: timeStr })}
            onOpenReminderSettings={onOpenReminderSettings ?? (() => {})}
          />
        </View>
      )}

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 2. Repeat Row */}
      <Pressable
        onPress={() => toggleRow('REPEAT')}
        accessibilityRole="button"
        accessibilityLabel={`Repeat: ${repeatSummary}`}
        testID="details-row-repeat"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: openRow === 'REPEAT' ? colors.primaryLight + '30' : 'transparent',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'transparent',
              borderRadius: 12,
              marginEnd: spacing.md,
              opacity: state.recurrencePreset !== 'NONE' ? 1 : 0.55,
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
            name={openRow === 'REPEAT' ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={openRow === 'REPEAT' ? colors.primary : colors.textTertiary}
            directional={openRow !== 'REPEAT'}
            decorative
          />
        </View>
      </Pressable>

      {/* Repeat Inline Panel */}
      {openRow === 'REPEAT' && (
        <View
          style={[
            styles.inlinePanelContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
          testID="repeat-sheet"
        >
          <RepeatInlinePanel state={state} dispatch={dispatch} />
        </View>
      )}

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 3. Priority Row */}
      <Pressable
        onPress={() => toggleRow('PRIORITY')}
        accessibilityRole="button"
        accessibilityLabel={`Priority: ${state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}`}
        testID="details-row-priority"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: openRow === 'PRIORITY' ? colors.primaryLight + '30' : 'transparent',
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
              Priority
            </Text>
            {!isPremium && (
              <View style={{ marginStart: 6 }}>
                <PremiumLanternIcon size={14} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.rowRightControl}>
          <Pressable
            onPress={() => toggleRow('PRIORITY')}
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
            name={openRow === 'PRIORITY' ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={openRow === 'PRIORITY' ? colors.primary : colors.textTertiary}
            directional={openRow !== 'PRIORITY'}
            decorative
          />
        </View>
      </Pressable>

      {/* Priority Inline Panel */}
      {openRow === 'PRIORITY' && (
        <View
          style={[
            styles.inlinePanelContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
          testID="priority-sheet"
        >
          <PriorityInlinePanel
            priority={state.priority}
            onSelectPriority={handleSelectPriority}
            isPremium={isPremium}
          />
        </View>
      )}

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 4. Track Streak Row */}
      <Pressable
        onPress={() => toggleRow('STREAK')}
        accessibilityRole="button"
        accessibilityLabel={`Track Streak: ${state.streakEnabled ? 'Enabled' : 'Disabled'}`}
        testID="streak-option-row"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: openRow === 'STREAK' ? colors.primaryLight + '30' : 'transparent',
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
              Track Streak
            </Text>
            {!isPremium && (
              <View style={{ marginStart: 6 }}>
                <PremiumLanternIcon size={14} />
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {state.recurrencePreset !== 'NONE'
              ? 'Build consecutive daily completion streaks'
              : 'Requires repeat (turns on Daily repeat)'}
          </Text>
        </View>

        <Switch
          value={state.streakEnabled}
          onValueChange={handleToggleStreak}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Track streak toggle"
          testID="track-streak-switch"
        />
      </Pressable>

      {/* Track Streak Inline Panel */}
      {openRow === 'STREAK' && (
        <View
          style={[
            styles.inlinePanelContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
          testID="track-streak-sheet"
        >
          <TrackStreakInlinePanel
            streakEnabled={state.streakEnabled}
            onToggleStreak={handleToggleStreak}
            recurrencePreset={state.recurrencePreset}
            isPremium={isPremium}
          />
        </View>
      )}

      {/* Inset Divider */}
      <View style={[styles.insetDivider, { backgroundColor: colors.border }]} />

      {/* 5. Notes Row */}
      <Pressable
        onPress={() => toggleRow('NOTES')}
        accessibilityRole="button"
        accessibilityLabel={`Notes: ${getNotesSummary(state.notes)}`}
        testID="details-row-notes"
        style={({ pressed }) => [
          styles.rowHeader,
          {
            minHeight: Math.max(touchTargets.min, 56),
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: openRow === 'NOTES' ? colors.primaryLight + '30' : 'transparent',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: 'transparent',
              borderRadius: 12,
              marginEnd: spacing.md,
              opacity: state.notes.trim() ? 1 : 0.55,
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
            name={openRow === 'NOTES' ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={openRow === 'NOTES' ? colors.primary : colors.textTertiary}
            directional={openRow !== 'NOTES'}
            decorative
          />
        </View>
      </Pressable>

      {/* Notes Inline Panel */}
      {openRow === 'NOTES' && (
        <View
          style={[
            styles.inlinePanelContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
          testID="notes-sheet"
        >
          <NotesInlinePanel
            notes={state.notes}
            onChangeNotes={text => dispatch({ type: 'SET_NOTES', payload: text })}
          />
        </View>
      )}

      {/* Paywall Modal */}
      <PaywallSheet
        visible={paywallVisible}
        onClose={closePaywall}
        onSuccess={onPurchaseSuccess}
        gatedFeature={gatedFeature}
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
  inlinePanelContainer: {
    borderWidth: 1,
  },
});
