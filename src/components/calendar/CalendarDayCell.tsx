import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { CalendarDayCellModel } from '@/domain/calendar/calendarGrid';

export interface CalendarDayCellProps {
  cell: CalendarDayCellModel;
  onPress: (cell: CalendarDayCellModel) => void;
  testID?: string;
}

import type { OccasionTint } from '@/domain/calendar/IslamicOccasions';

function getOccasionDotColor(tint: OccasionTint, isDark: boolean): string {
  switch (tint) {
    case 'gold':
      return isDark ? '#FACC15' : '#D97706';
    case 'teal':
      return isDark ? '#2DD4BF' : '#0D9488';
    case 'green':
      return isDark ? '#4ADE80' : '#16A34A';
    case 'indigo':
      return isDark ? '#818CF8' : '#4F46E5';
    case 'rose':
    default:
      return isDark ? '#FB7185' : '#E11D48';
  }
}

export const CalendarDayCell = React.memo(function CalendarDayCell({
  cell,
  onPress,
  testID,
}: CalendarDayCellProps) {
  const { colors, typography, radii, touchTargets, isDark } = useTheme();

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
          maxFontSizeMultiplier={2}
          style={[
            typography.bodyMedium,
            {
              color: isSelected
                ? colors.primary
                : isToday
                ? colors.primary
                : colors.textPrimary,
            },
          ]}
        >
          {cell.dayNumber}
        </Text>

        {/* Hijri day number */}
        <Text
          maxFontSizeMultiplier={2}
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

        {/* Task & Occasion indicator dots */}
        <View style={styles.dotContainer}>
          {cell.hasTasks && (
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                },
              ]}
              testID={`task-dot-${cell.date}`}
            />
          )}
          {cell.majorOccasion && (
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: getOccasionDotColor(cell.majorOccasion.tint, isDark),
                  borderRadius: radii.pill,
                },
              ]}
              testID={`occasion-dot-${cell.date}`}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
  },
});
