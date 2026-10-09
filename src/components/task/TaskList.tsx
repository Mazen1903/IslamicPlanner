import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, useWindowDimensions, Vibration, type PanResponderGestureState } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { AllDoneState } from './AllDoneState';
import { Icon } from '@/components/common/Icon';
import { useTodayStore } from '@/stores/useTodayStore';
import { usePlannerUiStore } from '@/stores/usePlannerUiStore';
import { useToastStore } from '@/stores/useToastStore';
import { deriveOverdueState } from '@/services/TodayViewModelProjection';

export interface TaskListProps {
  tab: PrayerTabViewModel;
  allTabs?: PrayerTabViewModel[];
  upcomingDaysTasks?: TaskCardViewModel[];
  selectedPrayer: Prayer;
  currentPrayer: Prayer;
  nextPrayer: Prayer | null;
  completedCollapsed?: boolean;
  anytimeCollapsed?: boolean;
  onToggleCompletedCollapsed?: () => void;
  onToggleAnytimeCollapsed?: () => void;
  onCompleteTask: (occurrenceId: string) => void;
  onUndoTask?: (occurrenceId: string) => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void | Promise<void>;
  onAddTask?: (prayer: Prayer) => void;
  onSelectPrayer?: (prayer: Prayer) => void;
  onRescheduleTask?: (task: TaskCardViewModel, targetPrayer: Prayer) => void;
  onDragTargetChange?: (prayer: Prayer | null) => void;
  completedTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
  overdueTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
  plannerHiddenSections?: string[] | null;
  isPremium?: boolean;
  onDeleteTask?: (task: TaskCardViewModel, scope?: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES') => void | boolean | Promise<void | boolean>;
}
const PRAYERS: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

interface SectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  testID: string;
}

