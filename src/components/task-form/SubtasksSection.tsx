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
}

export function SubtasksSection({ subtasks, dispatch, style }: SubtasksSectionProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

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
      <View style={styles.headerRow}>
        <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
          Steps
        </Text>
        {subtasks.length > 0 && (
          <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>
            {`${subtasks.length} step${subtasks.length === 1 ? '' : 's'}`}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.card,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
            marginTop: spacing.xs,
          },
        ]}
      >
        {/* Existing subtasks list */}
        {subtasks.map(subtask => (
          <View
            key={subtask.id}
            style={[
              styles.subtaskRow,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                marginBottom: spacing.xs,
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
              style={styles.subtaskCheck}
            >
              <Icon
                name={subtask.isCompleted ? 'check' : 'circle'}
                size={18}
                color={subtask.isCompleted ? colors.primary : colors.textTertiary}
                decorative
              />
            </Pressable>

            <Text
              style={[
                typography.bodyMedium,
                {
                  color: subtask.isCompleted ? colors.textTertiary : colors.textPrimary,
                  textDecorationLine: subtask.isCompleted ? 'line-through' : 'none',
                  flex: 1,
                  marginHorizontal: spacing.xs,
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
              style={styles.subtaskDelete}
            >
              <Icon name="close" size={16} color={colors.textTertiary} decorative />
            </Pressable>
          </View>
        ))}

        {/* Input Row for adding new step */}
        <View style={styles.inputRow}>
          <TextInput
            value={newSubtaskTitle}
            onChangeText={text => {
              newSubtaskRef.current = text;
              setNewSubtaskTitle(text);
            }}
            onSubmitEditing={handleAddSubtask}
            placeholder="Add a step..."
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
            accessibilityLabel="Add step"
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
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  card: {
    borderWidth: 1,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  subtaskCheck: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 4,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
  },
  addBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
