import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import type { SelectedDayDetailModel } from '@/services/CalendarMonthOrchestrator';
import { TaskCard } from '@/components/task/TaskCard';
import { PrayerTabIcon } from '@/components/prayer/PrayerTabBar';
import { Icon } from '@/components/common/Icon';
import { OccasionBanner } from './OccasionBanner';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

export interface DayDetailTaskListProps {
  selectedDayDetail: SelectedDayDetailModel | null;
  testID?: string;
}

export function DayDetailTaskList({
  selectedDayDetail,
  testID = 'day-detail-task-list',
}: DayDetailTaskListProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const openModal = useAddTaskModalStore(s => s.openModal);

  if (!selectedDayDetail) {
    return null;
  }

  const {
    civilDate,
    hijriFormatted,
    prayerSections,
    anytimeTasks,
    totalTasksCount,
    occasions = [],
  } = selectedDayDetail;

  const civilToday = DateTime.now().toISODate()!;
  const isFutureOrToday = civilDate >= civilToday;
  const formattedDayTitle = DateTime.fromISO(civilDate).isValid
    ? DateTime.fromISO(civilDate).toFormat('cccc, MMMM d')
    : civilDate;

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]} testID={testID}>
      {/* Selected Day Header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.sm, marginBottom: spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={[typography.headlineLarge, { color: colors.textPrimary }]} testID="selected-day-title">
              {formattedDayTitle}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.primary, marginTop: spacing.xxs }]}>
              {hijriFormatted}
            </Text>
          </View>
          {isFutureOrToday && (
            <Pressable
              onPress={() => {
                openModal(undefined, undefined, civilDate, undefined);
              }}
              style={({ pressed }) => [
                styles.addTaskButton,
                {
                  backgroundColor: pressed ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Add task for ${formattedDayTitle}`}
              testID="calendar-add-task-button"
            >
              <Icon name="plus" size="xs" color={colors.primary} />
              <Text style={[typography.labelMedium, { color: colors.primary, marginStart: 4, fontWeight: '600' }]}>
                Add Task
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Islamic Occasions Banner for Selected Day */}
      <OccasionBanner occasions={occasions} selectedDate={civilDate} />

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
                  <PrayerTabIcon
                    prayer={section.prayer}
                    size={24}
                    style={{ marginEnd: spacing.xs }}
                  />
                  <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
                    {section.name}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.primary }]}>
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
          <Text style={[typography.labelLarge, { color: colors.primary }]}>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitles: {
    flex: 1,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginStart: 12,
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
    alignItems: 'center',
  },
  tasksContainer: {
    width: '100%',
  },
  anytimeSectionContainer: {
    width: '100%',
  },
});
