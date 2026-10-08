import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalHistoryRow } from './JournalHistoryRow';
import { JournalStatsStrip } from './JournalStatsStrip';
import { JournalCalendar } from './JournalCalendar';
import {
  formatGregorianJournalDate,
  formatHijriJournalDate,
} from '@/services/journal/journalDateUtils';
import type { JournalEntryMetadata } from '@/domain/journal/types';
import type { HijriAdjustmentConfig } from '@/domain/calendar/types';

export interface JournalHistoryProps {
  entries: JournalEntryMetadata[];
  selectedPlanningDayKey?: string | null;
  activePlanningDayKey?: string | null;
  hijriAdjustment?: HijriAdjustmentConfig;
  onSelectEntry: (metadata: JournalEntryMetadata) => void;
  onBackToToday: () => void;
  testID?: string;
}

export function JournalHistory({
  entries,
  selectedPlanningDayKey,
  activePlanningDayKey,
  hijriAdjustment,
  onSelectEntry,
  onBackToToday,
  testID = 'journal-history-list',
}: JournalHistoryProps) {
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      {/* Top Header / Back Action */}
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
        <Pressable
          onPress={onBackToToday}
          accessibilityRole="button"
          accessibilityLabel="Back to today's entry"
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed
                ? colors.primaryLight
                : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surface),
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
              minHeight: touchTargets.min,
              borderRadius: radii.pill,
            },
          ]}
          testID="journal-history-back-btn"
        >
          <Icon name="chevron-left" size={16} color={colors.primary} decorative directional />
          <Text style={[typography.labelMedium, { color: colors.primary, marginStart: spacing.xs }]}>
            Back to Today
          </Text>
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={[typography.headlineMedium, styles.title, { color: colors.textPrimary }]}>
            Journal History
          </Text>
        </View>
      </View>

      {/* Empty State */}
      {entries.length === 0 ? (
        <View style={[styles.emptyContainer, { padding: spacing.xl }]} testID="journal-history-empty">
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark ? 'rgba(15, 159, 74, 0.15)' : 'rgba(15, 159, 74, 0.08)',
                borderRadius: radii.pill,
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>📜</Text>
          </View>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No reflections yet
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
            Previous journal entries will appear here once you write and save them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Stats Strip */}
              <JournalStatsStrip
                entries={entries}
                activePlanningDayKey={activePlanningDayKey ?? selectedPlanningDayKey}
              />

              {/* Calendar Heatmap Grid */}
              <JournalCalendar
                entries={entries}
                selectedPlanningDayKey={selectedPlanningDayKey}
                activePlanningDayKey={activePlanningDayKey}
                onSelectEntry={onSelectEntry}
              />

              {/* Section Header */}
              <View
                style={[
                  styles.sectionHeader,
                  { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xs },
                ]}
              >
                <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
                  All Entries
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.planningDayKey === selectedPlanningDayKey;
            const gregorianDisplay = formatGregorianJournalDate(item.planningDayKey);
            const hijriDisplay = formatHijriJournalDate(item.planningDayKey, hijriAdjustment);

            return (
              <JournalHistoryRow
                metadata={item}
                gregorianDisplay={gregorianDisplay}
                hijriDisplay={hijriDisplay}
                isSelected={isSelected}
                onPress={() => onSelectEntry(item)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: spacing.section }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  listHeader: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    letterSpacing: -0.2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
  },
});
