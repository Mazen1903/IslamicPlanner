import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface CalendarHeaderProps {
  gregorianTitle: string; // e.g. "September 2026"
  hijriHeaderSpan: string; // e.g. "Rabi' al-Awwal – Rabi' al-Thani 1448"
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onTodayPress: () => void;
  testID?: string;
}

export function CalendarHeader({
  gregorianTitle,
  hijriHeaderSpan,
  onPreviousMonth,
  onNextMonth,
  onTodayPress,
  testID = 'calendar-header',
}: CalendarHeaderProps) {
  const { colors, spacing, typography, radii, touchTargets } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]} testID={testID}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]} accessibilityRole="header">
            {gregorianTitle}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.primary, marginTop: spacing.xxs, fontWeight: '500' }]}>
            {hijriHeaderSpan}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            onPress={onTodayPress}
            style={({ pressed }) => [
              styles.todayButton,
              {
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderColor: colors.border,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
                paddingHorizontal: spacing.md,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            testID="calendar-today-button"
          >
            <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '600' }]}>Today</Text>
          </Pressable>

          <View style={styles.navButtonsGroup}>
            <Pressable
              onPress={onPreviousMonth}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                  borderRadius: radii.pill,
                  minWidth: touchTargets.min,
                  minHeight: touchTargets.min,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              testID="calendar-prev-month-button"
            >
              <Icon name="chevron-left" size={20} color={colors.textPrimary} />
            </Pressable>

            <Pressable
              onPress={onNextMonth}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                  borderRadius: radii.pill,
                  minWidth: touchTargets.min,
                  minHeight: touchTargets.min,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              testID="calendar-next-month-button"
            >
              <Icon name="chevron-right" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
