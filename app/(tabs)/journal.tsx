import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useJournal } from '@/hooks/useJournal';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';
import {
  JournalHeader,
  JournalEditor,
  type JournalEditorRef,
  MoodCard,
  PromptDeck,
  ReflectionSection,
  JournalHistory,
  JournalLockedState,
  JournalPrivacySheet,
  JournalDeleteDialog,
  UnreadableEntryCard,
} from '@/components/journal';
import { Icon } from '@/components/common/Icon';

export default function JournalScreen() {
  const { colors, spacing, typography, touchTargets, radii, isDark } = useTheme();
  const editorRef = useRef<JournalEditorRef>(null);

  const {
    mode,
    isHistorical,
    gregorianDisplay,
    hijriDisplay,
    draftPayload,
    saveState,
    lockEnabled,
    lockErrorMessage,
    historyEntries,
    showDeleteDialog,
    showPrivacySheet,
    isDeleting,
    isTogglingLock,
    hasDayRolledOver,
    loadError,
    hijriAdjustment,
    streak,
    activePlanningDayKey,
    pinnedPlanningDayKey,
    onBodyChange,
    onMoodChange,
    onReflectionChange,
    onHistoryOpen,
    onSelectHistoryEntry,
    onReturnToToday,
    onDeletePress,
    onDeleteConfirm,
    onDeleteCancel,
    onUnlockPress,
    onPrivacySheetOpen,
    onPrivacySheetClose,
    onToggleLock,
    onRetryLoad,
    onResetCorruptedEntry,
  } = useJournal();

  // Prompt CTA handler: appends quoted prompt to body without overwriting and opens Focus Mode
  const handleWriteAboutPrompt = (promptText: string) => {
    const quoted = `"${promptText}"`;
    const trimmedBody = draftPayload.body.trim();
    const nextBody =
      trimmedBody.length === 0
        ? `${quoted}\n\n`
        : `${draftPayload.body.replace(/\s+$/, '')}\n\n${quoted}\n\n`;

    onBodyChange(nextBody);
    editorRef.current?.openFocusMode();
  };

  // Whether the current entry has any user content (used to conditionally show Delete Entry)
  const hasContent = Boolean(
    draftPayload.body.trim().length > 0 ||
      draftPayload.mood ||
      Object.values(draftPayload.reflections).some(
        (val) => typeof val === 'string' && val.trim().length > 0
      )
  );

  // 1. Setup Required
  if (mode === 'SETUP_REQUIRED') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="journal-setup-required"
      >
        <SetupRequiredState />
      </SafeAreaView>
    );
  }

  // 2. Locked State
  if (mode === 'LOCKED' || mode === 'UNLOCKING') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="journal-screen-locked"
      >
        <JournalHeader
          gregorianDisplay={gregorianDisplay}
          hijriDisplay={hijriDisplay}
        />
        <JournalLockedState
          onUnlockPress={onUnlockPress}
          isUnlocking={mode === 'UNLOCKING'}
          errorMessage={lockErrorMessage}
        />
      </SafeAreaView>
    );
  }

  // 3. Loading
  if (mode === 'BOOTSTRAPPING' || mode === 'LOADING_ENTRY') {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="journal-loading-state"
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.md }]}>
          Loading your journal...
        </Text>
      </SafeAreaView>
    );
  }

  // 4. Load Error
  if (mode === 'LOAD_ERROR') {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}
        edges={['top', 'left', 'right']}
        testID="journal-error-state"
      >
        <Text
          accessibilityLiveRegion="assertive"
          style={[typography.headlineMedium, { color: colors.danger, marginBottom: spacing.sm }]}
        >
          Unable to load Journal
        </Text>
        <Text
          accessibilityLiveRegion="assertive"
          style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}
        >
          {loadError ?? 'An unexpected error occurred while decrypting your journal entry.'}
        </Text>
        <Pressable
          onPress={onRetryLoad}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              borderRadius: radii.pill,
              minHeight: touchTargets.min,
              paddingHorizontal: spacing.xl,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retry loading journal entry"
          testID="journal-retry-btn"
        >
          <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // 4b. Unreadable Entry (corrupted or lost key for a specific entry)
  if (mode === 'UNREADABLE_ENTRY') {
    return (
      <UnreadableEntryCard
        dayKey={activePlanningDayKey ?? pinnedPlanningDayKey ?? ''}
        errorMessage={loadError}
        onResetEntry={onResetCorruptedEntry}
        onOpenHistory={onHistoryOpen}
        onRetry={onRetryLoad}
      />
    );
  }

  // 5. History View
  if (mode === 'HISTORY') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="journal-screen-history"
      >
        <JournalHistory
          entries={historyEntries}
          selectedPlanningDayKey={activePlanningDayKey}
          activePlanningDayKey={pinnedPlanningDayKey ?? activePlanningDayKey}
          hijriAdjustment={hijriAdjustment}
          onSelectEntry={onSelectHistoryEntry}
          onBackToToday={onReturnToToday}
        />
      </SafeAreaView>
    );
  }

  const dayKeyForPrompt = activePlanningDayKey ?? pinnedPlanningDayKey ?? undefined;

  // 6. Ready / Editor View
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="journal-screen-ready"
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.section }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Header */}
          <JournalHeader
            gregorianDisplay={gregorianDisplay}
            hijriDisplay={hijriDisplay}
            saveState={saveState}
            isHistorical={isHistorical}
            lockEnabled={lockEnabled}
            streak={streak}
            onHistoryPress={onHistoryOpen}
            onPrivacyPress={onPrivacySheetOpen}
            onReturnToTodayPress={onReturnToToday}
          />

          {/* Planning day boundary rollover notice */}
          {hasDayRolledOver && !isHistorical && (
            <View
              style={[
                styles.rolloverBanner,
                {
                  backgroundColor: isDark ? 'rgba(15, 159, 74, 0.2)' : colors.primaryLight,
                  borderColor: colors.primary,
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.xs,
                  marginTop: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radii.md,
                },
              ]}
              testID="journal-rollover-notice"
            >
              <View style={styles.rolloverContent}>
                <Text style={[typography.bodySmall, { color: colors.primaryDark, flex: 1 }]}>
                  A new planning day has started.
                </Text>
                <Pressable
                  onPress={onReturnToToday}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to new planning day entry"
                  style={styles.rolloverButton}
                  testID="journal-switch-new-day-btn"
                >
                  <Text style={[typography.labelSmall, { color: colors.primary }]}>
                    Open Today
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* 2. Mood Card */}
          <MoodCard
            selectedMood={draftPayload.mood}
            onSelectMood={onMoodChange}
          />

          {/* 3. Daily Reflection Prompt (Hidden for historical entries) */}
          {!isHistorical && dayKeyForPrompt && (
            <PromptDeck
              dayKey={dayKeyForPrompt}
              onSelectPrompt={handleWriteAboutPrompt}
            />
          )}

          {/* 4. Today's Entry / Editor */}
          <JournalEditor
            ref={editorRef}
            value={draftPayload.body}
            onChangeText={onBodyChange}
            gregorianDisplay={gregorianDisplay}
            hijriDisplay={hijriDisplay}
            saveState={saveState}
          />

          {/* 5. Daily Muhasaba / Reflections */}
          <ReflectionSection
            reflections={draftPayload.reflections}
            onChangeReflection={onReflectionChange}
            initialExpanded={true}
          />

          {/* 6. Delete Action (Visible only when hasContent) */}
          {hasContent && (
            <View style={[styles.deleteContainer, { marginTop: spacing.xl, paddingHorizontal: spacing.lg }]}>
              <Pressable
                onPress={onDeletePress}
                accessibilityRole="button"
                accessibilityLabel="Delete journal entry"
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    opacity: pressed ? 0.7 : 1,
                    minHeight: touchTargets.min,
                  },
                ]}
                testID="journal-delete-btn"
              >
                <Icon name="trash" size={16} color={colors.textTertiary} decorative />
                <Text style={[typography.labelSmall, { color: colors.textTertiary, marginStart: spacing.xs }]}>
                  Delete Entry
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy / Lock Sheet */}
      <JournalPrivacySheet
        visible={showPrivacySheet}
        lockEnabled={lockEnabled}
        onToggleLock={onToggleLock}
        onClose={onPrivacySheetClose}
        isLoading={isTogglingLock}
        errorMessage={lockErrorMessage}
      />

      {/* Delete Confirmation Dialog */}
      <JournalDeleteDialog
        visible={showDeleteDialog}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
        isDeleting={isDeleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolloverBanner: {
    borderWidth: 1,
  },
  rolloverContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rolloverButton: {
    marginStart: 12,
  },
  deleteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
