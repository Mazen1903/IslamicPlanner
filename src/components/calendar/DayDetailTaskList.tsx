import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { SelectedDayDetailModel } from '@/services/CalendarMonthOrchestrator';
import { TaskCard } from '@/components/task/TaskCard';

export interface DayDetailTaskListProps {
  selectedDayDetail: SelectedDayDetailModel | null;
  testID?: string;
}

export function DayDetailTaskList({
  selectedDayDetail,
  testID = 'day-detail-task-list',
}: DayDetailTaskListProps) {
  const { colors, spacing, typography, radii } = useTheme();

  if (!selectedDayDetail) {
    return null;
  }

  const {
    civilDate,
    hijriFormatted,
    prayerSections,
    anytimeTasks,
    totalTasksCount,
  } = selectedDayDetail;

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]} testID={testID}>
      {/* Selected Day Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.sm, marginBottom: spacing.md }]}>
        <Text style={[typography.headlineLarge, { color: colors.textPrimary, fontWeight: '700' }]} testID="selected-day-title">
          {civilDate}
        </Text>
        <Text style={[typography.bodySmall, { color: colors.primary, marginTop: spacing.xxs }]}>
          {hijriFormatted}
        </Text>
      </View>

      {totalTasksCount === 0 && (
        <View style={[styles.emptyDayContainer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md }]}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
            No tasks scheduled for this day
          </Text>
        </View>
      )}

      {/* Exactly Five Prayer Sections (Fajr, Dhuhr, Asr, Maghrib, Isha in fixed order) */}
      <View style={styles.prayerSectionsList} testID="prayer-sections-list">
        {prayerSections.map(section => {
          const hasTasks = section.tasks.length > 0;

          return (
            <View
              key={section.prayer}
              style={[styles.sectionContainer, { marginBottom: spacing.md }]}
              testID={`prayer-section-${section.prayer.toLowerCase()}`}
            >
              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {section.name}
                  </Text>
                  <Text
                    importantForAccessibility="no"
                    accessibilityElementsHidden={true}
                    style={[typography.bodySmall, { color: colors.textTertiary, marginStart: spacing.xs }]}
                  >
                    {section.arabicName}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {section.startTime}
                </Text>
              </View>

              {/* Read-Only Task Cards for this Prayer Section */}
              {hasTasks ? (
                <View style={[styles.tasksContainer, { marginTop: spacing.xs }]}>
                  {section.tasks.map(task => (
                    <TaskCard
                      key={task.occurrenceId}
                      task={task}
                      // M14 §3: Calendar day detail is read-only. No onComplete passed.
                    />
                  ))}
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xxs, fontStyle: 'italic' }]}>
                  Nothing scheduled
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Visually Secondary Anytime Area (BELOW the five prayer sections) */}
      <View
        style={[
          styles.anytimeSectionContainer,
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: radii.card,
            padding: spacing.md,
            marginTop: spacing.sm,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
        testID="anytime-secondary-section"
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={[typography.labelLarge, { color: colors.textSecondary, fontWeight: '600' }]}>
            Anytime
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {anytimeTasks.length} {anytimeTasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>

        {anytimeTasks.length > 0 ? (
          <View style={[styles.tasksContainer, { marginTop: spacing.sm }]}>
            {anytimeTasks.map(task => (
              <TaskCard
                key={task.occurrenceId}
                task={task}
                // M14 §3: Read-only.
              />
            ))}
          </View>
        ) : (
          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, fontStyle: 'italic' }]}>
            No unscheduled tasks
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerContainer: {
    width: '100%',
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerSectionsList: {
    width: '100%',
  },
  sectionContainer: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tasksContainer: {
    width: '100%',
  },
  anytimeSectionContainer: {
    width: '100%',
  },
});
