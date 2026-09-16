import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction, RecurrencePreset } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';

const PRESETS: { preset: RecurrencePreset; label: string }[] = [
  { preset: 'NONE', label: "Doesn't repeat" },
  { preset: 'DAILY', label: 'Daily' },
  { preset: 'WEEKDAYS', label: 'Weekdays' },
  { preset: 'WEEKLY', label: 'Weekly' },
  { preset: 'MONTHLY', label: 'Monthly' },
  { preset: 'SPECIFIC_DAYS', label: 'Specific days' },
  { preset: 'CUSTOM', label: 'Custom...' },
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

interface RecurrenceSectionProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  style?: StyleProp<ViewStyle>;
}

export function RecurrenceSection({
  state,
  dispatch,
  style,
}: RecurrenceSectionProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
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
    <View style={[styles.container, style]}>
      <Text style={[typography.headlineMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Repeat
      </Text>

      <View
        style={[
          styles.cardContainer,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
          },
        ]}
      >
        {/* Preset Chips */}
        <View style={styles.presetsGrid}>
          {PRESETS.map(item => {
            const isSelected = state.recurrencePreset === item.preset;
            return (
              <Pressable
                key={item.preset}
                onPress={() => handleSelectPreset(item.preset)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Repeat preset: ${item.label}`}
                testID={`repeat-preset-${item.preset.toLowerCase()}`}
                style={({ pressed }) => [
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radii.md,
                    minHeight: touchTargets.min,
                    opacity: pressed ? 0.8 : 1,
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

        {/* Inline Specific Days Selector */}
        {state.recurrencePreset === 'SPECIFIC_DAYS' && (
          <View style={{ marginTop: spacing.md }} testID="specific-days-controls">
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Select Days of the Week
            </Text>
            <View style={styles.weekdayRow}>
              {ALL_WEEKDAYS.map(w => {
                const isSelected = state.specificDays.includes(w.iso);
                return (
                  <Pressable
                    key={w.iso}
                    onPress={() => toggleSpecificDay(w.iso)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Repeat on weekday ${w.iso}`}
                    testID={`weekday-toggle-${w.iso}`}
                    style={[
                      styles.weekdayCircle,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.pill,
                        minHeight: touchTargets.min,
                        minWidth: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelLarge,
                        {
                          color: isSelected ? colors.textOnPrimary : colors.textPrimary,
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

        {/* Custom Recurrence Summary Button */}
        {state.recurrencePreset === 'CUSTOM' && (
          <Pressable
            onPress={() => setShowCustomModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Configure custom repeat rules"
            testID="open-custom-recurrence-modal"
            style={({ pressed }) => [
              styles.customConfigureButton,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
                borderRadius: radii.md,
                minHeight: touchTargets.min,
                marginTop: spacing.md,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="settings" size={16} color={colors.primaryDark} style={{ marginRight: spacing.sm }} />
            <Text style={[typography.labelMedium, { color: colors.primaryDark, flex: 1, fontWeight: '600' }]}>
              {state.recurrenceCalendar === 'HIJRI'
                ? `Hijri Repeat: ${state.customHijriDraft.selectedDays.length} days, ${state.customHijriDraft.selectedMonths.length || 'all'} months`
                : `Every ${state.customGregorianDraft.interval} ${state.customGregorianDraft.frequency.toLowerCase()}`}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.primaryDark} />
          </Pressable>
        )}
      </View>

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
    marginVertical: 8,
  },
  cardContainer: {
    borderWidth: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  weekdayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  customConfigureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
