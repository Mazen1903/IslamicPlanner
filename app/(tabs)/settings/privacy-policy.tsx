import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { SettingsPastelHeader, SettingsSectionHeader, SettingsInfoCard } from '@/components/settings';

export default function PrivacyPolicyScreen() {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SettingsPastelHeader
        title="Privacy Policy"
        subtitle="How we protect your data"
        showBack
        showMosqueArt
        backTestID="privacy-policy-back-button"
        onBack={() => router.back()}
        testID="section-header-privacy-policy"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }]}
        testID="privacy-policy-screen"
        showsVerticalScrollIndicator={false}
      >
        <SettingsInfoCard
          title="Zero Tracking & Complete Privacy"
          message="Islamic Daily Planner was designed from the ground up to respect your spiritual journey. We do not operate tracking servers, advertising networks, or user profiling."
          icon="lock"
        />

        <SettingsSectionHeader title="1. Data Storage & Ownership" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            All your data—including tasks, habits, planner schedules, and settings—is stored locally in an SQLite database on your physical device. You own your data completely. We never upload or synchronize your information to any remote cloud servers.
          </Text>
        </View>

        <SettingsSectionHeader title="2. Journal Encryption" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            Personal reflections and journal entries are encrypted using industry-standard AES-256-GCM authenticated encryption. Cryptographic keys are generated and preserved exclusively in your device's hardware-backed SecureStore. Biometric authentication (Face ID or fingerprint) can be enabled to restrict access on your device.
          </Text>
        </View>

        <SettingsSectionHeader title="3. Location Information" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            When location permissions are granted, your geographical coordinates are accessed solely on your device to calculate accurate astronomical prayer times and solar positions. Your coordinates are never transmitted over the internet.
          </Text>
        </View>

        <SettingsSectionHeader title="4. Backups and Export" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            You have full freedom to export your tasks, habits, and preferences to a standard JSON backup file at any time. Journal entries are deliberately omitted from export files to prevent accidental leakage of encrypted reflections.
          </Text>
        </View>

        <SettingsSectionHeader title="5. Data Deletion" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            You can permanently wipe all records and reset the app at any time via Settings &gt; Privacy &amp; Data &gt; Erase All Data. Uninstalling the app also removes all local databases and SecureStore keys from your operating system.
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
    paddingTop: 8,
  },
  sectionCard: {
    borderWidth: 1,
    marginBottom: 8,
  },
});
