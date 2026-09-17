import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { CalendarMonthGridModel, CalendarDayCellModel } from '@/domain/calendar/calendarGrid';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarMonthGridProps {
  grid: CalendarMonthGridModel;
  onCellTap: (cell: CalendarDayCellModel) => void;
  testID?: string;
}

export function CalendarMonthGrid({
  grid,
  onCellTap,
  testID = 'calendar-month-grid',
}: CalendarMonthGridProps) {
  const { colors, spacing, typography } = useTheme();

  // Split cells into rows of 7
  const rows: CalendarDayCellModel[][] = [];
  for (let r = 0; r < grid.rowCount; r++) {
    rows.push(grid.cells.slice(r * 7, (r + 1) * 7));
  }

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md }]} testID={testID}>
      {/* Weekday Header Row (Sun-Sat) */}
      <View style={[styles.weekdayHeaderRow, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.xs }]}>
        {WEEKDAYS.map((day, idx) => (
          <View key={day} style={styles.weekdayHeaderCell}>
            <Text
              style={[
                typography.caption,
                {
                  color: idx === 0 || idx === 6 ? colors.textSecondary : colors.textTertiary,
                  fontWeight: '600',
                  textAlign: 'center',
                },
              ]}
              accessibilityRole="text"
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid Rows (4, 5, or 6 rows) */}
      <View style={styles.gridBody}>
        {rows.map((rowCells, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {rowCells.map(cell => (
              <CalendarDayCell
                key={cell.date}
                cell={cell}
                onPress={onCellTap}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekdayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBody: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
