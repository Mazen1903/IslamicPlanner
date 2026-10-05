import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  SettingsGridTile,
  SettingsPastelHeader,
  SettingsQuoteCard,
  SettingsHubMosqueIcon,
  SettingsHubPlannerIcon,
  SettingsHubNotificationsIcon,
  SettingsHubAppearanceIcon,
  SettingsHubCalendarIcon,
  SettingsHubAccountIcon,
  SettingsHubPremiumIcon,
  SettingsHubAboutIcon,
} from '@/components/settings';

export default function SettingsHubScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const hubItems = [
    {
      id: 'prayer-location',
      label: 'Prayer & Location',
      badge: <SettingsHubMosqueIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/prayer-location' as any),
      testID: 'settings-row-prayer-location',
    },
    {
      id: 'planning-day',
      label: 'Planner',
      badge: <SettingsHubPlannerIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/planning-day' as any),
      testID: 'settings-row-planning-day',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      badge: <SettingsHubNotificationsIcon size={44} />,
      bgColor: colors.dangerSurface,
      onPress: () => router.push('/(tabs)/settings/notifications' as any),
      testID: 'settings-row-notifications',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      badge: <SettingsHubAppearanceIcon size={44} />,
      bgColor: colors.prayerFajr,
      onPress: () => router.push('/(tabs)/settings/appearance' as any),
      testID: 'settings-row-appearance',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      badge: <SettingsHubCalendarIcon size={44} />,
      bgColor: colors.prayerIsha,
      onPress: () => router.push('/(tabs)/settings/hijri-calendar' as any),
      testID: 'settings-row-hijri-calendar',
    },
    {
      id: 'account',
      label: 'Privacy & Data',
      badge: <SettingsHubAccountIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/journal-privacy' as any),
      testID: 'settings-row-account',
    },
    {
      id: 'premium',
      label: 'Premium',
      badge: <SettingsHubPremiumIcon size={44} />,
      bgColor: colors.prayerAsr,
      onPress: () => router.push('/(tabs)/settings/premium' as any),
      testID: 'settings-row-premium',
    },
    {
      id: 'about',
      label: 'About',
      badge: <SettingsHubAboutIcon size={44} />,
      bgColor: colors.prayerIsha,
      onPress: () => router.push('/(tabs)/settings/about' as any),
      testID: 'settings-row-about',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Settings"
        subtitle="Customize your app experience"
        testID="section-header-settings"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        testID="settings-hub"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {hubItems.map((item) => (
            <SettingsGridTile
              key={item.id}
              label={item.label}
              badge={item.badge}
              bgColor={item.bgColor}
              onPress={item.onPress}
              testID={item.testID}
              style={styles.gridTile}
            />
          ))}
        </View>

        {/* Bottom Quran Inspiration Quote */}
        <SettingsQuoteCard
          quote="“And whoever relies upon Allah then He is sufficient for him.”"
          citation="Surah At-Talaq (65:3)"
        />
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  gridTile: {
    width: '48.2%',
    marginBottom: 12,
  },
});
