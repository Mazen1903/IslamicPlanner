import React, { useReducer, useState, useRef, useEffect, useMemo } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { TaskDetailsCard } from './TaskDetailsCard';
import { SubtasksSection } from './SubtasksSection';
import { EditScopeSheet } from './EditScopeSheet';
import { SuccessScreen } from './SuccessScreen';
import { PartialSuccessView } from './PartialSuccessView';
import { IconPickerModal, type IconPickerOrigin } from './IconPickerModal';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { detectTaskIcon } from '@/constants/taskIcons';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ReminderSubView, ReminderStyleSubView } from './reminder';
import { useToastStore } from '@/stores/useToastStore';
import type { Prayer } from '@/constants/prayers';

export type FormView = 'MAIN' | 'RELATIVE_PRAYER' | 'REMINDER' | 'REMINDER_STYLE';

export interface TaskFormSuccessInfo {
  definitionId?: string;
  seriesId?: string;
  targetPrayer?: Prayer;
  isSyncIncomplete?: boolean;
}

export interface TaskFormScreenProps {
  initialDefinition?: TaskDefinition;
  initialOccurrence?: TaskOccurrence;
  initialCivilSeedDate?: string;
  initialPlanningDayDate?: string;
  initialPrayerTab?: 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';
  initialScope?: EditScope;
  initialTitle?: string;
  inputProvider?: TodayTemporalInputProvider;
  orchestrator?: TaskFormOrchestrator;
  onSuccess: (info?: TaskFormSuccessInfo) => void;
  onCancel: () => void;
  onSaved?: () => void | Promise<void>;
}

const defaultInputProvider = new LocationAwareTodayTemporalInputProvider();

