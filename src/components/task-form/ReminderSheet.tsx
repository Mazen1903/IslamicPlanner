import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Linking,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TimePickerInput } from './DateTimePickerInput';
import {
  formatReminderOffset,
  MAX_REMINDERS_PER_TASK,
  DEFAULT_ANYTIME_REMINDER_TIME,
} from '@/domain/notification/reminderRule';
import {
  notificationSchedulerAdapter,
  type PermissionStatusResult,
} from '@/services/notification/NotificationSchedulerAdapter';

export interface ReminderSheetProps {
  visible: boolean;
  onClose: () => void;
  reminders: number[];
  onAddReminder: (offsetMinutes: number) => void;
  onRemoveReminder: (offsetMinutes: number) => void;
  scheduleMode: string;
  reminderTimeOfDay: string | null;
  onSetReminderTimeOfDay: (timeStr: string | null) => void;
  adapter?: typeof notificationSchedulerAdapter;
}

const PRESET_OPTIONS: { offset: number; label: string }[] = [
  { offset: 0, label: 'At time' },
  { offset: -5, label: '5m before' },
  { offset: -10, label: '10m before' },
  { offset: -15, label: '15m before' },
  { offset: -30, label: '30m before' },
  { offset: -60, label: '1h before' },
  { offset: -120, label: '2h before' },
  { offset: -1440, label: '1d before' },
];

