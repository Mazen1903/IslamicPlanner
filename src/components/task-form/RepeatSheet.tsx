import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction, RecurrencePreset } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';
import {
  RepeatHeaderBadgeIcon,
  RepeatNoneBadgeIcon,
  RepeatDailyBadgeIcon,
  RepeatEveryOtherDayBadgeIcon,
  RepeatWeekdaysBadgeIcon,
  RepeatWeeklyBadgeIcon,
  RepeatMonthlyBadgeIcon,
  RepeatSpecificDaysBadgeIcon,
  RepeatCustomBadgeIcon,
} from './RepeatIcons';
import { getEveryOtherDayPreview } from './details/RepeatInlinePanel';

export interface RepeatSheetProps {
  visible: boolean;
  onClose: () => void;
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

interface RepeatOptionItem {
  preset: RecurrencePreset;
  title: string;
  subtitle: string;
  renderIcon: (props: { size: number; color?: string; decorative?: boolean }) => React.ReactNode;
}

const REPEAT_OPTIONS: RepeatOptionItem[] = [
  {
    preset: 'NONE',
    title: "Doesn't repeat",
    subtitle: 'Only once',
    renderIcon: (p) => <RepeatNoneBadgeIcon {...p} />,
  },
  {
    preset: 'DAILY',
    title: 'Daily',
    subtitle: 'Repeats every day',
    renderIcon: (p) => <RepeatDailyBadgeIcon {...p} />,
  },
  {
    preset: 'EVERY_OTHER_DAY',
    title: 'Every other day',
    subtitle: 'Every 2 days • Day on, day off',
    renderIcon: (p) => <RepeatEveryOtherDayBadgeIcon {...p} />,
  },
  {
    preset: 'WEEKDAYS',
    title: 'Weekdays',
    subtitle: 'Every Monday to Friday',
    renderIcon: (p) => <RepeatWeekdaysBadgeIcon {...p} />,
  },
  {
    preset: 'WEEKLY',
    title: 'Weekly',
    subtitle: 'Repeats every week',
    renderIcon: (p) => <RepeatWeeklyBadgeIcon {...p} />,
  },
  {
    preset: 'MONTHLY',
    title: 'Monthly',
    subtitle: 'Repeats every month',
    renderIcon: (p) => <RepeatMonthlyBadgeIcon {...p} />,
  },
  {
    preset: 'SPECIFIC_DAYS',
    title: 'Specific days',
    subtitle: 'Choose specific days of the week',
    renderIcon: (p) => <RepeatSpecificDaysBadgeIcon {...p} />,
  },
  {
    preset: 'CUSTOM',
    title: 'Custom',
    subtitle: 'Set advanced recurrence rules',
    renderIcon: (p) => <RepeatCustomBadgeIcon {...p} />,
  },
];

export function RepeatSheet({
  visible,
  onClose,
  state,
  dispatch,
}: RepeatSheetProps) {
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
      ? existing.filter((d) => d !== iso)
      : [...existing, iso];
    dispatch({ type: 'SET_SPECIFIC_DAYS', payload: updated });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="repeat-sheet-modal"
    >
      <View style={[styles.overlay, { backgroundColor: 'transparent' }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="repeat-sheet-backdrop"
        />
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="repeat-sheet"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeftContainer}>
              <RepeatHeaderBadgeIcon size={44} style={{ marginEnd: spacing.sm }} decorative />
              <View style={styles.titleContainer}>
                <Text
                  accessibilityRole="header"
                  style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Repeat Schedule
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Choose how often this task should repeat
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close repeat schedule"
              testID="repeat-sheet-close-btn"
              style={[
                styles.closeButton,
                {
                  minHeight: touchTargets.min,
                  minWidth: touchTargets.min,
                  borderRadius: radii.pill,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} decorative />
            </Pressable>
          </View>

          {/* Options List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.xs }}
          >
            {REPEAT_OPTIONS.map((item) => {
              const isSelected = state.recurrencePreset === item.preset;

              return (
                <View key={item.preset} style={styles.optionItemWrapper}>
                  <Pressable
                    onPress={() => handleSelectPreset(item.preset)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Repeat option: ${item.title}`}
                    testID={`repeat-preset-${item.preset.toLowerCase()}`}
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected && shadows.card,
                      {
                        backgroundColor: isSelected ? colors.surface : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.card,
                        padding: spacing.md,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    {/* Radio circle indicator */}
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          marginEnd: spacing.sm,
                        },
                      ]}
                    >
                      {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
                    </View>

                    {/* Option Icon */}
                    <View style={{ marginEnd: spacing.sm }}>
                      {item.renderIcon({ size: 36, decorative: true })}
                    </View>

                    {/* Text container */}
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          typography.headlineMedium,
                          {
                            color: colors.textPrimary,
                            fontSize: 15,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                        {item.subtitle}
                      </Text>
                    </View>

                    {/* Expand indicator for expandable options */}
                    {(item.preset === 'SPECIFIC_DAYS' || item.preset === 'CUSTOM') && (
                      <Icon
                        name={isSelected ? 'chevron-down' : 'chevron-right'}
                        size={16}
                        color={colors.textTertiary}
                        directional
                        decorative
                      />
                    )}
                  </Pressable>

                  {/* Inline Every Other Day Schedule Preview */}
                  {item.preset === 'EVERY_OTHER_DAY' && isSelected && (
                    <View
                      style={[
                        styles.specificDaysContainer,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: radii.md,
                          borderColor: colors.border,
                          padding: spacing.md,
                          marginTop: spacing.xs,
                          marginBottom: spacing.xs,
                        },
                      ]}
                      testID="every-other-day-preview-sheet"
                    >
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                        Upcoming active days (every 2 days):
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {getEveryOtherDayPreview(state.civilSeedDate).map((dayStr, idx) => (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: idx === 0 ? colors.primaryLight : colors.surface,
                              borderColor: idx === 0 ? colors.primary : colors.border,
                              borderWidth: 1,
                              borderRadius: radii.pill,
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 4,
                            }}
                          >
                            <Text
                              style={[
                                typography.caption,
                                {
                                  color: idx === 0 ? colors.primaryDark : colors.textPrimary,
                                  fontWeight: idx === 0 ? '700' : '600',
                                },
                              ]}
                            >
                              {dayStr}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Inline Specific Days Controls */}
                  {item.preset === 'SPECIFIC_DAYS' && isSelected && (
                    <View
                      style={[
                        styles.specificDaysContainer,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: radii.md,
                          borderColor: colors.border,
                          padding: spacing.md,
                          marginTop: spacing.xs,
                          marginBottom: spacing.xs,
                        },
                      ]}
                      testID="specific-days-controls"
                    >
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                        Select days of the week:
                      </Text>
                      <View style={styles.weekdayRow}>
                        {ALL_WEEKDAYS.map((w) => {
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
                                  backgroundColor: isDaySelected ? colors.primary : colors.surface,
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

                  {/* Custom Recurrence Modal trigger */}
                  {item.preset === 'CUSTOM' && isSelected && (
                    <Pressable
                      onPress={() => setShowCustomModal(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Configure custom repeat rules"
                      testID="open-custom-recurrence-modal"
                      style={({ pressed }) => [
                        styles.customConfigureButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                          borderRadius: radii.md,
                          padding: spacing.sm,
                          marginTop: spacing.xs,
                          marginBottom: spacing.xs,
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
              );
            })}
          </ScrollView>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            testID="repeat-sheet-done-btn"
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                paddingVertical: 14,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.headlineMedium, { color: colors.textOnPrimary, textAlign: 'center' }]}>
              Done
            </Text>
          </Pressable>

          {/* Nested Custom Recurrence Modal */}
          <CustomRecurrenceModal
            visible={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            state={state}
            dispatch={dispatch}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    maxHeight: '90%',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionItemWrapper: {
    marginBottom: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionTextContainer: {
    flex: 1,
  },
  specificDaysContainer: {
    borderWidth: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekdayCircle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customConfigureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
