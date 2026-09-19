import React, { useReducer, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import {
  createInitialFormState,
  formReducer,
} from '@/features/task-form/formReducer';
import { validateForm } from '@/features/task-form/formValidation';
import { computeSchedulePreview } from '@/features/task-form/previewService';
import { taskFormOrchestrator, TaskFormOrchestrator } from '@/features/task-form/TaskFormOrchestrator';
import type {
  EditScope,
  OrchestratorResult,
  SchedulePreviewResult,
} from '@/features/task-form/types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import type { TodayTemporalInputProvider } from '@/services/types';
import { M7BootstrapInputProvider } from '@/services/TodayTemporalInputProvider';
import { ScheduleModeCards } from './ScheduleModeCards';
import { RecurrenceSection } from './RecurrenceSection';
import { MoreOptionsSection } from './MoreOptionsSection';
import { EditScopeSheet } from './EditScopeSheet';
import { SuccessScreen } from './SuccessScreen';
import { PartialSuccessView } from './PartialSuccessView';

export interface TaskFormScreenProps {
  initialDefinition?: TaskDefinition;
  initialOccurrence?: TaskOccurrence;
  initialCivilSeedDate?: string;
  initialPlanningDayDate?: string;
  initialPrayerTab?: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';
  initialScope?: EditScope;
  inputProvider?: TodayTemporalInputProvider;
  orchestrator?: TaskFormOrchestrator;
  onSuccess: () => void;
  onCancel: () => void;
}

const defaultInputProvider = new M7BootstrapInputProvider();

export function TaskFormScreen({
  initialDefinition,
  initialOccurrence,
  initialCivilSeedDate,
  initialPlanningDayDate,
  initialPrayerTab,
  initialScope,
  inputProvider = defaultInputProvider,
  orchestrator = taskFormOrchestrator,
  onSuccess,
  onCancel,
}: TaskFormScreenProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const isEdit = Boolean(initialDefinition);
  const isRecurringSeries = Boolean(
    initialDefinition?.recurrenceRule || initialDefinition?.hijriRecurrence
  );

  // Scope selection sheet state for recurring task edits
  const [showScopeSheet, setShowScopeSheet] = useState(
    isEdit && isRecurringSeries && !initialScope
  );

  const defaultDate = DateTime.now().toFormat('yyyy-MM-dd');

  // Form State via useReducer
  const [state, dispatch] = useReducer(
    formReducer,
    {
      civilSeedDate: initialCivilSeedDate || defaultDate,
      planningDayDate: initialPlanningDayDate || defaultDate,
      launchPrayer: initialPrayerTab,
      initialDefinition,
      initialOccurrence,
      editScope: initialScope,
    },
    createInitialFormState
  );

  // Synchronous presentation-layer mutex latch
  const submitInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // Orchestrator Result state
  const [saveResult, setSaveResult] = useState<OrchestratorResult | null>(null);

  // Live preview state
  const [previewResult, setPreviewResult] = useState<SchedulePreviewResult | null>(null);

  // Compute live preview whenever schedule draft, civil date, or temporal inputs change
  useEffect(() => {
    let isCancelled = false;
    async function fetchAndSetPreview() {
      try {
        const temporalRes = await inputProvider.getInputs();
        if (isCancelled) return;
        if (temporalRes.status === 'READY') {
          const preview = computeSchedulePreview(state, temporalRes.inputs);
          setPreviewResult(preview);
        } else {
          setPreviewResult({
            status: 'CONTEXT_UNAVAILABLE',
            reason: 'Schedule preview unavailable until location is configured.',
          });
        }
      } catch {
        if (!isCancelled) {
          setPreviewResult({
            status: 'CONTEXT_UNAVAILABLE',
            reason: 'Unable to calculate prayer times for preview.',
          });
        }
      }
    }
    fetchAndSetPreview();
    return () => {
      isCancelled = true;
    };
  }, [state, inputProvider]);

  // Handle scope selection for recurring edit
  const handleSelectScope = (scope: EditScope) => {
    dispatch({ type: 'SET_EDIT_SCOPE', payload: scope });
    setShowScopeSheet(false);
  };

  // Handle Cancel / Back with unsaved changes prompt
  const handleBackPress = () => {
    if (saveResult) {
      onCancel();
      return;
    }
    if (state.isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  // Single-flight Save Submission
  const handleSave = async () => {
    // Synchronous mutex latch check BEFORE first await
    if (submitInFlightRef.current || isSubmitting) {
      return;
    }

    // Validate form
    const validation = validateForm(state);
    if (!validation.isValid) {
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validation.errors });
      return;
    }

    // Engage mutex
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    dispatch({ type: 'SET_SAVE_PHASE', payload: 'SUBMITTING' });

    try {
      const result = await orchestrator.submit(state);
      setSaveResult(result);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'An unexpected error occurred while saving.');
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
      dispatch({ type: 'SET_SAVE_PHASE', payload: 'IDLE' });
    }
  };

  // Retry Sync (Phase 2 retry only, reusing committed identity)
  const handleRetrySync = async () => {
    if (isRetryingSync) return;
    setIsRetryingSync(true);
    try {
      const result = await orchestrator.retrySync();
      setSaveResult(result);
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to sync occurrences.');
    } finally {
      setIsRetryingSync(false);
    }
  };

  // Success view
  if (saveResult && saveResult.status === 'SAVED_AND_SYNCED') {
    return (
      <SuccessScreen
        title={state.title}
        scheduleSummary={previewResult?.primaryLabel ?? state.scheduleMode}
        repeatSummary={state.recurrencePreset !== 'NONE' ? state.recurrencePreset : null}
        onDone={onSuccess}
        isEdit={isEdit}
      />
    );
  }

  // Partial success view
  if (saveResult && saveResult.status === 'SAVED_SYNC_INCOMPLETE') {
    return (
      <PartialSuccessView
        issues={saveResult.issues}
        onRetrySync={handleRetrySync}
        onDone={onSuccess}
        isRetrying={isRetryingSync}
      />
    );
  }

  // If THIS_OCCURRENCE scope: only show occurrence-level override fields!
  const isThisOccurrenceScope = state.editScope === 'THIS_OCCURRENCE';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="task-form-screen"
    >
      {/* Visual Mosque / Header Banner */}
      <View
        style={[
          styles.headerBanner,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="task-form-back-button"
            style={[styles.iconButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
          >
            <Icon name="close" size={22} color={colors.textPrimary} />
          </Pressable>

          <Text style={[typography.headlineLarge, { color: colors.primaryDark, fontWeight: '700' }]}>
            {isEdit ? 'Edit Task' : 'Add Task'}
          </Text>

          {/* Save Button in Header */}
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Save task"
            accessibilityState={{ busy: isSubmitting }}
            testID="task-form-save-button"
            style={({ pressed }) => [
              styles.saveHeaderButton,
              {
                backgroundColor: isSubmitting ? colors.disabledBackground : pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
                paddingHorizontal: spacing.lg,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} testID="save-busy-indicator" />
            ) : (
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                Save
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
      >
        {/* Task Title Input */}
        <View style={[styles.titleSection, { marginBottom: spacing.md }]}>
          <TextInput
            value={state.title}
            onChangeText={text => dispatch({ type: 'SET_TITLE', payload: text })}
            placeholder="What would you like to do?"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Task title"
            testID="task-title-input"
            style={[
              styles.titleInput,
              typography.headlineMedium,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderColor: state.validationErrors.title ? colors.danger : colors.border,
                borderRadius: radii.card,
                padding: spacing.lg,
              },
              shadows.card,
            ]}
          />
          {state.validationErrors.title && (
            <Text
              style={[typography.caption, { color: colors.danger, marginTop: spacing.xs, marginStart: spacing.xs }]}
              testID="title-validation-error"
            >
              {state.validationErrors.title}
            </Text>
          )}
        </View>

        {/* If THIS_OCCURRENCE: hide definition-level fields (schedule, recurrence, priority, duration, tags, reminder) */}
        {!isThisOccurrenceScope ? (
          <>
            {/* Scheduling Mode Cards */}
            <ScheduleModeCards
              state={state}
              dispatch={dispatch}
              previewResult={previewResult}
            />

            {/* Recurrence Section */}
            <RecurrenceSection
              state={state}
              dispatch={dispatch}
            />

            {/* More Options Section */}
            <MoreOptionsSection
              state={state}
              dispatch={dispatch}
            />
          </>
        ) : (
          /* THIS_OCCURRENCE: Only occurrence-level fields (Title, Notes, Subtasks) */
          <View style={{ marginTop: spacing.md }} testID="occurrence-override-fields">
            <View
              style={[
                styles.noticeBanner,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text style={[typography.bodySmall, { color: colors.primaryDark, fontWeight: '600' }]}>
                Editing this occurrence only. Schedule and recurrence rules remain unchanged.
              </Text>
            </View>

            {/* Notes for this occurrence */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Notes for this occurrence
            </Text>
            <TextInput
              value={state.notes}
              onChangeText={text => dispatch({ type: 'SET_NOTES', payload: text })}
              placeholder="Add notes for this date..."
              placeholderTextColor={colors.textTertiary}
              multiline={true}
              numberOfLines={3}
              style={[
                styles.overrideNotes,
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
      </ScrollView>

      {/* Edit Scope Modal Sheet for recurring tasks */}
      <EditScopeSheet
        visible={showScopeSheet}
        onSelectScope={handleSelectScope}
        onCancel={onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    justifyContent: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleSection: {
    width: '100%',
  },
  titleInput: {
    borderWidth: 1,
  },
  noticeBanner: {
    borderWidth: 1,
  },
  overrideNotes: {
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
