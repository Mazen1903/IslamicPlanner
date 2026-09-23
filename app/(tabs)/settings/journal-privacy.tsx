import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';
import {
  JournalLockController,
  journalLockController as defaultController,
} from '@/services/journal/JournalLockController';
import {
  SettingsPastelHeader,
  SettingsSectionHeader,
  SettingsToggle,
  SettingsInfoCard,
  PastelOptionCard,
  SettingsAccSignInIcon,
  SettingsAccCloudSyncIcon,
  SettingsAccConnectedDevicesIcon,
  SettingsAccSyncNowIcon,
  SettingsAccDataMgmtIcon,
  SettingsAccSecurityShieldIcon,
} from '@/components/settings';
import { Switch } from 'react-native';

export interface JournalPrivacyScreenProps {
  controller?: JournalLockController;
}

export default function JournalPrivacyScreen({
  controller = defaultController,
}: JournalPrivacyScreenProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const router = useRouter();

  const [isEnabled, setIsEnabled] = useState<boolean>(controller.isEnabled);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    controller
      .initialize()
      .then(() => {
        if (active) {
          setIsEnabled(controller.isEnabled);
          setIsInitializing(false);
        }
      })
      .catch(err => {
        if (active) {
          console.warn('[JournalPrivacyScreen] Failed to initialize lock state:', err);
          setIsInitializing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [controller]);

  const handleToggle = async (newValue: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (newValue) {
        // Enabling requires biometric auth
        const res = await controller.enableLock();
        if (res.success) {
          setIsEnabled(true);
        } else if (res.error) {
          Alert.alert('Unable to Enable Lock', res.error, [{ text: 'OK' }]);
        }
      } else {
        // Disabling requires biometric auth verification
        const res = await controller.disableLock();
        if (res.success) {
          setIsEnabled(false);
        } else if (res.error) {
          Alert.alert('Unable to Disable Lock', res.error, [{ text: 'OK' }]);
        }
      }
    } catch {
      Alert.alert(
        'Authentication Error',
        'Could not complete biometric authentication. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const [cloudSync, setCloudSync] = useState(true);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Account & Sync"
        subtitle="Keep your data safe and in sync."
        showBack
        showMosqueArt
        backTestID="journal-privacy-back-button"
        onBack={() => router.back()}
        testID="section-header-journal-privacy"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }]}
        testID="journal-privacy-screen"
      >
        {/* MOCKUP ACCOUNT & SYNC OPTIONS */}
        <View style={styles.cardsList}>
          {/* 1. Sign In */}
          <PastelOptionCard
            label="Sign In"
            subtitle="Create or sign in to your account"
            customBadge={<SettingsAccSignInIcon size={40} />}
            onPress={() => {}}
            testID="account-row-sign-in"
          />

          {/* 2. Cloud Sync */}
          <View
            style={[
              styles.syncCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
              shadows.card,
            ]}
          >
            <View style={styles.syncTopRow}>
              <View style={{ marginRight: spacing.md }}>
                <SettingsAccCloudSyncIcon size={40} />
              </View>
              <View style={styles.syncTextContainer}>
                <Text style={[typography.labelLarge, { color: colors.textPrimary }]}>Cloud Sync</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>Backup and sync your data</Text>
              </View>
              <Switch
                value={cloudSync}
                onValueChange={setCloudSync}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              Your tasks, settings and progress will be synced across your devices.
            </Text>
          </View>

          {/* 3. Connected Devices */}
          <PastelOptionCard
            label="Connected Devices"
            subtitle="Manage your devices"
            customBadge={<SettingsAccConnectedDevicesIcon size={40} />}
            onPress={() => {}}
            testID="account-row-devices"
          />

          {/* 4. Sync Now */}
          <PastelOptionCard
            label="Sync Now"
            subtitle="Last synced: Today at 9:41 AM"
            customBadge={<SettingsAccSyncNowIcon size={40} />}
            onPress={() => {}}
            testID="account-row-sync-now"
          />

          {/* 5. Data Management */}
          <PastelOptionCard
            label="Data Management"
            subtitle="Export, import or reset your data"
            customBadge={<SettingsAccDataMgmtIcon size={40} />}
            onPress={() => {}}
            testID="account-row-data-mgmt"
          />
        </View>

        {/* Security Shield Notice matching mockup */}
        <View
          style={[
            styles.securityCard,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginVertical: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
            },
            shadows.card,
          ]}
        >
          <View style={{ marginRight: spacing.md }}>
            <SettingsAccSecurityShieldIcon size={38} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
              Your data is encrypted and secure.
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              We never share your personal information.
            </Text>
          </View>
        </View>

        <SettingsInfoCard
          title="On-Device AES-256-GCM Encryption"
          message="Your personal journal reflections are always encrypted using cryptographic keys stored securely on your device. Enabling Biometric Lock requires Face ID, Touch ID, or Biometric authentication each time the Journal is opened."
          icon="lock"
          testID="journal-privacy-info-card"
        />

        <SettingsSectionHeader title="Access Protection" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isInitializing ? (
            <View style={{ padding: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <SettingsToggle
              label="Biometric Lock"
              description="Require Face ID / fingerprint to unlock journal entries"
              value={isEnabled}
              onValueChange={handleToggle}
              disabled={isProcessing}
              icon="lock"
              testID="journal-lock-toggle"
            />
          )}
        </View>

        {/* Current Security Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, margin: spacing.md, padding: spacing.md }]}>
          <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>
            CURRENT PRIVACY STATUS
          </Text>
          <View style={styles.statusRow}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              Journal Lock:
            </Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isEnabled ? colors.primaryLight : colors.surfaceSecondary,
                  borderRadius: radii.sm,
                },
              ]}
              testID="journal-lock-status-badge"
            >
              <Text
                style={[
                  typography.labelSmall,
                  { color: isEnabled ? colors.primary : colors.textSecondary },
                ]}
              >
                {isEnabled ? 'PROTECTED (BIOMETRIC)' : 'UNLOCKED'}
              </Text>
            </View>
          </View>
          <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xs }]}>
            Encryption remains fully active regardless of whether biometric locking is enabled.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusCard: {
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardsList: {
    paddingTop: 8,
  },
  syncCard: {
    borderWidth: 1,
  },
  syncTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  securityCard: {
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
