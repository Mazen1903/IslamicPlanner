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

  const handleAddSubtask = () => {
    const text = newSubtaskRef.current || newSubtaskTitle;
    if (text.trim()) {
      dispatch({ type: 'ADD_SUBTASK', payload: { title: text.trim() } });
      newSubtaskRef.current = '';
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (id: string) => {
    dispatch({ type: 'REMOVE_SUBTASK', payload: { id } });
  };

  const handleToggleSubtask = (id: string) => {
    dispatch({ type: 'TOGGLE_SUBTASK', payload: { id } });
  };

  return (
    <View style={[styles.container, style]} testID="subtasks-section">
      {!hideDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}

      <View style={[styles.content, { padding: spacing.md }]}>
        {/* Existing subtasks list */}
        {subtasks.map(subtask => (
          <View
            key={subtask.id}
            style={[
              styles.subtaskRow,
              {
                paddingHorizontal: spacing.xs,
                paddingVertical: 6,
                marginBottom: spacing.xs,
                borderBottomColor: colors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            testID={`subtask-item-${subtask.id}`}
          >
            <Pressable
              onPress={() => handleToggleSubtask(subtask.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: subtask.isCompleted }}
              accessibilityLabel={`Subtask: ${subtask.title}`}
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

            <Pressable
              onPress={() => handleRemoveSubtask(subtask.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove subtask: ${subtask.title}`}
              testID={`remove-subtask-${subtask.id}`}
              style={({ pressed }) => [
                styles.subtaskDelete,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={16} color={colors.textTertiary} decorative />
            </Pressable>
          </View>
        ))}

        {/* Input Row for adding new step */}
        <View style={[styles.inputRow, subtasks.length > 0 && { marginTop: spacing.xs }]}>
          <TextInput
            value={newSubtaskTitle}
            onChangeText={text => {
              newSubtaskRef.current = text;
              setNewSubtaskTitle(text);
            }}
            onSubmitEditing={handleAddSubtask}
            placeholder="Add a subtask..."
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
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
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
  subtaskText: {
    flex: 1,
    fontSize: 15,
    marginHorizontal: 4,
  },
  subtaskDelete: {
    padding: 6,
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
