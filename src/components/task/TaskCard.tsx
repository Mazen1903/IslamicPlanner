import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Vibration,
  type PanResponderGestureState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import { useTheme, type ThemeColors } from '@/theme';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCheckbox } from './TaskCheckbox';
import { Icon, type IconName } from '@/components/common/Icon';
import { TaskCategoryIcon } from './TaskCategoryIcon';
import { hasCustomTaskIcon } from '@/constants/taskIconAssets';
import { useTodayStore } from '@/stores/useTodayStore';
import { deriveOverdueState } from '@/services/TodayViewModelProjection';
import { StreakFlameBadge } from '@/components/streak';
import { LottiePriorityBadge } from './LottiePriorityBadge';
import { Collapsible } from '@/components/common/Collapsible';
import { getRecurrenceLabel } from '@/domain/recurrence/recurrenceLabel';

export interface TaskCardProps {
  task: TaskCardViewModel;
  onComplete?: (occurrenceId: string) => void;
  onUndo?: (occurrenceId: string) => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void;
  isDraggable?: boolean;
  onDragStart?: (task: TaskCardViewModel) => void;
  onDragMove?: (task: TaskCardViewModel, gestureState: PanResponderGestureState) => void;
  onDragEnd?: (task: TaskCardViewModel, gestureState: PanResponderGestureState) => void;
  onDelete?: (task: TaskCardViewModel, scope?: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES') => void | boolean | Promise<void | boolean>;
  isHighlighted?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getCategoryTheme(
  title: string,
  colors: ThemeColors,
  isDark: boolean
): { icon: IconName; bg: string; color: string } {
  const lower = title.toLowerCase();
  if (
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('breakfast') ||
    lower.includes('food') ||
    lower.includes('eat')
  ) {
    return {
      icon: 'restaurant',
      bg: isDark ? '#14382B' : '#E8F8F0',
      color: isDark ? '#34D399' : '#059669',
    };
  }
  if (
    lower.includes('meet') ||
    lower.includes('work') ||
    lower.includes('team') ||
    lower.includes('sync') ||
    lower.includes('laptop')
  ) {
    return {
      icon: 'laptop',
      bg: isDark ? '#1E293B' : '#E0F2FE',
      color: isDark ? '#60A5FA' : '#0284C7',
    };
  }
  if (
    lower.includes('qur') ||
    lower.includes('read') ||
    lower.includes('dhikr') ||
    lower.includes('surah') ||
    lower.includes('book')
  ) {
    return {
      icon: 'book',
      bg: isDark ? '#2E1065' : '#F3E8FF',
      color: isDark ? '#C084FC' : '#7C3AED',
    };
  }
  if (
    lower.includes('call') ||
    lower.includes('phone') ||
    lower.includes('mom') ||
    lower.includes('dad')
  ) {
    return {
      icon: 'call',
      bg: isDark ? '#14382B' : '#E8F8F0',
      color: isDark ? '#34D399' : '#059669',
    };
  }
  if (
    lower.includes('gym') ||
    lower.includes('workout') ||
    lower.includes('exercise') ||
    lower.includes('run') ||
    lower.includes('fitness')
  ) {
    return {
      icon: 'barbell',
      bg: isDark ? '#134E4A' : '#CCFBF1',
      color: isDark ? '#2DD4BF' : '#0D9488',
    };
  }
  return {
    icon: 'check',
    bg: isDark ? '#1F2937' : '#F3F4F6',
    color: colors.primary,
  };
}

export function TaskCard({
  task,
  onComplete,
  onUndo,
  onToggleSubtask,
  isDraggable = true,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  isHighlighted = false,
  isExpanded: controlledIsExpanded,
  onToggleExpand,
}: TaskCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();
  const router = useRouter();

  const isCompleted = task.status === 'COMPLETED';
  const isMissed = task.status === 'MISSED';
  const isPending = task.status === 'PENDING';

  // Inline expansion state (controlled or uncontrolled fallback)
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalExpanded;
  const [showRecurringDelete, setShowRecurringDelete] = useState(false);

  // Highlight pulse animation (1.2s total)
  const highlightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 950, useNativeDriver: false }),
      ]).start();
    }
  }, [isHighlighted, highlightAnim]);

  // Drag & Jiggle animations
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const jiggleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isUnlockedRef = useRef(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const jiggleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const prevOccurrenceIdRef = useRef(task.occurrenceId);
  useEffect(() => {
    if (prevOccurrenceIdRef.current !== task.occurrenceId) {
      prevOccurrenceIdRef.current = task.occurrenceId;
      setInternalExpanded(false);
      setShowRecurringDelete(false);
    }
  }, [task.occurrenceId]);

  // Drag callbacks in refs so the PanResponder closure is always current
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  onDragStartRef.current = onDragStart;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;

  const resetDragState = useCallback(() => {
    isUnlockedRef.current = false;
    setIsUnlocked(false);
    jiggleLoopRef.current?.stop();
    jiggleAnim.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  }, [jiggleAnim, scaleAnim, pan]);

  const handleLongPress = () => {
    if (isCompleted || !isDraggable) return;
    try {
      Vibration.vibrate(40);
    } catch {}

    isUnlockedRef.current = true;
    setIsUnlocked(true);

    // Continuous slight wobble / rotation jiggle (±1.2deg at ~10Hz)
    jiggleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(jiggleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(jiggleAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(jiggleAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ])
    );
    jiggleLoopRef.current.start();

    // Subtle scale up
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      damping: 14,
      stiffness: 180,
      useNativeDriver: true,
    }).start();

    onDragStartRef.current?.(task);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => !isUnlockedRef.current,
      onMoveShouldSetPanResponder: () => Boolean(isUnlockedRef.current),
      onPanResponderMove: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          onDragMoveRef.current?.(task, gestureState);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          resetDragState();
          onDragEndRef.current?.(task, gestureState);
        }
      },
      onPanResponderTerminate: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          resetDragState();
          onDragEndRef.current?.(task, gestureState);
        }
      },
    })
  ).current;

  const rotate = jiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1.2deg', '0deg', '1.2deg'],
  });

  const nowMs = useTodayStore(s => s.nowMs);
  const now = useMemo(() => DateTime.fromMillis(nowMs), [nowMs]);
  const overdueState = deriveOverdueState(task, now);

  const category = getCategoryTheme(task.title, colors, isDark);

  const scheduleDisplay = useMemo(() => {
    // 1. Resolve date string (e.g. "Oct 1")
    let dateStr: string | null = task.date ?? null;
    if (!dateStr) {
      const rawDate =
        task.localDate ??
        (task.sortInstant ? task.sortInstant.slice(0, 10) : null) ??
        (task.createdAt ? task.createdAt.slice(0, 10) : null);
      if (rawDate) {
        const dt = DateTime.fromISO(rawDate);
        if (dt.isValid) {
          dateStr = dt.toFormat('MMM d');
        }
      }
    }

    // 2. Resolve time or prayer label
    const isAnytime =
      task.scheduleType === 'ANYTIME_TODAY' ||
      (task.scheduleLabel && task.scheduleLabel.toLowerCase().includes('anytime'));

    const timeOrPrayerLabel = !isAnytime && task.scheduleLabel ? task.scheduleLabel.trim() : null;

    if (dateStr && timeOrPrayerLabel) {
      return `${dateStr} · ${timeOrPrayerLabel}`;
    }
    if (dateStr) {
      return dateStr;
    }
    if (timeOrPrayerLabel) {
      return timeOrPrayerLabel;
    }
    return '';
  }, [task.scheduleLabel, task.scheduleType, task.date, task.localDate, task.sortInstant, task.createdAt]);

  const compositeLabel = useMemo(() => {
    let label = task.title;
    if (task.priority === 'IMPORTANT') {
      label += '. Important.';
    }
    if (isPending && overdueState.isOverdue) {
      label +=
        overdueState.overdueMinutes >= 1
          ? `. ${overdueState.overdueMinutes} min overdue.`
          : '. Overdue.';
    } else if (isMissed) {
      label += '. Missed.';
    } else if (isCompleted) {
      label += '. Completed.';
    }
    return label;
  }, [task.title, task.priority, isPending, overdueState, isMissed, isCompleted]);

  const handleCardPress = () => {
    if (isUnlockedRef.current) return;
    try {
      Vibration.vibrate(10);
    } catch {}
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(prev => !prev);
    }
    setShowRecurringDelete(false);
  };

  const handleEditPress = () => {
    if (task.occurrenceId || task.taskDefinitionId) {
      router.push({
        pathname: '/task/[id]',
        params: { id: task.occurrenceId || task.taskDefinitionId, defId: task.taskDefinitionId },
      });
    }
  };

  const handleDeletePress = () => {
    try {
      Vibration.vibrate(25);
    } catch {}

    if (task.isRecurring) {
      setShowRecurringDelete(true);
      return;
    }

    onDeleteRef.current?.(task, 'THIS_OCCURRENCE');
  };

  const handleSelectDeleteScope = (scope: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES') => {
    try {
      Vibration.vibrate(30);
    } catch {}
    setShowRecurringDelete(false);
    onDeleteRef.current?.(task, scope);
  };

  const handleCancelRecurringDelete = () => {
    setShowRecurringDelete(false);
  };

  return (
    <View style={styles.cardContainer} testID={`task-card-container-${task.occurrenceId}`}>
      {/* ── Foreground Draggable Card with Inline Expansion ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.animatedCardWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
              { rotate },
            ],
            zIndex: isUnlocked ? 9999 : 1,
          },
        ]}
      >
        <AnimatedPressable
          onPress={handleCardPress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}. ${isExpanded ? 'Expanded' : 'Collapsed'}. Tap to toggle details.`}
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: isCompleted
                ? (isDark ? '#131D17' : colors.surfaceSecondary)
                : (isDark ? '#141E18' : '#FFFFFF'),
              borderRadius: radii.card ?? 16,
              paddingVertical: 14,
              paddingHorizontal: 15,
              borderStartWidth: 4,
              borderStartColor: isCompleted
                ? colors.textMuted
                : task.priority === 'IMPORTANT'
                ? colors.error
                : (isDark ? '#10B981' : colors.primary),
              borderColor: highlightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  isUnlocked
                    ? colors.primary
                    : isExpanded
                    ? (isDark ? '#10B981' : colors.primary)
                    : task.priority === 'IMPORTANT' && !isCompleted
                    ? (isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.35)')
                    : (isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(5, 150, 105, 0.18)'),
                  colors.primary,
                ],
              }),
              borderWidth: isUnlocked ? 2 : isExpanded ? 1.5 : 1.2,
              shadowColor: colors.primary,
              shadowOpacity: isUnlocked ? 0.35 : isExpanded ? 0.16 : (isDark ? 0.12 : 0.06),
              shadowRadius: isUnlocked ? 10 : isExpanded ? 8 : 4,
              elevation: isUnlocked ? 10 : isExpanded ? 4 : 2,
              opacity: isCompleted ? 0.72 : 1,
            },
          ]}
          testID={`task-card-${task.occurrenceId}`}
        >
          <View style={styles.mainRow}>
            {/* Left: Checkbox */}
            <TaskCheckbox
              checked={isCompleted}
              disabled={isMissed}
              onToggle={() => {
                if (isCompleted && onUndo) {
                  onUndo(task.occurrenceId);
                } else if (isPending && onComplete) {
                  onComplete(task.occurrenceId);
                }
              }}
              accessibilityLabel={
                isCompleted
                  ? `Undo completion for task: ${task.title}`
                  : `Complete task: ${task.title}`
              }
              testID={`checkbox-${task.occurrenceId}`}
            />

            {/* Pastel Squircle Category / Task Icon */}
            <View
              style={[
                styles.taskIconBadge,
                {
                  backgroundColor: hasCustomTaskIcon(task.icon) ? 'transparent' : category.bg,
                  borderRadius: 14,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: 1,
                  marginEnd: spacing.sm,
                  opacity: isCompleted ? 0.6 : 1,
                },
              ]}
              testID={`task-icon-badge-${task.occurrenceId}`}
            >
              <TaskCategoryIcon
                iconId={task.icon}
                size={hasCustomTaskIcon(task.icon) ? 46 : 26}
                color={category.color}
              />
            </View>

            {/* Title, Subtasks, and metadata block */}
            <View
              style={styles.contentContainer}
              accessible={true}
              accessibilityLabel={compositeLabel}
            >
              {/* Task Title */}
              <Text
                style={[
                  typography.bodyLarge,
                  styles.titleText,
                  {
                    color: isCompleted ? colors.textMuted : colors.textPrimary,
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                    fontSize: 15.5,
                    fontWeight: '700',
                  },
                ]}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {task.title}
              </Text>

              {/* Checklist Progress Bar */}
              {task.subtasks && task.subtasks.length > 0 && (
                <View
                  style={[
                    styles.checklistProgressBarTrack,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <View
                    style={[
                      styles.checklistProgressBarFill,
                      {
                        backgroundColor: isCompleted ? colors.textMuted : colors.primary,
                        width: `${Math.round(
                          (task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Metadata Pills Row */}
              <View style={styles.metadataRow}>
                {/* Schedule / Prayer Pill */}
                {scheduleDisplay ? (
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: isCompleted
                          ? colors.surface
                          : isDark
                          ? 'rgba(16, 185, 129, 0.16)'
                          : 'rgba(16, 185, 129, 0.1)',
                        borderColor: isCompleted
                          ? 'transparent'
                          : isDark
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'rgba(16, 185, 129, 0.25)',
                      },
                    ]}
                  >
                    <Icon
                      name="clock"
                      size={11}
                      color={isCompleted ? colors.textMuted : isDark ? '#34D399' : colors.primaryDark}
                      style={{ marginEnd: 4 }}
                      decorative
                    />
                    <Text
                      style={[
                        typography.caption,
                        styles.metaPillText,
                        {
                          color: isCompleted ? colors.textMuted : isDark ? '#34D399' : colors.primaryDark,
                          fontWeight: '700',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {scheduleDisplay}
                    </Text>
                  </View>
                ) : null}

                {/* Recurring Badge Pill */}
                {task.isRecurring && (
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                        borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.25)',
                      },
                    ]}
                    testID={`task-recurring-badge-${task.occurrenceId}`}
                  >
                    <Icon
                      name="refresh"
                      size={10}
                      color={isDark ? '#60A5FA' : '#1D4ED8'}
                      style={{ marginEnd: 3 }}
                      decorative
                    />
                    <Text
                      style={[
                        typography.caption,
                        styles.metaPillText,
                        {
                          color: isDark ? '#60A5FA' : '#1D4ED8',
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {getRecurrenceLabel(task.recurrenceRule, task.hijriRecurrence)}
                    </Text>
                  </View>
                )}

                {/* Subtasks / Checklist Progress Pill */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: isCompleted
                          ? colors.surface
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : colors.surfaceSecondary,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                    testID={`subtasks-progress-${task.occurrenceId}`}
                  >
                    <Icon
                      name="checkbox"
                      size={11}
                      color={colors.textSecondary}
                      style={{ marginEnd: 3 }}
                      decorative
                    />
                    <Text
                      style={[
                        typography.caption,
                        styles.metaPillText,
                        { color: colors.textSecondary, fontWeight: '600' },
                      ]}
                    >
                      {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                    </Text>
                  </View>
                )}

                {/* Notes Indicator Pill */}
                {task.notes && task.notes.trim().length > 0 && (
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: isCompleted ? colors.surface : colors.surfaceSecondary,
                      },
                    ]}
                    testID={`notes-indicator-${task.occurrenceId}`}
                  >
                    <Icon
                      name="document"
                      size={11}
                      color={colors.textSecondary}
                      decorative
                    />
                  </View>
                )}

                {/* Duration Pill */}
                {task.estimatedMinutes ? (
                  <View
                    style={[
                      styles.metaPill,
                      {
                        backgroundColor: isCompleted ? colors.surface : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        styles.metaPillText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {task.estimatedMinutes}m
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Right side indicators: Streak Flame, Priority Badge, and Expansion Chevron */}
            <View style={styles.rightActions}>
              {task.streakCount !== null && task.streakCount !== undefined && task.streakCount >= 0 && (
                <StreakFlameBadge count={task.streakCount} size={36} testID={`streak-badge-${task.occurrenceId}`} />
              )}

              {task.priority === 'IMPORTANT' && (
                <LottiePriorityBadge
                  size={32}
                  testID={`important-badge-${task.occurrenceId}`}
                  accessibilityLabel="Important task"
                />
              )}

              <View
                style={[
                  styles.chevronWrapper,
                  {
                    backgroundColor: isExpanded
                      ? (isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.15)')
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                    borderColor: isExpanded
                      ? (isDark ? '#10B981' : colors.primary)
                      : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                  },
                ]}
                testID={`task-card-chevron-${task.occurrenceId}`}
              >
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={isExpanded ? (isDark ? '#34D399' : colors.primaryDark) : colors.textSecondary}
                  decorative
                />
              </View>
            </View>
          </View>

          {/* ── Inline Fluid Expanded Section ── */}
          <Collapsible expanded={isExpanded} testID={`task-card-expanded-${task.occurrenceId}`}>
            <View style={styles.expandedContentWrapper}>
              {/* Subtle Divider */}
              <View
                style={[
                  styles.expandedDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                ]}
              />

              {/* Notes Block (if present) */}
              {task.notes && task.notes.trim().length > 0 && (
                <View
                  style={[
                    styles.notesContainer,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                      borderStartColor: isDark ? '#10B981' : colors.primary,
                      borderRadius: radii.sm ?? 8,
                    },
                  ]}
                  testID={`task-card-notes-${task.occurrenceId}`}
                >
                  <Icon
                    name="document"
                    size={14}
                    color={isDark ? '#34D399' : colors.primaryDark}
                    decorative
                    style={{ marginTop: 2, marginEnd: 8 }}
                  />
                  <Text style={[typography.bodySmall, styles.notesText, { color: isDark ? '#E5E7EB' : colors.textPrimary }]}>
                    {task.notes}
                  </Text>
                </View>
              )}

              {/* Interactive Subtasks Checklist (if present) */}
              {task.subtasks && task.subtasks.length > 0 && (
                <View style={styles.subtasksContainer} testID={`task-card-subtasks-${task.occurrenceId}`}>
                  <View style={styles.subtasksHeaderRow}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                      Checklist ({task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length})
                    </Text>
                  </View>
                  {task.subtasks.map((subtask) => (
                    <Pressable
                      key={subtask.id}
                      onPress={() => onToggleSubtask?.(task.occurrenceId, subtask.id)}
                      style={({ pressed }) => [
                        styles.subtaskRow,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: subtask.isCompleted }}
                      accessibilityLabel={`${subtask.isCompleted ? 'Completed' : 'Incomplete'} checklist item: ${subtask.title}`}
                      testID={`subtask-item-${task.occurrenceId}-${subtask.id}`}
                    >
                      <View
                        style={[
                          styles.subtaskCheckbox,
                          {
                            borderColor: subtask.isCompleted
                              ? (isDark ? '#10B981' : colors.primary)
                              : (isDark ? 'rgba(255, 255, 255, 0.25)' : colors.border),
                            backgroundColor: subtask.isCompleted ? (isDark ? '#10B981' : colors.primary) : 'transparent',
                            borderRadius: 5,
                          },
                        ]}
                      >
                        {subtask.isCompleted && (
                          <Icon name="check" size={11} color={colors.textOnPrimary} decorative />
                        )}
                      </View>
                      <Text
                        style={[
                          typography.bodySmall,
                          styles.subtaskTitle,
                          {
                            color: subtask.isCompleted ? colors.textMuted : colors.textPrimary,
                            textDecorationLine: subtask.isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {subtask.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Inline Recurring Delete Confirmation Options */}
              {showRecurringDelete ? (
                <View
                  style={[
                    styles.recurringDeleteContainer,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.18)',
                      borderRadius: radii.md ?? 12,
                    },
                  ]}
                  testID={`task-card-recurring-delete-options-${task.occurrenceId}`}
                >
                  <Text style={[typography.labelMedium, { color: colors.error, fontWeight: '700', marginBottom: 4 }]}>
                    Delete Recurring Task
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 10 }]}>
                    Choose which occurrences of this task to delete:
                  </Text>

                  <View style={styles.recurringButtonsColumn}>
                    <Pressable
                      onPress={() => handleSelectDeleteScope('THIS_OCCURRENCE')}
                      style={({ pressed }) => [
                        styles.recurringOptionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surface,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      testID={`delete-scope-this-occurrence-${task.occurrenceId}`}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this occurrence only"
                    >
                      <Text style={[typography.labelSmall, { color: colors.textPrimary }]}>
                        This occurrence only
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleSelectDeleteScope('THIS_AND_FUTURE')}
                      style={({ pressed }) => [
                        styles.recurringOptionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surface,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      testID={`delete-scope-this-and-future-${task.occurrenceId}`}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this and future occurrences"
                    >
                      <Text style={[typography.labelSmall, { color: colors.textPrimary }]}>
                        This and future occurrences
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleSelectDeleteScope('ALL_OCCURRENCES')}
                      style={({ pressed }) => [
                        styles.recurringOptionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.14)',
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      testID={`delete-scope-all-occurrences-${task.occurrenceId}`}
                      accessibilityRole="button"
                      accessibilityLabel="Delete all occurrences"
                    >
                      <Text style={[typography.labelSmall, { color: colors.error, fontWeight: '600' }]}>
                        All occurrences
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleCancelRecurringDelete}
                      style={({ pressed }) => [
                        styles.recurringCancelBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      testID={`delete-scope-cancel-${task.occurrenceId}`}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel delete"
                    >
                      <Text style={[typography.caption, { color: colors.textTertiary }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Standard Quick Action Buttons: Edit Task & Delete */
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={handleEditPress}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.editBtn,
                      {
                        backgroundColor: isDark ? 'rgba(15, 159, 74, 0.18)' : colors.primaryLight,
                        borderColor: isDark ? 'rgba(15, 159, 74, 0.3)' : colors.primary,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit task ${task.title}`}
                    testID={`task-card-edit-btn-${task.occurrenceId}`}
                  >
                    <Icon
                      name="edit"
                      size={13}
                      color={isDark ? colors.primary : colors.primaryDark}
                      decorative
                      style={{ marginEnd: 5 }}
                    />
                    <Text
                      style={[
                        typography.labelSmall,
                        { color: isDark ? colors.primary : colors.primaryDark, fontWeight: '600' },
                      ]}
                    >
                      Edit Task
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeletePress}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.deleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : colors.dangerSurface,
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete task ${task.title}`}
                    testID={`task-card-delete-btn-${task.occurrenceId}`}
                  >
                    <Icon
                      name="trash"
                      size={13}
                      color={colors.error}
                      decorative
                      style={{ marginEnd: 5 }}
                    />
                    <Text style={[typography.labelSmall, { color: colors.error, fontWeight: '600' }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Collapsible>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 8,
  },
  checklistProgressBarTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
    width: '100%',
    overflow: 'hidden',
  },
  checklistProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  animatedCardWrapper: {
    width: '100%',
  },
  card: {
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginStart: 8,
    minHeight: 52,
  },
  titleText: {
    lineHeight: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 10,
    gap: 6,
  },
  chevronWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContentWrapper: {
    paddingTop: 8,
    paddingBottom: 2,
  },
  expandedDivider: {
    height: 1,
    width: '100%',
    marginBottom: 10,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderStartWidth: 3,
  },
  notesText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  subtasksContainer: {
    marginBottom: 10,
  },
  subtasksHeaderRow: {
    marginBottom: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  subtaskTitle: {
    flex: 1,
    lineHeight: 19,
    fontSize: 13.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingTop: 2,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {},
  deleteBtn: {},
  recurringDeleteContainer: {
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  recurringButtonsColumn: {
    gap: 6,
  },
  recurringOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringCancelBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});