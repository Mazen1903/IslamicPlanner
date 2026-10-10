import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePlanningDayMutation } from '@/hooks/usePlanningDayMutation';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import {
  SettingsPastelHeader,
  SettingsGroup,
  SettingsGroupRow,
  SettingsGroupDivider,
  SettingsSecDayStartClockIcon,
} from '@/components/settings';
import { PremiumLockedInfo } from '@/components/premium';
import { TimePickerInput } from '@/components/task-form/DateTimePickerInput';
import { usePaywallTestStore } from '@/stores/usePaywallTestStore';

export default function PlanningDayScreen() {
  const { colors, spacing, typography, radii, shadows } = useTheme();
  const router = useRouter();
  const { settings, reload } = useUserSettings();
  const { isPremium } = useEntitlement();
  const bypassPaywall = usePaywallTestStore(s => s.bypassPaywall);
  const { isSaving, setPlanningDayStart } = usePlanningDayMutation();

  const [showLockedInfo, setShowLockedInfo] = useState(false);

  const hiddenSections: string[] = useMemo(() => {
    try {
      if (settings?.plannerHiddenSections) {
        return JSON.parse(settings.plannerHiddenSections);
      }
    } catch {
      // fallback
    }
    return [];
  }, [settings?.plannerHiddenSections]);

  const handleToggleSection = async (section: string) => {
    if (!isPremium && !bypassPaywall) {
      setShowLockedInfo(true);
      return;
    }
    const next = hiddenSections.includes(section)
      ? hiddenSections.filter(s => s !== section)
      : [...hiddenSections, section];
    try {
      await userSettingsRepository.upsert({ plannerHiddenSections: JSON.stringify(next) });
      await reload();
    } catch (err) {
      console.warn('Failed to persist plannerHiddenSections:', err);
    }
  };

  const currentMode = settings?.planningDayStart ?? 'FAJR';
  const isFajr = currentMode === 'FAJR';
  const isMidnight = currentMode === 'MIDNIGHT';
  const isCustom = currentMode.startsWith('CUSTOM:');

  // Extract stored HH:mm or default to '04:00'
  const customTime = isCustom ? currentMode.replace('CUSTOM:', '') : '04:00';

  const handleSelectFajr = async () => {
    if (isFajr) return;

    const res = await setPlanningDayStart('FAJR');
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
        'Your planning day was updated to Fajr. Schedule refresh will occur automatically when you visit Planner.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSelectMidnight = async () => {
    if (isMidnight) return;

    if (!isPremium && !bypassPaywall) {
      setShowLockedInfo(true);
      return;
    }

    const res = await setPlanningDayStart('MIDNIGHT');
    if (res.status === 'SUCCESS') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        'Your planning day now begins at Midnight. The schedule has been refreshed.',
        [{ text: 'OK' }]
      );
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        'Your planning day was updated to Midnight. Schedule refresh will occur automatically when you visit Planner.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSelectCustom = async () => {
    if (isCustom) return;

    if (!isPremium && !bypassPaywall) {
      setShowLockedInfo(true);
      return;
    }

    const targetValue = `CUSTOM:${customTime || '04:00'}`;
    const res = await setPlanningDayStart(targetValue);
    if (res.status === 'SUCCESS') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        `Your planning day now begins at ${customTime || '04:00'}. The schedule has been refreshed.`,
        [{ text: 'OK' }]
      );
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      await reload();
      Alert.alert(
        'Planning Day Updated',
        'Your planning day was updated. Schedule refresh will occur automatically when you visit Planner.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleCustomTimeChange = async (newTime: string) => {
    if (!isPremium && !bypassPaywall) {
      setShowLockedInfo(true);
      return;
    }

    const targetValue = `CUSTOM:${newTime}`;
    if (targetValue === currentMode) return;

    const res = await setPlanningDayStart(targetValue);
    if (res.status === 'SUCCESS') {
      await reload();
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      await reload();
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <SettingsPastelHeader
        title="Planner Settings"
        subtitle="Customize how your day and tasks work."
        showBack
        showMosqueArt
        onBack={() => router.back()}
        testID="section-header-planning-day"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        testID="planning-day-screen"
      >
        {/* GROUP 1: DAY START */}
        <SettingsGroup
          title="Planning Day Begins At"
          subtitle="Choose when your day transitions"
          testID="day-start-section-card"
        >
          {/* Fajr (Default & Recommended) */}
          <SettingsGroupRow
            icon="sun"
            iconBgColor="transparent"
            title="Fajr (Default & Recommended)"
            subtitle="Follows the dawn prayer"
            isRadio
            radioSelected={isFajr}
            onPress={handleSelectFajr}
            disabled={isSaving}
            testID="planning-day-option-fajr"
          />

          <SettingsGroupDivider />

          {/* Midnight (12:00 AM) */}
          <SettingsGroupRow
            icon="moon"
            iconBgColor="transparent"
            title="Midnight (12:00 AM)"
            subtitle="Standard calendar day transition"
            isRadio
            radioSelected={isMidnight}
            onPress={handleSelectMidnight}
            isLocked={!isPremium && !bypassPaywall}
            disabled={isSaving}
            testID="planning-day-option-midnight"
            lockBadgeTestID="premium-badge-midnight"
          />

          <SettingsGroupDivider />

          {/* Custom Time */}
          <SettingsGroupRow
            icon="clock"
            iconBgColor="transparent"
            title="Custom Time"
            subtitle={isCustom ? `Begins at ${customTime}` : 'Choose a specific transition time'}
            isRadio
            radioSelected={isCustom}
            onPress={handleSelectCustom}
            isLocked={!isPremium && !bypassPaywall}
            disabled={isSaving}
            testID="planning-day-option-custom"
            lockBadgeTestID="premium-badge-custom"
          />

          {/* Time Picker if Custom & Premium (or bypass for testing) */}
          {isCustom && (isPremium || bypassPaywall) && (
            <View style={{ padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }} testID="planning-day-time-picker">
              <TimePickerInput
                value={customTime}
                onChange={handleCustomTimeChange}
                label="Select Transition Time"
              />
            </View>
          )}

          {/* Subtle active mode label for contract verification */}
          <Text style={[styles.hiddenContractText, { color: colors.textTertiary, paddingHorizontal: spacing.md, paddingBottom: spacing.xs }]} testID="planning-day-current-value">
            Current active mode: {currentMode}
          </Text>
        </SettingsGroup>

        {/* GROUP 2: PLANNER SECTIONS */}
        <SettingsGroup
          title="Planner Sections"
          subtitle="Show or hide sections in your daily planner"
          testID="planner-sections-group"
        >
          <SettingsGroupRow
            icon="refresh"
            iconBgColor="transparent"
            title="Previous"
            subtitle="Show overdue and earlier prayer tasks"
            isSwitch
            switchValue={!hiddenSections.includes('PREVIOUS')}
            onSwitchChange={() => handleToggleSection('PREVIOUS')}
            onPress={!isPremium && !bypassPaywall ? () => setShowLockedInfo(true) : undefined}
            isLocked={!isPremium && !bypassPaywall}
            testID="planner-section-previous"
          />
          <SettingsGroupDivider />
          <SettingsGroupRow
            icon="calendar"
            iconBgColor="transparent"
            title="Today"
            subtitle="Show tasks in the active prayer window"
            isSwitch
            switchValue={!hiddenSections.includes('TODAY')}
            onSwitchChange={() => handleToggleSection('TODAY')}
            onPress={!isPremium && !bypassPaywall ? () => setShowLockedInfo(true) : undefined}
            isLocked={!isPremium && !bypassPaywall}
            testID="planner-section-today"
          />
          <SettingsGroupDivider />
          <SettingsGroupRow
            icon="chevron-up"
            iconBgColor="transparent"
            title="Upcoming"
            subtitle="Show future scheduled tasks"
            isSwitch
            switchValue={!hiddenSections.includes('UPCOMING')}
            onSwitchChange={() => handleToggleSection('UPCOMING')}
            onPress={!isPremium && !bypassPaywall ? () => setShowLockedInfo(true) : undefined}
            isLocked={!isPremium && !bypassPaywall}
            testID="planner-section-upcoming"
          />
          <SettingsGroupDivider />
          <SettingsGroupRow
            icon="check-circle"
            iconBgColor="transparent"
            title="Completed"
            subtitle="Show tasks marked completed today"
            isSwitch
            switchValue={!hiddenSections.includes('COMPLETED')}
            onSwitchChange={() => handleToggleSection('COMPLETED')}
            onPress={!isPremium && !bypassPaywall ? () => setShowLockedInfo(true) : undefined}
            isLocked={!isPremium && !bypassPaywall}
            testID="planner-section-completed"
          />
        </SettingsGroup>
      </ScrollView>

      {/* Premium Locked Feature Sheet */}
      <PremiumLockedInfo
        visible={showLockedInfo}
        onClose={() => setShowLockedInfo(false)}
        title="Premium Feature"
        description="Planner section customization and custom day start boundaries are available with Islamic Planner Premium."
      />
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
  hiddenContractText: {
    fontSize: 10,
    marginTop: 4,
  },
});
