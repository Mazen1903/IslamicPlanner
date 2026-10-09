import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  SettingsPastelHeader,
  SettingsGroup,
  SettingsGroupDivider,
  SettingsInfoCard,
} from '@/components/settings';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: { category: string; items: FaqItem[] }[] = [
  {
    category: 'Prayer Times & Location',
    items: [
      {
        question: 'How are prayer times calculated?',
        answer:
          'Prayer times are calculated on your device using astronomical equations from the trusted Adhan library. You can customize the calculation method, juristic rule (Shafi or Hanafi), and manual minute offsets under Prayer & Location settings.',
      },
      {
        question: 'Why do prayer times change when I travel?',
        answer:
          'When Automatic Location is enabled, the app uses your device coordinates to determine local sunrise and prayer angles. You can switch to Manual City Mode if you prefer a fixed location.',
      },
    ],
  },
  {
    category: 'Islamic Calendar',
    items: [
      {
        question: 'How does the Hijri calendar adjustment work?',
        answer:
          'Astronomical calendars may differ from local moon sightings by 1 or 2 days. You can apply a Global Adjustment (±2 days) or month-specific overrides under Calendar Settings to align with your local community.',
      },
    ],
  },
  {
    category: 'Notifications & Reminders',
    items: [
      {
        question: 'Why did I miss a prayer or task reminder?',
        answer:
          'Ensure notifications are enabled in your device system settings, and check that battery optimization allows background alerts. In app settings, verify that Quiet Hours is not silencing your alerts during that time window.',
      },
    ],
  },
  {
    category: 'Data & Privacy',
    items: [
      {
        question: 'Where is my data stored?',
        answer:
          'All your planner tasks, streaks, and settings are stored locally on your device in an encrypted/private SQLite database. No personal data is sent to external servers.',
      },
      {
        question: 'How can I back up or transfer my data?',
        answer:
          'Go to Settings > Privacy & Data > Export Backup. This saves a JSON file that you can share or store. On another device, use Import Backup to restore your data.',
      },
      {
        question: 'Are my journal reflections included in backups?',
        answer:
          'No. To protect your utmost privacy, journal entries are encrypted on-device with hardware-backed keys and are omitted from export files.',
      },
    ],
  },
];

export default function HelpScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Help Center"
        subtitle="Frequently asked questions and guides"
        showBack
        showMosqueArt
        backTestID="help-back-button"
        onBack={() => router.back()}
        testID="section-header-help"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }]}
        testID="help-screen"
        showsVerticalScrollIndicator={false}
      >
        <SettingsInfoCard
          title="Local-First App"
          message="Islamic Daily Planner works completely offline without accounts or cloud servers. All calculations and storage remain securely on your device."
          icon="info"
        />

        {FAQS.map((cat, catIdx) => (
          <SettingsGroup key={catIdx} title={cat.category}>
            {cat.items.map((item, itemIdx) => (
              <React.Fragment key={itemIdx}>
                {itemIdx > 0 && <SettingsGroupDivider />}
                <View style={{ padding: spacing.md }}>
                  <Text
                    style={[
                      typography.headlineMedium,
                      { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
                    ]}
                  >
                    {item.question}
                  </Text>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textSecondary, marginTop: 6, lineHeight: 22 },
                    ]}
                  >
                    {item.answer}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </SettingsGroup>
        ))}
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
});
