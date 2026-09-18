import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsMutation } from '@/hooks/useSettingsMutation';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsSelectOption,
  SettingsInfoCard,
} from '@/components/settings';
import { Button } from '@/components/common/Button';

export default function PlanningDayScreen() {
  const { colors, spacing, typography } = useTheme();
  const { settings, reload } = useUserSettings();
  const { isSaving, applyTemporalSettings } = useSettingsMutation();

  const currentMode = settings?.planningDayStart ?? 'FAJR';
  const isFajr = currentMode === 'FAJR';

  const handleSwitchToFajr = async () => {
    if (isFajr) return;

    const res = await applyTemporalSettings({ planningDayStart: 'FAJR' });
    if (res.status === 'SUCCESS') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        'Your planning day now begins at Fajr. The schedule has been refreshed.',
        [{ text: 'OK' }]
      );
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        'Your planning day was updated to Fajr. Schedule refresh will occur automatically when you visit Today.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="Planning Day" backTestID="planning-day-back-button" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="planning-day-screen"
      >
        <SettingsInfoCard
          title="Islamic Day Boundary"
          message="In Islamic tradition, the spiritual cycle of the day is measured from Fajr. Tasks planned late at night remain part of your day until the Fajr prayer arrives."
          icon="clock"
          testID="planning-day-info-card"
        />

        {/* Current Active Mode Display */}
        <SettingsSectionHeader title="Planning Day Start Mode" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsSelectOption
            label="Fajr (Default & Recommended)"
            description="Your planning day begins at the moment of Fajr prayer."
            selected={isFajr}
            onSelect={() => {
              if (!isFajr) {
                handleSwitchToFajr();
              }
            }}
            testID="planning-day-option-fajr"
          />

          {!isFajr && (
            <View style={[styles.nonFajrBanner, { backgroundColor: colors.surfaceSecondary, padding: spacing.md }]}>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]} testID="planning-day-current-value">
                Current custom mode: {currentMode}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                Your database is currently configured with this mode. You can switch back to the standard Fajr boundary below.
              </Text>
              <View style={{ marginTop: 12 }}>
                <Button
                  title={isSaving ? 'Switching to Fajr...' : 'Switch to Fajr'}
                  onPress={handleSwitchToFajr}
                  disabled={isSaving}
                  testID="switch-to-fajr-button"
                />
              </View>
            </View>
          )}
        </View>

        {/* Informational Future Modes Card */}
        <View style={{ marginTop: spacing.md }}>
          <SettingsInfoCard
            title="Additional Modes"
            message="Additional planning day modes (Midnight and Custom fixed hour) will be available in a future update."
            icon="info"
            testID="planning-day-future-modes-card"
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
  scrollContent: {
    flexGrow: 1,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nonFajrBanner: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
