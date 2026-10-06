import React from 'react';
import {
  Modal,
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { RecurrencePreset } from '@/features/task-form/types';
import {
  TrackStreakHeaderBadgeIcon,
  TrackStreakFlameBadgeIcon,
} from './RepeatIcons';

export interface TrackStreakSheetProps {
  visible: boolean;
  onClose: () => void;
  streakEnabled: boolean;
  onToggleStreak: (val: boolean) => void;
  recurrencePreset: RecurrencePreset;
  onSetRecurrencePreset: (preset: RecurrencePreset) => void;
}

export function TrackStreakSheet({
  visible,
  onClose,
  streakEnabled,
  onToggleStreak,
  recurrencePreset,
  onSetRecurrencePreset,
}: TrackStreakSheetProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const isRepeating = recurrencePreset !== 'NONE';

  const handleToggle = (val: boolean) => {
    if (val && !isRepeating) {
      // Auto-set to daily if user toggles on
      onSetRecurrencePreset('DAILY');
      onToggleStreak(true);
      return;
    }
    onToggleStreak(val);
  };

  const handleSetDailyAndEnable = () => {
    onSetRecurrencePreset('DAILY');
    onToggleStreak(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="track-streak-modal"
    >
      <View style={[styles.overlay, { backgroundColor: 'transparent' }]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible={false}
          testID="track-streak-backdrop"
        />
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.sheetContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="track-streak-sheet"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeftContainer}>
              <TrackStreakHeaderBadgeIcon size={44} style={{ marginEnd: spacing.sm }} decorative />
              <View style={styles.titleContainer}>
                <Text
                  accessibilityRole="header"
                  style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                >
                  Track Streak
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Build consistent spiritual & daily habits
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close track streak"
              testID="track-streak-close-btn"
              style={[
                styles.closeButton,
                {
                  minHeight: touchTargets.min,
                  minWidth: touchTargets.min,
                  borderRadius: radii.pill,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            >
              <Icon name="close" size={20} color={colors.textSecondary} decorative />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.xs }}
          >
            {/* Hero Card */}
            <View
              style={[
                styles.heroCard,
                shadows.card,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.heroRow}>
                <TrackStreakFlameBadgeIcon
                  size={46}
                  active={streakEnabled}
                  style={{ marginEnd: spacing.sm }}
                  decorative
                />
                <View style={styles.heroTextContainer}>
                  <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16 }]}>
                    Streak Tracking
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    {streakEnabled
                      ? 'Actively tracking consecutive completions'
                      : 'Disabled for this task'}
                  </Text>
                </View>

                <Switch
                  value={streakEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Track streak toggle"
                  testID="track-streak-modal-switch"
                />
              </View>
            </View>

            {/* Recurrence Requirement Warning / Setup */}
            {!isRepeating && (
              <View
                style={[
                  styles.requirementNotice,
                  {
                    backgroundColor: colors.warning + '14',
                    borderColor: colors.warning,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
                testID="streak-requirement-notice"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Icon name="alert" size={18} color={colors.warning} style={{ marginEnd: 6 }} decorative />
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                    Repeating Schedule Required
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                  Streaks track consecutive occurrences, so this task needs a repeating schedule (e.g. Daily or Weekdays).
                </Text>

                <Pressable
                  onPress={handleSetDailyAndEnable}
                  accessibilityRole="button"
                  accessibilityLabel="Set to Repeat Daily & Enable Streak"
                  testID="streak-set-daily-btn"
                  style={({ pressed }) => [
                    styles.setDailyBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.sm,
                      paddingVertical: 9,
                      paddingHorizontal: spacing.md,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Icon name="refresh" size={16} color={colors.primary} style={{ marginEnd: 6 }} decorative />
                  <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>
                    Set to Repeat Daily & Enable
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Motivational Benefits Card */}
            <View
              style={[
                styles.benefitsCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text style={[typography.labelMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
                Why Track Streaks?
              </Text>

              <View style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitDot,
                    { backgroundColor: colors.primaryLight, marginEnd: spacing.sm },
                  ]}
                >
                  <Icon name="star" size={14} color={colors.primary} decorative />
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  Build consistency and steadfastness (Istiqamah) in your spiritual and daily routines.
                </Text>
              </View>

              <View style={[styles.benefitRow, { marginTop: spacing.sm }]}>
                <View
                  style={[
                    styles.benefitDot,
                    { backgroundColor: colors.primaryLight, marginEnd: spacing.sm },
                  ]}
                >
                  <Icon name="calendar-check" size={14} color={colors.primary} decorative />
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  Visual progress indicators on your Today view and calendar highlight your streak achievements.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            testID="track-streak-done-btn"
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                paddingVertical: 14,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.headlineMedium, { color: colors.textOnPrimary, textAlign: 'center' }]}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    maxHeight: '85%',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderWidth: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  requirementNotice: {
    borderWidth: 1,
  },
  setDailyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  benefitsCard: {
    borderWidth: 1,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
