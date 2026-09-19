import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { HIJRI_MONTH_NAMES } from '@/domain/calendar/types';

const ALL_WEEKDAYS: { iso: ISOWeekday; label: string }[] = [
  { iso: 1, label: 'M' },
  { iso: 2, label: 'T' },
  { iso: 3, label: 'W' },
  { iso: 4, label: 'T' },
  { iso: 5, label: 'F' },
  { iso: 6, label: 'S' },
  { iso: 7, label: 'S' },
];

interface CustomRecurrenceModalProps {
  visible: boolean;
  onClose: () => void;
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}

export function CustomRecurrenceModal({
  visible,
  onClose,
  state,
  dispatch,
}: CustomRecurrenceModalProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  const gregorianDraft = state.customGregorianDraft;
  const hijriDraft = state.customHijriDraft;

  const toggleWeekday = (iso: ISOWeekday) => {
    const existing = gregorianDraft.selectedWeekdays;
    const updated = existing.includes(iso)
      ? existing.filter(d => d !== iso)
      : [...existing, iso];
    dispatch({
      type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT',
      payload: { selectedWeekdays: updated },
    });
  };

  const toggleMonthDay = (day: number) => {
    const existing = gregorianDraft.selectedMonthDays;
    const updated = existing.includes(day)
      ? existing.filter(d => d !== day)
      : [...existing, day];
    dispatch({
      type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT',
      payload: { selectedMonthDays: updated },
    });
  };

  const toggleHijriDay = (day: number) => {
    const existing = hijriDraft.selectedDays;
    const updated = existing.includes(day)
      ? existing.filter(d => d !== day)
      : [...existing, day];
    dispatch({
      type: 'UPDATE_CUSTOM_HIJRI_DRAFT',
      payload: { selectedDays: updated },
    });
  };

  const toggleHijriMonth = (month: number) => {
    const existing = hijriDraft.selectedMonths;
    const updated = existing.includes(month)
      ? existing.filter(m => m !== month)
      : [...existing, month];
    dispatch({
      type: 'UPDATE_CUSTOM_HIJRI_DRAFT',
      payload: { selectedMonths: updated },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
              maxHeight: '85%',
            },
          ]}
          testID="custom-recurrence-modal"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text
              accessibilityRole="header"
              style={[typography.headlineMedium, { color: colors.textPrimary }]}
            >
              Custom Repeat
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close custom repeat settings"
              style={[styles.closeButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {/* Calendar Switcher: Gregorian vs Hijri */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Calendar System
            </Text>
            <View style={styles.calendarToggleRow}>
              {(['GREGORIAN', 'HIJRI'] as const).map(cal => {
                const isSelected = state.recurrenceCalendar === cal;
                return (
                  <Pressable
                    key={cal}
                    onPress={() => dispatch({ type: 'SET_RECURRENCE_CALENDAR', payload: cal })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${cal === 'GREGORIAN' ? 'Gregorian' : 'Islamic / Hijri'} calendar`}
                    testID={`calendar-${cal.toLowerCase()}`}
                    style={[
                      styles.calendarButton,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.md,
                        minHeight: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelLarge,
                        { color: isSelected ? colors.primaryDark : colors.textSecondary, fontWeight: '600' },
                      ]}
                    >
                      {cal === 'GREGORIAN' ? 'Gregorian (Solar)' : 'Hijri (Lunar)'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* GREGORIAN CUSTOM CONTROLS */}
            {state.recurrenceCalendar === 'GREGORIAN' && (
              <View style={{ marginTop: spacing.lg }} testID="gregorian-custom-controls">
                {/* Interval and Frequency */}
                <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                  Repeat Every
                </Text>
                <View style={styles.intervalRow}>
                  <TextInput
                    value={String(gregorianDraft.interval)}
                    onChangeText={text => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num > 0 && num <= 99) {
                        dispatch({ type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT', payload: { interval: num } });
                      }
                    }}
                    keyboardType="number-pad"
                    accessibilityLabel="Repeat interval number"
                    style={[
                      styles.intervalInput,
                      typography.bodyLarge,
                      {
                        borderColor: colors.border,
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceSecondary,
                        color: colors.textPrimary,
                        minHeight: touchTargets.min,
                        paddingHorizontal: spacing.md,
                      },
                    ]}
                  />

                  {/* Frequency Options: Daily, Weekly, Monthly */}
                  {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(freq => {
                    const isFreqSelected = gregorianDraft.frequency === freq;
                    return (
                      <Pressable
                        key={freq}
                        onPress={() => dispatch({ type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT', payload: { frequency: freq } })}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isFreqSelected }}
                        style={[
                          styles.freqButton,
                          {
                            backgroundColor: isFreqSelected ? colors.primary : colors.surfaceSecondary,
                            borderColor: isFreqSelected ? colors.primary : colors.border,
                            borderRadius: radii.md,
                            minHeight: touchTargets.min,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.labelMedium,
                            { color: isFreqSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {freq === 'DAILY' ? 'Days' : freq === 'WEEKLY' ? 'Weeks' : 'Months'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* If Weekly: Weekday Selection */}
                {gregorianDraft.frequency === 'WEEKLY' && (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      On Days
                    </Text>
                    <View style={styles.weekdayGrid}>
                      {ALL_WEEKDAYS.map(w => {
                        const isDaySelected = gregorianDraft.selectedWeekdays.includes(w.iso);
                        return (
                          <Pressable
                            key={w.iso}
                            onPress={() => toggleWeekday(w.iso)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isDaySelected }}
                            accessibilityLabel={`Weekday ${w.iso}`}
                            testID={`custom-weekday-${w.iso}`}
                            style={[
                              styles.weekdayCircle,
                              {
                                backgroundColor: isDaySelected ? colors.primary : colors.surfaceSecondary,
                                borderColor: isDaySelected ? colors.primary : colors.border,
                                borderRadius: radii.pill,
                                minHeight: touchTargets.min,
                                minWidth: touchTargets.min,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                typography.labelLarge,
                                { color: isDaySelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '700' },
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

                {/* If Monthly: Month-Day Selection */}
                {gregorianDraft.frequency === 'MONTHLY' && (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      On Month Days (1–31)
                    </Text>
                    <View style={styles.dayNumberGrid}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(dayNum => {
                        const isDaySelected = gregorianDraft.selectedMonthDays.includes(dayNum);
                        return (
                          <Pressable
                            key={dayNum}
                            onPress={() => toggleMonthDay(dayNum)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isDaySelected }}
                            accessibilityLabel={`Day ${dayNum}`}
                            style={[
                              styles.dayNumberChip,
                              {
                                backgroundColor: isDaySelected ? colors.primary : colors.surfaceSecondary,
                                borderColor: isDaySelected ? colors.primary : colors.border,
                                borderRadius: radii.sm,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                typography.caption,
                                { color: isDaySelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                              ]}
                            >
                              {dayNum}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* HIJRI CUSTOM CONTROLS */}
            {state.recurrenceCalendar === 'HIJRI' && (
              <View style={{ marginTop: spacing.lg }} testID="hijri-custom-controls">
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                  Select specific Hijri days (e.g. 13, 14, 15) and/or Hijri months (e.g. Ramadan).
                </Text>

                {/* Hijri Days: 1-30 */}
                <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                  Hijri Days of Month
                </Text>
                <View style={styles.dayNumberGrid}>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(hDay => {
                    const isSelected = hijriDraft.selectedDays.includes(hDay);
                    return (
                      <Pressable
                        key={hDay}
                        onPress={() => toggleHijriDay(hDay)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Hijri day ${hDay}`}
                        testID={`hijri-day-${hDay}`}
                        style={[
                          styles.dayNumberChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radii.sm,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.caption,
                            { color: isSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                          ]}
                        >
                          {hDay}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Hijri Months: 1-12 */}
                <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs }]}>
                  Hijri Months (leave unselected for every month)
                </Text>
                <View style={styles.hijriMonthGrid}>
                  {(Object.entries(HIJRI_MONTH_NAMES) as [string, string][]).map(([numStr, name]) => {
                    const monthNum = parseInt(numStr, 10);
                    const isSelected = hijriDraft.selectedMonths.includes(monthNum);
                    return (
                      <Pressable
                        key={monthNum}
                        onPress={() => toggleHijriMonth(monthNum)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Hijri month: ${name}`}
                        testID={`hijri-month-${monthNum}`}
                        style={[
                          styles.hijriMonthChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radii.md,
                            minHeight: touchTargets.min,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.caption,
                            { color: isSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Apply custom repeat settings"
            testID="apply-custom-repeat"
            style={({ pressed }) => [
              styles.applyButton,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.comfortable,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calendarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalInput: {
    width: 60,
    borderWidth: 1,
    textAlign: 'center',
  },
  freqButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekdayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayNumberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayNumberChip: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hijriMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hijriMonthChip: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  applyButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
