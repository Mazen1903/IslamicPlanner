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
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            borderRadius: radii.xl ?? 18,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-total"
      >
        <View
          style={[
            styles.emojiCircle,
            {
              backgroundColor: isDark ? 'rgba(15, 159, 74, 0.2)' : 'rgba(15, 159, 74, 0.1)',
              borderRadius: radii.pill,
            },
          ]}
        >
          <Text style={styles.statEmoji}>📝</Text>
        </View>
        <Text
          style={[
            typography.headlineMedium,
            styles.statNumber,
            { color: colors.textPrimary, marginTop: spacing.xs },
          ]}
        >
          {totalEntries}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: 2, fontSize: 11, fontWeight: '600' },
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
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            borderRadius: radii.xl ?? 18,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-streak"
      >
        <View
          style={[
            styles.emojiCircle,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)',
              borderRadius: radii.pill,
            },
          ]}
        >
          <Text style={styles.statEmoji}>🔥</Text>
        </View>
        <Text
          style={[
            typography.headlineMedium,
            styles.statNumber,
            {
              color: currentStreak > 0 ? colors.primaryDark : colors.textPrimary,
              marginTop: spacing.xs,
            },
          ]}
        >
          {currentStreak}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: 2, fontSize: 11, fontWeight: '600' },
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
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            borderRadius: radii.xl ?? 18,
            padding: spacing.md,
          },
        ]}
        testID="journal-stat-best"
      >
        <View
          style={[
            styles.emojiCircle,
            {
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.12)',
              borderRadius: radii.pill,
            },
          ]}
        >
          <Text style={styles.statEmoji}>🏆</Text>
        </View>
        <Text
          style={[
            typography.headlineMedium,
            styles.statNumber,
            { color: colors.textPrimary, marginTop: spacing.xs },
          ]}
        >
          {longestStreak}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, marginTop: 2, fontSize: 11, fontWeight: '600' },
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
    marginTop: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emojiCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: 18,
  },
  statNumber: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
