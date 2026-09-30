import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import { useToday } from '@/hooks/useToday';
import { useLocation } from '@/hooks/useLocation';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';
import { PrayerHeader } from '@/components/prayer/PrayerHeader';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import { PrayerTransitionBanner } from '@/components/prayer/PrayerTransitionBanner';
import { TaskList } from '@/components/task/TaskList';
import { getTodayDateSubtitle } from '@/utils/todayDateSubtitle';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

export default function TodayScreen() {
  const { colors, spacing, typography, radii, touchTargets, activeIslamicTheme, shadows } = useTheme();
  const router = useRouter();
  const { settings } = useUserSettings();
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
    toggleSubtask,
    refresh,
  } = useToday();

  const { locationName } = useLocation();

  // Use a ref to hold the latest refresh so the useFocusEffect callback is stable.
  // Without this, [refresh] as a dep recreates the callback every render, triggering
  // useFocusEffect → refresh → setState → re-render → useFocusEffect → ∞ loop.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  const isFirstFocusRef = useRef(true);

  // Refresh schedule whenever user navigates back to Today tab (skips initial mount handled by useToday)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      refreshRef.current();
    }, []) // stable — never changes
  );

  const handleSelectPrayer = (prayer: Prayer) => {
    setSelectedPrayer(prayer);
  };

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
        <Text
          accessibilityLiveRegion="assertive"
          style={[typography.headlineMedium, { color: colors.danger, marginBottom: spacing.sm }]}
        >
          Unable to load Today
        </Text>
        <Text
          accessibilityLiveRegion="assertive"
          style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}
        >
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

  const dateSubtitle = getTodayDateSubtitle();

  const handlePressLocation = () => {
    router.push('/(tabs)/settings/prayer-calculation');
  };

  const handleAddTask = (prayer?: Prayer) => {
    useAddTaskModalStore.getState().openModal(undefined, prayer ?? activePrayer);
  };

  return (
    <View style={styles.container} testID="today-screen">
      {activeIslamicTheme?.wallpaperAsset && (
        <Image
          source={activeIslamicTheme.wallpaperAsset}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <SafeAreaView
        style={[
          styles.container,
          !activeIslamicTheme?.wallpaperAsset && { backgroundColor: colors.background },
        ]}
        edges={['top', 'left', 'right']}
      >
        {/* 1. Header with Screen Title, Dynamic Gregorian & Hijri Date Subtitle, Location, and Mosque Skyline */}
        <PrayerHeader
          currentPrayer={viewModel.currentPrayer}
          nextPrayer={viewModel.nextPrayer}
          countdownDisplay={countdownDisplay}
          locationName={locationName ?? 'Current Location'}
          dateSubtitle={dateSubtitle}
          onPressLocation={handlePressLocation}
        />

        {/* 2. Prayer transition banner (if mid-session prayer changed) */}
        {prayerTransition && (
          <PrayerTransitionBanner
            transition={prayerTransition}
            onViewPress={viewTransitionPrayer}
            onDismissPress={dismissPrayerTransition}
          />
        )}

        {/* 3. Exactly 5 Prayer Capsules with vector icons and integrated time */}
        <View style={styles.tabBarWrapper}>
          <PrayerTabBar
            tabs={viewModel.tabs}
            selectedPrayer={activePrayer}
            onSelectPrayer={handleSelectPrayer}
          />
        </View>

        {/* 4. Task list for the selected prayer tab with Anytime Today */}
        {currentTab && (
          <View style={styles.taskListWrapper}>
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
              onToggleSubtask={toggleSubtask}
              onAddTask={handleAddTask}
              completedTasksMode={(settings?.completedTasksMode as any) ?? 'KEEP'}
              overdueTasksMode={(settings?.overdueTasksMode as any) ?? 'KEEP'}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarWrapper: {
    zIndex: 2,
  },
  taskListWrapper: {
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
