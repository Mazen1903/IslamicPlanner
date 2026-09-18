import React from 'react';
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
  ReflectionSection,
  JournalHistory,
  JournalLockedState,
  JournalPrivacySheet,
  JournalDeleteDialog,
} from '@/components/journal';
import { Icon } from '@/components/common/Icon';

export default function JournalScreen() {
  const { colors, spacing, typography, touchTargets, radii } = useTheme();
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
    onBodyChange,
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
  } = useJournal();

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
          saveState="idle"
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
        <Text style={[typography.headlineMedium, { color: colors.danger, marginBottom: spacing.sm }]}>
          Unable to load Journal
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
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
          hijriAdjustment={hijriAdjustment}
          onSelectEntry={onSelectHistoryEntry}
          onBackToToday={onReturnToToday}
        />
      </SafeAreaView>
    );
  }

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
          {/* Header */}
          <JournalHeader
            gregorianDisplay={gregorianDisplay}
            hijriDisplay={hijriDisplay}
            saveState={saveState}
            isHistorical={isHistorical}
            lockEnabled={lockEnabled}
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
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.md,
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
                  <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                    Open Today
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Main Editor */}
          <JournalEditor
            value={draftPayload.body}
            onChangeText={onBodyChange}
          />

          {/* Reflections */}
          <ReflectionSection
            reflections={draftPayload.reflections}
            onChangeReflection={onReflectionChange}
          />

          {/* Delete Action (Explicit confirmed delete) */}
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
              <Icon name="trash" size={16} color={colors.textTertiary} />
              <Text style={[typography.labelSmall, { color: colors.textTertiary, marginLeft: spacing.xs }]}>
                Delete Entry
              </Text>
            </Pressable>
          </View>
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
    marginLeft: 12,
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
