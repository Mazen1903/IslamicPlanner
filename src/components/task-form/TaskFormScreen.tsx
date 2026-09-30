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
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import { TaskHeaderBanner } from './TaskHeaderBanner';
import { ScheduleModeCards } from './ScheduleModeCards';
import { RelativePrayerSubView } from './RelativePrayerSubView';
import { RecurrenceSubView } from './RecurrenceSubView';
import { MoreOptionsSubView } from './MoreOptionsSubView';
import { SubtasksSection } from './SubtasksSection';
import { EditScopeSheet } from './EditScopeSheet';
import { SuccessScreen } from './SuccessScreen';
import { PartialSuccessView } from './PartialSuccessView';
import { IconPickerModal, type IconPickerOrigin } from './IconPickerModal';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { detectTaskIcon } from '@/constants/taskIcons';

export type FormView = 'MAIN' | 'RELATIVE_PRAYER' | 'REPEAT' | 'MORE_OPTIONS';

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

const defaultInputProvider = new LocationAwareTodayTemporalInputProvider();

function getRecurrenceLabel(preset: string, specificDaysCount: number, calendar: string): string {
  switch (preset) {
    case 'NONE':
      return "Doesn't repeat";
    case 'DAILY':
      return 'Daily';
    case 'WEEKDAYS':
      return 'Weekdays (Mon - Fri)';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'SPECIFIC_DAYS':
      return `Specific days (${specificDaysCount} selected)`;
    case 'CUSTOM':
      return calendar === 'HIJRI' ? 'Custom (Hijri)' : 'Custom (Gregorian)';
    default:
      return "Doesn't repeat";
  }
}

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
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();

  const isEdit = Boolean(initialDefinition);
  const isRecurringSeries = Boolean(
    initialDefinition?.recurrenceRule || initialDefinition?.hijriRecurrence
  );

  // Sub-view navigation state
  const [currentView, setCurrentView] = useState<FormView>('MAIN');

  // Scope selection sheet state for recurring task edits
  const [showScopeSheet, setShowScopeSheet] = useState(
    isEdit && isRecurringSeries && !initialScope
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerOrigin, setIconPickerOrigin] = useState<IconPickerOrigin | undefined>();
  const iconPickerButtonRef = useRef<View>(null);

  const handleOpenIconPicker = () => {
    if (iconPickerButtonRef.current && (iconPickerButtonRef.current as any).measureInWindow) {
      (iconPickerButtonRef.current as any).measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            setIconPickerOrigin({ x, y, width, height });
          }
          setShowIconPicker(true);
        }
      );
    } else {
      setShowIconPicker(true);
    }
  };

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
      // If validation failed, ensure we return to MAIN view to show errors
      setCurrentView('MAIN');
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

  // Sub-view 2: Relative to Prayer screen (add task2.png)
  if (currentView === 'RELATIVE_PRAYER') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="task-form-screen"
      >
        <TaskHeaderBanner
          title={isEdit ? 'Edit Task' : 'Add Task'}
          subtitle="Schedule it around your prayers"
          onBack={() => setCurrentView('MAIN')}
          backTestID="task-form-back-button"
        />
        <RelativePrayerSubView
          state={state}
          dispatch={dispatch}
          previewResult={previewResult}
          onBack={() => setCurrentView('MAIN')}
          onNext={() => setCurrentView('MAIN')}
        />
      </SafeAreaView>
    );
  }

  // Sub-view 3: Repeat options screen (add task3.png)
  if (currentView === 'REPEAT') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="task-form-screen"
      >
        <TaskHeaderBanner
          title={isEdit ? 'Edit Task' : 'Add Task'}
          subtitle="Set how often this task repeats"
          onBack={() => setCurrentView('MAIN')}
          backTestID="task-form-back-button"
        />
        <RecurrenceSubView
          state={state}
          dispatch={dispatch}
          onBack={() => setCurrentView('MAIN')}
          onNext={() => setCurrentView('MAIN')}
        />
      </SafeAreaView>
    );
  }

  // Sub-view 4: More Options screen (add task4.png)
  if (currentView === 'MORE_OPTIONS') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="task-form-screen"
      >
        <TaskHeaderBanner
          title={isEdit ? 'Edit Task' : 'Add Task'}
          subtitle="Customize your task"
          onBack={() => setCurrentView('MAIN')}
          backTestID="task-form-back-button"
        />
        <MoreOptionsSubView
          state={state}
          dispatch={dispatch}
          onBack={() => setCurrentView('MAIN')}
          onSave={handleSave}
          isSubmitting={isSubmitting}
        />
      </SafeAreaView>
    );
  }

  // If THIS_OCCURRENCE scope: only show occurrence-level override fields
  const isThisOccurrenceScope = state.editScope === 'THIS_OCCURRENCE';

  // Sub-view 1: Main screen (add task1.png)
  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="task-form-screen"
    >
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}
      >
      {/* Mosque Skyline Header Banner */}
      <TaskHeaderBanner
        title={isEdit ? 'Edit Task' : 'Add Task'}
        subtitle="Turn your plans into progress"
        onBack={handleBackPress}
        backTestID="task-form-back-button"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
      >
        {/* Task Title + Subtasks Unified Card */}
        <View style={[styles.titleSection, { marginBottom: spacing.md }]}>
          <View style={styles.taskSectionHeadingRow}>
            <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
              Task name
            </Text>
            {state.subtasks.length > 0 && (
              <Text
                style={[typography.labelMedium, { color: colors.textSecondary }]}
                testID="task-subtasks-count-badge"
              >
                {`${state.subtasks.length} subtask${state.subtasks.length === 1 ? '' : 's'}`}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.unifiedTaskCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: state.validationErrors.title ? colors.danger : colors.border,
                borderRadius: radii.card,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={[
                styles.titleInputRow,
                {
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Pressable
                ref={iconPickerButtonRef as any}
                onPress={handleOpenIconPicker}
                accessibilityRole="button"
                accessibilityLabel="Choose task icon"
                testID="task-icon-picker-button"
                style={[
                  styles.iconPickerButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSecondary,
                    borderRadius: radii.md,
                    marginEnd: spacing.sm,
                  },
                ]}
              >
                <TaskCategoryIcon iconId={state.icon || detectTaskIcon(state.title)} size={34} />
                <View style={[styles.iconEditPencilBadge, { backgroundColor: colors.primary }]}>
                  <Icon name="edit" size={10} color={colors.textOnPrimary} decorative />
                </View>
              </Pressable>
              <TextInput
                value={state.title}
                onChangeText={text => dispatch({ type: 'SET_TITLE', payload: text })}
                placeholder="What do you need to do?"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Task title"
                testID="task-title-input"
                style={[
                  styles.titleTextInput,
                  typography.bodyLarge,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            {/* Subtasks Section embedded inside the unified card */}
            <SubtasksSection
              subtasks={state.subtasks}
              dispatch={dispatch}
            />
          </View>
          {state.validationErrors.title && (
            <Text
              style={[typography.caption, { color: colors.danger, marginTop: spacing.xs, marginStart: spacing.xs }]}
              testID="title-validation-error"
            >
              {state.validationErrors.title}
            </Text>
          )}
        </View>

        {/* If THIS_OCCURRENCE: hide definition-level fields */}
        {!isThisOccurrenceScope ? (
          <>
            {/* Scheduling Mode Cards (When? 2x2 Grid) */}
            <ScheduleModeCards
              state={state}
              dispatch={dispatch}
              previewResult={previewResult}
            />

            {/* Redesigned Reminder Card */}
            <View
              style={[
                styles.reminderCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={styles.reminderHeaderRow}>
                <View
                  style={[
                    styles.reminderIconBadge,
                    {
                      backgroundColor:
                        state.reminderMinutes !== null ? colors.primaryLight : colors.surfaceSecondary,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Icon
                    name="bell"
                    size={20}
                    color={state.reminderMinutes !== null ? colors.primary : colors.textSecondary}
                    decorative
                  />
                </View>
                <View style={styles.reminderHeaderTextContainer}>
                  <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                    Reminder
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                    {state.scheduleMode === 'ANYTIME_TODAY'
                      ? 'Requires a scheduled time'
                      : state.reminderMinutes !== null
                      ? state.reminderMinutes === 0
                        ? 'At time of task'
                        : `${state.reminderMinutes} minutes before`
                      : 'No notification set'}
                  </Text>
                </View>
              </View>

              {state.scheduleMode === 'ANYTIME_TODAY' ? (
                <View
                  style={[
                    styles.reminderHelperBanner,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: radii.md,
                      marginTop: spacing.sm,
                      padding: spacing.sm,
                    },
                  ]}
                >
                  <Text
                    style={[typography.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}
                    testID="anytime-reminder-helper"
                  >
                    Set a time or prayer window above to add a reminder
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexDirection: 'row', paddingTop: spacing.sm }}
                  testID="reminder-presets-row"
                >
                  {[
                    { val: null, label: 'None' },
                    { val: 0, label: 'At time' },
                    { val: 5, label: '5m' },
                    { val: 10, label: '10m' },
                    { val: 15, label: '15m' },
                    { val: 20, label: '20m' },
                    { val: 30, label: '30m' },
                    { val: 45, label: '45m' },
                    { val: 60, label: '1h' },
                    { val: 120, label: '2h' },
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
                        style={({ pressed }) => [
                          styles.reminderChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radii.pill,
                            marginEnd: spacing.xs,
                            paddingVertical: spacing.xs,
                            paddingHorizontal: spacing.md,
                            minHeight: 34,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.labelMedium,
                            {
                              color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Repeat Row Entry Card (Tapping opens add task3.png) */}
            <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Repeat
            </Text>
            <Pressable
              onPress={() => setCurrentView('REPEAT')}
              accessibilityRole="button"
              accessibilityLabel={`Repeat: ${getRecurrenceLabel(state.recurrencePreset, state.specificDays.length, state.recurrenceCalendar)}`}
              testID="repeat-entry-card"
              style={({ pressed }) => [
                styles.navEntryCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  minHeight: touchTargets.min,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.entryIconBox}>
                <Icon name="refresh" size={28} color={colors.textSecondary} decorative />
              </View>
              <View style={styles.entryContent}>
                <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {getRecurrenceLabel(state.recurrencePreset, state.specificDays.length, state.recurrenceCalendar)}
                </Text>
              </View>
              <Icon name="chevron-down" size={18} color={colors.primary} decorative />
            </Pressable>

            {/* More Options Row Entry Card (Tapping opens add task4.png) */}
            <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              More options
            </Text>
            <Pressable
              onPress={() => setCurrentView('MORE_OPTIONS')}
              accessibilityRole="button"
              accessibilityLabel="More Options"
              testID="more-options-entry-card"
              style={({ pressed }) => [
                styles.navEntryCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  minHeight: touchTargets.min,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.entryIconBox}>
                <Icon name="options" size={28} color={colors.textSecondary} decorative />
              </View>
              <View style={styles.entryContent}>
                <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                  More options
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Priority, Notes, and Subtasks
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.primary} directional decorative />
            </Pressable>

            {/* Full-width Save Task Button */}
            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save task"
              accessibilityState={{ busy: isSubmitting }}
              testID="task-form-save-button"
              style={({ pressed }) => [
                styles.saveTaskButton,
                {
                  backgroundColor: isSubmitting
                    ? colors.disabledBackground
                    : pressed
                    ? colors.primaryPressed
                    : colors.primary,
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
          </>
        ) : (
          /* THIS_OCCURRENCE: Only occurrence-level fields */
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

            {/* Save Button for occurrence override */}
            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Save task occurrence"
              accessibilityState={{ busy: isSubmitting }}
              testID="task-form-save-button"
              style={({ pressed }) => [
                styles.saveTaskButton,
                {
                  backgroundColor: isSubmitting
                    ? colors.disabledBackground
                    : pressed
                    ? colors.primaryPressed
                    : colors.primary,
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
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 }]}>
                  Save Task
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
      </SafeAreaView>

      <IconPickerModal
        visible={showIconPicker}
        selectedIconId={state.icon}
        origin={iconPickerOrigin}
        onSelectIcon={iconId => {
          dispatch({ type: 'SET_ICON', payload: iconId });
        }}
        onClose={() => setShowIconPicker(false)}
      />

      {/* Edit Scope Modal Sheet for recurring tasks */}
      <EditScopeSheet
        visible={showScopeSheet}
        onSelectScope={handleSelectScope}
        onCancel={onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleSection: {
    width: '100%',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  taskSectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unifiedTaskCard: {
    borderWidth: 1,
  },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  iconPickerButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 0,
  },
  iconEditPencilBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextInput: {
    flex: 1,
    paddingVertical: 4,
  },
  titleIconBox: {
    paddingLeft: 8,
  },
  reminderCard: {
    borderWidth: 1,
  },
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIconBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reminderHeaderTextContainer: {
    flex: 1,
  },
  reminderHelperBanner: {
    borderWidth: 0,
  },
  navEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  entryIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  saveTaskButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBanner: {
    borderWidth: 1,
  },
  overrideNotes: {
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reminderChip: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
