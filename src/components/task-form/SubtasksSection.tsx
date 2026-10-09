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
import type { SubtaskDraft, FormAction } from '@/features/task-form/types';

export interface SubtasksSectionProps {
  subtasks: SubtaskDraft[];
  dispatch: React.Dispatch<FormAction>;
  style?: StyleProp<ViewStyle>;
  hideDivider?: boolean;
}

export function SubtasksSection({ subtasks, dispatch, style, hideDivider }: SubtasksSectionProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const newSubtaskRef = useRef('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const completedCount = subtasks.filter(s => s.isCompleted).length;
  const progressPercent = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : 0;

  const handleAddSubtask = () => {
    const text = newSubtaskRef.current || newSubtaskTitle;
    if (text.trim()) {
      dispatch({ type: 'ADD_SUBTASK', payload: { title: text.trim() } });
      newSubtaskRef.current = '';
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    if (editingId === id) setEditingId(null);
    dispatch({ type: 'REMOVE_SUBTASK', payload: { id } });
  };

  const handleToggleSubtask = (id: string) => {
    dispatch({ type: 'TOGGLE_SUBTASK', payload: { id } });
  };

  const handleStartEdit = (subtask: SubtaskDraft) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      dispatch({
        type: 'UPDATE_SUBTASK',
        payload: { id, title: editingTitle.trim() },
      });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      dispatch({
        type: 'REORDER_SUBTASKS',
        payload: { fromIndex: index, toIndex: index - 1 },
      });
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < subtasks.length - 1) {
      dispatch({
        type: 'REORDER_SUBTASKS',
        payload: { fromIndex: index, toIndex: index + 1 },
      });
    }
  };

  return (
    <View style={[styles.container, style]} testID="subtasks-section">
      {!hideDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}

      <View style={[styles.content, { padding: spacing.md }]}>
        {/* Progress Bar & Header (only if items exist) */}
        {subtasks.length > 0 && (
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Checklist
              </Text>
              <View
                style={[
                  styles.percentBadge,
                  {
                    backgroundColor: colors.primaryLight,
                    borderRadius: radii.pill,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '700' }]}>
                  {completedCount}/{subtasks.length} ({progressPercent}%)
                </Text>
              </View>
            </View>

            {/* Progress track */}
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: colors.primary,
                    borderRadius: radii.pill,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Existing checklist items list */}
        {subtasks.map((subtask, index) => {
          const isEditing = editingId === subtask.id;

          return (
            <View
              key={subtask.id}
              style={[
                styles.subtaskRow,
                {
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 8,
                  marginBottom: spacing.xs,
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
              testID={`subtask-item-${subtask.id}`}
            >
              {/* Checkbox */}
              <Pressable
                onPress={() => handleToggleSubtask(subtask.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: subtask.isCompleted }}
                accessibilityLabel={`Checklist item: ${subtask.title}`}
                testID={`toggle-subtask-${subtask.id}`}
                style={[
                  styles.subtaskCheck,
                  {
                    borderColor: subtask.isCompleted ? colors.primary : colors.border,
                    backgroundColor: subtask.isCompleted ? colors.primary : 'transparent',
                  },
                ]}
              >
                {subtask.isCompleted ? (
                  <Icon
                    name="check"
                    size={13}
                    color={colors.textOnPrimary}
                    decorative
                  />
                ) : null}
              </Pressable>

              {/* Title / Edit input */}
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    onSubmitEditing={() => handleSaveEdit(subtask.id)}
                    autoFocus
                    accessibilityLabel="Edit checklist item"
                    testID={`edit-input-${subtask.id}`}
                    style={[
                      styles.inlineEditInput,
                      typography.bodyMedium,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.primary,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radii.sm,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => handleSaveEdit(subtask.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Save edit"
                    testID={`save-edit-${subtask.id}`}
                    style={styles.iconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="check" size={16} color={colors.primary} decorative />
                  </Pressable>
                  <Pressable
                    onPress={handleCancelEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel edit"
                    testID={`cancel-edit-${subtask.id}`}
                    style={styles.iconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close" size={16} color={colors.textTertiary} decorative />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleStartEdit(subtask)}
                  style={styles.textContainer}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      styles.subtaskText,
                      {
                        color: subtask.isCompleted ? colors.textTertiary : colors.textPrimary,
                        textDecorationLine: subtask.isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {subtask.title}
                  </Text>
                </Pressable>
              )}

              {/* Action Buttons (when not editing) */}
              {!isEditing && (
                <View style={styles.actionsRow}>
                  {/* Edit button */}
                  <Pressable
                    onPress={() => handleStartEdit(subtask)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit: ${subtask.title}`}
                    testID={`edit-subtask-${subtask.id}`}
                    style={styles.iconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="pencil" size={14} color={colors.textSecondary} decorative />
                  </Pressable>

                  {/* Move Up */}
                  <Pressable
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`Move up: ${subtask.title}`}
                    testID={`move-up-${subtask.id}`}
                    style={[styles.iconButton, { opacity: index === 0 ? 0.25 : 1 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Icon name="chevron-up" size={15} color={colors.textSecondary} decorative />
                  </Pressable>

                  {/* Move Down */}
                  <Pressable
                    onPress={() => handleMoveDown(index)}
                    disabled={index === subtasks.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={`Move down: ${subtask.title}`}
                    testID={`move-down-${subtask.id}`}
                    style={[styles.iconButton, { opacity: index === subtasks.length - 1 ? 0.25 : 1 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Icon name="chevron-down" size={15} color={colors.textSecondary} decorative />
                  </Pressable>

                  {/* Remove button */}
                  <Pressable
                    onPress={() => handleRemoveSubtask(subtask.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove checklist item: ${subtask.title}`}
                    testID={`remove-subtask-${subtask.id}`}
                    style={({ pressed }) => [
                      styles.iconButton,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close" size={16} color={colors.textTertiary} decorative />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* Input Row for adding new item */}
        <View style={[styles.inputRow, subtasks.length > 0 && { marginTop: spacing.xs }]}>
          <TextInput
            value={newSubtaskTitle}
            onChangeText={text => {
              newSubtaskRef.current = text;
              setNewSubtaskTitle(text);
            }}
            onSubmitEditing={handleAddSubtask}
            placeholder="Add a checklist item..."
            placeholderTextColor={colors.textTertiary}
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
                paddingHorizontal: spacing.md,
                minHeight: touchTargets.min,
              },
            ]}
          />
          <Pressable
            onPress={handleAddSubtask}
            accessibilityRole="button"
            accessibilityLabel="Add subtask"
            testID="add-subtask-button"
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                minHeight: touchTargets.min,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              Add
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  content: {
    width: '100%',
  },
  headerBlock: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },
  subtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8,
  },
  textContainer: {
    flex: 1,
  },
  subtaskText: {
    fontSize: 15,
    marginHorizontal: 4,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineEditInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    fontSize: 15,
  },
  addBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
