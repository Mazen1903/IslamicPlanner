import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TimePickerInput } from './DateTimePickerInput';
import {
  formatReminderOffset,
  DEFAULT_ANYTIME_REMINDER_TIME,
} from '@/domain/notification/reminderRule';
import {
  ReminderHeaderBadgeIcon,
  ReminderCardBadgeIcon,
  ReminderEmptyStateIcon,
  ReminderStepperMinusIcon,
  ReminderStepperPlusIcon,
  ReminderUnitIcon,
  ReminderTrashIcon,
} from './ReminderIcons';
import type { notificationSchedulerAdapter } from '@/services/notification/NotificationSchedulerAdapter';

export type ReminderUnit = 'at_time' | 'minutes' | 'hours' | 'days';

export interface ReminderSheetProps {
  visible: boolean;
  onClose: () => void;
  reminders: number[];
  onAddReminder: (offsetMinutes: number) => void;
  onRemoveReminder: (offsetMinutes: number) => void;
  scheduleMode?: string | null;
  reminderTimeOfDay: string | null;
  onSetReminderTimeOfDay: (timeStr: string | null) => void;
  adapter?: typeof notificationSchedulerAdapter;
}

export function ReminderSheet({
  visible,
  onClose,
  reminders,
  onAddReminder,
  onRemoveReminder,
  scheduleMode,
  reminderTimeOfDay,
  onSetReminderTimeOfDay,
}: ReminderSheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [customValue, setCustomValue] = useState('15');
  const [customUnit, setCustomUnit] = useState<ReminderUnit>('minutes');

  const isAnytime = scheduleMode === 'ANYTIME_TODAY';

  // Stepping logic adaptively sized per unit: 5m for minutes, 1h for hours, 1d for days
  const getStepSize = (unit: ReminderUnit) => {
    switch (unit) {
      case 'minutes':
        return 5;
      case 'hours':
      case 'days':
      default:
        return 1;
    }
  };

  const handleIncrement = () => {
    if (customUnit === 'at_time') {
      setCustomUnit('minutes');
      setCustomValue('5');
      return;
    }
    const current = parseInt(customValue.trim(), 10) || 0;
    const step = getStepSize(customUnit);
    const nextVal = current + step;
    setCustomValue(String(nextVal));
  };

  const handleDecrement = () => {
    if (customUnit === 'at_time') return;
    const current = parseInt(customValue.trim(), 10) || 0;
    const step = getStepSize(customUnit);
    const nextVal = Math.max(step, current - step);
    setCustomValue(String(nextVal));
  };

  const handleTextChange = (text: string) => {
    // Only allow numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomValue(cleaned);
  };

  const handleAddCustom = () => {
    if (customUnit === 'at_time') {
      if (!reminders.includes(0)) {
        onAddReminder(0);
      }
      return;
    }

    const parsed = parseInt(customValue.trim(), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;

    let minutes = parsed;
    if (customUnit === 'hours') {
      minutes = parsed * 60;
    } else if (customUnit === 'days') {
      minutes = parsed * 1440;
    }

    const offset = -minutes; // before task
    if (!reminders.includes(offset)) {
      onAddReminder(offset);
    }
  };

  const isAddDisabled =
    customUnit !== 'at_time' &&
    (!customValue.trim() || parseInt(customValue.trim(), 10) <= 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="reminder-sheet-modal"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: 'transparent' }]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="reminder-sheet-backdrop"
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
          testID="reminder-sheet"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeftContainer}>
              <ReminderHeaderBadgeIcon size={44} style={{ marginEnd: spacing.sm }} decorative />
              <View style={styles.titleContainer}>
                <Text
                  accessibilityRole="header"
                  style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Task Reminders
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {isAnytime
                    ? 'Set a notification time for this anytime task'
                    : 'Set custom alerts to stay on track'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close reminders"
              testID="reminder-sheet-close-btn"
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.sm }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ANYTIME_TODAY UI */}
            {isAnytime ? (
              <View
                style={[
                  styles.anytimeCard,
                  shadows.card,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <View style={styles.anytimeHeaderRow}>
                  <View
                    style={[
                      styles.anytimeIconBadge,
                      { backgroundColor: 'transparent', borderRadius: radii.md, marginEnd: spacing.sm },
                    ]}
                  >
                    <Icon name="sun" size={36} color={colors.primary} decorative />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
                      Daily Notification Time
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                      Receive an alert on the day of this task
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <TimePickerInput
                    value={reminderTimeOfDay || DEFAULT_ANYTIME_REMINDER_TIME}
                    onChange={(newTime) => onSetReminderTimeOfDay(newTime)}
                    label="Notification Time"
                    testID="anytime-reminder-time-input"
                  />
                </View>

                {reminderTimeOfDay && (
                  <Pressable
                    onPress={() => onSetReminderTimeOfDay(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Clear alert time"
                    style={[styles.clearAnytimeButton, { marginTop: spacing.sm }]}
                  >
                    <Icon name="close" size={14} color={colors.textTertiary} style={{ marginEnd: 4 }} decorative />
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>
                      Turn off anytime alert
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              /* Timed Tasks UI */
              <>
                {/* 1. Active Reminders List */}
                <View style={styles.sectionContainer}>
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                    Active Reminders ({reminders.length})
                  </Text>

                  {reminders.length === 0 ? (
                    <View
                      style={[
                        styles.emptyContainer,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                          borderRadius: radii.card,
                          padding: spacing.lg,
                        },
                      ]}
                    >
                      <ReminderEmptyStateIcon size={56} style={{ marginBottom: spacing.sm }} decorative />
                      <Text
                        style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}
                        testID="no-reminders-text"
                      >
                        No reminders set yet
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
                        ]}
                      >
                        Use the controls below to configure custom alerts.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.activeList} testID="active-reminders-list">
                      {reminders.map((offset) => (
                        <View
                          key={offset}
                          style={[
                            styles.activeCard,
                            shadows.card,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderRadius: radii.md,
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              marginBottom: spacing.sm,
                            },
                          ]}
                          testID={`reminder-chip-${offset}`}
                          accessibilityLabel={`Reminder: ${formatReminderOffset(offset)}`}
                        >
                          <ReminderCardBadgeIcon size={34} style={{ marginEnd: spacing.sm }} decorative />
                          <View style={styles.activeCardTextContainer}>
                            <Text
                              style={[
                                typography.bodyMedium,
                                { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
                              ]}
                            >
                              {formatReminderOffset(offset)}
                            </Text>
                            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                              {offset === 0 ? 'At time of task' : `${Math.abs(offset)} min before task`}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => onRemoveReminder(offset)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove reminder ${formatReminderOffset(offset)}`}
                            testID={`remove-reminder-${offset}`}
                            hitSlop={8}
                            style={[
                              styles.trashBtn,
                              {
                                minHeight: touchTargets.min,
                                minWidth: touchTargets.min,
                              },
                            ]}
                          >
                            <ReminderTrashIcon size={18} decorative />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 2. Redesigned Custom Reminder Builder */}
                <View style={styles.sectionContainer}>
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                    Add Custom Reminder
                  </Text>

                  <View
                    style={[
                      styles.builderCard,
                      shadows.card,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radii.card,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    {/* Unit Selector Tabs */}
                    <View style={styles.unitSelector}>
                      {(['at_time', 'minutes', 'hours', 'days'] as const).map((unit) => {
                        const isSelected = customUnit === unit;
                        const label =
                          unit === 'at_time'
                            ? 'At time'
                            : unit === 'minutes'
                            ? 'min'
                            : unit === 'hours'
                            ? 'hours'
                            : 'days';

                        return (
                          <Pressable
                            key={unit}
                            onPress={() => setCustomUnit(unit)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`Unit: ${label}`}
                            testID={`custom-unit-${unit.replace('_', '-')}`}
                            style={[
                              styles.unitTab,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.surface,
                                borderColor: isSelected ? colors.primary : colors.border,
                                borderRadius: radii.pill,
                                paddingVertical: 7,
                                paddingHorizontal: 10,
                                marginEnd: spacing.sm,
                              },
                            ]}
                          >
                            <ReminderUnitIcon
                              unit={unit}
                              size={14}
                              color={isSelected ? colors.textOnPrimary : colors.textSecondary}
                              style={{ marginEnd: 4 }}
                              decorative
                            />
                            <Text
                              style={[
                                typography.labelSmall,
                                {
                                  color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                                  fontWeight: isSelected ? '700' : '500',
                                },
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Stepper & Numeric Input (hidden when "At time" selected) */}
                    {customUnit === 'at_time' ? (
                      <View
                        style={[
                          styles.atTimeNotice,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderRadius: radii.md,
                            padding: spacing.md,
                            marginTop: spacing.md,
                          },
                        ]}
                      >
                        <Icon name="bell" size={20} color={colors.primary} style={{ marginEnd: spacing.sm }} decorative />
                        <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
                          Alert will trigger promptly at the scheduled task time.
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.stepperContainer, { marginTop: spacing.md }]}>
                        {/* Decrement Button */}
                        <Pressable
                          onPress={handleDecrement}
                          accessibilityRole="button"
                          accessibilityLabel="Decrease reminder time"
                          testID="reminder-stepper-minus-btn"
                          hitSlop={8}
                          style={styles.stepperPressable}
                        >
                          <ReminderStepperMinusIcon size={44} decorative />
                        </Pressable>

                        {/* Direct Number Input Display */}
                        <View
                          style={[
                            styles.stepperValueCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderRadius: radii.md,
                            },
                          ]}
                        >
                          <TextInput
                            value={customValue}
                            onChangeText={handleTextChange}
                            keyboardType="number-pad"
                            maxLength={4}
                            accessibilityLabel="Custom reminder duration"
                            testID="custom-reminder-input"
                            style={[
                              typography.headlineMedium,
                              styles.stepperTextInput,
                              { color: colors.textPrimary },
                            ]}
                          />
                          <Text
                            style={[
                              typography.labelSmall,
                              { color: colors.textSecondary, marginStart: 4 },
                            ]}
                          >
                            {customUnit === 'minutes' ? 'min' : customUnit}
                          </Text>
                        </View>

                        {/* Increment Button */}
                        <Pressable
                          onPress={handleIncrement}
                          accessibilityRole="button"
                          accessibilityLabel="Increase reminder time"
                          testID="reminder-stepper-plus-btn"
                          hitSlop={8}
                          style={styles.stepperPressable}
                        >
                          <ReminderStepperPlusIcon size={44} decorative />
                        </Pressable>
                      </View>
                    )}

                    {/* Add Alert Button */}
                    <Pressable
                      onPress={handleAddCustom}
                      disabled={isAddDisabled}
                      accessibilityRole="button"
                      accessibilityLabel="Add reminder alert"
                      testID="add-custom-reminder-btn"
                      style={({ pressed }) => [
                        styles.addCustomBtn,
                        shadows.card,
                        {
                          backgroundColor: isAddDisabled ? colors.surfaceSecondary : colors.primary,
                          borderColor: isAddDisabled ? colors.border : colors.primary,
                          borderRadius: radii.md,
                          paddingVertical: 12,
                          marginTop: spacing.md,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.labelMedium,
                          {
                            color: isAddDisabled ? colors.textTertiary : colors.textOnPrimary,
                            fontWeight: '700',
                            fontSize: 15,
                          },
                        ]}
                      >
                        {customUnit === 'at_time'
                          ? '+ Add Alert (At task time)'
                          : `+ Add Alert (${customValue || '0'} ${
                              customUnit === 'minutes' ? 'min' : customUnit
                            } before)`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            testID="reminder-sheet-done-btn"
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
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '88%',
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
  sectionContainer: {
    marginBottom: 18,
  },
  emptyContainer: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeList: {
    flexDirection: 'column',
    marginTop: 4,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeCardTextContainer: {
    flex: 1,
  },
  trashBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderCard: {
    borderWidth: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  unitTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  atTimeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: 12,
    minWidth: 110,
  },
  stepperTextInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 40,
    padding: 0,
  },
  addCustomBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  anytimeCard: {
    borderWidth: 1,
  },
  anytimeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anytimeIconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAnytimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
