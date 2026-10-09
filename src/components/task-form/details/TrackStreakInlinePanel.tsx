import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';
import { StreakFlameBadge } from '@/components/streak';
import type { RecurrencePreset } from '@/features/task-form/types';

export interface TrackStreakInlinePanelProps {
  streakEnabled: boolean;
  /**
   * Called with the requested value. The parent owns premium gating and the
   * "requires repeat" confirmation, so this panel never mutates state itself.
   */
  onToggleStreak: (val: boolean) => void;
  recurrencePreset: RecurrencePreset;
  isPremium?: boolean;
}

export function TrackStreakInlinePanel({
  streakEnabled,
  onToggleStreak,
  recurrencePreset,
  isPremium = true,
}: TrackStreakInlinePanelProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  const handleToggle = (val: boolean) => onToggleStreak(val);

  return (
    <View style={styles.container} testID="track-streak-inline-panel">
      {/* Switch row */}
      <View
        style={[
          styles.switchRow,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      >
        <View style={styles.switchTextContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 15, fontWeight: '700' }]}>
              Habit Streak Tracking
            </Text>
            {!isPremium && (
              <View style={{ marginStart: 6 }}>
                <PremiumLanternIcon size={14} />
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {recurrencePreset !== 'NONE'
              ? 'Build consecutive daily completion streaks.'
              : 'Requires repeat schedule (turns on Daily repeat).'}
          </Text>
        </View>

        <Switch
          value={streakEnabled}
          onValueChange={handleToggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Track streak toggle"
          testID="track-streak-switch-inline"
        />
      </View>

      {/* Flame Tiers Preview */}
      <View
        style={[
          styles.tierCard,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.sm,
          },
        ]}
      >
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.sm, fontSize: 12 }]}>
          Flame Milestone Tiers
        </Text>
        <View style={styles.tierRow}>
          <View style={styles.tierItem}>
            <StreakFlameBadge count={3} size={32} testID="flame-preview-warm" />
            <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 4, fontWeight: '600', fontSize: 11 }]}>
              Warm
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>1-7d</Text>
          </View>
          <View style={styles.tierItem}>
            <StreakFlameBadge count={14} size={32} testID="flame-preview-bright" />
            <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 4, fontWeight: '600', fontSize: 11 }]}>
              Bright
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>8-30d</Text>
          </View>
          <View style={styles.tierItem}>
            <StreakFlameBadge count={45} size={32} testID="flame-preview-hot" />
            <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 4, fontWeight: '600', fontSize: 11 }]}>
              Hot
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>31-99d</Text>
          </View>
          <View style={styles.tierItem}>
            <StreakFlameBadge count={120} size={32} testID="flame-preview-electric" />
            <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 4, fontWeight: '600', fontSize: 11 }]}>
              Electric
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>100d+</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  switchTextContainer: {
    flex: 1,
    marginEnd: 12,
  },
  tierCard: {
    borderWidth: 1,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tierItem: {
    alignItems: 'center',
  },
});
