import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction } from '@/features/task-form/types';
import type { TaskPriority } from '@/domain/task/types';

interface MoreOptionsSectionProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  style?: StyleProp<ViewStyle>;
}

export function MoreOptionsSection({
  state,
  dispatch,
  style,
}: MoreOptionsSectionProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const newSubtaskRef = useRef('');
  const [newTagText, setNewTagText] = useState('');
  const newTagRef = useRef('');

  const handleAddSubtask = () => {
    const text = newSubtaskRef.current || newSubtaskTitle;
    if (text.trim()) {
      dispatch({ type: 'ADD_SUBTASK', payload: { title: text.trim() } });
      newSubtaskRef.current = '';
      setNewSubtaskTitle('');
    }
  };

  const handleAddTag = () => {
    const text = newTagRef.current || newTagText;
    if (text.trim()) {
      const formatted = text.trim().toLowerCase();
      if (!state.tags.includes(formatted)) {
        dispatch({ type: 'SET_TAGS', payload: [...state.tags, formatted] });
      }
      newTagRef.current = '';
      setNewTagText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    dispatch({ type: 'SET_TAGS', payload: state.tags.filter(t => t !== tagToRemove) });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header / Expand Toggle */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityLabel="Toggle more task options"
        accessibilityState={{ expanded: isExpanded }}
        testID="toggle-more-options"
        style={({ pressed }) => [
          styles.headerButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            minHeight: touchTargets.min,
            padding: spacing.md,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="settings" size={18} color={colors.primary} style={{ marginEnd: spacing.sm }} decorative />
        <Text style={[typography.bodyLarge, { color: colors.textPrimary, flex: 1, fontWeight: '600' }]}>
          More Options
        </Text>
        <Icon
          name={isExpanded ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={colors.textSecondary}
          decorative
        />
      </Pressable>

      {isExpanded && (
        <View
          style={[
            styles.bodyContainer,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.lg,
              marginTop: spacing.sm,
            },
          ]}
          testID="more-options-body"
        >
          {/* 1. Priority: Normal vs Important */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Priority
          </Text>
          <View style={styles.priorityRow}>
            {(['NORMAL', 'IMPORTANT'] as TaskPriority[]).map(p => {
              const isSelected = state.priority === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => dispatch({ type: 'SET_PRIORITY', payload: p })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Priority: ${p === 'NORMAL' ? 'Normal' : 'Important'}`}
                  testID={`priority-${p.toLowerCase()}`}
                  style={[
                    styles.priorityButton,
                    {
                      backgroundColor: isSelected
                        ? p === 'IMPORTANT'
                          ? colors.danger + '1A'
                          : colors.primaryLight
                        : colors.surfaceSecondary,
                      borderColor: isSelected
                        ? p === 'IMPORTANT'
                          ? colors.danger
                          : colors.primary
                        : colors.border,
                      borderRadius: radii.md,
                      minHeight: touchTargets.min,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isSelected
                          ? p === 'IMPORTANT'
                            ? colors.danger
                            : colors.primaryDark
                          : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {p === 'NORMAL' ? 'Normal' : 'Important'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 2. Reminder */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Reminder
          </Text>
          {state.scheduleMode === 'ANYTIME_TODAY' ? (
            <Text
              style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic', marginVertical: spacing.xs }]}
              testID="anytime-reminder-helper"
            >
              Reminders require a specific time.
            </Text>
          ) : (
            <View style={styles.reminderPresetRow}>
              {[
                { val: null, label: 'None' },
                { val: 0, label: 'At time' },
                { val: 10, label: '10m before' },
                { val: 15, label: '15m before' },
                { val: 30, label: '30m before' },
              ].map(item => {
                const isSelected = state.reminderMinutes === item.val;
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => dispatch({ type: 'SET_REMINDER_MINUTES', payload: item.val })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Reminder: ${item.label}`}
                    testID={`reminder-preset-${item.val === null ? 'none' : item.val}`}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.sm,
                        minHeight: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* 3. Estimated Duration */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Estimated Duration (minutes)
          </Text>
          <View style={styles.durationRow}>
            {[15, 30, 45, 60].map(mins => {
              const isSelected = state.estimatedMinutes === mins;
              return (
                <Pressable
                  key={mins}
                  onPress={() =>
                    dispatch({
                      type: 'SET_ESTIMATED_MINUTES',
                      payload: isSelected ? null : mins,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${mins} minutes duration`}
                  testID={`duration-${mins}`}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.sm,
                      minHeight: touchTargets.min,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {mins}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 4. Notes */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Notes
          </Text>
          <TextInput
            value={state.notes}
            onChangeText={text => dispatch({ type: 'SET_NOTES', payload: text })}
            placeholder="Add any extra details or intentions..."
            placeholderTextColor={colors.textTertiary}
            multiline={true}
            numberOfLines={3}
            accessibilityLabel="Task notes"
            testID="task-notes-input"
            style={[
              styles.notesInput,
              typography.bodyMedium,
              {
                borderColor: colors.border,
                borderRadius: radii.md,
                backgroundColor: colors.surfaceSecondary,
                color: colors.textPrimary,
                padding: spacing.md,
              },
            ]}
          />

          {/* 5. Subtasks */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Subtasks
          </Text>
          {state.subtasks.map(sub => (
            <View key={sub.id} style={styles.subtaskItemRow}>
              <Icon name="check" size={16} color={colors.primary} style={{ marginEnd: spacing.xs }} decorative />
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>
                {sub.title}
              </Text>
              <Pressable
                onPress={() => dispatch({ type: 'REMOVE_SUBTASK', payload: { id: sub.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Remove subtask ${sub.title}`}
                testID={`remove-subtask-${sub.id}`}
                style={[styles.removeButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
              >
                <Icon name="trash" size={16} color={colors.textTertiary} decorative />
              </Pressable>
            </View>
          ))}
          <View style={styles.addSubtaskRow}>
            <TextInput
              value={newSubtaskTitle}
              onChangeText={text => {
                newSubtaskRef.current = text;
                setNewSubtaskTitle(text);
              }}
              placeholder="Add subtask..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleAddSubtask}
              accessibilityLabel="New subtask title"
              testID="new-subtask-input"
              style={[
                styles.subtaskInput,
                typography.bodyMedium,
                {
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  minHeight: touchTargets.min,
                  paddingHorizontal: spacing.md,
                },
              ]}
            />
            <Pressable
              onPress={handleAddSubtask}
              accessibilityRole="button"
              accessibilityLabel="Add subtask"
              testID="add-subtask-button"
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                  minHeight: touchTargets.min,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Icon name="plus" size={16} color={colors.textOnPrimary} />
            </Pressable>
          </View>

          {/* 6. Tags */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
            Tags
          </Text>
          <View style={styles.tagsContainer}>
            {state.tags.map(tag => (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xxs,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '600' }]}>
                  #{tag}
                </Text>
                <Pressable
                  onPress={() => handleRemoveTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove tag ${tag}`}
                  style={{ marginStart: 4 }}
                >
                  <Icon name="close" size={12} color={colors.primaryDark} decorative />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.addTagRow}>
            <TextInput
              value={newTagText}
              onChangeText={text => {
                newTagRef.current = text;
                setNewTagText(text);
              }}
              placeholder="Add tag (e.g. worship, family)..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleAddTag}
              accessibilityLabel="New tag name"
              testID="new-tag-input"
              style={[
                styles.subtaskInput,
                typography.bodyMedium,
                {
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  minHeight: touchTargets.min,
                  paddingHorizontal: spacing.md,
                },
              ]}
            />
            <Pressable
              onPress={handleAddTag}
              accessibilityRole="button"
              accessibilityLabel="Add tag"
              testID="add-tag-button"
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                  minHeight: touchTargets.min,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Icon name="plus" size={16} color={colors.textOnPrimary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  bodyContainer: {
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  reminderPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reminderChip: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
