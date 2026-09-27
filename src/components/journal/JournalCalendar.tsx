import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { JournalEntryMetadata } from '@/domain/journal/types';

export interface JournalCalendarProps {
  entries: JournalEntryMetadata[];
  selectedPlanningDayKey?: string | null;
  activePlanningDayKey?: string | null;
  onSelectEntry: (metadata: JournalEntryMetadata) => void;
  onSelectDate?: (dateKey: string) => void;
  testID?: string;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function JournalCalendar({
  entries,
  selectedPlanningDayKey,
  activePlanningDayKey,
  onSelectEntry,
  onSelectDate,
  testID = 'journal-calendar',
}: JournalCalendarProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  const todayKey = activePlanningDayKey ?? DateTime.local().toISODate()!;
  const todayDt = DateTime.fromISO(todayKey);

  // Month currently being browsed
  const [browsedDate, setBrowsedDate] = useState<DateTime>(() => {
    if (selectedPlanningDayKey) {
      const parsed = DateTime.fromISO(selectedPlanningDayKey);
      if (parsed.isValid) return parsed.startOf('month');
    }
    return todayDt.startOf('month');
  });

  // Map of planningDayKey -> metadata for instant lookup
  const entryMap = useMemo(() => {
    const map = new Map<string, JournalEntryMetadata>();
    for (const entry of entries) {
      map.set(entry.planningDayKey, entry);
    }
    return map;
  }, [entries]);

  const year = browsedDate.year;
  const month = browsedDate.month;
  const monthStart = browsedDate.startOf('month');
  const daysInMonth = monthStart.daysInMonth ?? 30;

  // Sunday-first offset: Luxon weekday (1=Mon..7=Sun). (Sun % 7) = 0.
  const leadingFillerCount = monthStart.weekday % 7;

  const isCurrentMonthView = browsedDate.hasSame(todayDt, 'month');

  const handlePrevMonth = () => {
    setBrowsedDate(prev => prev.minus({ months: 1 }));
  };

  const handleNextMonth = () => {
    setBrowsedDate(prev => prev.plus({ months: 1 }));
  };

  const handleJumpToToday = () => {
    setBrowsedDate(todayDt.startOf('month'));
  };

  // Build grid days
  const gridCells = useMemo(() => {
    const cells: Array<{
      dayNumber: number;
      dateKey: string;
      isFiller: boolean;
      hasEntry: boolean;
      entryMeta?: JournalEntryMetadata;
    }> = [];

    // Leading fillers
    for (let i = 0; i < leadingFillerCount; i++) {
      cells.push({
        dayNumber: 0,
        dateKey: `filler-lead-${i}`,
        isFiller: true,
        hasEntry: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entryMeta = entryMap.get(dateKey);
      cells.push({
        dayNumber: day,
        dateKey,
        isFiller: false,
        hasEntry: !!entryMeta,
        entryMeta,
      });
    }

    // Trailing fillers to complete the week
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const trailingCount = 7 - remainder;
      for (let i = 0; i < trailingCount; i++) {
        cells.push({
          dayNumber: 0,
          dateKey: `filler-trail-${i}`,
          isFiller: true,
          hasEntry: false,
        });
      }
    }

    return cells;
  }, [leadingFillerCount, daysInMonth, year, month, entryMap]);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          borderColor: colors.border,
          marginHorizontal: spacing.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
      testID={testID}
    >
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handlePrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [
            styles.navButton,
            {
              borderRadius: radii.pill,
              opacity: pressed ? 0.6 : 1,
              minWidth: touchTargets.min,
              minHeight: touchTargets.min,
            },
          ]}
          testID="journal-calendar-prev-month"
        >
          <Icon name="chevron-left" size={18} color={colors.textPrimary} decorative directional />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary }]} testID="journal-calendar-month-title">
            {browsedDate.toFormat('MMMM yyyy')}
          </Text>
          {!isCurrentMonthView && (
            <Pressable
              onPress={handleJumpToToday}
              accessibilityRole="button"
              accessibilityLabel="Jump to current month"
              style={({ pressed }) => [
                styles.todayBadge,
                {
                  backgroundColor: pressed ? colors.primaryPressed : colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.pill,
                  marginStart: spacing.sm,
                },
              ]}
              testID="journal-calendar-jump-today"
            >
              <Text style={[typography.labelSmall, { color: colors.primaryDark, fontWeight: '700' }]}>
                Today
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => [
            styles.navButton,
            {
              borderRadius: radii.pill,
              opacity: pressed ? 0.6 : 1,
              minWidth: touchTargets.min,
              minHeight: touchTargets.min,
            },
          ]}
          testID="journal-calendar-next-month"
        >
          <Icon name="chevron-right" size={18} color={colors.textPrimary} decorative directional />
        </Pressable>
      </View>

      {/* Weekday Row */}
      <View style={[styles.weekdayRow, { borderBottomColor: colors.divider }]}>
        {WEEKDAYS.map((day, idx) => (
          <View key={`weekday-${idx}`} style={styles.weekdayCell}>
            <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '700' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Day Cells Grid */}
      <View style={styles.grid}>
        {gridCells.map((cell) => {
          if (cell.isFiller) {
            return <View key={cell.dateKey} style={styles.dayCell} />;
          }

          const isSelected = cell.dateKey === selectedPlanningDayKey;
          const isToday = cell.dateKey === todayKey;

          return (
            <Pressable
              key={cell.dateKey}
              onPress={() => {
                if (cell.entryMeta) {
                  onSelectEntry(cell.entryMeta);
                } else if (onSelectDate) {
                  onSelectDate(cell.dateKey);
                }
              }}
              disabled={!cell.hasEntry && !isToday && !onSelectDate}
              accessibilityRole="button"
              accessibilityLabel={`${cell.dayNumber}, ${browsedDate.toFormat('MMMM yyyy')}${
                isToday ? ', Today' : ''
              }${cell.hasEntry ? ', Journal entry written' : ''}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.dayCell,
                {
                  borderRadius: radii.md,
                  backgroundColor: isSelected
                    ? colors.primaryLight
                    : isToday
                    ? colors.surfaceSecondary
                    : 'transparent',
                  borderColor: isSelected
                    ? colors.primary
                    : isToday
                    ? colors.primaryLight
                    : 'transparent',
                  borderWidth: isSelected ? 2 : isToday ? 1 : 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID={`calendar-day-${cell.dateKey}`}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: isSelected
                      ? colors.primaryDark
                      : isToday
                      ? colors.primary
                      : colors.textPrimary,
                    fontWeight: isSelected || isToday ? '700' : '500',
                  },
                ]}
              >
                {cell.dayNumber}
              </Text>

              {/* Entry Dot indicator */}
              {cell.hasEntry ? (
                <View
                  style={[
                    styles.entryDot,
                    {
                      backgroundColor: isSelected ? colors.primaryDark : colors.primary,
                    },
                  ]}
                  testID={`calendar-dot-${cell.dateKey}`}
                />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  entryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 2,
  },
});
