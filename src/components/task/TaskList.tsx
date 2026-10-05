import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, useWindowDimensions, Vibration, type PanResponderGestureState } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { AllDoneState } from './AllDoneState';
import { Icon } from '@/components/common/Icon';
import { useTodayStore } from '@/stores/useTodayStore';
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
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void;
  onAddTask?: (prayer: Prayer) => void;
  onSelectPrayer?: (prayer: Prayer) => void;
  onRescheduleTask?: (task: TaskCardViewModel, targetPrayer: Prayer) => void;
  onDragTargetChange?: (prayer: Prayer | null) => void;
  completedTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
  overdueTasksMode?: 'KEEP' | 'MOVE' | 'HIDE';
  onDeleteTask?: (task: TaskCardViewModel) => void | boolean | Promise<void | boolean>;
}

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
  onDeleteTask,
}: TaskListProps) {
  const { colors, spacing, typography } = useTheme();

  // Collapsible section states
  const [previousExpanded, setPreviousExpanded] = useState(false);
  const [previousUserToggled, setPreviousUserToggled] = useState(false);
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [upcomingUserToggled, setUpcomingUserToggled] = useState(false);
  // Fix #3: Derive from prop so it stays in sync when switching prayer tabs
  const completedExpanded = !completedCollapsed;

  const nowMs = useTodayStore(s => s.nowMs);
  const now = useMemo(() => DateTime.fromMillis(nowMs), [nowMs]);
  const nowIso = now.toISO() ?? '';

  // Fix #1: Use hook instead of stale Dimensions.get snapshot
  const { width: screenWidth } = useWindowDimensions();
  const PRAYERS: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

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
    const isShowingCurrentPrayer = selectedPrayer === currentPrayer && allTabs && allTabs.length > 0;

    const seenIds = new Set<string>();
    const completed: TaskCardViewModel[] = [];
    const previous: TaskCardViewModel[] = [];
    const upcoming: TaskCardViewModel[] = [];
    const today: TaskCardViewModel[] = [];

    if (!isShowingCurrentPrayer) {
      // User is explicitly viewing a specific prayer tab (e.g. Fajr, Asr, Maghrib, Isha)
      // All pending tasks scheduled for this prayer appear directly under "Today" so they are immediately visible.
      // Also retain upcoming tasks from upcoming days below so user does not lose visibility of future schedule.
      if (completedTasksMode !== 'HIDE') {
        for (const task of tab.completedTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            completed.push(task);
          }
        }
      }

      if (overdueTasksMode !== 'HIDE') {
        for (const task of tab.missedTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            previous.push(task);
          }
        }
      }

      for (const task of tab.scheduledTasks) {
        if (!seenIds.has(task.occurrenceId)) {
          seenIds.add(task.occurrenceId);
          today.push(task);
        }
      }

      if (tab.anytimeTasks) {
        for (const task of tab.anytimeTasks) {
          if (task.status === 'COMPLETED') {
            if (completedTasksMode !== 'HIDE' && !seenIds.has(task.occurrenceId)) {
              seenIds.add(task.occurrenceId);
              completed.push(task);
            }
          } else if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            today.push(task);
          }
        }
      }

      // Retain upcoming days' tasks in the upcoming section
      for (const task of upcomingDaysTasks) {
        if (!seenIds.has(task.occurrenceId)) {
          seenIds.add(task.occurrenceId);
          upcoming.push(task);
        }
      }

      return {
        previousTasks: previous,
        todayTasks: today,
        upcomingTasks: upcoming,
        completedTasks: completed,
      };
    }

    // Unified current prayer view (aggregates past, current, and upcoming prayers for today)
    const tabsToProcess = allTabs;

    // 1. Collect completed tasks
    if (completedTasksMode !== 'HIDE') {
      for (const t of tabsToProcess) {
        for (const task of t.completedTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            completed.push(task);
          }
        }
      }
    }

    // 2. Collect previous tasks (missed, overdue, past prayers)
    if (overdueTasksMode !== 'HIDE') {
      for (const t of tabsToProcess) {
        // Explicit missed tasks
        for (const task of t.missedTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            previous.push(task);
          }
        }

        // Past prayer tab pending tasks
        if (t.temporalState === 'PAST') {
          for (const task of t.scheduledTasks) {
            if (!seenIds.has(task.occurrenceId)) {
              seenIds.add(task.occurrenceId);
              previous.push(task);
            }
          }
        } else {
          // Current or future tab tasks that are overdue
          for (const task of t.scheduledTasks) {
            if (!seenIds.has(task.occurrenceId)) {
              const overdue = deriveOverdueState(task, now);
              if (overdue.isOverdue) {
                seenIds.add(task.occurrenceId);
                previous.push(task);
              }
            }
          }
        }
      }
    }

    // 3. Collect upcoming tasks (future prayer tab tasks, future sortInstant in current tab, and upcoming days)
    for (const t of tabsToProcess) {
      if (t.temporalState === 'FUTURE') {
        for (const task of t.scheduledTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            upcoming.push(task);
          }
        }
      } else if (t.temporalState === 'CURRENT') {
        for (const task of t.scheduledTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            if (task.sortInstant && task.sortInstant > nowIso) {
              seenIds.add(task.occurrenceId);
              upcoming.push(task);
            }
          }
        }
      }
    }

    // Plus upcoming tasks from upcoming days
    for (const task of upcomingDaysTasks) {
      if (!seenIds.has(task.occurrenceId)) {
        seenIds.add(task.occurrenceId);
        upcoming.push(task);
      }
    }

    // 4. Collect today tasks (remaining scheduled tasks + anytime tasks)
    for (const t of tabsToProcess) {
      for (const task of t.scheduledTasks) {
        if (!seenIds.has(task.occurrenceId)) {
          seenIds.add(task.occurrenceId);
          today.push(task);
        }
      }
    }

    // Anytime tasks scheduled for today
    if (tab.anytimeTasks) {
      for (const task of tab.anytimeTasks) {
        if (task.status === 'COMPLETED') {
          if (completedTasksMode !== 'HIDE' && !seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            completed.push(task);
          }
        } else if (!seenIds.has(task.occurrenceId)) {
          seenIds.add(task.occurrenceId);
          today.push(task);
        }
      }
    }

    // Deduplicate repetitive occurrences in upcoming:
    // Avoid repeating an occurrence already in today or previous
    // For recurring tasks, only show the earliest upcoming occurrence per series
    const activeKeys = new Set<string>();
    for (const t of today) {
      const key = t.taskDefinitionId || t.occurrenceId;
      activeKeys.add(key);
    }
    for (const t of previous) {
      const key = t.taskDefinitionId || t.occurrenceId;
      activeKeys.add(key);
    }

    const seenUpcomingKeys = new Set<string>();
    const deduplicatedUpcoming: TaskCardViewModel[] = [];
    for (const t of upcoming) {
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
  }, [tab, allTabs, upcomingDaysTasks, selectedPrayer, currentPrayer, completedTasksMode, overdueTasksMode, now, nowIso]);

  const totalActionableTasks = previousTasks.length + todayTasks.length + upcomingTasks.length;
  const totalTasks = totalActionableTasks + completedTasks.length;

  const handleToggleCompleted = () => {
    onToggleCompletedCollapsed?.();
  };

  const isPreviousOpen = previousUserToggled
    ? previousExpanded
    : previousExpanded || (todayTasks.length === 0 && previousTasks.length > 0);

  const isUpcomingOpen = upcomingUserToggled
    ? upcomingExpanded
    : upcomingTasks.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      testID="today-task-list"
    >
      {/* 1. Previous Section — Fix #7: hide entirely when empty */}
      {previousTasks.length > 0 && (
        <View style={styles.sectionContainer} testID="section-previous">
          <SectionHeader
            title="Previous"
            count={previousTasks.length}
            isExpanded={isPreviousOpen}
            onToggle={() => {
              setPreviousUserToggled(true);
              setPreviousExpanded(!isPreviousOpen);
            }}
            testID="section-header-previous"
          />
          {isPreviousOpen && (
            <View style={styles.cardsContainer} testID="section-content-previous">
              {previousTasks.map(task => (
                <TaskCard
                  key={task.occurrenceId}
                  task={task}
                  onComplete={onCompleteTask}
                  onUndo={onUndoTask}
                  onToggleSubtask={onToggleSubtask}
                  onDelete={onDeleteTask}
                  isDraggable={task.status === 'PENDING'}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* 2. Today Section */}
      <View style={styles.sectionContainer} testID="section-today">
        <SectionHeader
          title="Today"
          count={todayTasks.length}
          isExpanded={todayExpanded}
          onToggle={() => setTodayExpanded(p => !p)}
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
                  onComplete={onCompleteTask}
                  onUndo={onUndoTask}
                  onToggleSubtask={onToggleSubtask}
                  onDelete={onDeleteTask}
                  isDraggable={task.status === 'PENDING'}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* 3. Upcoming Section */}
      <View style={styles.sectionContainer} testID="section-upcoming">
        <SectionHeader
          title="Upcoming"
          count={upcomingTasks.length}
          isExpanded={isUpcomingOpen}
          onToggle={() => {
            setUpcomingUserToggled(true);
            setUpcomingExpanded(!isUpcomingOpen);
          }}
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
                  onComplete={onCompleteTask}
                  onUndo={onUndoTask}
                  onToggleSubtask={onToggleSubtask}
                  onDelete={onDeleteTask}
                  isDraggable={task.status === 'PENDING'}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* 4. Completed Today Section */}
      {completedTasksMode !== 'HIDE' && (
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
                    onComplete={onCompleteTask}
                    onUndo={onUndoTask}
                    onToggleSubtask={onToggleSubtask}
                    onDelete={onDeleteTask}
                    isDraggable={false}
                  />
                ))
              )}
            </View>
          )}
        </View>
      )}

      {/* Subtle Check all completed tasks link as shown in design */}
      {completedTasksMode !== 'HIDE' && !completedExpanded && completedTasks.length > 0 && (
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