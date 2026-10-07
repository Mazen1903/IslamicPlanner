import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { FormState, FormAction, RecurrencePreset } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { CustomRecurrenceModal } from '../CustomRecurrenceModal';
import {
  RepeatNoneBadgeIcon,
  RepeatDailyBadgeIcon,
  RepeatWeekdaysBadgeIcon,
  RepeatWeeklyBadgeIcon,
  RepeatMonthlyBadgeIcon,
  RepeatSpecificDaysBadgeIcon,
  RepeatCustomBadgeIcon,
} from '../RepeatIcons';

export interface RepeatInlinePanelProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

const ALL_WEEKDAYS: { iso: ISOWeekday; label: string }[] = [
  { iso: 1, label: 'M' },
  { iso: 2, label: 'T' },
  { iso: 3, label: 'W' },
  { iso: 4, label: 'T' },
  { iso: 5, label: 'F' },
  { iso: 6, label: 'S' },
  { iso: 7, label: 'S' },
];

const PRESETS: {
  preset: RecurrencePreset;
  title: string;
  renderIcon: (props: { size: number; decorative?: boolean }) => React.ReactNode;
}[] = [
  { preset: 'NONE', title: "Doesn't repeat", renderIcon: p => <RepeatNoneBadgeIcon {...p} /> },
  { preset: 'DAILY', title: 'Daily', renderIcon: p => <RepeatDailyBadgeIcon {...p} /> },
  { preset: 'WEEKDAYS', title: 'Weekdays (M-F)', renderIcon: p => <RepeatWeekdaysBadgeIcon {...p} /> },
  { preset: 'WEEKLY', title: 'Weekly', renderIcon: p => <RepeatWeeklyBadgeIcon {...p} /> },
  { preset: 'MONTHLY', title: 'Monthly', renderIcon: p => <RepeatMonthlyBadgeIcon {...p} /> },
  { preset: 'SPECIFIC_DAYS', title: 'Specific days', renderIcon: p => <RepeatSpecificDaysBadgeIcon {...p} /> },
  { preset: 'CUSTOM', title: 'Custom', renderIcon: p => <RepeatCustomBadgeIcon {...p} /> },
];

export function RepeatInlinePanel({ state, dispatch }: RepeatInlinePanelProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const [showCustomModal, setShowCustomModal] = useState(false);

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

  return (
    <View style={styles.container} testID="repeat-inline-panel">
      {/* 2-column or list grid of presets */}
      <View style={styles.presetsGrid}>
        {PRESETS.map(item => {
          const isSelected = state.recurrencePreset === item.preset;
          return (
            <Pressable
              key={item.preset}
              onPress={() => handleSelectPreset(item.preset)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Repeat option: ${item.title}`}
              testID={`repeat-preset-${item.preset.toLowerCase()}`}
              style={({ pressed }) => [
                styles.presetChip,
                isSelected && shadows.card,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radii.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.presetContent}>
                <View style={{ marginEnd: 6 }}>
                  {item.renderIcon({ size: 22, decorative: true })}
                </View>
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.primaryDark : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: 13,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Specific Days Picker */}
      {state.recurrencePreset === 'SPECIFIC_DAYS' && (
        <View
          style={[
            styles.extraBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.sm,
              marginTop: spacing.sm,
            },
          ]}
          testID="specific-days-controls"
        >
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
            Select Days of the Week:
          </Text>
          <View style={styles.daysRow}>
            {ALL_WEEKDAYS.map(day => {
              const isDaySelected = state.specificDays.includes(day.iso);
              return (
                <Pressable
                  key={day.iso}
                  onPress={() => toggleSpecificDay(day.iso)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDaySelected }}
                  accessibilityLabel={`Weekday ${day.label}`}
                  testID={`weekday-toggle-${day.iso}`}
                  style={({ pressed }) => [
                    styles.dayChip,
                    {
                      backgroundColor: isDaySelected ? colors.primary : colors.surface,
                      borderColor: isDaySelected ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isDaySelected ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: isDaySelected ? '700' : '500',
                        fontSize: 13,
                      },
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Custom Recurrence Config Button */}
      {state.recurrencePreset === 'CUSTOM' && (
        <Pressable
          onPress={() => setShowCustomModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Configure Custom Recurrence"
          testID="open-custom-recurrence-modal"
          style={({ pressed }) => [
            styles.customButton,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary,
              borderRadius: radii.md,
              padding: spacing.sm,
              marginTop: spacing.sm,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.labelMedium, { color: colors.primaryDark, fontWeight: '700', textAlign: 'center' }]}>
            {state.recurrenceCalendar === 'HIJRI' ? 'Edit Hijri Pattern ›' : 'Edit Gregorian Pattern ›'}
          </Text>
        </Pressable>
      )}

      {/* Custom Recurrence Modal */}
      <CustomRecurrenceModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        state={state}
        dispatch={dispatch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: 'center',
  },
  presetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraBox: {
    borderWidth: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButton: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
