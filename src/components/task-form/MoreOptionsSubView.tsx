import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction } from '@/features/task-form/types';

interface MoreOptionsSubViewProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  onBack: () => void;
  onSave: () => void;
  isSubmitting?: boolean;
}

export function MoreOptionsSubView({
  state,
  dispatch,
  onSave,
  isSubmitting = false,
}: MoreOptionsSubViewProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  // Expansion states for interactive inline entry
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const newSubtaskRef = useRef('');
  const [newTagText, setNewTagText] = useState('');
  const newTagRef = useRef('');

  // Local visual toggle state for Private Task and Habit Tracker (from mockup)
  const [isPrivate, setIsPrivate] = useState(false);
  const [isHabit, setIsHabit] = useState(false);

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

  const getReminderText = () => {
    if (state.reminderMinutes === null) return 'No reminder';
    if (state.reminderMinutes === 0) return 'At time';
    return `${state.reminderMinutes} min before`;
  };

  const getDurationText = () => {
    if (!state.estimatedMinutes) return '30 minutes';
    if (state.estimatedMinutes === 60) return '1 hour';
    return `${state.estimatedMinutes} minutes`;
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { padding: spacing.lg }]}
      testID="more-options-subview"
    >
      {/* 1. Feature Info Card */}
      <View
        style={[
          styles.infoCard,
          shadows.card,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <View style={[styles.infoBadgeIcon, { backgroundColor: colors.primaryLight, borderRadius: radii.md }]}>
          <Icon name="settings" size={32} color={colors.primary} decorative />
        </View>
        <View style={styles.infoCardText}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            More Options
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' }]}>
            Add more details to personalize this task
          </Text>
        </View>
      </View>

      {/* 2. Options List */}
      <View style={styles.optionsList}>
        {/* Row 1: Reminder */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('reminder')}
            accessibilityRole="button"
            accessibilityLabel={`Reminder: ${getReminderText()}`}
            style={({ pressed }) => [
              styles.optionRow,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.badgeBox, { backgroundColor: colors.primaryLight, borderRadius: radii.md }]}>
              <Icon name="bell" size={24} color={colors.primary} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Reminder
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Get notified before the task
              </Text>
            </View>
            <View style={styles.trailingRow}>
              <Text style={[typography.labelMedium, { color: colors.textSecondary, marginEnd: spacing.xs }]}>
                {getReminderText()}
              </Text>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
            </View>
          </Pressable>

          {expandedSection === 'reminder' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              {state.scheduleMode === 'ANYTIME_TODAY' ? (
                <Text
                  style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}
                  testID="anytime-reminder-helper"
                >
                  Reminders require a specific time.
                </Text>
              ) : (
                <View style={styles.chipsRow}>
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
                          styles.choiceChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
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
            </View>
          )}
        </View>

        {/* Row 2: Priority */}
        <View
          style={[
            styles.optionRow,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
            },
          ]}
        >
          <View style={[styles.badgeBox, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
            <Icon name="flag" size={24} color={colors.danger} decorative />
          </View>
          <View style={styles.textContent}>
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              Priority
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Mark the importance
            </Text>
          </View>
          <Pressable
            onPress={() =>
              dispatch({
                type: 'SET_PRIORITY',
                payload: state.priority === 'IMPORTANT' ? 'NORMAL' : 'IMPORTANT',
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Priority: ${state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}`}
            testID={state.priority === 'IMPORTANT' ? 'priority-important' : 'priority-normal'}
            style={[styles.dropdownPill, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}
          >
            <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              {state.priority === 'IMPORTANT' ? 'Important' : 'Normal'}
            </Text>
            <Icon name="chevron-down" size={14} color={colors.textSecondary} style={{ marginStart: 4 }} decorative />
          </Pressable>
        </View>

        {/* Row 3: Duration */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('duration')}
            accessibilityRole="button"
            accessibilityLabel={`Duration: ${getDurationText()}`}
            style={({ pressed }) => [
              styles.optionRow,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.badgeBox, { backgroundColor: colors.prayerIsha, borderRadius: radii.md }]}>
              <Icon name="duration" size={24} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Duration
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Set an estimated time
              </Text>
            </View>
            <View style={styles.trailingRow}>
              <Text style={[typography.labelMedium, { color: colors.textSecondary, marginEnd: spacing.xs }]}>
                {getDurationText()}
              </Text>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
            </View>
          </Pressable>

          {expandedSection === 'duration' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              <View style={styles.chipsRow}>
                {[15, 30, 45, 60].map(mins => {
                  const isSelected = state.estimatedMinutes === mins;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => dispatch({ type: 'SET_ESTIMATED_MINUTES', payload: isSelected ? null : mins })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Duration: ${mins} minutes`}
                      testID={`duration-${mins}`}
                      style={[
                        styles.choiceChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
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
                        {mins === 60 ? '1h' : `${mins}m`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Row 4: Notes */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('notes')}
            accessibilityRole="button"
            accessibilityLabel="Notes"
            style={({ pressed }) => [
              styles.optionRow,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.badgeBox, { backgroundColor: colors.prayerAsr, borderRadius: radii.md }]}>
              <Icon name="document" size={24} color={colors.warning} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Notes
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Add extra details
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
          </Pressable>

          {expandedSection === 'notes' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              <TextInput
                value={state.notes}
                onChangeText={text => dispatch({ type: 'SET_NOTES', payload: text })}
                placeholder="Add notes..."
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Task notes"
                testID="task-notes-input"
                multiline={true}
                numberOfLines={3}
                style={[
                  styles.notesInput,
                  typography.bodyMedium,
                  {
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    padding: spacing.md,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Row 5: Subtasks */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('subtasks')}
            accessibilityRole="button"
            accessibilityLabel={`Subtasks: ${state.subtasks.length} subtasks`}
            style={({ pressed }) => [
              styles.optionRow,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.badgeBox, { backgroundColor: colors.prayerFajr, borderRadius: radii.md }]}>
              <Icon name="checkbox" size={24} color={colors.primaryDark} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Subtasks
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Break it into smaller steps
              </Text>
            </View>
            <View style={styles.trailingRow}>
              <Text style={[typography.labelMedium, { color: colors.textSecondary, marginEnd: spacing.xs }]}>
                {`${state.subtasks.length} subtasks`}
              </Text>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
            </View>
          </Pressable>

          {expandedSection === 'subtasks' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              {state.subtasks.map(subtask => (
                <View
                  key={subtask.id}
                  style={[
                    styles.subtaskRow,
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.sm,
                      paddingHorizontal: spacing.sm,
                      marginTop: spacing.xs,
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

              <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
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
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                />
                <Pressable
                  onPress={handleAddSubtask}
                  accessibilityRole="button"
                  accessibilityLabel="Add step"
                  testID="add-subtask-button"
                  style={[
                    styles.addBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radii.md,
                      minHeight: touchTargets.min,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Row 6: Attachment */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attachment"
          style={({ pressed }) => [
            styles.optionRow,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.badgeBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
            <Icon name="attach" size={24} color={colors.textSecondary} decorative />
          </View>
          <View style={styles.textContent}>
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              Attachment
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Add a file or photo
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
        </Pressable>

        {/* Row 7: Tags */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('tags')}
            accessibilityRole="button"
            accessibilityLabel={`Tags: ${state.tags.length} tags`}
            style={({ pressed }) => [
              styles.optionRow,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.badgeBox, { backgroundColor: colors.primaryLight, borderRadius: radii.md }]}>
              <Icon name="pricetag" size={24} color={colors.primary} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Tags
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Organize with tags
              </Text>
            </View>
            <View style={styles.trailingRow}>
              {state.tags.length > 0 && (
                <Text style={[typography.labelMedium, { color: colors.textSecondary, marginEnd: spacing.xs }]}>
                  {`${state.tags.length} tags`}
                </Text>
              )}
              <Icon name="chevron-right" size={18} color={colors.textTertiary} directional decorative />
            </View>
          </Pressable>

          {expandedSection === 'tags' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              {state.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {state.tags.map(tag => (
                    <View
                      key={tag}
                      style={[
                        styles.tagBadge,
                        {
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primary,
                          borderRadius: radii.pill,
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.sm,
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
                        testID={`remove-tag-${tag}`}
                        style={styles.tagDelete}
                      >
                        <Icon name="close" size={12} color={colors.primaryDark} decorative />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
                <TextInput
                  value={newTagText}
                  onChangeText={text => {
                    newTagRef.current = text;
                    setNewTagText(text);
                  }}
                  onSubmitEditing={handleAddTag}
                  placeholder="Add tag (e.g. ibadah, family)..."
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel="New tag name"
                  testID="new-tag-input"
                  style={[
                    styles.subtaskInput,
                    typography.bodyMedium,
                    {
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
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
                    styles.addBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radii.md,
                      minHeight: touchTargets.min,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Row 8: Private Task */}
        <View
          style={[
            styles.optionRow,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
            },
          ]}
        >
          <View style={[styles.badgeBox, { backgroundColor: colors.dangerSurface, borderRadius: radii.md }]}>
            <Icon name="eye" size={24} color={colors.danger} decorative />
          </View>
          <View style={styles.textContent}>
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              Private Task
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Keep this task hidden from others
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Private Task toggle"
          />
        </View>

        {/* Row 9: Add to Habit Tracker */}
        <View
          style={[
            styles.optionRow,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
            },
          ]}
        >
          <View style={[styles.badgeBox, { backgroundColor: colors.primaryLight, borderRadius: radii.md }]}>
            <Icon name="sync" size={24} color={colors.primary} decorative />
          </View>
          <View style={styles.textContent}>
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              Add to Habit Tracker
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Track this as a habit
            </Text>
          </View>
          <Switch
            value={isHabit}
            onValueChange={setIsHabit}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Add to Habit Tracker toggle"
          />
        </View>
      </View>

      {/* 3. Bottom Full-width Save Button */}
      <Pressable
        onPress={onSave}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Save task"
        accessibilityState={{ busy: isSubmitting }}
        testID="more-options-save-button"
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: isSubmitting ? colors.disabledBackground : pressed ? colors.primaryPressed : colors.primary,
            borderRadius: radii.pill,
            minHeight: touchTargets.min,
            marginTop: spacing.xl,
            marginBottom: spacing.xl,
            opacity: isSubmitting ? 0.7 : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} testID="save-busy-indicator" />
        ) : (
          <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700', fontSize: 18 }]}>
            Save Task
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  infoBadgeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCardText: {
    flex: 1,
  },
  optionsList: {
    gap: 10,
  },
  rowCardWrapper: {
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 64,
  },
  badgeBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expandedDrawer: {
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  subtaskCheck: {
    padding: 6,
    marginRight: 4,
  },
  subtaskDelete: {
    padding: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    minHeight: 44,
  },
  addBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  tagDelete: {
    padding: 2,
    marginLeft: 4,
  },
  saveButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
