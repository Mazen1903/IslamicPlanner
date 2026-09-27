import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { DateTime } from 'luxon';
import {
  computeCurrentStreak,
  computeLongestStreak,
} from '@/utils/journalStreakUtils';
import type { JournalEntryMetadata } from '@/domain/journal/types';

export interface JournalStatsStripProps {
  entries: JournalEntryMetadata[];
  activePlanningDayKey?: string | null;
  testID?: string;
}

export function JournalStatsStrip({
  entries,
  activePlanningDayKey,
  testID = 'journal-stats-strip',
}: JournalStatsStripProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  const todayKey = activePlanningDayKey ?? DateTime.local().toISODate()!;
  const totalEntries = entries.length;
  const currentStreak = React.useMemo(
    () => computeCurrentStreak(entries, todayKey),
    [entries, todayKey]
  );
  const longestStreak = React.useMemo(
    () => computeLongestStreak(entries),
    [entries]
  );

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg }]} testID={testID}>
      {/* Total Entries */}
      <View
        style={[
          styles.statCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-total"
      >
        <Text style={styles.statEmoji}>✍️</Text>
        <Text
          style={[
            typography.headlineMedium,
            { color: colors.textPrimary, fontWeight: '700', marginTop: spacing.xxs },
          ]}
        >
          {totalEntries}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: spacing.xxs, fontSize: 11 },
          ]}
        >
          {totalEntries === 1 ? 'Entry' : 'Entries'}
        </Text>
      </View>

      {/* Current Streak */}
      <View
        style={[
          styles.statCard,
          shadows.card,
          {
            backgroundColor: currentStreak > 0 ? colors.primaryLight : colors.surface,
            borderColor: currentStreak > 0 ? colors.primary : colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-streak"
      >
        <Text style={styles.statEmoji}>🔥</Text>
        <Text
          style={[
            typography.headlineMedium,
            {
              color: currentStreak > 0 ? colors.primaryDark : colors.textPrimary,
              fontWeight: '700',
              marginTop: spacing.xxs,
            },
          ]}
        >
          {currentStreak}
        </Text>
        <Text
          style={[
            typography.caption,
            {
              color: currentStreak > 0 ? colors.primaryDark : colors.textSecondary,
              marginTop: spacing.xxs,
              fontSize: 11,
            },
          ]}
        >
          Day Streak
        </Text>
      </View>

      {/* Best Streak */}
      <View
        style={[
          styles.statCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-best"
      >
        <Text style={styles.statEmoji}>🏆</Text>
        <Text
          style={[
            typography.headlineMedium,
            { color: colors.textPrimary, fontWeight: '700', marginTop: spacing.xxs },
          ]}
        >
          {longestStreak}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: spacing.xxs, fontSize: 11 },
          ]}
        >
          Best Streak
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
