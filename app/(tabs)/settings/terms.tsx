import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { SettingsPastelHeader, SettingsSectionHeader, SettingsInfoCard } from '@/components/settings';

export default function TermsOfServiceScreen() {
  const { colors, spacing, radii, typography } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SettingsPastelHeader
        title="Terms of Service"
        subtitle="Our terms and conditions"
        showBack
        showMosqueArt
        backTestID="terms-back-button"
        onBack={() => router.back()}
        testID="section-header-terms"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }]}
        testID="terms-screen"
        showsVerticalScrollIndicator={false}
      >
        <SettingsInfoCard
          title="Personal Spiritual Productivity"
          message="Islamic Daily Planner is provided to assist your daily worship, habits, and schedule with transparency and honesty."
          icon="info"
        />

        <SettingsSectionHeader title="1. Permitted Use" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            Islamic Daily Planner is intended for personal, non-commercial use to assist in tracking daily prayers, tasks, habits, and reflections.
          </Text>
        </View>

        <SettingsSectionHeader title="2. Astronomical Calculations" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            Prayer times and calendar dates are calculated using established astronomical formulas and historical datasets. Variations can occur due to elevation, atmospheric refraction, and regional moon sightings. Users are encouraged to adjust settings to align with their local Islamic authority.
          </Text>
        </View>

        <SettingsSectionHeader title="3. Local Data Responsibility" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            Because this application runs entirely offline without cloud backups, you are solely responsible for exporting backups of your data before changing devices or performing system resets.
          </Text>
        </View>

        <SettingsSectionHeader title="4. Disclaimer of Warranties" />
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, lineHeight: 22 }]}>
            The application is provided "as is" without warranty of any kind. While every effort is made to ensure reliability, notification delivery may be subject to device operating system battery constraints and settings.
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
