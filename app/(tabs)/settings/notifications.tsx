import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, AppState, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
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
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

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

  // Refresh status on screen mount
  useEffect(() => {
    let mounted = true;
    adapter
      .getPermissionStatus()
      .then(res => {
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

  // Refresh status when returning from OS Settings (app returns to active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
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
        // Immediate reconcile so stored reminder intent is delivered without background/reopen
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.content, { padding: spacing.lg }]}>
        <View style={styles.headerRow}>
          <Icon name="bell" size={28} color={colors.primary} style={{ marginEnd: spacing.sm }} decorative />
          <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
            Reminders & Notifications
          </Text>
        </View>

        <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl }]}>
          Configure local task reminder delivery.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Permission Status
            </Text>

            {permission?.canSchedule ? (
              <View style={styles.statusRow} testID="notifications-enabled-container">
                <Icon name="check" size={20} color={colors.primary} style={{ marginEnd: spacing.xs }} decorative />
                <Text
                  style={[typography.bodyLarge, { color: colors.primary, fontWeight: '700' }]}
                  testID="notifications-enabled-label"
                >
                  Notifications enabled
                </Text>
              </View>
            ) : permission?.status === 'DENIED' ? (
              <View>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
                  Notifications are disabled in system settings.
                </Text>
                <Pressable
                  onPress={handleOpenSettings}
                  accessibilityRole="button"
                  accessibilityLabel="Open System Settings"
                  testID="open-settings-btn"
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      minHeight: touchTargets.min,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon name="settings" size={18} color={colors.textPrimary} style={{ marginEnd: spacing.sm }} decorative />
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    Open Settings
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
                  Enable notifications to receive reminders for scheduled tasks.
                </Text>
                <Pressable
                  onPress={handleEnableNotifications}
                  disabled={isRequesting}
                  accessibilityRole="button"
                  accessibilityLabel="Enable Notifications"
                  testID="enable-notifications-btn"
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      borderRadius: radii.md,
                      minHeight: touchTargets.min,
                      opacity: pressed || isRequesting ? 0.8 : 1,
                    },
                  ]}
                >
                  {isRequesting ? (
                    <ActivityIndicator color={colors.textOnPrimary} size="small" />
                  ) : (
                    <>
                      <Icon name="bell" size={18} color={colors.textOnPrimary} style={{ marginEnd: spacing.sm }} decorative />
                      <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '600' }]}>
                        Enable Notifications
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={[styles.policyBox, { marginTop: spacing.xl }]}>
          <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
            Android may delay reminder delivery according to system battery and alarm policies when exact-alarm capability is unavailable.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  policyBox: {
    paddingHorizontal: 4,
  },
});