function SectionHeader({ title, count, isExpanded, onToggle, testID }: SectionHeaderProps) {
  const { colors, typography, touchTargets, spacing } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.sectionHeader,
        {
          minHeight: touchTargets.min,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} items, ${isExpanded ? 'expanded' : 'collapsed'}`}
      accessibilityState={{ expanded: isExpanded }}
      testID={testID}
    >
      <View style={styles.sectionHeaderContent}>
        <Text
          style={[
            typography.bodyLarge,
            styles.sectionTitle,
            { color: colors.textPrimary },
          ]}
        >
          {title} ({count})
        </Text>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
          style={styles.chevron}
          decorative
        />
      </View>
    </Pressable>
  );
}

export function TaskList({
  tab,
  allTabs,
  upcomingDaysTasks = [],
  selectedPrayer,
  currentPrayer,
  nextPrayer,
  completedCollapsed = true,
  anytimeCollapsed,
  onToggleCompletedCollapsed,
  onToggleAnytimeCollapsed,
  onCompleteTask,
  onUndoTask,
  onToggleSubtask,
  onAddTask: _onAddTask,
  onSelectPrayer,
  onRescheduleTask,
  onDragTargetChange,
  completedTasksMode = 'KEEP',
  overdueTasksMode = 'KEEP',
  plannerHiddenSections = [],
  isPremium = false,
  onDeleteTask,
}: TaskListProps) {
  const { colors, typography } = useTheme();

  const highlightedOccurrenceId = usePlannerUiStore(s => s.highlightedOccurrenceId);
  const [hiddenDeletedIds, setHiddenDeletedIds] = useState<Set<string>>(new Set());

  const isSectionHidden = useCallback(
    (sectionKey: 'PREVIOUS' | 'TODAY' | 'UPCOMING' | 'COMPLETED') => {
      if (!isPremium) return false; // Free users fail-closed (all sections visible)
      if (!plannerHiddenSections || !Array.isArray(plannerHiddenSections)) return false;
      return plannerHiddenSections.includes(sectionKey);
    },
    [isPremium, plannerHiddenSections]
  );

  const handleDeleteTask = useCallback(
    async (task: TaskCardViewModel, scope: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES' = 'THIS_OCCURRENCE') => {
      if (task.isRecurring) {
        try {
          await onDeleteTask?.(task, scope);
          useToastStore.getState().showToast({
            message: scope === 'ALL_OCCURRENCES' ? 'Series deleted' : 'Occurrence deleted',
          });
        } catch (err) {
          console.warn('[TaskList] Failed to delete recurring task:', err);
        }
        return;
      }

      setHiddenDeletedIds(prev => new Set(prev).add(task.occurrenceId));
      useToastStore.getState().showToast({
        message: 'Task deleted',
        durationMs: 5000,
        action: {
          label: 'Undo',
          onPress: () => {
            setHiddenDeletedIds(prev => {
              const next = new Set(prev);
              next.delete(task.occurrenceId);
              return next;
            });
          },
        },
        onCommit: async () => {
          try {
            await onDeleteTask?.(task, 'THIS_OCCURRENCE');
          } catch (err) {
            console.warn('[TaskList] Failed to commit one-off delete:', err);
          }
        },
      });
    },
    [onDeleteTask]
  );

  const findTaskById = useCallback(
    (occurrenceId: string): TaskCardViewModel | undefined => {
      const tabs = allTabs && allTabs.length > 0 ? allTabs : [tab];
      for (const t of tabs) {
        const pools = [t.scheduledTasks, t.missedTasks, t.completedTasks, t.anytimeTasks ?? []];
        for (const pool of pools) {
          const hit = pool.find(x => x.occurrenceId === occurrenceId);
          if (hit) return hit;
        }
      }
      return upcomingDaysTasks.find(x => x.occurrenceId === occurrenceId);
    },
    [allTabs, tab, upcomingDaysTasks]
  );

  // Completing a parent task with unfinished checklist items offers a one-tap
  // "Mark all done" so the checklist and the task stay consistent.
  const handleCompleteTask = useCallback(
    (occurrenceId: string) => {
      const task = findTaskById(occurrenceId);
      const incompleteIds = (task?.subtasks ?? []).filter(s => !s.isCompleted).map(s => s.id);

      onCompleteTask(occurrenceId);

      if (incompleteIds.length > 0 && onToggleSubtask) {
        useToastStore.getState().showToast({
          message: 'Mark all checklist items done?',
          durationMs: 5000,
          action: {
            label: 'Mark all',
            onPress: () => {
              void (async () => {
                // Sequential: each toggle is a read-modify-write on the occurrence.
                for (const subtaskId of incompleteIds) {
                  try {
                    await onToggleSubtask(occurrenceId, subtaskId);
                  } catch (err) {
                    console.warn('[TaskList] Failed to mark checklist item done:', err);
                  }
                }
              })();
            },
          },
        });
      }
    },
    [findTaskById, onCompleteTask, onToggleSubtask]
  );

  // Collapsible section states persisted across app restarts
  const {
    previousExpanded,
    todayExpanded,
    upcomingExpanded,
    completedExpanded: storedCompletedExpanded,
    togglePrevious,
    toggleToday,
    toggleUpcoming,
    toggleCompleted,
    hydrate: hydratePlannerUi,
  } = usePlannerUiStore();

  useEffect(() => {
    hydratePlannerUi();
  }, [hydratePlannerUi]);

  const completedExpanded = onToggleCompletedCollapsed ? !completedCollapsed : storedCompletedExpanded;

  const nowMs = useTodayStore(s => s.nowMs);
  const now = useMemo(() => DateTime.fromMillis(nowMs), [nowMs]);
  const nowIso = now.toISO() ?? '';

  // Fix #1: Use hook instead of stale Dimensions.get snapshot
  const { width: screenWidth } = useWindowDimensions();

  // Edge pagination tuning constants
  const EDGE_ZONE_WIDTH = 36; // Narrow edge zone near screen bezel (px)
  const MIN_HORIZONTAL_DRAG = 35; // Minimum horizontal displacement to confirm drag intent (px)
  const INITIAL_DWELL_MS = 800; // Time needed to dwell at edge before flipping page (ms)
  const PAGINATION_COOLDOWN_MS = 1200; // Minimum delay before subsequent page flips while holding (ms)

  const originPrayerRef = useRef<Prayer>(selectedPrayer);
  const currentHoverPrayerRef = useRef<Prayer | null>(null);
  const edgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const edgeDirectionRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const lastEdgeSwitchTimeRef = useRef<number>(0);

  // Keep a ref to selectedPrayer to always have the latest value in async callbacks without recreation churn
  const selectedPrayerRef = useRef<Prayer>(selectedPrayer);
  useEffect(() => {
    selectedPrayerRef.current = selectedPrayer;
  }, [selectedPrayer]);

  // Fix #2: Clean up edge dwell timer on unmount to prevent ghost reschedules
  useEffect(() => {
    return () => {
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
    };
  }, []);

  const handleDragStart = useCallback(
    (task: TaskCardViewModel) => {
      originPrayerRef.current = selectedPrayer;
      currentHoverPrayerRef.current = selectedPrayer;
      lastEdgeSwitchTimeRef.current = 0;
      edgeDirectionRef.current = null;
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
      onDragTargetChange?.(selectedPrayer);
    },
    [selectedPrayer, onDragTargetChange]
  );

  const handleDragMove = useCallback(
    (task: TaskCardViewModel, gestureState: PanResponderGestureState) => {
      // 1. Top prayer capsules area (gestureState.moveY < 180): user is aiming to drop on a capsule
      if (gestureState.moveY > 0 && gestureState.moveY < 180) {
        // Cancel any pending edge page flips when user targets top capsules
        if (edgeTimerRef.current) {
          clearTimeout(edgeTimerRef.current);
          edgeTimerRef.current = null;
        }
        edgeDirectionRef.current = null;

        const colIndex = Math.min(4, Math.max(0, Math.floor(gestureState.moveX / (screenWidth / 5))));
        const hovered = PRAYERS[colIndex];
        if (hovered && hovered !== currentHoverPrayerRef.current) {
          currentHoverPrayerRef.current = hovered;
          onDragTargetChange?.(hovered);
          try {
            Vibration.vibrate(20);
          } catch {}
        }
        return;
      }

      // 2. Edge pagination when dragging horizontally in the main task area
      const currentIdx = PRAYERS.indexOf(selectedPrayerRef.current);
      const isLeftEdge = gestureState.moveX < EDGE_ZONE_WIDTH && gestureState.dx < -MIN_HORIZONTAL_DRAG;
      const isRightEdge = gestureState.moveX > screenWidth - EDGE_ZONE_WIDTH && gestureState.dx > MIN_HORIZONTAL_DRAG;
      const now = Date.now();

      if (isLeftEdge && currentIdx > 0) {
        // Cancel opposite edge timer if switching direction
        if (edgeDirectionRef.current === 'RIGHT') {
          if (edgeTimerRef.current) {
            clearTimeout(edgeTimerRef.current);
            edgeTimerRef.current = null;
          }
        }

        // Check if cooldown has elapsed since the last page switch
        const timeSinceLastSwitch = now - lastEdgeSwitchTimeRef.current;
        if (timeSinceLastSwitch >= PAGINATION_COOLDOWN_MS && !edgeTimerRef.current) {
          edgeDirectionRef.current = 'LEFT';
          edgeTimerRef.current = setTimeout(() => {
            const latestIdx = PRAYERS.indexOf(selectedPrayerRef.current);
            if (latestIdx > 0) {
              const prevPrayer = PRAYERS[latestIdx - 1];
              lastEdgeSwitchTimeRef.current = Date.now();
              onSelectPrayer?.(prevPrayer);
              currentHoverPrayerRef.current = prevPrayer;
              onDragTargetChange?.(prevPrayer);
              try {
                Vibration.vibrate(30);
              } catch {}
            }
            edgeTimerRef.current = null;
          }, INITIAL_DWELL_MS);
        }
      } else if (isRightEdge && currentIdx < PRAYERS.length - 1) {
        // Cancel opposite edge timer if switching direction
        if (edgeDirectionRef.current === 'LEFT') {
          if (edgeTimerRef.current) {
            clearTimeout(edgeTimerRef.current);
            edgeTimerRef.current = null;
          }
        }

        // Check if cooldown has elapsed since the last page switch
        const timeSinceLastSwitch = now - lastEdgeSwitchTimeRef.current;
        if (timeSinceLastSwitch >= PAGINATION_COOLDOWN_MS && !edgeTimerRef.current) {
          edgeDirectionRef.current = 'RIGHT';
          edgeTimerRef.current = setTimeout(() => {
            const latestIdx = PRAYERS.indexOf(selectedPrayerRef.current);
            if (latestIdx < PRAYERS.length - 1) {
              const nextPrayer = PRAYERS[latestIdx + 1];
              lastEdgeSwitchTimeRef.current = Date.now();
              onSelectPrayer?.(nextPrayer);
              currentHoverPrayerRef.current = nextPrayer;
              onDragTargetChange?.(nextPrayer);
              try {
                Vibration.vibrate(30);
              } catch {}
            }
            edgeTimerRef.current = null;
          }, INITIAL_DWELL_MS);
        }
      } else {
        // Away from edges: cancel pending edge timers and reset direction
        if (edgeTimerRef.current) {
          clearTimeout(edgeTimerRef.current);
          edgeTimerRef.current = null;
        }
        edgeDirectionRef.current = null;
      }
    },
    [onSelectPrayer, onDragTargetChange, screenWidth]
  );

  const handleDragEnd = useCallback(
    (task: TaskCardViewModel, _gestureState: PanResponderGestureState) => {
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
      edgeDirectionRef.current = null;
      lastEdgeSwitchTimeRef.current = 0;

      const targetPrayer = currentHoverPrayerRef.current || selectedPrayer;
      onDragTargetChange?.(null);

      if (targetPrayer && targetPrayer !== originPrayerRef.current) {
        onRescheduleTask?.(task, targetPrayer);
      }

      currentHoverPrayerRef.current = null;
    },
    [selectedPrayer, onRescheduleTask, onDragTargetChange]
  );

  // Partition tasks into Previous, Today, Upcoming, and Completed Today
  const { previousTasks, todayTasks, upcomingTasks, completedTasks } = useMemo(() => {
    const seenIds = new Set<string>();
    const completed: TaskCardViewModel[] = [];
    const previous: TaskCardViewModel[] = [];
    const today: TaskCardViewModel[] = [];
    const upcomingRaw: TaskCardViewModel[] = [];

    // Collect all tabs to process (all tabs if present, otherwise just current tab)
    const tabsToProcess = allTabs && allTabs.length > 0 ? allTabs : [tab];

    for (const t of tabsToProcess) {
      // 1. Scheduled tasks
      for (const task of t.scheduledTasks) {
        if (hiddenDeletedIds.has(task.occurrenceId) || seenIds.has(task.occurrenceId)) continue;
        seenIds.add(task.occurrenceId);

        if (task.status === 'COMPLETED') {
          if (completedTasksMode !== 'HIDE') completed.push(task);
        } else if (task.status === 'MISSED' || deriveOverdueState(task, now).isOverdue) {
          if (overdueTasksMode !== 'HIDE') previous.push(task);
        } else if (t.prayer === selectedPrayer) {
          today.push(task);
        } else {
          const prayerIdx = PRAYERS.indexOf(t.prayer);
          const selectedIdx = PRAYERS.indexOf(selectedPrayer);
          if (prayerIdx > selectedIdx) {
            upcomingRaw.push(task);
          } else {
            if (overdueTasksMode !== 'HIDE') previous.push(task);
          }
        }
      }

      // 2. Missed tasks
      if (overdueTasksMode !== 'HIDE') {
        for (const task of t.missedTasks) {
          if (hiddenDeletedIds.has(task.occurrenceId) || seenIds.has(task.occurrenceId)) continue;
          seenIds.add(task.occurrenceId);
          previous.push(task);
        }
      }

      // 3. Completed tasks
      if (completedTasksMode !== 'HIDE') {
        for (const task of t.completedTasks) {
          if (hiddenDeletedIds.has(task.occurrenceId) || seenIds.has(task.occurrenceId)) continue;
          seenIds.add(task.occurrenceId);
          completed.push(task);
        }
      }

      // 4. Anytime tasks
      if (t.anytimeTasks) {
        for (const task of t.anytimeTasks) {
          if (hiddenDeletedIds.has(task.occurrenceId) || seenIds.has(task.occurrenceId)) continue;
          seenIds.add(task.occurrenceId);

          if (task.status === 'COMPLETED') {
            if (completedTasksMode !== 'HIDE') completed.push(task);
          } else if (task.status === 'MISSED' || deriveOverdueState(task, now).isOverdue) {
            if (overdueTasksMode !== 'HIDE') previous.push(task);
          } else {
            today.push(task);
          }
        }
      }
    }

    // 5. Upcoming days tasks
    for (const task of upcomingDaysTasks) {
      if (hiddenDeletedIds.has(task.occurrenceId) || seenIds.has(task.occurrenceId)) continue;
      seenIds.add(task.occurrenceId);

      if (task.status === 'COMPLETED') {
        if (completedTasksMode !== 'HIDE') completed.push(task);
      } else {
        upcomingRaw.push(task);
      }
    }

    // Sort today tasks chronologically by sortInstant
    today.sort((a, b) => {
      if (a.sortInstant && b.sortInstant) return a.sortInstant.localeCompare(b.sortInstant);
      if (a.sortInstant) return -1;
      if (b.sortInstant) return 1;
      return 0;
    });

    // Sort upcoming tasks chronologically by sortInstant
    upcomingRaw.sort((a, b) => {
      if (a.sortInstant && b.sortInstant) return a.sortInstant.localeCompare(b.sortInstant);
      if (a.sortInstant) return -1;
      if (b.sortInstant) return 1;
      return 0;
    });

    // Deduplicate repetitive occurrences in upcoming per series
    const activeKeys = new Set<string>();
    for (const t of today) activeKeys.add(t.taskDefinitionId || t.occurrenceId);
    for (const t of previous) activeKeys.add(t.taskDefinitionId || t.occurrenceId);

    const seenUpcomingKeys = new Set<string>();
    const deduplicatedUpcoming: TaskCardViewModel[] = [];
    for (const t of upcomingRaw) {
      const key = t.taskDefinitionId || t.occurrenceId;
      if (!activeKeys.has(key) && !seenUpcomingKeys.has(key)) {
        seenUpcomingKeys.add(key);
        deduplicatedUpcoming.push(t);
      }
    }

    return {
      previousTasks: previous,
      todayTasks: today,
      upcomingTasks: deduplicatedUpcoming,
      completedTasks: completed,
    };
  }, [tab, allTabs, upcomingDaysTasks, selectedPrayer, completedTasksMode, overdueTasksMode, now, hiddenDeletedIds]);

  const totalActionableTasks = previousTasks.length + todayTasks.length + upcomingTasks.length;
  const totalTasks = totalActionableTasks + completedTasks.length;

  const handleToggleCompleted = () => {
    onToggleCompletedCollapsed?.();
    toggleCompleted();
  };

  const isPreviousOpen = previousExpanded || (todayTasks.length === 0 && previousTasks.length > 0);
  const isUpcomingOpen = upcomingExpanded;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      testID="today-task-list"
    >
      {/* 1. Previous Section */}
      {!isSectionHidden('PREVIOUS') && overdueTasksMode !== 'HIDE' && previousTasks.length > 0 && (
        <View style={styles.sectionContainer} testID="section-previous">
          <SectionHeader
            title="Previous"
            count={previousTasks.length}
            isExpanded={isPreviousOpen}
            onToggle={togglePrevious}
            testID="section-header-previous"
          />
          {isPreviousOpen && (
            <View style={styles.cardsContainer} testID="section-content-previous">
              {previousTasks.map(task => (
                <TaskCard
                  key={task.occurrenceId}
                  task={task}
                  onComplete={handleCompleteTask}
                  onUndo={onUndoTask}
                  onToggleSubtask={onToggleSubtask}
                  onDelete={handleDeleteTask}
                  isDraggable={task.status === 'PENDING'}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  isHighlighted={task.occurrenceId === highlightedOccurrenceId || task.taskDefinitionId === highlightedOccurrenceId}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* 2. Today Section */}
      {!isSectionHidden('TODAY') && (
        <View style={styles.sectionContainer} testID="section-today">
          <SectionHeader
            title="Today"
            count={todayTasks.length}
            isExpanded={todayExpanded}
            onToggle={toggleToday}
            testID="section-header-today"
          />
          {todayExpanded && (
            <View style={styles.cardsContainer} testID="section-content-today">
              {todayTasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No tasks for today</Text>
              ) : (
                todayTasks.map(task => (
                  <TaskCard
                    key={task.occurrenceId}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUndo={onUndoTask}
                    onToggleSubtask={onToggleSubtask}
                    onDelete={handleDeleteTask}
                    isDraggable={task.status === 'PENDING'}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    isHighlighted={task.occurrenceId === highlightedOccurrenceId || task.taskDefinitionId === highlightedOccurrenceId}
                  />
                ))
              )}
            </View>
          )}
        </View>
      )}

      {/* 3. Upcoming Section */}
      {!isSectionHidden('UPCOMING') && (
        <View style={styles.sectionContainer} testID="section-upcoming">
          <SectionHeader
            title="Upcoming"
            count={upcomingTasks.length}
            isExpanded={isUpcomingOpen}
            onToggle={toggleUpcoming}
            testID="section-header-upcoming"
          />
          {isUpcomingOpen && (
            <View style={styles.cardsContainer} testID="section-content-upcoming">
              {upcomingTasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No upcoming tasks</Text>
              ) : (
                upcomingTasks.map(task => (
                  <TaskCard
                    key={task.occurrenceId}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUndo={onUndoTask}
                    onToggleSubtask={onToggleSubtask}
                    onDelete={handleDeleteTask}
                    isDraggable={task.status === 'PENDING'}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    isHighlighted={task.occurrenceId === highlightedOccurrenceId || task.taskDefinitionId === highlightedOccurrenceId}
                  />
                ))
              )}
            </View>
          )}
        </View>
      )}

      {/* 4. Completed Today Section */}
      {!isSectionHidden('COMPLETED') && completedTasksMode !== 'HIDE' && (
        <View style={styles.sectionContainer} testID="section-completed">
          <SectionHeader
            title="Completed Today"
            count={completedTasks.length}
            isExpanded={completedExpanded}
            onToggle={handleToggleCompleted}
            testID="section-header-completed"
          />
          {completedExpanded && (
            <View style={styles.cardsContainer} testID="section-content-completed">
              {completedTasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No completed tasks</Text>
              ) : (
                completedTasks.map(task => (
                  <TaskCard
                    key={task.occurrenceId}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUndo={onUndoTask}
                    onToggleSubtask={onToggleSubtask}
                    onDelete={handleDeleteTask}
                    isDraggable={false}
                    isHighlighted={task.occurrenceId === highlightedOccurrenceId || task.taskDefinitionId === highlightedOccurrenceId}
                  />
                ))
              )}
            </View>
          )}
        </View>
      )}

      {/* Subtle Check all completed tasks link as shown in design */}
      {!isSectionHidden('COMPLETED') && completedTasksMode !== 'HIDE' && !completedExpanded && completedTasks.length > 0 && (
        <Pressable
          onPress={handleToggleCompleted}
          style={styles.checkCompletedButton}
          accessibilityRole="button"
          accessibilityLabel="Check all completed tasks"
          testID="check-all-completed-tasks-button"
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            Check all completed tasks
          </Text>
        </Pressable>
      )}

      {/* All Done State when all scheduled tasks are completed */}
      {totalTasks > 0 && totalActionableTasks === 0 && (
        <AllDoneState
          selectedPrayer={selectedPrayer}
          currentPrayer={currentPrayer}
          nextPrayer={nextPrayer}
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
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    letterSpacing: 0.2,
  },
  chevron: {
    marginStart: 6,
  },
  cardsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    fontStyle: 'italic',
  },
  checkCompletedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});