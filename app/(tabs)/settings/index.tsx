import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  SettingsSectionHeader,
  SettingsRow,
} from '@/components/settings';
import { CALCULATION_METHOD_LABELS } from '@/domain/prayer/calculationMethods';
import type { CalculationMethodKey } from '@/domain/prayer/types';
import { journalLockPreference } from '@/services/journal/JournalLockPreference';

export default function SettingsHubScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { settings } = useUserSettings();
  const [isLockEnabled, setIsLockEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    journalLockPreference.isEnabled().then(val => {
      if (active) {
        setIsLockEnabled(val);
      }
    }).catch(() => {
      if (active) {
        setIsLockEnabled(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Calculation method summary
  const calcMethodKey = (settings?.calculationMethod as CalculationMethodKey) || 'MWL';
  const calcMethodSummary = CALCULATION_METHOD_LABELS[calcMethodKey]?.label ?? 'Muslim World League';

  // Location summary
  const locationSummary =
    settings?.locationMode === 'AUTO'
      ? settings.lastKnownTimezone
        ? `Automatic • ${settings.lastKnownTimezone}`
        : 'Automatic (GPS)'
      : settings?.manualLocationName ?? 'Manual';

  // Planning day summary
  const planningDaySummary =
    settings?.planningDayStart === 'FAJR'
      ? 'Day starts at Fajr'
      : settings?.planningDayStart ?? 'Day starts at Fajr';

  // Hijri adjustment summary
  const hijriAdj = settings?.hijriGlobalAdjustment ?? 0;
  const hijriSummary = `Hijri adjustment: ${hijriAdj > 0 ? `+${hijriAdj}` : hijriAdj} days`;

  // Appearance summary
  const themeSummary =
    settings?.themeMode === 'DARK'
      ? 'Dark'
      : settings?.themeMode === 'LIGHT'
      ? 'Light'
      : 'System';

  // Journal lock summary
  const journalLockSummary =
    isLockEnabled === true
      ? 'Lock On'
      : isLockEnabled === false
      ? 'Lock Off'
      : 'Biometric lock';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[
          styles.headerContainer,
          {
            borderBottomColor: colors.divider,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <Text style={[typography.headlineLarge, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="settings-hub"
      >
        {/* PRAYER SECTION */}
        <SettingsSectionHeader title="Prayer & Location" testID="section-header-prayer" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            label="Prayer Calculation"
            subtitle={calcMethodSummary}
            icon="prayer"
            onPress={() => router.push('/(tabs)/settings/prayer-calculation' as any)}
            testID="settings-row-prayer-calculation"
          />
          <SettingsRow
            label="Prayer Location"
            subtitle={locationSummary}
            icon="location"
            onPress={() => router.push('/(tabs)/settings/prayer-location' as any)}
            testID="settings-row-prayer-location"
          />
        </View>

        {/* PLANNER SECTION */}
        <SettingsSectionHeader title="Planner & Calendar" testID="section-header-planner" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            label="Planning Day"
            subtitle={planningDaySummary}
            icon="clock"
            onPress={() => router.push('/(tabs)/settings/planning-day' as any)}
            testID="settings-row-planning-day"
          />
          <SettingsRow
            label="Hijri Calendar"
            subtitle={hijriSummary}
            icon="moon"
            onPress={() => router.push('/(tabs)/settings/hijri-calendar' as any)}
            testID="settings-row-hijri-calendar"
          />
        </View>

        {/* SYSTEM SECTION */}
        <SettingsSectionHeader title="Preferences & Privacy" testID="section-header-system" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            label="Appearance"
            subtitle={themeSummary}
            icon="sun"
            onPress={() => router.push('/(tabs)/settings/appearance' as any)}
            testID="settings-row-appearance"
          />
          <SettingsRow
            label="Notifications"
            subtitle="Task reminders & schedule"
            icon="bell"
            onPress={() => router.push('/(tabs)/settings/notifications' as any)}
            testID="settings-row-notifications"
          />
          <SettingsRow
            label="Journal Privacy"
            subtitle={journalLockSummary}
            icon="lock"
            onPress={() => router.push('/(tabs)/settings/journal-privacy' as any)}
            testID="settings-row-journal-privacy"
          />
        </View>

        {/* ABOUT SECTION */}
        <SettingsSectionHeader title="About" testID="section-header-about" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            label="About & Help"
            subtitle="Information, version & credits"
            icon="info"
            onPress={() => router.push('/(tabs)/settings/about' as any)}
            testID="settings-row-about"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    flexGrow: 1,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
