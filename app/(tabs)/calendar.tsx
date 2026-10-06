import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { DayDetailTaskList } from '@/components/calendar/DayDetailTaskList';
import { UpcomingSection } from '@/components/calendar/UpcomingSection';
import { MonthYearPickerSheet } from '@/components/calendar/MonthYearPickerSheet';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const {
    state,
    loading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToMonthYear,
    onCellTap,
  } = useCalendar();

  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Horizontal swipe gesture tracking on calendar grid
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.nativeEvent.pageX - touchStartX.current;
    const dy = e.nativeEvent.pageY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Minimum swipe threshold 50px, predominantly horizontal
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        // Swipe left -> next month
        goToNextMonth();
      } else {
        // Swipe right -> previous month
        goToPreviousMonth();
      }
    }
  };

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
          onTitlePress={() => setShowMonthYearPicker(true)}
        />

        {/* 4/5/6 Row Sunday-First Grid with Swipe Gestures */}
        <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} testID="calendar-grid-swipe-wrapper">
          <CalendarMonthGrid
            grid={state.grid}
            onCellTap={onCellTap}
          />
        </View>

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

            {/* Upcoming This Month Section with Interleaved Occasions */}
            <UpcomingSection
              upcomingTasks={state.upcomingTasks}
              upcomingOccasions={state.upcomingOccasions}
              hasMoreUpcoming={state.hasMoreUpcoming}
            />
          </>
        )}
      </ScrollView>

      {/* Month/Year Quick Jump Sheet */}
      <MonthYearPickerSheet
        visible={showMonthYearPicker}
        currentYear={state.year}
        currentMonth={state.month}
        onSelect={(y, m) => goToMonthYear(y, m)}
        onClose={() => setShowMonthYearPicker(false)}
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
