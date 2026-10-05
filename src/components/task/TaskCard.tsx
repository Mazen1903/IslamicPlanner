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

export interface TaskCardProps {
  task: TaskCardViewModel;
  onComplete?: (occurrenceId: string) => void;
  onUndo?: (occurrenceId: string) => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void;
  isDraggable?: boolean;
  onDragStart?: (task: TaskCardViewModel) => void;
  onDragMove?: (task: TaskCardViewModel, gestureState: PanResponderGestureState) => void;
  onDragEnd?: (task: TaskCardViewModel, gestureState: PanResponderGestureState) => void;
  onDelete?: (task: TaskCardViewModel) => void | boolean | Promise<void | boolean>;
}

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
}: TaskCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();
  const router = useRouter();

  const isCompleted = task.status === 'COMPLETED';
  const isMissed = task.status === 'MISSED';
  const isPending = task.status === 'PENDING';

  // Drag & Jiggle animations
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const jiggleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isUnlockedRef = useRef(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const jiggleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Swipe to remove animation state
  const swipeX = useRef(new Animated.Value(0)).current;
  const trashScale = useRef(new Animated.Value(0)).current;
  const trashOpacity = useRef(new Animated.Value(0)).current;
  const isSwipedOpenRef = useRef(false);
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const prevOccurrenceIdRef = useRef(task.occurrenceId);
  useEffect(() => {
    if (prevOccurrenceIdRef.current !== task.occurrenceId) {
      prevOccurrenceIdRef.current = task.occurrenceId;
      isSwipedOpenRef.current = false;
      swipeX.setValue(0);
      trashScale.setValue(0);
      trashOpacity.setValue(0);
    }
  }, [task.occurrenceId, swipeX, trashScale, trashOpacity]);

  const handleConfirmDelete = useCallback(() => {
    try {
      Vibration.vibrate(30);
    } catch {}

    Animated.timing(swipeX, {
      toValue: -500,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (onDeleteRef.current) {
      Promise.resolve(onDeleteRef.current(task))
        .then(res => {
          if (res === false) {
            Animated.spring(swipeX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 6,
            }).start();
          }
        })
        .catch(() => {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        });
    }
  }, [task, swipeX]);

  // Fix #5: Keep drag callbacks in refs so the PanResponder closure is always current
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
    // Fix #8: Use native driver for transform animations
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
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (isUnlockedRef.current) return true;
        // Terminal historical records (completed or missed) are immutable and cannot be deleted via swipe
        if (isCompleted || isMissed) return false;
        // Check for horizontal swipe to the left
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;
        if (isHorizontal && gestureState.dx < -8) {
          return true;
        }
        // If already open, allow swiping right to close
        if (isSwipedOpenRef.current && isHorizontal && gestureState.dx > 8) {
          return true;
        }
        return false;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          onDragMoveRef.current?.(task, gestureState);
          return;
        }

        const baseOffset = isSwipedOpenRef.current ? -84 : 0;
        const rawDx = baseOffset + gestureState.dx;
        // Clamp between -200 (left) and 0 (closed)
        const clampedDx = Math.min(0, Math.max(-200, rawDx));
        swipeX.setValue(clampedDx);

        // Pop-up transition animation on trash icon:
        if (clampedDx < -15) {
          Animated.spring(trashScale, {
            toValue: 1,
            damping: 12,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
          Animated.timing(trashOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }).start();
        } else {
          trashScale.setValue(0);
          trashOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          resetDragState();
          onDragEndRef.current?.(task, gestureState);
          return;
        }

        const baseOffset = isSwipedOpenRef.current ? -84 : 0;
        const totalDx = baseOffset + gestureState.dx;

        if (totalDx < -140 || gestureState.vx < -1.0) {
          // Full swipe to remove!
          handleConfirmDelete();
        } else if (totalDx < -40) {
          // Reveal delete container
          isSwipedOpenRef.current = true;
          Animated.spring(swipeX, {
            toValue: -84,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
          Animated.spring(trashScale, {
            toValue: 1,
            damping: 10,
            stiffness: 240,
            useNativeDriver: true,
          }).start();
          Animated.timing(trashOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();
        } else {
          // Spring back to closed
          isSwipedOpenRef.current = false;
          Animated.spring(swipeX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            useNativeDriver: true,
          }).start();
          Animated.timing(trashScale, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
          Animated.timing(trashOpacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: (_evt, gestureState) => {
        if (isUnlockedRef.current) {
          resetDragState();
          onDragEndRef.current?.(task, gestureState);
          return;
        }
        isSwipedOpenRef.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(trashScale, { toValue: 0, duration: 120, useNativeDriver: true }).start();
        Animated.timing(trashOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
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
    if (isSwipedOpenRef.current) {
      isSwipedOpenRef.current = false;
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      Animated.timing(trashScale, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      Animated.timing(trashOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      return;
    }
    if (task.occurrenceId || task.taskDefinitionId) {
      router.push({
        pathname: '/task/[id]',
        params: { id: task.occurrenceId || task.taskDefinitionId, defId: task.taskDefinitionId },
      });
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── Underneath Delete Action Revealed on Swipe Left ── */}
      <View
        style={[
          styles.deleteUnderneathContainer,
          {
            borderRadius: radii.card,
            backgroundColor: '#DC2626',
          },
        ]}
        testID={`task-card-delete-reveal-${task.occurrenceId}`}
      >
        <Pressable
          onPress={handleConfirmDelete}
          accessibilityRole="button"
          accessibilityLabel={`Remove task: ${task.title}`}
          testID={`task-card-remove-button-${task.occurrenceId}`}
          style={styles.deleteRevealPressable}
        >
          <Animated.View
            style={[
              styles.deleteIconPopWrapper,
              {
                transform: [
                  {
                    scale: trashScale.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0, 1.25, 1],
                    }),
                  },
                ],
                opacity: trashOpacity,
              },
            ]}
          >
            <Icon name="trash" size={24} color="#FFFFFF" decorative />
            <Text style={styles.deleteRevealText}>Delete</Text>
          </Animated.View>
        </Pressable>
      </View>

      {/* ── Foreground Draggable & Swipable Card ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.animatedCardWrapper,
          {
            transform: [
              { translateX: Animated.add(pan.x, swipeX) },
              { translateY: pan.y },
              { scale: scaleAnim },
              { rotate },
            ],
            zIndex: isUnlocked ? 9999 : 1,
          },
        ]}
      >
      <Pressable
        onPress={handleCardPress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`View task details: ${task.title}`}
        style={({ pressed }) => [
          styles.card,
          shadows.card,
          {
            backgroundColor: isCompleted
              ? colors.surfaceSecondary
              : pressed
              ? isDark
                ? 'rgba(38, 48, 60, 0.95)'
                : 'rgba(249, 250, 251, 0.98)'
              : isDark
              ? 'rgba(28, 35, 43, 0.95)'
              : 'rgba(255, 255, 255, 0.98)',
            borderRadius: radii.card,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 0,
            borderColor: isUnlocked ? '#10B981' : colors.border,
            borderWidth: isUnlocked ? 2 : 1,
            shadowColor: isUnlocked ? '#10B981' : '#000',
            shadowOpacity: isUnlocked ? 0.35 : 0.04,
            shadowRadius: isUnlocked ? 10 : 3,
            elevation: isUnlocked ? 10 : 2,
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

        {/* Title, Subtasks, and metadata block */}
        <View
          style={styles.contentContainer}
          accessible={true}
          accessibilityLabel={compositeLabel}
        >
          {/* Main content row with Icon and title/date column */}
          <View style={styles.taskRowWithIcon}>
            <View
              style={[
                styles.taskIconBadge,
                { backgroundColor: hasCustomTaskIcon(task.icon) ? 'transparent' : category.bg },
              ]}
              testID={`task-icon-badge-${task.occurrenceId}`}
            >
              <TaskCategoryIcon
                iconId={task.icon}
                size={hasCustomTaskIcon(task.icon) ? 28 : 20}
                color={category.color}
              />
            </View>

            <View style={styles.titleAndDateColumn}>
              <Text
                style={[
                  typography.bodyLarge,
                  styles.titleText,
                  {
                    color: isCompleted ? colors.textMuted : colors.textPrimary,
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={1}
              >
                {task.title}
              </Text>

              {scheduleDisplay ? (
                <View style={styles.scheduleRow}>
                  <Text
                    style={[
                      typography.caption,
                      styles.dateSubtitleText,
                      {
                        color: isCompleted
                          ? colors.textMuted
                          : isDark
                          ? '#34D399'
                          : '#059669',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {scheduleDisplay}
                  </Text>
                  {task.isRecurring && (
                    <View
                      style={[
                        styles.recurringBadge,
                        {
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                          borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : '#A7F3D0',
                        },
                      ]}
                      testID={`task-recurring-badge-${task.occurrenceId}`}
                    >
                      <Icon
                        name="refresh"
                        size={10}
                        color={isDark ? '#34D399' : '#047857'}
                        decorative
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isDark ? '#34D399' : '#047857',
                            fontSize: 10,
                          },
                        ]}
                      >
                        Daily
                      </Text>
                    </View>
                  )}
                </View>
              ) : task.isRecurring ? (
                <View style={styles.scheduleRow}>
                  <View
                    style={[
                      styles.recurringBadge,
                      {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
                        borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : '#A7F3D0',
                      },
                    ]}
                    testID={`task-recurring-badge-${task.occurrenceId}`}
                  >
                    <Icon
                      name="refresh"
                      size={10}
                      color={isDark ? '#34D399' : '#047857'}
                      decorative
                      style={{ marginRight: 3 }}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isDark ? '#34D399' : '#047857',
                          fontSize: 10,
                        },
                      ]}
                    >
                      Daily
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {(task.estimatedMinutes || (isPending && overdueState.isOverdue)) ? (
            <View style={styles.metaRow}>
              {task.estimatedMinutes ? (
                <View style={styles.metaItem}>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>
                    {task.estimatedMinutes}m
                  </Text>
                </View>
              ) : null}

              {isPending && overdueState.isOverdue && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.warning + '1A',
                      borderColor: colors.warning,
                      borderRadius: radii.pill,
                      borderWidth: 1,
                      paddingHorizontal: spacing.xs,
                      marginLeft: 'auto',
                    },
                  ]}
                  testID={`overdue-badge-${task.occurrenceId}`}
                >
                  <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>
                    {overdueState.overdueMinutes >= 1
                      ? `${overdueState.overdueMinutes} min overdue`
                      : 'Overdue'}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Right side indicators: Streak Flame, Priority Circle & Chevron */}
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

          <Icon
            name="chevron-right"
            size={18}
            color={colors.textTertiary}
            directional
            decorative
            style={{ marginStart: 4 }}
          />
        </View>
      </View>
    </Pressable>
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
  deleteUnderneathContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    zIndex: 0,
  },
  deleteRevealPressable: {
    width: 84,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconPopWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRevealText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  animatedCardWrapper: {
    width: '100%',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  contentContainer: {
    flex: 1,
    marginStart: 4,
    justifyContent: 'center',
  },
  taskRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleAndDateColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateSubtitleText: {
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 8,
  },
  priorityCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 4,
  },
  priorityExclamation: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  srOnly: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});