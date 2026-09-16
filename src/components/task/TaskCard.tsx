import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCheckbox } from './TaskCheckbox';
import { Icon } from '@/components/common/Icon';

export interface TaskCardProps {
  task: TaskCardViewModel;
  onComplete?: (occurrenceId: string) => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  const isCompleted = task.status === 'COMPLETED';
  const isMissed = task.status === 'MISSED';
  const isPending = task.status === 'PENDING';

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: isCompleted ? colors.surfaceSecondary : colors.surface,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
      testID={`task-card-${task.occurrenceId}`}
    >
      <View style={styles.mainRow}>
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

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                typography.bodyLarge,
                {
                  color: isCompleted ? colors.textMuted : colors.textPrimary,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                  fontWeight: '600',
                  flex: 1,
                },
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            {task.priority === 'IMPORTANT' && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.danger + '1A', // subtle 10% tint
                    borderColor: colors.danger,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: spacing.xs,
                    marginLeft: spacing.xs,
                  },
                ]}
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
                <Icon name="clock" size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {task.scheduleLabel}
                </Text>
              </View>
            ) : null}

            {task.estimatedMinutes ? (
              <View style={[styles.metaItem, { marginLeft: spacing.md }]}>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>
                  {task.estimatedMinutes}m
                </Text>
              </View>
            ) : null}

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
  contentContainer: {
    flex: 1,
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});