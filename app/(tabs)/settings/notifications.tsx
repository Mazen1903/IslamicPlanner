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
  SettingsGroup,
  SettingsGroupRow,
  SettingsGroupDivider,
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
import { REMINDER_SOUNDS, getSoundById } from '@/constants/reminderSounds';
import { REMINDER_BACKGROUNDS, getBackgroundById } from '@/constants/reminderBackgrounds';
import { SoundPicker } from '@/components/task-form/reminder/SoundPicker';

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
  const { colors, spacing, radii, typography, shadows } = useTheme();
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
  const [defaultReminderType, setDefaultReminderType] = useState<'STANDARD' | 'ENHANCED'>('STANDARD');
  const [defaultSoundId, setDefaultSoundId] = useState<string>('default');
  const [defaultBackgroundId, setDefaultBackgroundId] = useState<string>('night_mosque');
  const [showSoundPicker, setShowSoundPicker] = useState(false);

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
      if (settings.reminderDefaults) {
        try {
          const parsed = JSON.parse(settings.reminderDefaults);
          if (parsed.offsetMinutes !== undefined) setDefaultReminderMinutes(parsed.offsetMinutes);
          if (parsed.reminderType) setDefaultReminderType(parsed.reminderType);
          if (parsed.soundId) setDefaultSoundId(parsed.soundId);
          if (parsed.backgroundId) setDefaultBackgroundId(parsed.backgroundId);
        } catch {
          // fallback
        }
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

  const saveReminderDefaults = async (patch: {
    offsetMinutes?: number | null;
    reminderType?: 'STANDARD' | 'ENHANCED';
    soundId?: string;
    backgroundId?: string;
  }) => {
    const nextOffset = patch.offsetMinutes !== undefined ? patch.offsetMinutes : defaultReminderMinutes;
    const nextType = patch.reminderType !== undefined ? patch.reminderType : defaultReminderType;
    const nextSound = patch.soundId !== undefined ? patch.soundId : defaultSoundId;
    const nextBg = patch.backgroundId !== undefined ? patch.backgroundId : defaultBackgroundId;

    if (patch.offsetMinutes !== undefined) setDefaultReminderMinutes(nextOffset);
    if (patch.reminderType !== undefined) setDefaultReminderType(nextType);
    if (patch.soundId !== undefined) setDefaultSoundId(nextSound);
    if (patch.backgroundId !== undefined) setDefaultBackgroundId(nextBg);

    const payload = JSON.stringify({
      offsetMinutes: nextOffset,
      reminderType: nextType,
      soundId: nextSound,
      backgroundId: nextBg,
    });

    try {
      const updateObj: Record<string, any> = { reminderDefaults: payload };
      if (patch.offsetMinutes !== undefined) {
        updateObj.defaultReminderMinutes = patch.offsetMinutes;
      }
      await userSettingsRepository.upsert(updateObj);
      await reload();
    } catch (err) {
      console.warn('[NotificationSettings] Failed to save reminderDefaults:', err);
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

  const activeSound = getSoundById(defaultSoundId);
  const activeBackground = getBackgroundById(defaultBackgroundId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
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
        {/* GROUP 1: PRAYER ALERTS */}
        <SettingsGroup
          title="Prayer Alerts"
          subtitle="Get notified for prayer times."
          testID="prayer-alerts-section-card"
        >
          <SettingsGroupRow
            icon={<SettingsSecPrayerAlertsIcon size={44} />}
            title="Prayer Notifications"
            subtitle="Adhan and prayer time reminders"
            rightElement={
              <Switch
                testID="prayer-notifications-switch"
                value={prayerNotifications}
                onValueChange={handlePrayerNotificationsChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            isFirst
            isLast={Platform.OS !== 'android'}
          />

          {Platform.OS === 'android' && (
            <>
              <SettingsGroupDivider />
              <SettingsGroupRow
                icon={<Icon name="bell" size="sm" color={colors.primary} decorative />}
                title="Vibration"
                subtitle="Vibrate device when prayer time arrives"
                rightElement={
                  <Switch
                    testID="prayer-vibration-switch"
                    value={prayerVibration}
                    onValueChange={handlePrayerVibrationChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                }
                isLast
              />
            </>
          )}
        </SettingsGroup>

        {/* GROUP 2: TASK REMINDERS */}
        <SettingsGroup
          title="Task Reminders"
          subtitle="Get reminders for your scheduled tasks."
          testID="task-reminders-section-card"
        >
          <SettingsGroupRow
            icon={<SettingsSecTaskRemindersIcon size={44} />}
            title="Task Reminders"
            subtitle="Notifications for upcoming tasks"
            rightElement={
              <Switch
                testID="task-reminders-switch"
                value={taskReminders}
                onValueChange={handleTaskRemindersChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            isFirst
          />

          {/* System Permission Notice or Status */}
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}>
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
                    marginBottom: spacing.xs,
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
              <View style={[styles.grantedBadge, { paddingVertical: spacing.xs }]} testID="notifications-enabled-container">
                <Icon name="check" size="xs" color={colors.primary} decorative style={{ marginEnd: 4 }} />
                <Text
                  style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}
                  testID="notifications-enabled-label"
                >
                  Notifications enabled
                </Text>
              </View>
            )}
          </View>

          {/* Sub-row: Vibration (Android only) */}
          {Platform.OS === 'android' && (
            <>
              <SettingsGroupDivider />
              <SettingsGroupRow
                icon={<Icon name="bell" size="sm" color={colors.primary} decorative />}
                title="Vibration"
                subtitle="Vibrate device on reminder alerts"
                rightElement={
                  <Switch
                    testID="task-vibration-switch"
                    value={taskVibration}
                    onValueChange={handleTaskVibrationChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                }
              />
            </>
          )}

          {/* Default reminder for new tasks */}
          <SettingsGroupDivider />
          <View style={[styles.expandedSection, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              Default Reminder Timing
            </Text>
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

          {/* Default Reminder Style: Standard vs Alarm */}
          <SettingsGroupDivider />
          <View style={[styles.expandedSection, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              Default Reminder Style
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs }]}>
              Choose standard notification or full-screen alarm experience.
            </Text>
            <View style={[styles.segmentedRow, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: 3 }]}>
              <Pressable
                onPress={() => saveReminderDefaults({ reminderType: 'STANDARD' })}
                accessibilityRole="button"
                accessibilityState={{ selected: defaultReminderType === 'STANDARD' }}
                style={[
                  styles.segmentedItem,
                  {
                    backgroundColor: defaultReminderType === 'STANDARD' ? colors.surface : 'transparent',
                    borderRadius: radii.sm,
                  },
                  defaultReminderType === 'STANDARD' && shadows.card,
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: defaultReminderType === 'STANDARD' ? colors.primary : colors.textSecondary,
                      fontWeight: defaultReminderType === 'STANDARD' ? '700' : '500',
                    },
                  ]}
                >
                  Standard Banner
                </Text>
              </Pressable>
              <Pressable
                onPress={() => saveReminderDefaults({ reminderType: 'ENHANCED' })}
                accessibilityRole="button"
                accessibilityState={{ selected: defaultReminderType === 'ENHANCED' }}
                style={[
                  styles.segmentedItem,
                  {
                    backgroundColor: defaultReminderType === 'ENHANCED' ? colors.surface : 'transparent',
                    borderRadius: radii.sm,
                  },
                  defaultReminderType === 'ENHANCED' && shadows.card,
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: defaultReminderType === 'ENHANCED' ? colors.primary : colors.textSecondary,
                      fontWeight: defaultReminderType === 'ENHANCED' ? '700' : '500',
                    },
                  ]}
                >
                  Full-Screen Alarm
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Default Sound Picker */}
          <SettingsGroupDivider />
          <SettingsGroupRow
            icon={<Icon name="bell" size="sm" color={colors.primary} decorative />}
            title="Default Sound"
            subtitle={activeSound.name}
            rightElement={
              <Icon name="chevron-right" size="sm" color={colors.textTertiary} directional decorative />
            }
            onPress={() => setShowSoundPicker(true)}
            testID="default-sound-row"
          />

          {/* Default Alarm Background */}
          <SettingsGroupDivider />
          <View style={[styles.expandedSection, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              Default Alarm Background
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs }]}>
              Lock screen wallpaper for enhanced reminders ({activeBackground.name}).
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacing.xs, gap: spacing.xs }}
            >
              {REMINDER_BACKGROUNDS.map((bg) => {
                const isSelected = defaultBackgroundId === bg.id;
                return (
                  <Pressable
                    key={bg.id}
                    onPress={() => saveReminderDefaults({ backgroundId: bg.id })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Background: ${bg.name}`}
                    style={[
                      styles.bgThumbnail,
                      {
                        backgroundColor: bg.colorGradient[0],
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2.5 : 1,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: bg.colorGradient[1],
                          opacity: 0.5,
                          borderRadius: radii.md,
                        },
                      ]}
                    />
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Icon name="check" size={10} color={colors.textOnPrimary} decorative />
                      </View>
                    )}
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textOnPrimary,
                          fontSize: 10,
                          fontWeight: '700',
                          textShadowColor: colors.shadowElevated,
                          textShadowRadius: 2,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {bg.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SettingsGroup>

        {/* GROUP 3: DAILY JOURNAL REMINDER */}
        <SettingsGroup
          title="Daily Journal"
          subtitle="Get a gentle evening reminder for your reflection."
          testID="journal-reminder-section-card"
        >
          <SettingsGroupRow
            icon={<SettingsSecJournalReminderIcon size={44} />}
            title="Daily Reflection"
            subtitle="Gentle reminder to write in your journal"
            rightElement={
              <Switch
                testID="journal-reminder-switch"
                value={journalReminderEnabled}
                onValueChange={handleJournalReminderChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            isFirst
            isLast={!journalReminderEnabled}
          />

          <SettingsGroupDivider />
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
            <TimePickerInput
              value={journalReminderTime}
              onChange={handleJournalReminderTimeChange}
              label="Reminder Time"
              testID="journal-reminder-time-row"
            />
          </View>
        </SettingsGroup>

        {/* GROUP 4: GENERAL */}
        <SettingsGroup
          title="General"
          subtitle="System & quiet hours configuration."
          testID="general-section-card"
        >
          <SettingsGroupRow
            icon={<SettingsSecGeneralBellIcon size={44} />}
            title="Quiet Hours"
            subtitle="Pause non-prayer notifications during sleep"
            rightElement={
              <Switch
                testID="quiet-hours-switch"
                value={quietHours}
                onValueChange={handleQuietHoursChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            isFirst
          />

          {/* Quiet Hours Expandable Configuration */}
          {quietHours && (
            <View
              style={[
                styles.quietHoursExpanded,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
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
          <SettingsGroupDivider />
          <View style={[styles.testSection, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
            <View style={styles.testHeaderRow}>
              <View style={{ flex: 1, paddingEnd: spacing.sm }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Test Notification
                </Text>
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
        </SettingsGroup>

        {/* Required Android Delivery Policy Disclaimer */}
        <View style={{ marginTop: spacing.xs, paddingHorizontal: 4 }}>
          <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
            Android may delay reminder delivery according to system battery and alarm policies when exact-alarm capability is unavailable.
          </Text>
        </View>
      </ScrollView>

      {/* Sound Picker Modal */}
      <SoundPicker
        visible={showSoundPicker}
        onClose={() => setShowSoundPicker(false)}
        selectedSoundId={defaultSoundId}
        onSelectSound={(soundId) => {
          saveReminderDefaults({ soundId });
          setShowSoundPicker(false);
        }}
      />
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
  expandedSection: {},
  presetChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetChip: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgThumbnail: {
    width: 70,
    height: 50,
    padding: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  checkCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
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
