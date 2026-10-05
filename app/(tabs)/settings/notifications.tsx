import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  AppState,
  ActivityIndicator,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { TimePickerInput } from '@/components/task-form/DateTimePickerInput';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import {
  SettingsPastelHeader,
  SettingsSectionCard,
  SettingsSecPrayerAlertsIcon,
  SettingsSecTaskRemindersIcon,
  SettingsSecJournalReminderIcon,
  SettingsSecGeneralBellIcon,
} from '@/components/settings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import {
  notificationSchedulerAdapter,
  type PermissionStatusResult,
} from '@/services/notification/NotificationSchedulerAdapter';
import { notificationChannelManager } from '@/services/notification/NotificationChannelManager';
import { notificationReconciliationService } from '@/services/notification/NotificationReconciliationService';

export interface NotificationSettingsProps {
  adapter?: typeof notificationSchedulerAdapter;
  channelManager?: typeof notificationChannelManager;
  reconciliationService?: typeof notificationReconciliationService;
}

const DEFAULT_REMINDER_PRESETS: { label: string; value: number | null }[] = [
  { label: 'None', value: null },
  { label: 'At time', value: 0 },
  { label: '5m before', value: -5 },
  { label: '10m before', value: -10 },
  { label: '15m before', value: -15 },
  { label: '30m before', value: -30 },
  { label: '1h before', value: -60 },
  { label: '1d before', value: -1440 },
];

