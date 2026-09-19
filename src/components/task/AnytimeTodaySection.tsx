import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';
import { Icon } from '@/components/common/Icon';

export interface AnytimeTodaySectionProps {
  tasks: TaskCardViewModel[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onComplete: (occurrenceId: string) => void;
}

export function AnytimeTodaySection({
  tasks,
  collapsed,
  onToggleCollapsed,
  onComplete,
}: AnytimeTodaySectionProps) {
  const { colors, spacing, typography, touchTargets } = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="anytime-today-section">
      <Pressable
        onPress={onToggleCollapsed}
        style={[
          styles.header,
          {
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderTopColor: colors.divider,
            borderTopWidth: 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Anytime Today, ${tasks.length} items, ${collapsed ? 'collapsed' : 'expanded'}`}
        accessibilityState={{ expanded: !collapsed }}
        testID="anytime-section-header"
      >
        <View style={styles.headerLeft}>
          <Icon name="sun" size={16} color={colors.primary} style={{ marginEnd: 6 }} decorative />
          <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Anytime Today ({tasks.length})
          </Text>
        </View>
        <Icon
          name={collapsed ? 'chevron-right' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
          decorative
          directional={collapsed}
        />
      </Pressable>

      {!collapsed && (
        <View style={styles.list}>
          {tasks.map(task => (
            <TaskCard key={task.occurrenceId} task={task} onComplete={onComplete} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    marginTop: 6,
  },
});