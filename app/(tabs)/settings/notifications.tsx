import React, { useState, useEffect, useCallback } from 'react';
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

export default function NotificationSettingsScreen({
  adapter = notificationSchedulerAdapter,
  channelManager = notificationChannelManager,
  reconciliationService = notificationReconciliationService,
}: NotificationSettingsProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();
  const router = useRouter();

  const { settings, reload } = useUserSettings();

  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  // Exact settings toggles
  const [prayerNotifications, setPrayerNotifications] = useState(true);
  const [prayerVibration, setPrayerVibration] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [taskVibration, setTaskVibration] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(false);
  const [journalReminderTime, setJournalReminderTime] = useState('21:30');

  useEffect(() => {
    if (settings) {
      if (settings.prayerAlertsEnabled !== undefined) setPrayerNotifications(settings.prayerAlertsEnabled);
      if (settings.prayerVibrationEnabled !== undefined) setPrayerVibration(settings.prayerVibrationEnabled);
      if (settings.taskRemindersEnabled !== undefined) setTaskReminders(settings.taskRemindersEnabled);
      if (settings.taskVibrationEnabled !== undefined) setTaskVibration(settings.taskVibrationEnabled);
      if (settings.quietHoursEnabled !== undefined) setQuietHours(settings.quietHoursEnabled);
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
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save taskVibrationEnabled:', err);
    }
  };

  const handleQuietHoursChange = async (val: boolean) => {
    setQuietHours(val);
    try {
      await userSettingsRepository.upsert({ quietHoursEnabled: val });
      await reload();
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save quietHoursEnabled:', err);
    }
  };

  const handleJournalReminderChange = async (val: boolean) => {
    setJournalReminderEnabled(val);
    try {
      await userSettingsRepository.upsert({ journalReminderEnabled: val });
      await reload();
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save journalReminderEnabled:', err);
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
          {/* Sub-row: Vibration */}
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
            <View style={[styles.permissionNoticeBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm }]}>
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
                    style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sm }]}
                  >
                    <Icon name="settings" size="xs" color={colors.textPrimary} style={{ marginRight: 4 }} decorative />
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
                    style={[styles.smallActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: radii.sm }]}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color={colors.textOnPrimary} />
                    ) : (
                      <>
                        <Icon name="bell" size="xs" color={colors.textOnPrimary} style={{ marginRight: 4 }} decorative />
                        <Text style={[typography.labelSmall, { color: colors.textOnPrimary }]}>Enable Notifications</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View style={[styles.grantedBadge, { paddingBottom: spacing.xs }]} testID="notifications-enabled-container">
              <Icon name="check" size="xs" color={colors.primary} decorative style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]} testID="notifications-enabled-label">
                Notifications enabled
              </Text>
            </View>
          )}

          {/* Sub-row: Vibration */}
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
            onChange={async (newTimeStr) => {
              setJournalReminderTime(newTimeStr);
              try {
                await userSettingsRepository.upsert({ journalReminderTime: newTimeStr });
                await reload();
              } catch (err) {
                console.warn('[NotificationSettings] Failed to save journalReminderTime:', err);
              }
            }}
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
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
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
    alignSelf: 'flex-start',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
