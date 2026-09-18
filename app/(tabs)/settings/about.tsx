import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsRow,
  SettingsInfoCard,
} from '@/components/settings';

const CREDITS: { name: string; license: string; purpose: string }[] = [
  {
    name: 'GeoNames',
    license: 'CC BY 4.0',
    purpose: 'Offline global geographical city dataset',
  },
  {
    name: 'Adhan',
    license: 'MIT',
    purpose: 'Astronomical prayer time calculation algorithms',
  },
  {
    name: 'Expo & React Native',
    license: 'MIT',
    purpose: 'Cross-platform mobile application architecture',
  },
  {
    name: 'Drizzle ORM & SQLite',
    license: 'Apache 2.0',
    purpose: 'Local transactional database persistence',
  },
  {
    name: 'Luxon',
    license: 'MIT',
    purpose: 'Civil date and timezone handling',
  },
  {
    name: 'expo-crypto',
    license: 'MIT',
    purpose: 'On-device AES-256-GCM journal encryption',
  },
  {
    name: 'expo-local-authentication',
    license: 'MIT',
    purpose: 'Hardware biometric authentication gate',
  },
];

export default function AboutScreen() {
  const { colors, spacing, radii, typography } = useTheme();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="About & Help" backTestID="about-back-button" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="about-screen"
      >
        {/* App Title & Version Header */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              margin: spacing.md,
              padding: spacing.lg,
              alignItems: 'center',
            },
          ]}
        >
          <Text
            style={[
              typography.headlineMedium,
              { color: colors.textPrimary, fontWeight: '700' },
            ]}
            testID="app-name"
          >
            Islamic Daily Planner
          </Text>
          <Text
            style={[
              typography.labelMedium,
              { color: colors.primary, marginTop: 4 },
            ]}
            testID="app-version"
          >
            Version {appVersion}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              {
                color: colors.textSecondary,
                textAlign: 'center',
                marginTop: spacing.md,
                lineHeight: 18,
              },
            ]}
          >
            An offline-first, prayer-centered daily planner designed to bring serenity and spiritual rhythm to your daily duties without surveillance, advertisements, or tracking.
          </Text>
        </View>

        {/* Privacy & Philosophy Notice */}
        <SettingsInfoCard
          title="Privacy & Data Stewardship"
          message="This application operates locally on your device. Your tasks, journals, and location snapshots remain on this device and are never sent to an external server or third party."
          icon="lock"
        />

        {/* Open Source Acknowledgements */}
        <SettingsSectionHeader title="Open Source Acknowledgements" testID="credits-section" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {CREDITS.map(credit => (
            <SettingsRow
              key={credit.name}
              label={credit.name}
              subtitle={credit.purpose}
              value={credit.license}
              showChevron={false}
              testID={`credit-item-${credit.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            />
          ))}
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
  heroCard: {
    borderWidth: 1,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
