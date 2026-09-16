import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { Icon } from '@/components/common/Icon';

export interface CompletedSectionProps {
  tasks: TaskCardViewModel[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function CompletedSection({
  tasks,
  collapsed,
  onToggleCollapsed,
}: CompletedSectionProps) {
  const { colors, spacing, typography, touchTargets } = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="completed-section">
      <Pressable
        onPress={onToggleCollapsed}
        style={[
          styles.header,
          {
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Completed tasks, ${tasks.length} items, ${collapsed ? 'collapsed' : 'expanded'}`}
        testID="completed-section-header"
      >
        <Text style={[typography.labelMedium, { color: colors.textSecondary, fontWeight: '700' }]}>
          Completed ({tasks.length})
        </Text>
        <Icon
          name={collapsed ? 'chevron-right' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </Pressable>

      {!collapsed && (
        <View style={styles.list}>
          {tasks.map(task => (
            <TaskCard key={task.occurrenceId} task={task} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    marginTop: 6,
  },
});
