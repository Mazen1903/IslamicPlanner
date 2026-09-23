import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePlanningDayMutation } from '@/hooks/usePlanningDayMutation';
import {
  SettingsPastelHeader,
  SettingsSectionCard,
  SettingsSecDayStartClockIcon,
  SettingsSecCompletedCheckIcon,
  SettingsSecOverdueBoltIcon,
  SettingsSecInfoCircleIcon,
  SettingsBadgeGoldLock,
  SettingsCheckCircleIcon,
} from '@/components/settings';
import { PremiumBadge, PremiumLockedInfo } from '@/components/premium';
import { TimePickerInput } from '@/components/task-form/DateTimePickerInput';
import { Icon } from '@/components/common/Icon';

export default function PlanningDayScreen() {
  const { colors, spacing, typography, touchTargets, radii, shadows } = useTheme();
  const router = useRouter();
  const { settings, reload } = useUserSettings();
  const { isPremium } = useEntitlement();
  const { isSaving, setPlanningDayStart } = usePlanningDayMutation();

  const [showLockedInfo, setShowLockedInfo] = useState(false);
  const [completedTasksMode, setCompletedTasksMode] = useState<'KEEP' | 'MOVE' | 'HIDE'>('KEEP');
  const [overdueTasksMode, setOverdueTasksMode] = useState<'KEEP' | 'MOVE' | 'HIDE'>('KEEP');

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
        'Your planning day was updated to Fajr. Schedule refresh will occur automatically when you visit Today.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Update Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSelectMidnight = async () => {
    if (isMidnight) return;

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
    if (isCustom) return;

    if (!isPremium) {
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
        'Your planning day was updated. Schedule refresh will occur automatically when you visit Today.',
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
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
        {/* CARD 1: DAY START */}
        <SettingsSectionCard
          customBadge={<SettingsSecDayStartClockIcon size={40} />}
          title="Day Start"
          subtitle="Choose when your day starts."
          testID="day-start-section-card"
        >
          {/* Midnight (12:00 AM) */}
          <Pressable
            onPress={handleSelectMidnight}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Midnight (12:00 AM)"
            accessibilityState={{ checked: isMidnight }}
            testID="planning-day-option-midnight"
          >
            <View style={[styles.radioCircle, { borderColor: isMidnight ? colors.primary : colors.border }]}>
              {isMidnight && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, marginEnd: spacing.sm }]}>
              Midnight (12:00 AM)
            </Text>
            {!isPremium && <SettingsBadgeGoldLock testID="premium-badge-midnight" />}
          </Pressable>

          {/* Fajr (Default & Recommended) */}
          <Pressable
            onPress={handleSelectFajr}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Fajr (Default & Recommended)"
            accessibilityState={{ checked: isFajr }}
            testID="planning-day-option-fajr"
          >
            <View style={[styles.radioCircle, { borderColor: isFajr ? colors.primary : colors.border }]}>
              {isFajr && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, marginEnd: spacing.sm }]}>
              Fajr (Default & Recommended)
            </Text>
          </Pressable>

          {/* Custom Time */}
          <Pressable
            onPress={handleSelectCustom}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityLabel="Custom Time"
            accessibilityState={{ checked: isCustom }}
            testID="planning-day-option-custom"
          >
            <View style={[styles.radioCircle, { borderColor: isCustom ? colors.primary : colors.border }]}>
              {isCustom && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, marginEnd: spacing.sm }]}>
              Custom Time
            </Text>
            {!isPremium && <SettingsBadgeGoldLock testID="premium-badge-custom" />}
          </Pressable>

          {/* Time Picker if Custom & Premium */}
          {isCustom && isPremium && (
            <View style={{ marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }} testID="planning-day-time-picker">
              <TimePickerInput
                value={customTime}
                onChange={handleCustomTimeChange}
                label="Select Transition Time"
              />
            </View>
          )}

          {/* Hidden/Subtle active mode label for contract verification */}
          <Text style={[styles.hiddenContractText, { color: colors.textTertiary }]} testID="planning-day-current-value">
            Current active mode: {currentMode}
          </Text>
        </SettingsSectionCard>

        {/* CARD 2: COMPLETED TASKS */}
        <SettingsSectionCard
          customBadge={<SettingsSecCompletedCheckIcon size={40} />}
          title="Completed Tasks"
          subtitle="Choose what happens after you complete a task."
          testID="completed-tasks-section-card"
        >
          {/* Keep in today (move to bottom) */}
          <Pressable
            onPress={() => setCompletedTasksMode('KEEP')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {completedTasksMode === 'KEEP' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Keep in today (move to bottom)
            </Text>
          </Pressable>

          {/* Move to completed list */}
          <Pressable
            onPress={() => setCompletedTasksMode('MOVE')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {completedTasksMode === 'MOVE' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Move to completed list
            </Text>
          </Pressable>

          {/* Hide from today */}
          <Pressable
            onPress={() => setCompletedTasksMode('HIDE')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {completedTasksMode === 'HIDE' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Hide from today
            </Text>
          </Pressable>
        </SettingsSectionCard>

        {/* CARD 3: OVERDUE TASKS */}
        <SettingsSectionCard
          customBadge={<SettingsSecOverdueBoltIcon size={40} />}
          title="Overdue Tasks"
          subtitle="Choose how to handle overdue tasks."
          testID="overdue-tasks-section-card"
        >
          {/* Keep in today (Recommended) */}
          <Pressable
            onPress={() => setOverdueTasksMode('KEEP')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {overdueTasksMode === 'KEEP' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Keep in today (Recommended)
            </Text>
          </Pressable>

          {/* Move to next day */}
          <Pressable
            onPress={() => setOverdueTasksMode('MOVE')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {overdueTasksMode === 'MOVE' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Move to next day
            </Text>
          </Pressable>

          {/* Hide from today */}
          <Pressable
            onPress={() => setOverdueTasksMode('HIDE')}
            style={({ pressed }) => [
              styles.radioRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {overdueTasksMode === 'HIDE' ? (
              <SettingsCheckCircleIcon size={20} style={{ marginRight: spacing.sm }} />
            ) : (
              <View style={[styles.radioCircle, { borderColor: colors.border, marginRight: spacing.sm }]} />
            )}
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
              Hide from today
            </Text>
          </Pressable>
        </SettingsSectionCard>

        {/* BOTTOM HELPER NOTICE */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderRadius: radii.card, padding: spacing.md }]}>
          <SettingsSecInfoCircleIcon size={28} style={{ marginRight: 10 }} />
          <Text style={[typography.caption, { color: colors.primary, flex: 1, lineHeight: 18, fontStyle: 'italic' }]}>
            These settings help you organize your tasks in a way that fits your routine.
          </Text>
        </View>
      </ScrollView>

      {/* Premium Locked Feature Sheet */}
      <PremiumLockedInfo
        visible={showLockedInfo}
        onClose={() => setShowLockedInfo(false)}
        title="Premium Feature"
        description="Alternative day start boundaries (Midnight and Custom Time) are available with Islamic Planner Premium."
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hiddenContractText: {
    fontSize: 10,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
