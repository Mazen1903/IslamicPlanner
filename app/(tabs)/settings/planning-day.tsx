import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePlanningDayMutation } from '@/hooks/usePlanningDayMutation';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsInfoCard,
} from '@/components/settings';
import { PremiumBadge, PremiumLockedInfo } from '@/components/premium';
import { TimePickerInput } from '@/components/task-form/DateTimePickerInput';
import { Icon } from '@/components/common/Icon';

export default function PlanningDayScreen() {
  const { colors, spacing, typography, touchTargets, radii } = useTheme();
  const { settings, reload } = useUserSettings();
  const { isPremium, isLoading: isEntitlementLoading } = useEntitlement();
  const { isSaving, setPlanningDayStart } = usePlanningDayMutation();

  const [showLockedInfo, setShowLockedInfo] = useState(false);

  const currentMode = settings?.planningDayStart ?? 'FAJR';
  const isFajr = currentMode === 'FAJR';
  const isMidnight = currentMode === 'MIDNIGHT';
  const isCustom = currentMode.startsWith('CUSTOM:');

  // Extract stored HH:mm or default to '04:00'
  const customTime = isCustom ? currentMode.replace('CUSTOM:', '') : '04:00';

  const handleSelectFajr = async () => {
    if (isFajr) return; // UI short-circuit

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
        'Your planning day was updated to Fajr. Schedule refresh will occur automatically when you visit Today.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSelectMidnight = async () => {
    // UI-12: If already active mode, presentation short-circuit (zero mutation call)
    if (isMidnight) {
      return;
    }

    if (!isPremium) {
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
        'Your planning day was updated to Midnight. Schedule refresh will occur automatically when you visit Today.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSelectCustom = async () => {
    // UI-12: If already active custom mode, presentation short-circuit (zero mutation call)
    if (isCustom) {
      return;
    }

    if (!isPremium) {
      setShowLockedInfo(true);
      return;
    }

    // Default new custom boundary is 04:00
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
        `Your planning day was updated. Schedule refresh will occur automatically when you visit Today.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleCustomTimeChange = async (newTime: string) => {
    if (!isPremium) {
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

        <SettingsSectionHeader title="Planning Day Start Mode" />

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* 1. FAJR (Universally free) */}
          <Pressable
            onPress={handleSelectFajr}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.optionRow,
              {
                minHeight: touchTargets.min,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Fajr (Default & Recommended)"
            accessibilityState={{ checked: isFajr }}
            testID="planning-day-option-fajr"
          >
            <View style={styles.textContainer}>
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: isFajr ? colors.primary : colors.textPrimary,
                    fontWeight: isFajr ? '600' : '400',
                  },
                ]}
              >
                Fajr (Default & Recommended)
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                Your planning day begins at the moment of Fajr prayer.
              </Text>
            </View>
            <View style={styles.checkWrapper}>
              {isFajr ? (
                <Icon name="check" size={20} color={colors.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )}
            </View>
          </Pressable>

          {/* 2. MIDNIGHT (Premium) */}
          <Pressable
            onPress={handleSelectMidnight}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.optionRow,
              {
                minHeight: touchTargets.min,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Midnight (12:00 AM)"
            accessibilityState={{ checked: isMidnight }}
            testID="planning-day-option-midnight"
          >
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: isMidnight ? colors.primary : colors.textPrimary,
                      fontWeight: isMidnight ? '600' : '400',
                      marginRight: spacing.sm,
                    },
                  ]}
                >
                  Midnight (12:00 AM)
                </Text>
                <PremiumBadge testID="premium-badge-midnight" />
              </View>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                Standard civil day boundary at 00:00.
              </Text>
            </View>
            <View style={styles.checkWrapper}>
              {isMidnight ? (
                <Icon name="check" size={20} color={colors.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )}
            </View>
          </Pressable>

          {/* 3. CUSTOM (Premium) */}
          <Pressable
            onPress={handleSelectCustom}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.optionRow,
              {
                minHeight: touchTargets.min,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderBottomColor: isCustom ? 'transparent' : colors.border,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Custom Time"
            accessibilityState={{ checked: isCustom }}
            testID="planning-day-option-custom"
          >
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: isCustom ? colors.primary : colors.textPrimary,
                      fontWeight: isCustom ? '600' : '400',
                      marginRight: spacing.sm,
                    },
                  ]}
                >
                  Custom Time
                </Text>
                <PremiumBadge testID="premium-badge-custom" />
              </View>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                Choose a fixed local hour for your planning day rollover.
              </Text>
            </View>
            <View style={styles.checkWrapper}>
              {isCustom ? (
                <Icon name="check" size={20} color={colors.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )}
            </View>
          </Pressable>

          {/* CUSTOM time picker section — visible when Custom is active */}
          {isCustom && (
            <View
              style={[
                styles.customPickerContainer,
                {
                  backgroundColor: colors.surfaceSecondary,
                  padding: spacing.md,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TimePickerInput
                value={customTime}
                onChange={handleCustomTimeChange}
                disabled={!isPremium || isSaving}
                label="Planning Day Boundary Time"
                testID="planning-day-time-picker"
              />
              {!isPremium && !isEntitlementLoading && (
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, marginTop: spacing.xs },
                  ]}
                >
                  Editing this custom boundary requires Premium entitlement.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Informational banner when an existing non-FAJR mode is loaded while FREE */}
        {!isPremium && !isEntitlementLoading && !isFajr && (
          <View
            style={[
              styles.nonFajrBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                marginHorizontal: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textPrimary, fontWeight: '600' },
              ]}
              testID="planning-day-current-value"
            >
              Current active mode: {currentMode}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              Your database is currently configured with this mode. You can switch back to the standard Fajr boundary at any time.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Premium locked info modal */}
      <PremiumLockedInfo
        visible={showLockedInfo}
        onClose={() => setShowLockedInfo(false)}
        testID="premium-locked-info"
      />
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPickerContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nonFajrBanner: {
    borderWidth: 1,
  },
});
