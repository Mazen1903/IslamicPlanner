import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CalendarScreen from '../calendar';
import * as useCalendarModule from '@/hooks/useCalendar';
import type { CalendarMonthState } from '@/services/CalendarMonthOrchestrator';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((cb) => cb()),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('@/components/today/SetupRequiredState', () => {
  const RN = jest.requireActual('react-native');
  return {
    SetupRequiredState: () => (
      <RN.View testID="setup-required-state">
        <RN.Text>Set your prayer location to begin</RN.Text>
      </RN.View>
    ),
  };
});

describe('CalendarScreen (M14)', () => {
  const readyState: CalendarMonthState = {
    status: 'READY',
    year: 2026,
    month: 9,
    selectedDate: '2026-09-15',
    currentPlanningDayKey: '2026-09-15',
    plannerLocalCivilDate: '2026-09-15',
    grid: {
      year: 2026,
      month: 9,
      rowCount: 5,
      totalCells: 35,
      cells: [
        {
          date: '2026-09-15',
          dayNumber: 15,
          hijriDayNumber: 3,
          hijriDate: { year: 1448, month: 3, day: 3 },
          isCurrentMonth: true,
          isCivilToday: true,
          isSelected: true,
          hasTasks: false,
          taskSummary: { total: 0, completed: 0, pending: 0, missed: 0 },
          accessibleLabel: 'Sep 15',
        },
      ],
      gregorianTitle: 'September 2026',
      hijriHeaderSpan: "Rabi' al-Awwal 1448",
      monthStart: '2026-09-01',
      monthEnd: '2026-09-30',
    },
    selectedDayDetail: {
      planningDayKey: '2026-09-15',
      civilDate: '2026-09-15',
      hijriFormatted: '3 Rabi al-Awwal 1448 AH',
      prayerSections: [
        { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startTime: '5:15 AM', tasks: [] },
        { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startTime: '1:05 PM', tasks: [] },
        { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startTime: '4:35 PM', tasks: [] },
        { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startTime: '7:10 PM', tasks: [] },
        { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startTime: '8:30 PM', tasks: [] },
      ],
      anytimeTasks: [],
      totalTasksCount: 0,
    },
    upcomingTasks: [],
    hasMoreUpcoming: false,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading indicator when loading with no state', async () => {
    jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue({
      visibleMonth: { year: 2026, month: 9 },
      selectedDate: '2026-09-15',
      state: null,
      loading: true,
      goToPreviousMonth: jest.fn(),
      goToNextMonth: jest.fn(),
      goToToday: jest.fn(),
      selectDate: jest.fn(),
      onCellTap: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = await render(
      <ThemeProvider>
        <CalendarScreen />
      </ThemeProvider>
    );

    expect(getByTestId('calendar-loading-state')).toBeTruthy();
  });

  it('renders SETUP_REQUIRED calm state without task lists (M14 §10)', async () => {
    const setupState: CalendarMonthState = {
      ...readyState,
      status: 'SETUP_REQUIRED',
      selectedDayDetail: null,
      upcomingTasks: [],
    };

    jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue({
      visibleMonth: { year: 2026, month: 9 },
      selectedDate: '2026-09-15',
      state: setupState,
      loading: false,
      goToPreviousMonth: jest.fn(),
      goToNextMonth: jest.fn(),
      goToToday: jest.fn(),
      selectDate: jest.fn(),
      onCellTap: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId, queryByTestId, getByText } = await render(
      <ThemeProvider>
        <CalendarScreen />
      </ThemeProvider>
    );

    // Gregorian grid & Hijri header are shown
    expect(getByTestId('calendar-header')).toBeTruthy();
    expect(getByTestId('calendar-month-grid')).toBeTruthy();

    // Setup required action shown
    expect(getByTestId('setup-required-state')).toBeTruthy();
    expect(getByText('Set your prayer location to begin')).toBeTruthy();

    // Invariant: Day detail & Upcoming sections NOT rendered
    expect(queryByTestId('day-detail-task-list')).toBeNull();
    expect(queryByTestId('upcoming-section')).toBeNull();
  });

  it('renders full calendar with grid, 5-prayer detail, and upcoming section when READY', async () => {
    jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue({
      visibleMonth: { year: 2026, month: 9 },
      selectedDate: '2026-09-15',
      state: readyState,
      loading: false,
      goToPreviousMonth: jest.fn(),
      goToNextMonth: jest.fn(),
      goToToday: jest.fn(),
      selectDate: jest.fn(),
      onCellTap: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <CalendarScreen />
      </ThemeProvider>
    );

    expect(getByTestId('calendar-header')).toBeTruthy();
    expect(getByTestId('calendar-month-grid')).toBeTruthy();
    expect(getByTestId('day-detail-task-list')).toBeTruthy();
    expect(getByTestId('upcoming-section')).toBeTruthy();
    expect(queryByTestId('setup-required-state')).toBeNull();
  });
});
