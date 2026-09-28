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
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
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
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
              minHeight: touchTargets.min,
              borderRadius: radii.pill,
            },
          ]}
          testID="journal-history-back-btn"
        >
          <Icon name="chevron-left" size={16} color={colors.primary} decorative directional />
          <Text style={[typography.labelMedium, { color: colors.primary, marginStart: spacing.xs, fontWeight: '700' }]}>
            Back to Today
          </Text>
        </Pressable>

        <Text style={[typography.headlineMedium, styles.title, { color: colors.textPrimary }]}>
          History
        </Text>
      </View>

      {/* Empty State */}
      {entries.length === 0 ? (
        <View style={[styles.emptyContainer, { padding: spacing.xl }]} testID="journal-history-empty">
          <Text style={styles.emptyEmoji}>📜</Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
            No previous journal entries yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
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
              <View style={[styles.sectionHeader, { paddingHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.sm }]}>
                <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
                  All Entries
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <JournalHistoryRow
              metadata={item}
              gregorianDisplay={formatGregorianJournalDate(item.planningDayKey)}
              hijriDisplay={formatHijriJournalDate(item.planningDayKey, hijriAdjustment)}
              isSelected={item.planningDayKey === selectedPlanningDayKey}
              onPress={() => onSelectEntry(item)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.section }]}
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
    paddingTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  listHeader: {
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  emptyEmoji: {
    fontSize: 40,
  },
});
