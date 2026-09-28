import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
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
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void;
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
  onToggleSubtask,
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
          onToggleSubtask={onToggleSubtask}
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

      {/* 5. Completed tasks (collapsible) */}
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
});