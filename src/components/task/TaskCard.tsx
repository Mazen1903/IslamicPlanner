import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme, type ThemeColors } from '@/theme';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCheckbox } from './TaskCheckbox';
import { Icon, type IconName } from '@/components/common/Icon';
import { useTodayStore } from '@/stores/useTodayStore';
import { deriveOverdueState } from '@/services/TodayViewModelProjection';

export interface TaskCardProps {
  task: TaskCardViewModel;
  onComplete?: (occurrenceId: string) => void;
}

function getCategoryTheme(title: string, colors: ThemeColors): { icon: IconName; bg: string; color: string } {
  const lower = title.toLowerCase();
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast') || lower.includes('food') || lower.includes('eat')) {
    return { icon: 'restaurant', bg: colors.primaryLight, color: colors.primary };
  }
  if (lower.includes('meet') || lower.includes('work') || lower.includes('team') || lower.includes('sync') || lower.includes('laptop')) {
    return { icon: 'laptop', bg: colors.surfaceSecondary, color: colors.info };
  }
  if (lower.includes('qur') || lower.includes('read') || lower.includes('dhikr') || lower.includes('surah') || lower.includes('book')) {
    return { icon: 'book', bg: colors.prayerFajr, color: colors.primary };
  }
  if (lower.includes('call') || lower.includes('phone') || lower.includes('mom') || lower.includes('dad')) {
    return { icon: 'call', bg: colors.primaryLight, color: colors.primary };
  }
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('exercise') || lower.includes('run') || lower.includes('fitness')) {
    return { icon: 'barbell', bg: colors.primaryLight, color: colors.primary };
  }
  return { icon: 'check', bg: colors.primaryLight, color: colors.primary };
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  const isCompleted = task.status === 'COMPLETED';
  const isMissed = task.status === 'MISSED';
  const isPending = task.status === 'PENDING';

  const nowMs = useTodayStore(s => s.nowMs);
  const now = useMemo(() => DateTime.fromMillis(nowMs), [nowMs]);
  const overdueState = deriveOverdueState(task, now);

  const category = getCategoryTheme(task.title, colors);

  const compositeLabel = useMemo(() => {
    let label = task.title;
    if (task.priority === 'IMPORTANT') {
      label += '. Important.';
    }
    if (isPending && overdueState.isOverdue) {
      label += overdueState.overdueMinutes >= 1
        ? `. ${overdueState.overdueMinutes} min overdue.`
        : '. Overdue.';
    } else if (isMissed) {
      label += '. Missed.';
    } else if (isCompleted) {
      label += '. Completed.';
    }
    return label;
  }, [task.title, task.priority, isPending, overdueState, isMissed, isCompleted]);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: isCompleted ? colors.surfaceSecondary : colors.surface,
          borderRadius: radii.card,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
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

        {/* Category Icon Badge */}
        <View style={[styles.categoryCircle, { backgroundColor: category.bg }]}>
          <Icon name={category.icon} size={18} color={category.color} decorative />
        </View>

        {/* Title and metadata block */}
        <View
          style={styles.contentContainer}
          accessible={true}
          accessibilityLabel={compositeLabel}
        >
          <View style={styles.titleRow}>
            <Text
              style={[
                typography.bodyLarge,
                {
                  color: isCompleted ? colors.textMuted : colors.textPrimary,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                  fontWeight: '600',
                  fontSize: 15,
                  flex: 1,
                },
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>

            {task.priority === 'IMPORTANT' && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.dangerSurface,
                    borderColor: colors.danger,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: spacing.xs,
                    marginStart: spacing.xs,
                  },
                ]}
                testID={`important-badge-${task.occurrenceId}`}
              >
                <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                  IMPORTANT
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {task.scheduleLabel ? (
              <View style={styles.metaItem}>
                <Icon name="clock" size={12} color={colors.textTertiary} style={{ marginEnd: 4 }} decorative />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
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

        {/* Right side indicators: Chevron */}
        <View style={styles.rightActions}>
          <Icon name="chevron-right" size={18} color={colors.textTertiary} decorative />
        </View>
      </View>
    </View>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  contentContainer: {
    flex: 1,
    marginStart: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 8,
  },
});