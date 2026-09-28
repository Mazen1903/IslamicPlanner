import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

export interface TaskCardProps {
  task: TaskCardViewModel;
  onComplete?: (occurrenceId: string) => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => void;
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

export function TaskCard({ task, onComplete, onToggleSubtask }: TaskCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();
  const router = useRouter();

  const isCompleted = task.status === 'COMPLETED';
  const isMissed = task.status === 'MISSED';
  const isPending = task.status === 'PENDING';

  const nowMs = useTodayStore(s => s.nowMs);
  const now = useMemo(() => DateTime.fromMillis(nowMs), [nowMs]);
  const overdueState = deriveOverdueState(task, now);

  const category = getCategoryTheme(task.title, colors, isDark);

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
    if (task.occurrenceId || task.taskDefinitionId) {
      router.push({
        pathname: '/task/[id]',
        params: { id: task.occurrenceId || task.taskDefinitionId, defId: task.taskDefinitionId },
      });
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
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
          marginBottom: 8,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
      testID={`task-card-${task.occurrenceId}`}
    >
      <View style={styles.mainRow}>
        {/* Left: Checkbox */}
        <TaskCheckbox
          checked={isCompleted}
          disabled={!isPending}
          onToggle={() => {
            if (isPending && onComplete) {
              onComplete(task.occurrenceId);
            }
          }}
          accessibilityLabel={`Complete task: ${task.title}`}
          testID={`checkbox-${task.occurrenceId}`}
        />

        {/* Title, Subtasks, and metadata block */}
        <View
          style={styles.contentContainer}
          accessible={true}
          accessibilityLabel={compositeLabel}
        >
          {/* Title row with Icon right next to the task name */}
          <View style={styles.titleRow}>
            <View
              style={[
                styles.taskIconBadge,
                { backgroundColor: hasCustomTaskIcon(task.icon) ? 'transparent' : category.bg },
              ]}
              testID={`task-icon-badge-${task.occurrenceId}`}
            >
              <TaskCategoryIcon
                iconId={task.icon}
                size={hasCustomTaskIcon(task.icon) ? 24 : 15}
                color={category.color}
              />
            </View>

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
          </View>

          {/* Subtasks under task name */}
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.subtasksContainer} testID={`task-subtasks-${task.occurrenceId}`}>
              {task.subtasks.map(subtask => (
                <Pressable
                  key={subtask.id}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleSubtask?.(task.occurrenceId, subtask.id);
                  }}
                  style={styles.subtaskRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: subtask.isCompleted }}
                  accessibilityLabel={`Subtask: ${subtask.title}`}
                  testID={`subtask-item-${task.occurrenceId}-${subtask.id}`}
                >
                  <View
                    style={[
                      styles.subtaskCheckbox,
                      {
                        borderColor: subtask.isCompleted ? colors.primary : colors.border,
                        backgroundColor: subtask.isCompleted ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {subtask.isCompleted && (
                      <Icon name="check" size={10} color={colors.textOnPrimary} decorative />
                    )}
                  </View>
                  <Text
                    style={[
                      typography.bodySmall,
                      styles.subtaskText,
                      {
                        color: subtask.isCompleted ? colors.textMuted : colors.textPrimary,
                        textDecorationLine: subtask.isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {subtask.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            {task.scheduleLabel ? (
              <View style={styles.metaItem}>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isCompleted ? colors.textMuted : colors.textSecondary,
                    },
                  ]}
                >
                  {task.scheduleLabel}
                </Text>
              </View>
            ) : null}

            {task.estimatedMinutes ? (
              <View style={[styles.metaItem, { marginStart: spacing.sm }]}>
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

            {isMissed && (
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
              >
                <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>
                  Missed
                </Text>
              </View>
            )}

            {isCompleted && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.completed + '1A',
                    borderColor: colors.completed,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: spacing.xs,
                    marginLeft: 'auto',
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.completed, fontWeight: '700' }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right side indicators: Priority Circle & Chevron */}
        <View style={styles.rightActions}>
          {task.priority === 'IMPORTANT' && (
            <View
              style={styles.priorityCircle}
              testID={`important-badge-${task.occurrenceId}`}
              accessibilityLabel="Important task"
            >
              <Text style={styles.priorityExclamation}>!</Text>
              <Text style={styles.srOnly}>IMPORTANT</Text>
            </View>
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
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  titleText: {
    flex: 1,
  },
  subtasksContainer: {
    marginTop: 4,
    marginBottom: 2,
    gap: 3,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  subtaskCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  subtaskText: {
    flex: 1,
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
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 4,
  },
  priorityExclamation: {
    color: '#DC2626',
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