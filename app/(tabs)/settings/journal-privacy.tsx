import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  JournalLockController,
  journalLockController as defaultController,
} from '@/services/journal/JournalLockController';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsToggle,
  SettingsInfoCard,
} from '@/components/settings';

export interface JournalPrivacyScreenProps {
  controller?: JournalLockController;
}

export default function JournalPrivacyScreen({
  controller = defaultController,
}: JournalPrivacyScreenProps) {
  const { colors, spacing, radii, typography } = useTheme();

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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="Journal Privacy" backTestID="journal-privacy-back-button" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="journal-privacy-screen"
      >
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
