import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { CalendarDayCellModel } from '@/domain/calendar/calendarGrid';

export interface CalendarDayCellProps {
  cell: CalendarDayCellModel;
  onPress: (cell: CalendarDayCellModel) => void;
  testID?: string;
}

export const CalendarDayCell = React.memo(function CalendarDayCell({
  cell,
  onPress,
  testID,
}: CalendarDayCellProps) {
  const { colors, typography, radii, touchTargets } = useTheme();

  const handlePress = () => {
    onPress(cell);
  };

  const isDimmed = !cell.isCurrentMonth;
  const isSelected = cell.isSelected;
  const isToday = cell.isCivilToday;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.cellContainer,
        {
          minHeight: touchTargets.min,
          minWidth: touchTargets.min,
          opacity: isDimmed ? 0.35 : 1,
          backgroundColor: isSelected
            ? colors.primaryLight
            : pressed
            ? colors.surfaceSecondary
            : 'transparent',
          borderRadius: radii.md,
          borderColor: isToday ? colors.primary : 'transparent',
          borderWidth: isToday ? 1.5 : 0,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={cell.accessibleLabel}
      accessibilityState={{ selected: isSelected }}
      testID={testID ?? `calendar-cell-${cell.date}`}
    >
      <View style={styles.content}>
        {/* Gregorian day number */}
        <Text
          style={[
            typography.bodyMedium,
            {
              color: isSelected
                ? colors.primary
                : isToday
                ? colors.primary
                : colors.textPrimary,
              fontWeight: isSelected || isToday ? '700' : '500',
            },
          ]}
        >
          {cell.dayNumber}
        </Text>

        {/* Hijri day number */}
        <Text
          style={[
            typography.caption,
            {
              fontSize: 10,
              lineHeight: 12,
              color: isSelected ? colors.primary : colors.textTertiary,
              marginTop: 1,
            },
          ]}
        >
          {cell.hijriDayNumber}
        </Text>

        {/* Single neutral/accent task-presence dot (M14 §4: No traffic-light colors) */}
        <View style={styles.dotContainer}>
          {cell.hasTasks && (
            <View
              style={[
                styles.taskDot,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                },
              ]}
              testID={`task-dot-${cell.date}`}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cellContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    margin: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotContainer: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskDot: {
    width: 4,
    height: 4,
  },
});
