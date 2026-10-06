import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';

export interface CalendarHeaderProps {
  gregorianTitle: string; // e.g. "September 2026"
  hijriHeaderSpan: string; // e.g. "Rabi' al-Awwal – Rabi' al-Thani 1448"
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onTodayPress: () => void;
  onTitlePress?: () => void;
  testID?: string;
}

export function CalendarHeader({
  gregorianTitle,
  hijriHeaderSpan,
  onPreviousMonth,
  onNextMonth,
  onTodayPress,
  onTitlePress,
  testID = 'calendar-header',
}: CalendarHeaderProps) {
  const { colors, spacing, typography, radii, touchTargets } = useTheme();

  return (
    <AppHeroHeader
      testID={testID}
      title={
        onTitlePress ? (
          <Pressable
            onPress={onTitlePress}
            style={styles.titlePressable}
            accessibilityRole="button"
            accessibilityLabel={`Change month and year, currently ${gregorianTitle}`}
            testID="calendar-month-picker-trigger"
          >
            <Text
              style={[typography.headlineMedium, styles.titleText, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {gregorianTitle}
            </Text>
            <Icon name="chevron-down" size={16} color={colors.textSecondary} style={{ marginStart: 4 }} decorative />
          </Pressable>
        ) : (
          <Text
            style={[typography.headlineMedium, styles.titleText, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {gregorianTitle}
          </Text>
        )
      }
      hijriSubtitle={
        <Text style={[typography.bodySmall, styles.hijriText, { color: colors.primary, marginTop: spacing.xxs }]}>
          {hijriHeaderSpan}
        </Text>
      }
      rightElement={
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
            <Text style={[typography.labelMedium, { color: colors.primary }]}>Today</Text>
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
              <Icon name="chevron-left" size={20} color={colors.textPrimary} decorative directional />
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
              <Icon name="chevron-right" size={20} color={colors.textPrimary} decorative directional />
            </Pressable>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  titlePressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  hijriText: {
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
