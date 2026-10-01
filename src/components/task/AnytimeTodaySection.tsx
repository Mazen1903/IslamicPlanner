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
  const { colors, spacing, typography, shadows } = useTheme();

  const taskCount = tasks.length;
  const countLabel = `${taskCount} task${taskCount === 1 ? '' : 's'}`;

  return (
    <View style={styles.container} testID="anytime-today-section">
      <Pressable
        onPress={onToggleCollapsed}
        style={[
          styles.cardHeader,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 16,
            paddingHorizontal: spacing.lg,
            paddingVertical: 14,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Anytime Today, ${taskCount} items, ${collapsed ? 'collapsed' : 'expanded'}`}
        accessibilityState={{ expanded: !collapsed }}
        testID="anytime-section-header"
      >
        <View style={styles.headerLeft}>
          <Icon name="clock" size={18} color={colors.primary} style={{ marginEnd: 6 }} decorative />
          <Text style={[typography.labelLarge, styles.title, { color: colors.textPrimary }]}>
            Anytime Today
          </Text>

          <View style={[styles.badgePill, { backgroundColor: colors.primaryLight }]}>
            <Text style={[typography.caption, styles.badgeText, { color: colors.primary }]}>{countLabel}</Text>
          </View>
        </View>

        <Icon
          name={collapsed ? 'chevron-right' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
          decorative
          directional={collapsed}
        />
      </Pressable>

      {!collapsed && tasks.length > 0 && (
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
    marginTop: 8,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    marginStart: 4,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginStart: 8,
  },
  badgeText: {
    fontSize: 12,
  },
  list: {
    marginTop: 10,
  },
});