export function TaskFormScreen({
  initialDefinition,
  initialOccurrence,
  initialCivilSeedDate,
  initialPlanningDayDate,
  initialPrayerTab,
  initialScope,
  initialTitle,
  inputProvider = defaultInputProvider,
  orchestrator = taskFormOrchestrator,
  onSuccess,
  onCancel,
  onSaved,
}: TaskFormScreenProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  const isEdit = Boolean(initialDefinition);
  const isRecurringSeries = Boolean(
    initialDefinition?.recurrenceRule || initialDefinition?.hijriRecurrence
  );

  // Fix #1: Reset orchestrator stale state on mount so each form session starts fresh
  useEffect(() => {
    orchestrator.resetFlight();
    return () => {
      orchestrator.resetFlight();
    };
  }, [orchestrator]);

  // Sub-view navigation state
  const [currentView, setCurrentView] = useState<FormView>('MAIN');

  // Scope selection sheet state for recurring task edits - do not block on mount
  const [showScopeSheet, setShowScopeSheet] = useState(false);
  // Track whether scope was selected (defaults to true so form is immediately accessible)
  const [scopeSelected, setScopeSelected] = useState(true);
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
  const { settings } = useUserSettings();
  const defaultReminderMinutes = (settings as any)?.defaultReminderMinutes ?? null;
  const parsedReminderDefaults = useMemo(() => {
    try {
      if (settings?.reminderDefaults) {
        return JSON.parse(settings.reminderDefaults);
      }
    } catch {
      // fallback
    }
    return null;
  }, [settings?.reminderDefaults]);

  // Form State via useReducer
  const [state, dispatch] = useReducer(
    formReducer,
    {
      civilSeedDate: initialCivilSeedDate || defaultDate,
      planningDayDate: initialPlanningDayDate || defaultDate,
      launchPrayer: initialPrayerTab,
      initialDefinition,
      initialOccurrence,
      editScope: initialScope ?? (isRecurringSeries ? 'ALL_OCCURRENCES' : undefined),
      defaultReminderMinutes: parsedReminderDefaults?.offsetMinutes ?? defaultReminderMinutes,
      defaultReminderType: parsedReminderDefaults?.reminderType,
      defaultSoundId: parsedReminderDefaults?.soundId,
      defaultBackgroundId: parsedReminderDefaults?.backgroundId,
      initialTitle,
    },
    createInitialFormState
  );

  // Sync default reminder if user settings load after initial mount
  useEffect(() => {
    const defReminder = (settings as any)?.defaultReminderMinutes;
    if (
      defReminder !== undefined &&
      defReminder !== null &&
      state.mode === 'CREATE' &&
      !state.isDirty &&
      state.reminders.length === 0
    ) {
      dispatch({ type: 'PREFILL_DEFAULT_REMINDER', payload: defReminder });
    }
  }, [settings, state.mode, state.isDirty, state.reminders.length]);

  // Synchronous presentation-layer mutex latch
  const submitInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // Subtasks expansion state inside unified Task card
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(
    () => Boolean(state.subtasks && state.subtasks.length > 0)
  );

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
    setScopeSelected(true);
    setShowScopeSheet(false);
  };

  // Fix #12/#14: Dismissing scope sheet without selecting should not exit form
  const handleDismissScopeSheet = () => {
    if (scopeSelected) {
      setShowScopeSheet(false);
    } else {
      // User hasn't chosen a scope yet — navigate back since we can't proceed
      onCancel();
    }
  };

  // Handle Cancel / Back directly without discard changes alert
  const handleBackPress = () => {
    onCancel();
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
      if (result.status === 'SAVED_AND_SYNCED' || result.status === 'SAVED_SYNC_INCOMPLETE') {
        onSaved?.();

        let targetPrayer: Prayer | undefined;
        if (state.scheduleMode === 'PRAYER_RELATIVE') {
          targetPrayer = state.relativeDraft.prayer;
        } else if (state.scheduleMode === 'PRAYER_WINDOW') {
          targetPrayer = state.windowDraft.startPrayer;
        } else if (initialPrayerTab) {
          targetPrayer = initialPrayerTab;
        }

        if (result.status === 'SAVED_SYNC_INCOMPLETE') {
          useToastStore.getState().showToast({
            message: 'Sync incomplete',
            action: {
              label: 'Retry',
              onPress: () => {
                orchestrator.retrySync().catch(console.warn);
              },
            },
          });
        }

        onSuccess({
          definitionId: result.definitionId,
          seriesId: result.seriesId,
          targetPrayer,
          isSyncIncomplete: result.status === 'SAVED_SYNC_INCOMPLETE',
        });
        return;
      }
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
        scheduleSummary={previewResult?.primaryLabel ?? (state.scheduleMode ?? '')}
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
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
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
      </View>
    );
  }

  // Sub-view 3: Reminder settings screen (media_1791325705295.png)
  if (currentView === 'REMINDER') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="task-form-screen"
      >
        <ReminderSubView
          taskTitle={state.title}
          scheduleMode={state.scheduleMode}
          reminderEnabled={state.reminderEnabled}
          reminders={state.reminders}
          prayerAnchors={state.reminderPrayerAnchors}
          reminderTimeOfDay={state.reminderTimeOfDay}
          reminderType={state.reminderType}
          enhancedMode={state.reminderEnhancedMode}
          soundId={state.reminderSoundId}
          customSoundUri={state.reminderCustomSoundUri}
          playbackCount={state.reminderPlaybackCount}
          backgroundId={state.reminderBackgroundId}
          timeSensitive={state.reminderTimeSensitive}
          nag={state.reminderNag}
          onToggleEnabled={val => dispatch({ type: 'SET_REMINDER_ENABLED', payload: val })}
          onAddReminder={offset => dispatch({ type: 'ADD_REMINDER', payload: offset })}
          onRemoveReminder={offset => dispatch({ type: 'REMOVE_REMINDER', payload: offset })}
          onAddPrayerAnchor={anchor => dispatch({ type: 'ADD_REMINDER_PRAYER_ANCHOR', payload: anchor })}
          onRemovePrayerAnchor={anchor => dispatch({ type: 'REMOVE_REMINDER_PRAYER_ANCHOR', payload: anchor })}
          onSetTimeOfDay={timeStr => dispatch({ type: 'SET_REMINDER_TIME_OF_DAY', payload: timeStr })}
          onSetReminderType={type => dispatch({ type: 'SET_REMINDER_TYPE', payload: type })}
          onSetEnhancedMode={mode => dispatch({ type: 'SET_ENHANCED_MODE', payload: mode })}
          onSetSoundId={(soundId, customUri) =>
            dispatch({ type: 'SET_REMINDER_SOUND', payload: { soundId, customSoundUri: customUri } })
          }
          onSetTimeSensitive={val => dispatch({ type: 'SET_REMINDER_TIME_SENSITIVE', payload: val })}
          onSetNag={val => dispatch({ type: 'SET_REMINDER_NAG', payload: val })}
          onOpenAlarmStyle={() => setCurrentView('REMINDER_STYLE')}
          onBack={() => setCurrentView('MAIN')}
        />
      </SafeAreaView>
    );
  }

  // Sub-view 4: Reminder alarm style customization screen (media_1791325706165.png)
  if (currentView === 'REMINDER_STYLE') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="task-form-screen"
      >
        <ReminderStyleSubView
          taskTitle={state.title}
          backgroundId={state.reminderBackgroundId}
          soundId={state.reminderSoundId}
          playbackCount={state.reminderPlaybackCount}
          onUpdateBackgroundId={bgId => dispatch({ type: 'SET_REMINDER_BACKGROUND', payload: bgId })}
          onUpdateSoundId={soundId =>
            dispatch({
              type: 'SET_REMINDER_SOUND',
              payload: { soundId, customSoundUri: state.reminderCustomSoundUri },
            })
          }
          onUpdatePlaybackCount={count => dispatch({ type: 'SET_REMINDER_PLAYBACK_COUNT', payload: count })}
          onBack={() => setCurrentView('REMINDER')}
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
      {/* Mosque Skyline Header Banner */}
      <TaskHeaderBanner
        title={isEdit ? 'Edit Task' : 'Add Task'}
        subtitle="Turn your plans into progress"
        onBack={handleBackPress}
        backTestID="task-form-back-button"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            padding: spacing.lg,
            paddingBottom: Math.max(insets?.bottom ?? 0, spacing.xl) + 40,
          },
        ]}
      >
        {/* Unified Task & Subtasks Section */}
        <View style={[styles.titleSection, { marginBottom: spacing.md }]}>
          <View style={styles.taskSectionHeadingRow}>
            <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
              Task
            </Text>
            {state.subtasks.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.primaryLight,
                  borderRadius: radii.pill,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={[typography.labelMedium, { color: colors.primaryDark, fontWeight: '700' }]}
                  testID="task-subtasks-count-badge"
                >
                  {`${state.subtasks.length} subtask${state.subtasks.length === 1 ? '' : 's'}`}
                </Text>
              </View>
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
            <View style={[styles.titleInputRow, { padding: spacing.sm }]}>
              <Pressable
                ref={iconPickerButtonRef as any}
                onPress={handleOpenIconPicker}
                accessibilityRole="button"
                accessibilityLabel="Choose task icon"
                testID="task-icon-picker-button"
                style={[
                  styles.iconPickerButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 14,
                    marginEnd: spacing.sm,
                  },
                ]}
              >
                <TaskCategoryIcon iconId={state.icon || detectTaskIcon(state.title)} size={36} />
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
                    fontSize: 17,
                    fontWeight: '600',
                  },
                ]}
              />
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.border, marginStart: 56 }]} />

            {isSubtasksExpanded || state.subtasks.length > 0 ? (
              <SubtasksSection
                subtasks={state.subtasks}
                dispatch={dispatch}
                hideDivider={true}
              />
            ) : (
              <Pressable
                onPress={() => setIsSubtasksExpanded(true)}
                accessibilityRole="button"
                accessibilityLabel="Add checklist item"
                testID="expand-add-subtask-button"
                style={({ pressed }) => [
                  styles.addSubtaskRowButton,
                  {
                    opacity: pressed ? 0.7 : 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 10,
                  },
                ]}
              >
                <View
                  style={[
                    styles.addSubtaskPlusCircle,
                    {
                      backgroundColor: colors.primaryLight,
                      marginEnd: spacing.sm,
                    },
                  ]}
                >
                  <Icon name="plus" size={14} color={colors.primary} decorative />
                </View>
                <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '600', fontSize: 15 }]}>
                  Add checklist item
                </Text>
              </Pressable>
            )}
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

            {/* Unified Details Card (Reminder, Repeat, Priority, Track Streak, Notes) */}
            <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.md, marginBottom: 8 }]}>
              Details
            </Text>
            <TaskDetailsCard
              state={state}
              dispatch={dispatch}
              onOpenReminderSettings={() => setCurrentView('REMINDER')}
            />

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
        onCancel={handleDismissScopeSheet}
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
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  addSubtaskRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  addSubtaskPlusCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  iconPickerButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 0,
  },
  iconEditPencilBadge: {
    position: 'absolute',
    bottom: -1,
    end: -1,
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
    paddingStart: 8,
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
});
