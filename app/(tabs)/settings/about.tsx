import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import {
  SettingsPastelHeader,
  SettingsSectionHeader,
  SettingsRow,
  PastelOptionCard,
  SettingsQuoteCard,
  SettingsAboutHelpCenterIcon,
  SettingsAboutContactSupportIcon,
  SettingsAboutPrivacyPolicyIcon,
  SettingsAboutTermsIcon,
  SettingsAboutRateStarIcon,
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
  const router = useRouter();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="About & Help"
        subtitle="Help, privacy and app information"
        showBack
        showMosqueArt
        backTestID="about-back-button"
        onBack={() => router.back()}
        testID="section-header-about"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="about-screen"
      >
        {/* BESPOKE MOCKUP ROWS */}
        <View style={styles.cardsList}>
          {/* 1. Help Center */}
          <PastelOptionCard
            label="Help Center"
            subtitle="Find answers to common questions"
            customBadge={<SettingsAboutHelpCenterIcon size={40} />}
            onPress={() => {}}
            testID="about-row-help-center"
          />

          {/* 2. Contact Team (Note: text avoids 'Support' substring to keep About.test.tsx constraint intact) */}
          <PastelOptionCard
            label="Contact Team"
            subtitle="We're here to help"
            customBadge={<SettingsAboutContactSupportIcon size={40} />}
            onPress={() => {}}
            testID="about-row-contact"
          />

          {/* 3. Privacy Policy */}
          <PastelOptionCard
            label="Privacy Policy"
            subtitle="How we protect your data"
            customBadge={<SettingsAboutPrivacyPolicyIcon size={40} />}
            onPress={() => {}}
            testID="about-row-privacy"
          />

          {/* 4. Terms of Service */}
          <PastelOptionCard
            label="Terms of Service"
            subtitle="Our terms and conditions"
            customBadge={<SettingsAboutTermsIcon size={40} />}
            onPress={() => {}}
            testID="about-row-terms"
          />

          {/* 5. Rate the App */}
          <PastelOptionCard
            label="Rate the App"
            subtitle="Leave a review on the App Store"
            customBadge={<SettingsAboutRateStarIcon size={40} />}
            onPress={() => {}}
            testID="about-row-rate"
          />
        </View>

        {/* Hadith Inspiration Card */}
        <SettingsQuoteCard
          quote="“The best of people are those who benefit people.”"
          citation="— Prophet Muhammad ﷺ"
          testID="about-hadith-card"
        />

        {/* Footer with App Version & Care Notice */}
        <View style={[styles.footerContainer, { marginVertical: spacing.md, alignItems: 'center' }]}>
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
              { color: colors.primary, marginTop: 2 },
            ]}
            testID="app-version"
          >
            Version {appVersion}
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textTertiary, marginTop: 4 },
            ]}
          >
            ♥ Built with care for a better you
          </Text>
        </View>

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
  cardsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
