import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
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
  onDragActiveChange?: (isDragging: boolean) => void;
}

export function computeDropIndex(fromIndex: number, dy: number, rowHeight: number, count: number): number {
  if (count <= 0 || rowHeight <= 0) return fromIndex;
  const shift = Math.round(dy / rowHeight);
  return Math.max(0, Math.min(count - 1, fromIndex + shift));
}

interface DraggableSubtaskRowProps {
  index: number;
  count: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  isEditing: boolean;
  onDragActiveChange?: (isDragging: boolean) => void;
  children: React.ReactNode;
}

function DraggableSubtaskRow({
  index,
  count,
  onReorder,
  style,
  testID,
  isEditing,
  onDragActiveChange,
  children,
}: DraggableSubtaskRowProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const { shadows } = useTheme();
  const [dragging, setDragging] = useState(false);
  const rowHeightRef = useRef(48);
  const indexRef = useRef(index);
  const countRef = useRef(count);
  const onReorderRef = useRef(onReorder);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    indexRef.current = index;
    countRef.current = count;
    onReorderRef.current = onReorder;
  }, [index, count, onReorder]);

  const finish = (dy: number) => {
    const from = indexRef.current;
    const to = computeDropIndex(from, dy, rowHeightRef.current, countRef.current);
    onDragActiveChange?.(false);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    isDraggingRef.current = false;
    setDragging(false);
    if (to !== from) {
      onReorderRef.current(from, to);
    }
  };

  const handleLongPress = () => {
    if (isEditing) return;
    try {
      Vibration.vibrate(30);
    } catch {}
    isDraggingRef.current = true;
    setDragging(true);
    onDragActiveChange?.(true);
    Animated.spring(scale, { toValue: 1.03, useNativeDriver: true }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => isDraggingRef.current,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return isDraggingRef.current && Math.abs(gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        return isDraggingRef.current && Math.abs(gestureState.dy) > 2;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, g) => {
        if (isDraggingRef.current) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_evt, g) => {
        if (isDraggingRef.current) {
          finish(g.dy);
        }
      },
      onPanResponderTerminate: () => {
        if (isDraggingRef.current) {
          finish(0);
        }
      },
    })
  ).current;

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={350}
      accessible={false}
      style={{ width: '100%' }}
    >
      <Animated.View
        {...panResponder.panHandlers}
        onLayout={e => {
          rowHeightRef.current = e.nativeEvent.layout.height || rowHeightRef.current;
        }}
        style={[
          style,
          dragging && styles.rowDragging,
          dragging && shadows.elevated,
          {
            transform: [{ translateY }, { scale }],
            zIndex: dragging ? 10 : 0,
          },
        ]}
        testID={testID}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function SubtasksSection({ subtasks, dispatch, style, hideDivider, onDragActiveChange }: SubtasksSectionProps) {
  const { colors, spacing, radii, typography } = useTheme();

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

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    dispatch({
      type: 'REORDER_SUBTASKS',
      payload: { fromIndex, toIndex },
    });
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

        {/* Checklist items list */}
        {subtasks.map((subtask, index) => {
          const isEditing = editingId === subtask.id;

          return (
            <DraggableSubtaskRow
              key={subtask.id}
              index={index}
              count={subtasks.length}
              onReorder={handleReorder}
              isEditing={isEditing}
              onDragActiveChange={onDragActiveChange}
              style={[
                styles.subtaskRow,
                {
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 10,
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
                    borderColor: subtask.isCompleted ? colors.primary : colors.checkboxUnchecked,
                    backgroundColor: subtask.isCompleted ? colors.primary : 'transparent',
                    borderWidth: 2,
                  },
                ]}
              >
                {subtask.isCompleted ? (
                  <Icon
                    name="check"
                    size={14}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${subtask.title}`}
                  accessibilityHint="Tap to edit, long press to reorder"
                  testID={`edit-subtask-${subtask.id}`}
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

              {/* Action Button: X delete button */}
              {!isEditing && (
                <Pressable
                  onPress={() => handleRemoveSubtask(subtask.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove: ${subtask.title}`}
                  testID={`remove-subtask-${subtask.id}`}
                  style={styles.iconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close" size={15} color={colors.textTertiary} decorative />
                </Pressable>
              )}
            </DraggableSubtaskRow>
          );
        })}

        {/* Add new subtask input row */}
        <View style={[styles.addRow, { marginTop: spacing.sm }]}>
          <TextInput
            placeholder="Add a checklist item..."
            placeholderTextColor={colors.textTertiary}
            value={newSubtaskTitle}
            onChangeText={text => {
              newSubtaskRef.current = text;
              setNewSubtaskTitle(text);
            }}
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
            style={[
              styles.addInput,
              typography.bodyMedium,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.sm,
              },
            ]}
            testID="new-subtask-input"
          />
          <Pressable
            onPress={handleAddSubtask}
            disabled={!newSubtaskTitle.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add checklist item"
            testID="add-subtask-button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.addButton,
              {
                backgroundColor: newSubtaskTitle.trim() ? colors.primary : colors.disabledBackground,
                borderRadius: radii.sm,
              },
            ]}
          >
            <Icon
              name="plus"
              size={18}
              color={newSubtaskTitle.trim() ? colors.textOnPrimary : colors.disabledText}
              decorative
            />
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
  content: {},
  headerBlock: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  progressTrack: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  rowDragging: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  subtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  textContainer: {
    flex: 1,
    paddingVertical: 4,
  },
  subtaskText: {
    fontSize: 15,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineEditInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 15,
  },
  iconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
