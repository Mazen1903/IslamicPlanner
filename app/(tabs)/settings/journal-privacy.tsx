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
  SettingsAccExportIcon,
  SettingsAccImportIcon,
  SettingsAccEraseIcon,
} from '@/components/settings';
import {
  dataBackupService as defaultBackupService,
  DataBackupService,
} from '@/services/data/DataBackupService';

export interface JournalPrivacyScreenProps {
  controller?: JournalLockController;
  backupService?: DataBackupService;
}

export default function JournalPrivacyScreen({
  controller = defaultController,
  backupService = defaultBackupService,
}: JournalPrivacyScreenProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const router = useRouter();

  const [isEnabled, setIsEnabled] = useState<boolean>(controller.isEnabled);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isOperatingData, setIsOperatingData] = useState<boolean>(false);

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
        const res = await controller.enableLock();
        if (res.success) {
          setIsEnabled(true);
        } else if (res.error) {
          Alert.alert('Unable to Enable Lock', res.error, [{ text: 'OK' }]);
        }
      } else {
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

  const handleExportBackup = async () => {
    if (isOperatingData) return;
    setIsOperatingData(true);
    try {
      const res = await backupService.exportBackup();
      if (!res.success && res.error) {
        Alert.alert('Export Failed', res.error, [{ text: 'OK' }]);
      }
    } catch {
      Alert.alert('Export Error', 'An unexpected error occurred while exporting data.', [{ text: 'OK' }]);
    } finally {
      setIsOperatingData(false);
    }
  };

  const handleImportBackup = () => {
    if (isOperatingData) return;

    Alert.alert(
      'Restore From Backup',
      'Importing a backup will replace your current tasks, planner settings, and streak data with the backup file. This cannot be undone. Do you wish to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File & Restore',
          onPress: async () => {
            setIsOperatingData(true);
            try {
              const res = await backupService.importBackupFromFile();
              if (res.success) {
                Alert.alert(
                  'Restore Complete',
                  `Your backup data from ${res.importedAt ? new Date(res.importedAt).toLocaleDateString() : 'file'} has been successfully restored.`,
                  [{ text: 'OK' }]
                );
              } else if (res.error && res.error !== 'Document picker was canceled') {
                Alert.alert('Restore Failed', res.error, [{ text: 'OK' }]);
              }
            } catch {
              Alert.alert('Restore Error', 'An unexpected error occurred during import.', [{ text: 'OK' }]);
            } finally {
              setIsOperatingData(false);
            }
          },
        },
      ]
    );
  };

  const handleEraseAllData = () => {
    if (isOperatingData) return;

    Alert.alert(
      'Erase All Data',
      'This will permanently delete all your tasks, journal entries, streaks, and preferences from this device. The app will return to the welcome screen. This action cannot be reversed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Erase',
          style: 'destructive',
          onPress: async () => {
            setIsOperatingData(true);
            try {
              const res = await backupService.eraseAllData();
              if (res.success) {
                router.replace('/onboarding' as any);
              } else {
                Alert.alert('Erase Failed', res.error || 'Failed to erase data.', [{ text: 'OK' }]);
              }
            } catch {
              Alert.alert('Erase Error', 'An unexpected error occurred while resetting the app.', [{ text: 'OK' }]);
            } finally {
              setIsOperatingData(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Privacy & Data"
        subtitle="Your data stays on your device."
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
        {/* BACKUP & DATA MANAGEMENT SECTION */}
        <SettingsSectionHeader title="Backup & Restore" />
        <View style={styles.cardsList}>
          {/* 1. Export Backup */}
          <PastelOptionCard
            label="Export Backup"
            subtitle="Save tasks, settings and streaks as JSON"
            customBadge={<SettingsAccExportIcon size={40} />}
            onPress={handleExportBackup}
            disabled={isOperatingData}
            testID="privacy-row-export-backup"
          />

          {/* 2. Import Backup */}
          <PastelOptionCard
            label="Import Backup"
            subtitle="Restore data from a JSON backup file"
            customBadge={<SettingsAccImportIcon size={40} />}
            onPress={handleImportBackup}
            disabled={isOperatingData}
            testID="privacy-row-import-backup"
          />
        </View>

        {/* ACCESS PROTECTION SECTION */}
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
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              marginVertical: spacing.sm,
              padding: spacing.md,
            },
          ]}
        >
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

        {/* Info card regarding encryption and local-first architecture */}
        <SettingsInfoCard
          title="On-Device AES-256-GCM Encryption"
          message="Your personal journal reflections are always encrypted using cryptographic keys stored securely on your device. Journal entries are not included in backups to protect your privacy. Enabling Biometric Lock requires Face ID, Touch ID, or Biometric authentication each time the Journal is opened."
          icon="lock"
          testID="journal-privacy-info-card"
        />

        {/* DANGER ZONE SECTION */}
        <SettingsSectionHeader title="Danger Zone" />
        <View style={styles.cardsList}>
          <PastelOptionCard
            label="Erase All Data"
            subtitle="Permanently delete all local data and reset app"
            customBadge={<SettingsAccEraseIcon size={40} />}
            onPress={handleEraseAllData}
            disabled={isOperatingData}
            testID="privacy-row-erase-all"
          />
        </View>

        <Text
          style={[
            typography.caption,
            {
              color: colors.textTertiary,
              textAlign: 'center',
              marginHorizontal: spacing.md,
              marginTop: spacing.md,
            },
          ]}
        >
          All data is stored exclusively on this device. Backups allow you to transfer data between devices manually.
        </Text>
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
    paddingTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
