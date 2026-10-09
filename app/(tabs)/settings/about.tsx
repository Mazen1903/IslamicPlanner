import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/theme';
import {
  SettingsPastelHeader,
  SettingsGroup,
  SettingsGroupRow,
  SettingsGroupDivider,
  SettingsQuoteCard,
  SettingsAboutHelpCenterIcon,
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
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleRateApp = async () => {
    const storeUrl = 'market://details?id=com.mm1903.islamicplannerapp';
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      } else {
        await Linking.openURL('https://play.google.com/store/apps/details?id=com.mm1903.islamicplannerapp');
      }
    } catch {
      Alert.alert('Unable to open store', 'Could not open the store page.', [{ text: 'OK' }]);
    }
  };

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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }]}
        testID="about-screen"
      >
        {/* RESOURCES & LEGAL GROUP */}
        <SettingsGroup
          title="Resources & Legal"
          subtitle="Documentation and application policies"
        >
          <SettingsGroupRow
            title="Help Center"
            subtitle="Find answers to common questions"
            icon={<SettingsAboutHelpCenterIcon size={40} />}
            onPress={() => router.push('/(tabs)/settings/help' as any)}
            showChevron
            testID="about-row-help-center"
            isFirst
          />

          <SettingsGroupDivider />

          <SettingsGroupRow
            title="Privacy Policy"
            subtitle="How we protect your data"
            icon={<SettingsAboutPrivacyPolicyIcon size={40} />}
            onPress={() => router.push('/(tabs)/settings/privacy-policy' as any)}
            showChevron
            testID="about-row-privacy"
          />

          <SettingsGroupDivider />

          <SettingsGroupRow
            title="Terms of Service"
            subtitle="Our terms and conditions"
            icon={<SettingsAboutTermsIcon size={40} />}
            onPress={() => router.push('/(tabs)/settings/terms' as any)}
            showChevron
            testID="about-row-terms"
            isLast={Platform.OS !== 'android'}
          />

          {Platform.OS === 'android' && (
            <>
              <SettingsGroupDivider />
              <SettingsGroupRow
                title="Rate the App"
                subtitle="Leave a review on Google Play"
                icon={<SettingsAboutRateStarIcon size={40} />}
                onPress={handleRateApp}
                showChevron
                testID="about-row-rate"
                isLast
              />
            </>
          )}
        </SettingsGroup>

        {/* Hadith Inspiration Card */}
        <SettingsQuoteCard
          quote="“The best of people are those who benefit people.”"
          citation="— Prophet Muhammad (peace be upon him)"
          testID="about-hadith-card"
        />

        {/* Footer with App Version */}
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
            Built with care for a better you
          </Text>
        </View>

        {/* Open Source Acknowledgements */}
        <SettingsGroup
          title="Open Source Acknowledgements"
          subtitle="Honoring the open-source libraries that power this app"
          testID="credits-section"
        >
          {CREDITS.map((credit, idx) => (
            <React.Fragment key={credit.name}>
              {idx > 0 && <SettingsGroupDivider />}
              <SettingsGroupRow
                title={credit.name}
                subtitle={credit.purpose}
                value={credit.license}
                showChevron={false}
                testID={`credit-item-${credit.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                isFirst={idx === 0}
                isLast={idx === CREDITS.length - 1}
              />
            </React.Fragment>
          ))}
        </SettingsGroup>
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
    paddingTop: 8,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
