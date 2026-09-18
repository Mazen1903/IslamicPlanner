import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalHistoryRow } from './JournalHistoryRow';
import {
  formatGregorianJournalDate,
  formatHijriJournalDate,
} from '@/services/journal/journalDateUtils';
import type { JournalEntryMetadata } from '@/domain/journal/types';
import type { HijriAdjustmentConfig } from '@/domain/calendar/types';

export interface JournalHistoryProps {
  entries: JournalEntryMetadata[];
  selectedPlanningDayKey?: string | null;
  hijriAdjustment?: HijriAdjustmentConfig;
  onSelectEntry: (metadata: JournalEntryMetadata) => void;
  onBackToToday: () => void;
  testID?: string;
}

export function JournalHistory({
  entries,
  selectedPlanningDayKey,
  hijriAdjustment,
  onSelectEntry,
  onBackToToday,
  testID = 'journal-history-list',
}: JournalHistoryProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      {/* Top Header / Back Action */}
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
        <Pressable
          onPress={onBackToToday}
          accessibilityRole="button"
          accessibilityLabel="Back to today's entry"
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? colors.primaryLight : colors.surface,
              borderColor: colors.border,
              minHeight: touchTargets.min,
              borderRadius: radii.sm,
            },
          ]}
          testID="journal-history-back-btn"
        >
          <Icon name="chevron-left" size={18} color={colors.primary} />
          <Text style={[typography.labelMedium, { color: colors.primary, marginLeft: spacing.xs }]}>
            Back to Today
          </Text>
        </Pressable>

        <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
          History
        </Text>
      </View>

      {/* FlatList */}
      {entries.length === 0 ? (
        <View style={[styles.emptyContainer, { padding: spacing.xl }]} testID="journal-history-empty">
          <Icon name="calendar" size={36} color={colors.textTertiary} />
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
            No previous journal entries yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
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
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});
