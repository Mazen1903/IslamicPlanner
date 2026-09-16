import React from 'react';
import { StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useToday } from '@/hooks/useToday';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';
import { PrayerHeader } from '@/components/prayer/PrayerHeader';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import { PrayerTransitionBanner } from '@/components/prayer/PrayerTransitionBanner';
import { TaskList } from '@/components/task/TaskList';

export default function TodayScreen() {
  const { colors, spacing, typography, radii, touchTargets } = useTheme();
  const {
    viewModel,
    status,
    error,
    selectedPrayer,
    setSelectedPrayer,
    prayerTransition,
    dismissPrayerTransition,
    viewTransitionPrayer,
    completedCollapsed,
    toggleCompletedCollapsed,
    anytimeCollapsed,
    toggleAnytimeCollapsed,
    countdownDisplay,
    completeTask,
    refresh,
  } = useToday();

  if (status === 'setup_required') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <SetupRequiredState />
      </SafeAreaView>
    );
  }

  if (status === 'loading' && !viewModel) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="today-loading-state"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' && !viewModel) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}
        edges={['top', 'left', 'right']}
        testID="today-error-state"
      >
        <Text style={[typography.headlineMedium, { color: colors.danger, marginBottom: spacing.sm }]}>
          Unable to load Today
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
          {error ?? 'An unexpected error occurred while loading your schedule.'}
        </Text>
        <Pressable
          onPress={refresh}
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
          accessibilityLabel="Retry loading Today schedule"
        >
          <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!viewModel) {
    return null;
  }

  const activePrayer = selectedPrayer ?? viewModel.currentPrayer;
  const currentTab =
    viewModel.tabs.find(tab => tab.prayer === activePrayer) ?? viewModel.tabs[0];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="today-screen"
    >
      {/* 1. Prominent Islamic Current Prayer Header with countdown */}
      <PrayerHeader
        currentPrayer={viewModel.currentPrayer}
        nextPrayer={viewModel.nextPrayer}
        countdownDisplay={countdownDisplay}
      />

      {/* 2. Prayer transition banner (if mid-session prayer changed) */}
      {prayerTransition && (
        <PrayerTransitionBanner
          transition={prayerTransition}
          onViewPress={viewTransitionPrayer}
          onDismissPress={dismissPrayerTransition}
        />
      )}

      {/* 3. Exactly 5 Prayer Tabs */}
      <PrayerTabBar
        tabs={viewModel.tabs}
        selectedPrayer={activePrayer}
        onSelectPrayer={setSelectedPrayer}
      />

      {/* 4. Task list for the selected prayer tab */}
      {currentTab && (
        <TaskList
          tab={currentTab}
          selectedPrayer={activePrayer}
          currentPrayer={viewModel.currentPrayer}
          nextPrayer={viewModel.nextPrayer?.prayer ?? null}
          completedCollapsed={completedCollapsed[activePrayer] ?? true}
          anytimeCollapsed={anytimeCollapsed}
          onToggleCompletedCollapsed={() => toggleCompletedCollapsed(activePrayer)}
          onToggleAnytimeCollapsed={toggleAnytimeCollapsed}
          onCompleteTask={completeTask}
        />
      )}
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
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