export default function NotificationSettingsScreen({
  adapter = notificationSchedulerAdapter,
  channelManager = notificationChannelManager,
  reconciliationService = notificationReconciliationService,
}: NotificationSettingsProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();

  const { settings, reload } = useUserSettings();

  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  // Settings toggles and values
  const [prayerNotifications, setPrayerNotifications] = useState(true);
  const [prayerVibration, setPrayerVibration] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [taskVibration, setTaskVibration] = useState(true);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState<number | null>(null);
  const [quietHours, setQuietHours] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('06:00');
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(false);
  const [journalReminderTime, setJournalReminderTime] = useState('21:30');

  // Test notification state
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.prayerAlertsEnabled !== undefined) setPrayerNotifications(settings.prayerAlertsEnabled);
      if (settings.prayerVibrationEnabled !== undefined) setPrayerVibration(settings.prayerVibrationEnabled);
      if (settings.taskRemindersEnabled !== undefined) setTaskReminders(settings.taskRemindersEnabled);
      if (settings.taskVibrationEnabled !== undefined) setTaskVibration(settings.taskVibrationEnabled);
      if ((settings as any).defaultReminderMinutes !== undefined) {
        setDefaultReminderMinutes((settings as any).defaultReminderMinutes);
      }
      if (settings.quietHoursEnabled !== undefined) setQuietHours(settings.quietHoursEnabled);
      if ((settings as any).quietHoursStart) setQuietHoursStart((settings as any).quietHoursStart);
      if ((settings as any).quietHoursEnd) setQuietHoursEnd((settings as any).quietHoursEnd);
      if (settings.journalReminderEnabled !== undefined) setJournalReminderEnabled(settings.journalReminderEnabled);
      if (settings.journalReminderTime !== undefined) setJournalReminderTime(settings.journalReminderTime);
    }
  }, [settings]);

  const handlePrayerNotificationsChange = async (val: boolean) => {
    setPrayerNotifications(val);
    try {
      await userSettingsRepository.upsert({ prayerAlertsEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save prayerAlertsEnabled:', err);
    }
  };

  const handlePrayerVibrationChange = async (val: boolean) => {
    setPrayerVibration(val);
    try {
      await userSettingsRepository.upsert({ prayerVibrationEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save prayerVibrationEnabled:', err);
    }
  };

  const handleTaskRemindersChange = async (val: boolean) => {
    setTaskReminders(val);
    try {
      await userSettingsRepository.upsert({ taskRemindersEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save taskRemindersEnabled:', err);
    }
  };

  const handleTaskVibrationChange = async (val: boolean) => {
    setTaskVibration(val);
    try {
      await userSettingsRepository.upsert({ taskVibrationEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save taskVibrationEnabled:', err);
    }
  };

  const handleDefaultReminderChange = async (minutes: number | null) => {
    setDefaultReminderMinutes(minutes);
    try {
      await userSettingsRepository.upsert({ defaultReminderMinutes: minutes });
      await reload();
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save defaultReminderMinutes:', err);
    }
  };

  const handleQuietHoursChange = async (val: boolean) => {
    setQuietHours(val);
    try {
      await userSettingsRepository.upsert({ quietHoursEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save quietHoursEnabled:', err);
    }
  };

  const handleQuietHoursStartChange = async (newTimeStr: string) => {
    setQuietHoursStart(newTimeStr);
    try {
      await userSettingsRepository.upsert({ quietHoursStart: newTimeStr });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save quietHoursStart:', err);
    }
  };

  const handleQuietHoursEndChange = async (newTimeStr: string) => {
    setQuietHoursEnd(newTimeStr);
    try {
      await userSettingsRepository.upsert({ quietHoursEnd: newTimeStr });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save quietHoursEnd:', err);
    }
  };

  const handleJournalReminderChange = async (val: boolean) => {
    setJournalReminderEnabled(val);
    try {
      await userSettingsRepository.upsert({ journalReminderEnabled: val });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save journalReminderEnabled:', err);
    }
  };

  const handleJournalReminderTimeChange = async (newTimeStr: string) => {
    setJournalReminderTime(newTimeStr);
    try {
      await userSettingsRepository.upsert({ journalReminderTime: newTimeStr });
      await reload();
      if (permission?.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save journalReminderTime:', err);
    }
  };

  const refreshPermissionStatus = useCallback(async () => {
    try {
      const res = await adapter.getPermissionStatus();
      setPermission(res);
    } catch {
      setPermission({ canSchedule: false, canRequest: false, status: 'DENIED' });
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    let mounted = true;
    adapter
      .getPermissionStatus()
      .then((res) => {
        if (mounted) {
          setPermission(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setPermission({ canSchedule: false, canRequest: false, status: 'DENIED' });
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [adapter]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshPermissionStatus();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refreshPermissionStatus]);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      if (Platform.OS === 'android') {
        await channelManager.ensureChannel();
      }
      const res = await adapter.requestPermission();
      setPermission(res);

      if (res.canSchedule) {
        await reconciliationService.reconcile();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Failed to enable notifications:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('[NotificationSettings] Failed to open settings:', err);
    }
  };

  const handleSendTestNotification = async () => {
    if (!permission?.canSchedule) {
      await handleEnableNotifications();
      return;
    }
    setIsSendingTest(true);
    setTestMessage(null);
    try {
      const triggerAtMs = Date.now() + 5000;
      const channelId = channelManager.getTaskChannelId
        ? channelManager.getTaskChannelId('NORMAL', taskVibration)
        : 'task-reminders-v2-vib';

      await adapter.scheduleNotification({
        identifier: `test-notification:${Date.now()}`,
        occurrenceId: 'test-occurrence',
        taskDefinitionId: 'test-definition',
        title: 'Test Reminder',
        triggerAtMs,
        channelId,
        data: {
          kind: 'test-notification' as any,
          triggerAtMs,
          payloadVersion: 2,
        },
      });

      setTestMessage('Test notification scheduled! Arriving in 5 seconds.');
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
      }
      testTimerRef.current = setTimeout(() => {
        setTestMessage(null);
      }, 6000);
    } catch (err) {
      console.warn('[NotificationSettings] Failed to schedule test notification:', err);
      setTestMessage('Failed to schedule test notification.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <SettingsPastelHeader
        title="Notifications"
        subtitle="Set reminders and alerts."
        showBack
        showMosqueArt
        onBack={() => router.back()}
        testID="section-header-notifications"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        testID="notification-settings-scroll"
      >
        {/* CARD 1: PRAYER ALERTS */}
        <SettingsSectionCard
          bgColor={colors.dangerSurface}
          customBadge={<SettingsSecPrayerAlertsIcon size={40} />}
          title="Prayer Alerts"
          subtitle="Get notified for prayer times."
          rightElement={
            <Switch
              testID="prayer-notifications-switch"
              value={prayerNotifications}
              onValueChange={handlePrayerNotificationsChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          }
          testID="prayer-alerts-section-card"
        >
          {/* Sub-row: Vibration (Android only) */}
          {Platform.OS === 'android' && (
            <View style={[styles.subRow, { borderBottomWidth: 0, paddingVertical: spacing.sm }]}>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Vibration</Text>
              <Switch
                testID="prayer-vibration-switch"
                value={prayerVibration}
                onValueChange={handlePrayerVibrationChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          )}
        </SettingsSectionCard>

        {/* CARD 2: TASK REMINDERS */}
        <SettingsSectionCard
          bgColor={colors.dangerSurface}
          customBadge={<SettingsSecTaskRemindersIcon size={40} />}
          title="Task Reminders"
          subtitle="Get reminders for your tasks."
          rightElement={
            <Switch
              testID="task-reminders-switch"
              value={taskReminders}
              onValueChange={handleTaskRemindersChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          }
          testID="task-reminders-section-card"
        >
          {/* System Permission Banner inside card if needed */}
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.xs }} />
          ) : !permission?.canSchedule ? (
            <View
              style={[
                styles.permissionNoticeBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  padding: spacing.sm,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              {permission?.status === 'DENIED' ? (
                <>
                  <Text style={[typography.caption, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                    Notifications are disabled in system settings.
                  </Text>
                  <Pressable
                    onPress={handleOpenSettings}
                    accessibilityRole="button"
                    accessibilityLabel="Open System Settings"
                    testID="open-settings-btn"
                    style={[
                      styles.smallActionBtn,
                      { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sm },
                    ]}
                  >
                    <Icon name="settings" size="xs" color={colors.textPrimary} style={{ marginEnd: 4 }} decorative />
                    <Text style={[typography.labelSmall, { color: colors.textPrimary }]}>Open Settings</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={[typography.caption, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
                    Enable notifications to receive reminders for scheduled tasks.
                  </Text>
                  <Pressable
                    onPress={handleEnableNotifications}
                    disabled={isRequesting}
                    accessibilityRole="button"
                    accessibilityLabel="Enable Notifications"
                    testID="enable-notifications-btn"
                    style={[
                      styles.smallActionBtn,
                      { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: radii.sm },
                    ]}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color={colors.textOnPrimary} />
                    ) : (
                      <>
                        <Icon name="bell" size="xs" color={colors.textOnPrimary} style={{ marginEnd: 4 }} decorative />
                        <Text style={[typography.labelSmall, { color: colors.textOnPrimary }]}>
                          Enable Notifications
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={[styles.grantedBadge, { paddingBottom: spacing.xs }]} testID="notifications-enabled-container">
              <Icon name="check" size="xs" color={colors.primary} decorative style={{ marginEnd: 4 }} />
              <Text
                style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}
                testID="notifications-enabled-label"
              >
                Notifications enabled
              </Text>
            </View>
          )}

          {/* Sub-row: Vibration (Android only) */}
          {Platform.OS === 'android' && (
            <View style={[styles.subRow, { borderBottomWidth: 0, paddingVertical: spacing.sm }]}>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Vibration</Text>
              <Switch
                testID="task-vibration-switch"
                value={taskVibration}
                onValueChange={handleTaskVibrationChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          )}

          {/* Sub-row: Default reminder for new tasks */}
          <View
            style={[
              styles.defaultReminderContainer,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: spacing.sm,
                marginTop: spacing.xs,
              },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Default Reminder for New Tasks</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs }]}>
              Pre-filled when creating new tasks.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.presetChipsScroll, { paddingVertical: spacing.xs }]}
            >
              {DEFAULT_REMINDER_PRESETS.map((preset) => {
                const isSelected = defaultReminderMinutes === preset.value;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => handleDefaultReminderChange(preset.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Default reminder: ${preset.label}`}
                    testID={`default-reminder-chip-${preset.value ?? 'none'}`}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.pill,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs + 2,
                        marginEnd: spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelSmall,
                        {
                          color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SettingsSectionCard>

        {/* CARD 3: DAILY JOURNAL REMINDER */}
        <SettingsSectionCard
          bgColor={colors.dangerSurface}
          customBadge={<SettingsSecJournalReminderIcon size={40} />}
          title="Daily Journal"
          subtitle="Get a gentle evening reminder for your reflection."
          rightElement={
            <Switch
              testID="journal-reminder-switch"
              value={journalReminderEnabled}
              onValueChange={handleJournalReminderChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          }
          testID="journal-reminder-section-card"
        >
          {/* Sub-row: Reminder Time */}
          <TimePickerInput
            value={journalReminderTime}
            onChange={handleJournalReminderTimeChange}
            label="Reminder Time"
            testID="journal-reminder-time-row"
          />
        </SettingsSectionCard>

        {/* CARD 4: GENERAL */}
        <SettingsSectionCard
          bgColor={colors.dangerSurface}
          customBadge={<SettingsSecGeneralBellIcon size={40} />}
          title="General"
          testID="general-section-card"
        >
          {/* Sub-row: Quiet Hours */}
          <View style={[styles.subRow, { borderBottomWidth: 0, paddingVertical: spacing.sm }]}>
            <View style={{ flex: 1, paddingEnd: spacing.sm }}>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Quiet Hours</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Pause non-prayer notifications.
              </Text>
            </View>
            <Switch
              testID="quiet-hours-switch"
              value={quietHours}
              onValueChange={handleQuietHoursChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Quiet Hours Expandable Configuration */}
          {quietHours && (
            <View
              style={[
                styles.quietHoursExpanded,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                  paddingTop: spacing.xs,
                  marginTop: spacing.xs,
                },
              ]}
              testID="quiet-hours-expanded-section"
            >
              <TimePickerInput
                value={quietHoursStart}
                onChange={handleQuietHoursStartChange}
                label="Start Time"
                testID="quiet-hours-start-time-row"
              />
              <TimePickerInput
                value={quietHoursEnd}
                onChange={handleQuietHoursEndChange}
                label="End Time"
                testID="quiet-hours-end-time-row"
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textTertiary, marginTop: spacing.xs, lineHeight: 18 },
                ]}
              >
                Task reminders within these hours are postponed until quiet hours end. Important tasks and prayer alerts are delivered normally.
              </Text>
            </View>
          )}

          {/* Sub-row: Send Test Notification */}
          <View
            style={[
              styles.testSection,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                paddingTop: spacing.md,
                marginTop: spacing.sm,
              },
            ]}
          >
            <View style={styles.testHeaderRow}>
              <View style={{ flex: 1, paddingEnd: spacing.sm }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Test Notification</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Schedule a test notification to verify delivery on this device.
                </Text>
              </View>
              <Pressable
                onPress={handleSendTestNotification}
                disabled={isSendingTest}
                accessibilityRole="button"
                accessibilityLabel="Send Test Notification"
                testID="send-test-notification-btn"
                style={[
                  styles.smallActionBtn,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    borderRadius: radii.sm,
                    alignSelf: 'center',
                  },
                ]}
              >
                {isSendingTest ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="bell" size="xs" color={colors.textOnPrimary} style={{ marginEnd: 4 }} decorative />
                    <Text style={[typography.labelSmall, { color: colors.textOnPrimary }]}>Send Test</Text>
                  </>
                )}
              </Pressable>
            </View>
            {testMessage && (
              <View
                style={[
                  styles.testFeedbackBox,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.sm,
                    padding: spacing.sm,
                    marginTop: spacing.sm,
                  },
                ]}
                testID="test-notification-feedback"
              >
                <Text
                  style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}
                  testID="test-notification-message"
                >
                  {testMessage}
                </Text>
              </View>
            )}
          </View>
        </SettingsSectionCard>

        {/* Required Android Delivery Policy Disclaimer */}
        <View style={{ marginTop: spacing.md, paddingHorizontal: 4 }}>
          <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
            Android may delay reminder delivery according to system battery and alarm policies when exact-alarm capability is unavailable.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  permissionNoticeBox: {
    borderWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultReminderContainer: {},
  presetChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetChip: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietHoursExpanded: {},
  testSection: {},
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testFeedbackBox: {
    borderWidth: 1,
  },
});
