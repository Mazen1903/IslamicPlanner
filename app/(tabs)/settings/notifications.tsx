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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import {
  SettingsPastelHeader,
  SettingsSectionCard,
  SettingsSecPrayerAlertsIcon,
  SettingsSecTaskRemindersIcon,
  SettingsSecWorshipStarIcon,
  SettingsSecGeneralBellIcon,
} from '@/components/settings';
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
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const router = useRouter();

  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  // Exact mockup toggles
  const [prayerNotifications, setPrayerNotifications] = useState(true);
  const [prayerVibration, setPrayerVibration] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [taskVibration, setTaskVibration] = useState(true);
  const [worshipSuggestions, setWorshipSuggestions] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

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
          customBadge={<SettingsSecPrayerAlertsIcon size={40} />}
          title="Prayer Alerts"
          subtitle="Get notified for prayer times."
          rightElement={
            <Switch
              value={prayerNotifications}
              onValueChange={setPrayerNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          }
          testID="prayer-alerts-section-card"
        >
          {/* Sub-row: Adhan Sound */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { borderBottomColor: colors.border, paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Adhan Sound</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>Default</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>

          {/* Sub-row: Vibration */}
          <View style={[styles.subRow, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Vibration</Text>
            <Switch
              value={prayerVibration}
              onValueChange={setPrayerVibration}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Sub-row: Notify Before Prayer */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Notify Before Prayer</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>10 minutes</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>
        </SettingsSectionCard>

        {/* CARD 2: TASK REMINDERS */}
        <SettingsSectionCard
          customBadge={<SettingsSecTaskRemindersIcon size={40} />}
          title="Task Reminders"
          subtitle="Get reminders for your tasks."
          rightElement={
            <Switch
              value={taskReminders}
              onValueChange={setTaskReminders}
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

          {/* Sub-row: Reminder Time */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { borderBottomColor: colors.border, paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Reminder Time</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>At time of task</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>

          {/* Sub-row: Sound */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { borderBottomColor: colors.border, paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Sound</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>Default</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>

          {/* Sub-row: Vibration */}
          <View style={[styles.subRow, { paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Vibration</Text>
            <Switch
              value={taskVibration}
              onValueChange={setTaskVibration}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </SettingsSectionCard>

        {/* CARD 3: WORSHIP SUGGESTIONS */}
        <SettingsSectionCard
          customBadge={<SettingsSecWorshipStarIcon size={40} />}
          title="Worship Suggestions"
          subtitle="Get notified for suggested acts of worship."
          rightElement={
            <Switch
              value={worshipSuggestions}
              onValueChange={setWorshipSuggestions}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          }
          testID="worship-suggestions-section-card"
        >
          {/* Sub-row: Daily Reminders */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Daily Reminders</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>Morning & Evening</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>
        </SettingsSectionCard>

        {/* CARD 4: GENERAL */}
        <SettingsSectionCard
          customBadge={<SettingsSecGeneralBellIcon size={40} />}
          title="General"
          testID="general-section-card"
        >
          {/* Sub-row: Quiet Hours */}
          <View style={[styles.subRow, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Quiet Hours</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Pause non-prayer notifications.
              </Text>
            </View>
            <Switch
              value={quietHours}
              onValueChange={setQuietHours}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Sub-row: Sound & Vibration Style */}
          <Pressable
            style={({ pressed }) => [
              styles.subRow,
              { paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Sound & Vibration Style
            </Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>
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
