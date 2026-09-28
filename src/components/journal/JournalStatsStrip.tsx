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
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

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
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
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
            styles.statNumber,
            { color: colors.textPrimary, marginTop: spacing.xxs },
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
            backgroundColor: currentStreak > 0
              ? (isDark ? 'rgba(15, 159, 74, 0.22)' : colors.primaryLight)
              : (isDark ? 'rgba(30, 41, 59, 0.72)' : colors.surface),
            borderColor: currentStreak > 0
              ? colors.primary
              : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border),
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
            styles.statNumber,
            {
              color: currentStreak > 0 ? colors.primaryDark : colors.textPrimary,
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
              fontWeight: currentStreak > 0 ? '700' : '400',
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
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
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
            styles.statNumber,
            { color: colors.textPrimary, marginTop: spacing.xxs },
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
  statNumber: {
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.5,
  },
});
