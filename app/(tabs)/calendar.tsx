import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { DayDetailTaskList } from '@/components/calendar/DayDetailTaskList';
import { UpcomingSection } from '@/components/calendar/UpcomingSection';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const {
    state,
    loading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    onCellTap,
  } = useCalendar();

  if (loading && !state) {
    return (
      <SafeAreaView
        style={[styles.container, styles.center, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
        testID="calendar-loading-state"
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!state) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      testID="calendar-screen"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.section }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation & Hijri Span Header */}
        <CalendarHeader
          gregorianTitle={state.grid.gregorianTitle}
          hijriHeaderSpan={state.grid.hijriHeaderSpan}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onTodayPress={goToToday}
        />

        {/* 4/5/6 Row Sunday-First Grid */}
        <CalendarMonthGrid
          grid={state.grid}
          onCellTap={onCellTap}
        />

        {/* Conditional Content: SETUP_REQUIRED vs. Task Detail */}
        {state.status === 'SETUP_REQUIRED' ? (
          <View style={[styles.setupContainer, { marginTop: spacing.lg }]}>
            <SetupRequiredState />
          </View>
        ) : (
          <>
            {/* Selected Day 5-Prayer & Secondary Anytime Detail */}
            <DayDetailTaskList
              selectedDayDetail={state.selectedDayDetail}
            />

            {/* Upcoming This Month Section */}
            <UpcomingSection
              upcomingTasks={state.upcomingTasks}
              hasMoreUpcoming={state.hasMoreUpcoming}
            />
          </>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  setupContainer: {
    width: '100%',
  },
});
