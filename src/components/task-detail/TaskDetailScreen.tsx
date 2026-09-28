import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { getIconIdFromTags, detectTaskIcon } from '@/constants/taskIcons';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

export interface TaskDetailScreenProps {
  definition: TaskDefinition;
  occurrence: TaskOccurrence | null;
  onEditFull: () => void;
  onDelete: () => void;
  onBack: () => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => Promise<void>;
  onAddSubtask?: (title: string) => Promise<void>;
  onUpdateNotes?: (notes: string) => Promise<void>;
}

export function TaskDetailScreen({
  definition,
  occurrence,
  onEditFull,
  onDelete,
  onBack,
  onToggleSubtask,
  onAddSubtask,
  onUpdateNotes,
}: TaskDetailScreenProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  // Three dots action sheet state
  const [showMenu, setShowMenu] = useState(false);

  // Subtasks local state for immediate feedback
  const [completedSubtaskIds, setCompletedSubtaskIds] = useState<string[]>(
    occurrence?.overrideData?.completedSubtaskIds ?? []
  );
  const [subtasksList, setSubtasksList] = useState(definition.subtasks ?? []);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Notes state
  const initialNotes =
    occurrence?.overrideData?.notes !== undefined
      ? occurrence.overrideData.notes ?? ''
      : definition.notes ?? '';
  const [notes, setNotes] = useState(initialNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Resolve icon
  const iconId = getIconIdFromTags(definition.tags) || detectTaskIcon(definition.title);

  // Resolve effective title
  const effectiveTitle = occurrence?.overrideData?.title || definition.title;

  // Schedule summary
  const getScheduleSummary = () => {
    switch (definition.scheduleType) {
      case 'EXACT_TIME': {
        const time = (definition.scheduleData as any)?.localTime;
        return time ? `Exact · ${time}` : 'Exact Time';
      }
      case 'PRAYER_RELATIVE': {
        const data = definition.scheduleData as any;
        const prayer = data?.anchorPrayer || data?.prayer || 'Prayer';
        const offset = data?.offsetMinutes ?? 0;
        return offset === 0 ? `At ${prayer}` : `${offset}m after ${prayer}`;
      }
      case 'PRAYER_WINDOW': {
        const data = definition.scheduleData as any;
        return `Between ${data?.startPrayer || 'Prayer'} & ${data?.endPrayer || 'Prayer'}`;
      }
      case 'ANYTIME_TODAY':
      default:
        return 'Anytime Today';
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const isCompleted = completedSubtaskIds.includes(subtaskId);
    const nextCompleted = isCompleted
      ? completedSubtaskIds.filter(id => id !== subtaskId)
      : [...completedSubtaskIds, subtaskId];

    setCompletedSubtaskIds(nextCompleted);

    if (occurrence && onToggleSubtask) {
      try {
        await onToggleSubtask(occurrence.id, subtaskId);
      } catch (err) {
        // Revert on error
        setCompletedSubtaskIds(completedSubtaskIds);
      }
    }
  };

  const handleAddSubtask = async () => {
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;

    setIsAddingSubtask(true);
    const tempId = `temp-${Date.now()}`;
    const newSubtask = { id: tempId, title: trimmed };
    setSubtasksList(prev => [...prev, newSubtask]);
    setNewSubtaskText('');

    try {
      if (onAddSubtask) {
        await onAddSubtask(trimmed);
      }
    } catch {
      // Revert if failed
      setSubtasksList(prev => prev.filter(s => s.id !== tempId));
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      if (onUpdateNotes) {
        await onUpdateNotes(notes);
      }
      setIsEditingNotes(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeletePress = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const completedCount = subtasksList.filter(s => completedSubtaskIds.includes(s.id)).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="task-detail-screen"
    >
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="task-detail-back-button"
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: pressed ? colors.surfaceSecondary : 'transparent', borderRadius: radii.pill },
          ]}
        >
          <Icon name="arrow-left" size={24} color={colors.textPrimary} decorative />
        </Pressable>

        <Text style={[typography.headlineLarge, styles.headerTitle, { color: colors.textPrimary }]}>
          Task Details
        </Text>

        <Pressable
          onPress={() => setShowMenu(true)}
          accessibilityRole="button"
          accessibilityLabel="Task options"
          testID="task-detail-more-button"
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: pressed ? colors.surfaceSecondary : 'transparent', borderRadius: radii.pill },
          ]}
        >
          <Icon name="dots-horizontal" size={24} color={colors.textPrimary} decorative />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
      >
        {/* 2. Main Title & Icon Card */}
        <View
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: colors.primaryLight,
                  borderRadius: radii.pill,
                  marginRight: spacing.md,
                },
              ]}
            >
              <TaskCategoryIcon iconId={iconId} size={30} />
            </View>

            <View style={styles.titleTextContainer}>
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                {effectiveTitle}
              </Text>

              {/* Badges row: Schedule + Priority */}
              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.pillBadge,
                    { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
                  ]}
                >
                  <Icon name="clock" size={13} color={colors.primary} decorative style={{ marginRight: 4 }} />
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                    {getScheduleSummary()}
                  </Text>
                </View>

                {definition.priority === 'IMPORTANT' && (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: '#fee2e2',
                        borderRadius: radii.pill,
                        marginLeft: spacing.xs,
                      },
                    ]}
                  >
                    <Icon name="flag" size={12} color={colors.danger} decorative style={{ marginRight: 4 }} />
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                      Important
                    </Text>
                  </View>
                )}

                {Boolean(definition.recurrenceRule || definition.hijriRecurrence) && (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radii.pill,
                        marginLeft: spacing.xs,
                      },
                    ]}
                  >
                    <Icon name="refresh" size={12} color={colors.textSecondary} decorative style={{ marginRight: 4 }} />
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                      Recurring
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 3. Subtasks Checklist Card */}
        <View
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="checkbox" size={20} color={colors.primary} decorative style={{ marginRight: 8 }} />
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Subtasks
              </Text>
            </View>
            {subtasksList.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                  {completedCount}/{subtasksList.length}
                </Text>
              </View>
            )}
          </View>

          {/* Subtasks items */}
          {subtasksList.length > 0 ? (
            <View style={styles.subtasksListContainer}>
              {subtasksList.map(item => {
                const isChecked = completedSubtaskIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleToggleSubtask(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={item.title}
                    style={({ pressed }) => [
                      styles.subtaskRow,
                      {
                        borderBottomColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        {
                          borderColor: isChecked ? colors.primary : colors.border,
                          backgroundColor: isChecked ? colors.primary : 'transparent',
                          borderRadius: 4,
                        },
                      ]}
                    >
                      {isChecked && <Icon name="check" size={14} color={colors.textOnPrimary} decorative />}
                    </View>
                    <Text
                      style={[
                        typography.bodyMedium,
                        styles.subtaskText,
                        {
                          color: isChecked ? colors.textTertiary : colors.textPrimary,
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={[typography.bodySmall, { color: colors.textTertiary, fontStyle: 'italic', marginVertical: spacing.xs }]}>
              No subtasks added yet
            </Text>
          )}

          {/* Quick Add Subtask row */}
          <View style={[styles.addSubtaskRow, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
            <TextInput
              value={newSubtaskText}
              onChangeText={setNewSubtaskText}
              placeholder="Add a step..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
              style={[
                styles.addSubtaskInput,
                typography.bodyMedium,
                { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
              ]}
            />
            <Pressable
              onPress={handleAddSubtask}
              disabled={!newSubtaskText.trim() || isAddingSubtask}
              accessibilityRole="button"
              accessibilityLabel="Add step"
              style={({ pressed }) => [
                styles.addSubtaskButton,
                {
                  backgroundColor: newSubtaskText.trim() ? colors.primary : colors.disabledBackground,
                  borderRadius: radii.pill,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Icon name="plus" size={18} color={colors.textOnPrimary} decorative />
            </Pressable>
          </View>
        </View>

        {/* 4. Notes Card */}
        <View
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="document" size={20} color={colors.primary} decorative style={{ marginRight: 8 }} />
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Notes
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (isEditingNotes) {
                  handleSaveNotes();
                } else {
                  setIsEditingNotes(true);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isEditingNotes ? 'Save notes' : 'Edit notes'}
              style={({ pressed }) => [
                styles.notesActionBtn,
                {
                  backgroundColor: isEditingNotes ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radii.pill,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {isSavingNotes ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text
                  style={[
                    typography.labelSmall,
                    {
                      color: isEditingNotes ? colors.textOnPrimary : colors.textPrimary,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {isEditingNotes ? 'Save' : 'Edit'}
                </Text>
              )}
            </Pressable>
          </View>

          {isEditingNotes ? (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add extra details, reminders, or references..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              style={[
                styles.notesInput,
                typography.bodyMedium,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                  marginTop: spacing.sm,
                  padding: spacing.md,
                },
              ]}
            />
          ) : (
            <Text
              style={[
                typography.bodyMedium,
                styles.notesContent,
                {
                  color: notes.trim() ? colors.textPrimary : colors.textTertiary,
                  fontStyle: notes.trim() ? 'normal' : 'italic',
                  marginTop: spacing.xs,
                },
              ]}
            >
              {notes.trim() || 'No notes added for this task'}
            </Text>
          )}
        </View>

        {/* 5. Attachments Card */}
        <View
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Icon name="attach" size={20} color={colors.primary} decorative style={{ marginRight: 8 }} />
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Attachments
              </Text>
            </View>
          </View>

          <View style={[styles.attachmentPlaceholder, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, marginTop: spacing.xs, padding: spacing.md }]}>
            <Icon name="attach" size={24} color={colors.textTertiary} decorative style={{ marginBottom: 6 }} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
              No attachments attached yet
            </Text>
            <Pressable
              onPress={() => Alert.alert('Attachments', 'File and photo attachments will be available in an upcoming update.')}
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              style={({ pressed }) => [
                styles.addAttachmentBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                  marginTop: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                + Add Attachment
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 6. Quick Full Edit Button */}
        <Pressable
          onPress={onEditFull}
          accessibilityRole="button"
          accessibilityLabel="Edit full task options"
          testID="task-detail-edit-full-button"
          style={({ pressed }) => [
            styles.editFullButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: radii.pill,
              minHeight: touchTargets.min,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="edit" size={18} color={colors.primary} decorative style={{ marginRight: 8 }} />
          <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700' }]}>
            Edit Full Task & Options
          </Text>
        </Pressable>
      </ScrollView>

      {/* 7. Action Sheet Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View
            style={[
              styles.menuContainer,
              shadows.card,
              { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md },
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.md }]}>
              Task Options
            </Text>

            <Pressable
              onPress={() => {
                setShowMenu(false);
                onEditFull();
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit full task"
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? colors.surfaceSecondary : 'transparent', borderRadius: radii.md },
              ]}
            >
              <Icon name="edit" size={20} color={colors.primary} decorative style={{ marginRight: spacing.md }} />
              <View style={styles.menuItemTextContainer}>
                <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Edit Full Task
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Schedule, recurrence, priority, and reminders
                </Text>
              </View>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={handleDeletePress}
              accessibilityRole="button"
              accessibilityLabel="Delete task"
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? '#fee2e2' : 'transparent', borderRadius: radii.md },
              ]}
            >
              <Icon name="trash" size={20} color={colors.danger} decorative style={{ marginRight: spacing.md }} />
              <View style={styles.menuItemTextContainer}>
                <Text style={[typography.labelLarge, { color: colors.danger, fontWeight: '700' }]}>
                  Delete Task
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Remove this task from your planner
                </Text>
              </View>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => setShowMenu(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.cancelMenuItem,
                { backgroundColor: pressed ? colors.surfaceSecondary : 'transparent', borderRadius: radii.pill },
              ]}
            >
              <Text style={[typography.labelMedium, { color: colors.textSecondary, fontWeight: '700' }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subtasksListContainer: {
    marginTop: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subtaskText: {
    flex: 1,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addSubtaskInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  addSubtaskButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  notesInput: {
    borderWidth: 1,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  notesContent: {
    lineHeight: 22,
  },
  attachmentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAttachmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  editFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  menuContainer: {
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  cancelMenuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
});