export function ReminderSheet({
  visible,
  onClose,
  reminders,
  onAddReminder,
  onRemoveReminder,
  scheduleMode,
  reminderTimeOfDay,
  onSetReminderTimeOfDay,
  adapter = notificationSchedulerAdapter,
}: ReminderSheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours'>('minutes');

  const isAnytime = scheduleMode === 'ANYTIME_TODAY';
  const isCapped = reminders.length >= MAX_REMINDERS_PER_TASK;

  const checkPermission = useCallback(async () => {
    try {
      const res = await adapter.getPermissionStatus();
      setPermission(res);
    } catch {
      setPermission({ canSchedule: false, canRequest: false, status: 'DENIED' });
    }
  }, [adapter]);

  useEffect(() => {
    if (visible) {
      checkPermission();
    }
  }, [visible, checkPermission]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const res = await adapter.requestPermission();
      setPermission(res);
    } catch {
      setPermission({ canSchedule: false, canRequest: false, status: 'DENIED' });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('[ReminderSheet] Failed to open settings:', err);
    }
  };

  const handleSelectPreset = async (offset: number) => {
    if (isCapped || reminders.includes(offset)) return;

    if (permission && !permission.canSchedule && permission.canRequest) {
      await handleRequestPermission();
    }
    onAddReminder(offset);
  };

  const handleAddCustom = async () => {
    const parsed = parseInt(customValue.trim(), 10);
    if (Number.isNaN(parsed) || parsed <= 0 || isCapped) return;

    const minutes = customUnit === 'hours' ? parsed * 60 : parsed;
    const offset = -minutes; // before task

    if (reminders.includes(offset)) return;

    if (permission && !permission.canSchedule && permission.canRequest) {
      await handleRequestPermission();
    }

    onAddReminder(offset);
    setCustomValue('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="reminder-sheet-modal"
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="reminder-sheet"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, { color: colors.textPrimary }]}
              >
                Task Reminders
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {isAnytime
                  ? 'Set a notification time for this anytime task'
                  : `Add up to ${MAX_REMINDERS_PER_TASK} alerts before this task`}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close reminders"
              testID="reminder-sheet-close-btn"
              style={[
                styles.closeButton,
                { minHeight: touchTargets.min, minWidth: touchTargets.min },
              ]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
            {/* Permission Banner */}
            {permission && !permission.canSchedule && (
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
                testID="reminder-permission-banner"
              >
                {permission.status === 'DENIED' ? (
                  <>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                      Notifications are turned off
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                      Enable notifications in device settings to receive task alerts.
                    </Text>
                    <Pressable
                      onPress={handleOpenSettings}
                      accessibilityRole="button"
                      accessibilityLabel="Open Settings"
                      testID="reminder-open-settings-btn"
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderRadius: radii.sm,
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.md,
                        },
                      ]}
                    >
                      <Icon name="settings" size="xs" color={colors.textPrimary} style={{ marginEnd: 6 }} decorative />
                      <Text style={[typography.labelSmall, { color: colors.textPrimary }]}>Open Settings</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                      Allow notifications?
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                      Enable notifications so you get reminded when this task is due.
                    </Text>
                    <Pressable
                      onPress={handleRequestPermission}
                      disabled={isRequesting}
                      accessibilityRole="button"
                      accessibilityLabel="Enable Notifications"
                      testID="reminder-enable-notifications-btn"
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          borderRadius: radii.sm,
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.md,
                        },
                      ]}
                    >
                      {isRequesting ? (
                        <ActivityIndicator size="small" color={colors.textOnPrimary} />
                      ) : (
                        <>
                          <Icon name="bell" size="xs" color={colors.textOnPrimary} style={{ marginEnd: 6 }} decorative />
                          <Text style={[typography.labelSmall, { color: colors.textOnPrimary }]}>Enable Notifications</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {/* ANYTIME_TODAY UI */}
            {isAnytime ? (
              <View style={styles.sectionContainer}>
                <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                  Alert Time
                </Text>
                <TimePickerInput
                  value={reminderTimeOfDay || DEFAULT_ANYTIME_REMINDER_TIME}
                  onChange={(newTime) => onSetReminderTimeOfDay(newTime)}
                  label="Notification Time"
                  testID="anytime-reminder-time-input"
                />
              </View>
            ) : (
              /* Timed Tasks UI */
              <>
                {/* Active Reminders List */}
                <View style={styles.sectionContainer}>
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                    Active Reminders ({reminders.length}/{MAX_REMINDERS_PER_TASK})
                  </Text>

                  {reminders.length === 0 ? (
                    <Text
                      style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic', marginVertical: spacing.xs }]}
                      testID="no-reminders-text"
                    >
                      No reminders set yet. Choose a preset below.
                    </Text>
                  ) : (
                    <View style={styles.activeList} testID="active-reminders-list">
                      {reminders.map((offset) => (
                        <View
                          key={offset}
                          style={[
                            styles.activeChip,
                            {
                              backgroundColor: colors.primaryLight,
                              borderColor: colors.primary,
                              borderRadius: radii.md,
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              marginEnd: spacing.sm,
                              marginBottom: spacing.sm,
                            },
                          ]}
                          testID={`reminder-chip-${offset}`}
                        >
                          <Icon name="bell" size={14} color={colors.primary} style={{ marginEnd: 6 }} decorative />
                          <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '600', marginEnd: 8 }]}>
                            {formatReminderOffset(offset)}
                          </Text>
                          <Pressable
                            onPress={() => onRemoveReminder(offset)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove reminder ${formatReminderOffset(offset)}`}
                            testID={`remove-reminder-${offset}`}
                            hitSlop={8}
                          >
                            <Icon name="close" size={14} color={colors.primary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Preset Chips */}
                {!isCapped && (
                  <View style={styles.sectionContainer}>
                    <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                      Quick Presets
                    </Text>
                    <View style={styles.presetWrap}>
                      {PRESET_OPTIONS.map((item) => {
                        const isSelected = reminders.includes(item.offset);
                        return (
                          <Pressable
                            key={item.offset}
                            onPress={() => handleSelectPreset(item.offset)}
                            disabled={isSelected}
                            accessibilityRole="button"
                            accessibilityLabel={`Add reminder ${item.label}`}
                            testID={`preset-btn-${item.offset}`}
                            style={({ pressed }) => [
                              styles.presetChip,
                              {
                                backgroundColor: isSelected
                                  ? colors.surfaceSecondary
                                  : pressed
                                  ? colors.primaryLight
                                  : colors.surface,
                                borderColor: isSelected ? colors.border : colors.primary,
                                borderRadius: radii.md,
                                opacity: isSelected ? 0.5 : 1,
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                marginEnd: spacing.sm,
                                marginBottom: spacing.sm,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                typography.labelSmall,
                                {
                                  color: isSelected ? colors.textTertiary : colors.primary,
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              + {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Custom Minutes Input */}
                {!isCapped && (
                  <View style={styles.sectionContainer}>
                    <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                      Custom Reminder
                    </Text>
                    <View style={styles.customRow}>
                      <TextInput
                        value={customValue}
                        onChangeText={setCustomValue}
                        placeholder="e.g. 45"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="number-pad"
                        style={[
                          styles.customInput,
                          typography.bodyMedium,
                          {
                            color: colors.textPrimary,
                            backgroundColor: colors.surfaceSecondary,
                            borderColor: colors.border,
                            borderRadius: radii.sm,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 8,
                            marginEnd: spacing.sm,
                            minWidth: 70,
                          },
                        ]}
                        testID="custom-reminder-input"
                      />

                      <View style={styles.unitSelector}>
                        <Pressable
                          onPress={() => setCustomUnit('minutes')}
                          style={[
                            styles.unitBtn,
                            {
                              backgroundColor: customUnit === 'minutes' ? colors.primary : colors.surfaceSecondary,
                              borderRadius: radii.sm,
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              marginEnd: 4,
                            },
                          ]}
                          testID="custom-unit-minutes"
                        >
                          <Text
                            style={[
                              typography.labelSmall,
                              { color: customUnit === 'minutes' ? colors.textOnPrimary : colors.textSecondary },
                            ]}
                          >
                            min
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setCustomUnit('hours')}
                          style={[
                            styles.unitBtn,
                            {
                              backgroundColor: customUnit === 'hours' ? colors.primary : colors.surfaceSecondary,
                              borderRadius: radii.sm,
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              marginEnd: spacing.sm,
                            },
                          ]}
                          testID="custom-unit-hours"
                        >
                          <Text
                            style={[
                              typography.labelSmall,
                              { color: customUnit === 'hours' ? colors.textOnPrimary : colors.textSecondary },
                            ]}
                          >
                            hours
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={handleAddCustom}
                        disabled={!customValue.trim()}
                        style={[
                          styles.addCustomBtn,
                          {
                            backgroundColor: customValue.trim() ? colors.primary : colors.surfaceSecondary,
                            borderRadius: radii.sm,
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            opacity: customValue.trim() ? 1 : 0.6,
                          },
                        ]}
                        testID="add-custom-reminder-btn"
                      >
                        <Text
                          style={[
                            typography.labelSmall,
                            {
                              color: customValue.trim() ? colors.textOnPrimary : colors.textTertiary,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          Add
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {isCapped && (
                  <Text
                    style={[typography.caption, { color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs }]}
                    testID="max-reminders-note"
                  >
                    You have reached the maximum limit of {MAX_REMINDERS_PER_TASK} reminders.
                  </Text>
                )}
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
                paddingVertical: 12,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.headlineMedium, { color: colors.textOnPrimary, textAlign: 'center' }]}>
              Done
            </Text>
          </Pressable>
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
  sheetContainer: {
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  noticeBox: {
    borderWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  activeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetChip: {
    borderWidth: 1,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customInput: {
    borderWidth: 1,
    height: 40,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  addCustomBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
