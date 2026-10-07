import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import type { TaskPriority } from '@/domain/task/types';
import { PriorityNormalBadgeIcon, PriorityImportantBadgeIcon } from '../RepeatIcons';

export interface PriorityInlinePanelProps {
  priority: TaskPriority;
  onSelectPriority: (priority: TaskPriority) => void;
  isPremium?: boolean;
}

export function PriorityInlinePanel({ priority, onSelectPriority, isPremium = true }: PriorityInlinePanelProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  const isNormal = priority === 'NORMAL';
  const isImportant = priority === 'IMPORTANT';

  return (
    <View style={styles.container} testID="priority-inline-panel">
      {/* Normal Option */}
      <Pressable
        onPress={() => onSelectPriority('NORMAL')}
        accessibilityRole="radio"
        accessibilityState={{ selected: isNormal }}
        accessibilityLabel="Priority option: Normal"
        testID="priority-option-normal"
        style={({ pressed }) => [
          styles.optionCard,
          isNormal && shadows.card,
          {
            backgroundColor: isNormal ? colors.primaryLight : colors.surface,
            borderColor: isNormal ? colors.primary : colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: isNormal ? colors.primary : colors.border,
              backgroundColor: isNormal ? colors.primary : 'transparent',
              marginEnd: spacing.sm,
            },
          ]}
        >
          {isNormal && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
        </View>

        <View style={{ marginEnd: spacing.sm }}>
          <PriorityNormalBadgeIcon size={32} decorative />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              typography.headlineMedium,
              {
                color: isNormal ? colors.primaryDark : colors.textPrimary,
                fontSize: 15,
                fontWeight: isNormal ? '700' : '600',
              },
            ]}
          >
            Normal
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Standard priority for routine daily tasks and reminders.
          </Text>
        </View>
      </Pressable>

      {/* Important Option */}
      <Pressable
        onPress={() => onSelectPriority('IMPORTANT')}
        accessibilityRole="radio"
        accessibilityState={{ selected: isImportant }}
        accessibilityLabel="Priority option: Important"
        testID="priority-option-important"
        style={({ pressed }) => [
          styles.optionCard,
          isImportant && shadows.card,
          {
            backgroundColor: isImportant ? colors.error + '14' : colors.surface,
            borderColor: isImportant ? colors.error : colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: isImportant ? colors.error : colors.border,
              backgroundColor: isImportant ? colors.error : 'transparent',
              marginEnd: spacing.sm,
            },
          ]}
        >
          {isImportant && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
        </View>

        <View style={{ marginEnd: spacing.sm }}>
          <PriorityImportantBadgeIcon size={32} decorative />
        </View>

        <View style={styles.textContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                typography.headlineMedium,
                {
                  color: isImportant ? colors.error : colors.textPrimary,
                  fontSize: 15,
                  fontWeight: isImportant ? '700' : '600',
                },
              ]}
            >
              Important
            </Text>
            {!isPremium && (
              <View style={{ marginStart: 6 }}>
                <MaterialCommunityIcons name="crown" size={14} color={colors.warning} />
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Highlight on planner and send priority alerts.
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
  },
});
