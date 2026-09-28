import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction } from '@/features/task-form/types';
import { SubtasksSection } from './SubtasksSection';

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

  // Expansion state for inline drawers
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
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
        {/* Row 1: Priority */}
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
          <View style={styles.badgeBox}>
            <Icon name="flag" size={40} decorative />
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

        {/* Row 2: Notes */}
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
            <View style={styles.badgeBox}>
              <Icon name="document" size={40} decorative />
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

        {/* Row 3: Subtasks */}
        <View style={styles.rowCardWrapper}>
          <Pressable
            onPress={() => toggleSection('subtasks')}
            accessibilityRole="button"
            accessibilityLabel="Subtasks"
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
            <View style={styles.badgeBox}>
              <Icon name="checkbox" size={40} decorative />
            </View>
            <View style={styles.textContent}>
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Subtasks
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {state.subtasks.length > 0 ? `${state.subtasks.length} item${state.subtasks.length === 1 ? '' : 's'}` : 'Break into smaller steps'}
              </Text>
            </View>
            <Icon
              name={expandedSection === 'subtasks' ? 'chevron-down' : 'chevron-right'}
              size={18}
              color={colors.textTertiary}
              directional
              decorative
            />
          </Pressable>

          {expandedSection === 'subtasks' && (
            <View style={[styles.expandedDrawer, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, padding: spacing.md }]}>
              <SubtasksSection
                subtasks={state.subtasks}
                dispatch={dispatch}
              />
            </View>
          )}
        </View>

        {/* Row 4: Attachment */}
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
          <View style={styles.badgeBox}>
            <Icon name="attach" size={40} decorative />
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
    gap: 12,
  },
  rowCardWrapper: {
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 72,
  },
  badgeBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  expandedDrawer: {
    marginTop: 8,
  },
  notesInput: {
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
