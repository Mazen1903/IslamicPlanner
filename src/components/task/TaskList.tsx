import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { MissedTaskRow } from './MissedTaskRow';
import { CompletedSection } from './CompletedSection';
import { AnytimeTodaySection } from './AnytimeTodaySection';
import { EmptyPrayerState } from './EmptyPrayerState';
import { AllDoneState } from './AllDoneState';
import { AddTaskButton } from './AddTaskButton';
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
}: TaskListProps) {
  const emptyState = computeEmptyState(tab);

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
      {tab.missedTasks.map(task => (
        <MissedTaskRow key={task.occurrenceId} task={task} />
      ))}

      {/* 3. Empty state if no scheduled/anytime/missed tasks */}
      {emptyState === 'NOTHING_SCHEDULED' && (
        <EmptyPrayerState
          selectedPrayer={selectedPrayer}
          currentPrayer={currentPrayer}
          nextPrayer={nextPrayer}
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
      <CompletedSection
        tasks={tab.completedTasks}
        collapsed={completedCollapsed}
        onToggleCollapsed={onToggleCompletedCollapsed}
      />

      {/* 6. + Add Task Button */}
      <AddTaskButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 32,
  },
});