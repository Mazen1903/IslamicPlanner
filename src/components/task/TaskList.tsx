import React from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { MissedTaskRow } from './MissedTaskRow';
import { CompletedSection } from './CompletedSection';
import { AnytimeTodaySection } from './AnytimeTodaySection';
import { EmptyPrayerState } from './EmptyPrayerState';
import { AllDoneState } from './AllDoneState';
import { computeEmptyState } from '@/services/TodayViewModelProjection';

export interface TaskListProps {
  tab: PrayerTabViewModel;
  selectedPrayer: Prayer;
  currentPrayer: Prayer;
  nextPrayer: Prayer | null;
  completedCollapsed: boolean;
  anytimeCollapsed?: boolean;
  onToggleCompletedCollapsed: () => void;
  onToggleAnytimeCollapsed?: () => void;
  onCompleteTask: (occurrenceId: string) => void;
  onAddTask?: (prayer: Prayer) => void;
  completedTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
  overdueTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
}

export function TaskList({
  tab,
  selectedPrayer,
  currentPrayer,
  nextPrayer,
  completedCollapsed,
  anytimeCollapsed,
  onToggleCompletedCollapsed,
  onToggleAnytimeCollapsed,
  onCompleteTask,
  onAddTask,
  completedTasksMode = 'KEEP',
  overdueTasksMode = 'KEEP',
}: TaskListProps) {
  const router = useRouter();
  const { colors, spacing, typography, radii, isDark } = useTheme();

  const effectiveMissedTasks = overdueTasksMode === 'HIDE' ? [] : tab.missedTasks;
  const effectiveCompletedTasks = completedTasksMode === 'HIDE' ? [] : tab.completedTasks;

  const emptyState = computeEmptyState({
    ...tab,
    missedTasks: effectiveMissedTasks,
    completedTasks: effectiveCompletedTasks,
  });

  const handlePressAddTask = () => {
    if (onAddTask) {
      onAddTask(selectedPrayer);
    } else {
      router.push({ pathname: '/task/add', params: { prayer: selectedPrayer } });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      testID="today-task-list"
    >
      {/* 1. Scheduled PENDING tasks */}
      {tab.scheduledTasks.map(task => (
        <TaskCard
          key={task.occurrenceId}
          task={task}
          onComplete={onCompleteTask}
        />
      ))}

      {/* 2. Missed tasks */}
      {effectiveMissedTasks.map(task => (
        <MissedTaskRow key={task.occurrenceId} task={task} />
      ))}

      {/* 3. Empty state if no scheduled/anytime/missed tasks */}
      {emptyState === 'NOTHING_SCHEDULED' && (
        <EmptyPrayerState
          selectedPrayer={selectedPrayer}
          currentPrayer={currentPrayer}
          nextPrayer={nextPrayer}
          onAddTask={handlePressAddTask}
        />
      )}

      {emptyState === 'ALL_DONE' && (
        <AllDoneState
          selectedPrayer={selectedPrayer}
          currentPrayer={currentPrayer}
          nextPrayer={nextPrayer}
        />
      )}

      {/* 4. Anytime Today section (collapsible bottom section) */}
      {tab.anytimeTasks && tab.anytimeTasks.length > 0 && (
        <AnytimeTodaySection
          tasks={tab.anytimeTasks}
          collapsed={anytimeCollapsed ?? true}
          onToggleCollapsed={onToggleAnytimeCollapsed ?? (() => {})}
          onComplete={onCompleteTask}
        />
      )}

      {/* 5. Inline "+ Add Task" pill button when there are scheduled or anytime tasks */}
      {emptyState !== 'NOTHING_SCHEDULED' && (
        <View style={[styles.inlineAddContainer, { paddingHorizontal: spacing.lg, marginVertical: spacing.md }]}>
          <Pressable
            onPress={handlePressAddTask}
            style={({ pressed }) => [
              styles.inlineAddButton,
              {
                backgroundColor: pressed
                  ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
                  : (isDark ? 'rgba(28, 35, 43, 0.8)' : 'rgba(255, 255, 255, 0.85)'),
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: radii.card,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Add task for ${selectedPrayer}`}
            testID="inline-add-task-button"
          >
            <Text style={[typography.labelLarge, styles.inlineAddText, { color: colors.primary }]}>
              + Add Task
            </Text>
          </Pressable>
        </View>
      )}

      {/* 6. Completed tasks (collapsible) */}
      {completedTasksMode !== 'HIDE' && (
        <CompletedSection
          tasks={effectiveCompletedTasks}
          collapsed={completedCollapsed}
          onToggleCollapsed={onToggleCompletedCollapsed}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  inlineAddContainer: {
    width: '100%',
  },
  inlineAddButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddText: {
    fontWeight: '700',
    fontSize: 15,
  },
});