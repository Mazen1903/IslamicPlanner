import { renderHook, act } from '@testing-library/react-native';
import { useCalendar } from '../useCalendar';
import type { CalendarMonthOrchestrator, CalendarMonthState } from '@/services/CalendarMonthOrchestrator';
import type { CalendarDayCellModel } from '@/domain/calendar/calendarGrid';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

describe('useCalendar Hook (M14)', () => {
  let mockOrchestrator: jest.Mocked<CalendarMonthOrchestrator>;

  const mockState: CalendarMonthState = {
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
      cells: [],
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

  beforeEach(() => {
    mockOrchestrator = {
      loadMonth: jest.fn().mockResolvedValue(mockState),
    } as any;
  });

  it('initializes with civil date and loads current month (M14 §7)', async () => {
    const { result } = await renderHook(() =>
      useCalendar({
        orchestrator: mockOrchestrator,
        initialYear: 2026,
        initialMonth: 9,
        initialSelectedDate: '2026-09-15',
      })
    );

    expect(result.current.visibleMonth).toEqual({ year: 2026, month: 9 });
    expect(result.current.selectedDate).toBe('2026-09-15');

    // Wait for initial load to resolve
    await act(async () => {});

    expect(mockOrchestrator.loadMonth).toHaveBeenCalledWith(2026, 9, '2026-09-15');
    expect(result.current.state).toEqual(mockState);
    expect(result.current.loading).toBe(false);
  });

  it('navigates to previous and next months', async () => {
    const { result } = await renderHook(() =>
      useCalendar({
        orchestrator: mockOrchestrator,
        initialYear: 2026,
        initialMonth: 9,
        initialSelectedDate: '2026-09-15',
      })
    );

    await act(async () => {});

    // Previous month (August 2026)
    await act(async () => {
      result.current.goToPreviousMonth();
    });
    expect(mockOrchestrator.loadMonth).toHaveBeenCalledWith(2026, 8, undefined);

    // Next month (October 2026 from August 2026)
    await act(async () => {
      result.current.goToNextMonth();
    });
    expect(mockOrchestrator.loadMonth).toHaveBeenCalledWith(2026, 10, undefined);
  });

  it('cell tap on in-month date selects date without changing month (M14 §8)', async () => {
    const { result } = await renderHook(() =>
      useCalendar({
        orchestrator: mockOrchestrator,
        initialYear: 2026,
        initialMonth: 9,
        initialSelectedDate: '2026-09-15',
      })
    );
    await act(async () => {});

    const inMonthCell: CalendarDayCellModel = {
      date: '2026-09-22',
      dayNumber: 22,
      hijriDayNumber: 10,
      hijriDate: { year: 1448, month: 3, day: 10 },
      isCurrentMonth: true,
      isCivilToday: false,
      isSelected: false,
      hasTasks: false,
      taskSummary: { total: 0, completed: 0, pending: 0, missed: 0 },
      accessibleLabel: 'Tuesday, Sep 22',
    };

    await act(async () => {
      result.current.onCellTap(inMonthCell);
    });

    expect(mockOrchestrator.loadMonth).toHaveBeenCalledWith(2026, 9, '2026-09-22');
  });

  it('filler cell tap navigates visibleMonth to target month and selects date (M14 §8)', async () => {
    const { result } = await renderHook(() =>
      useCalendar({
        orchestrator: mockOrchestrator,
        initialYear: 2026,
        initialMonth: 9,
        initialSelectedDate: '2026-09-15',
      })
    );
    await act(async () => {});

    // August 30 leading filler cell
    const fillerCell: CalendarDayCellModel = {
      date: '2026-08-30',
      dayNumber: 30,
      hijriDayNumber: 16,
      hijriDate: { year: 1448, month: 2, day: 16 },
      isCurrentMonth: false,
      isCivilToday: false,
      isSelected: false,
      hasTasks: false,
      taskSummary: { total: 0, completed: 0, pending: 0, missed: 0 },
      accessibleLabel: 'Sunday, Aug 30',
    };

    await act(async () => {
      result.current.onCellTap(fillerCell);
    });

    // Invariant (M14 §8): must navigate visibleMonth to August 2026, select 2026-08-30, and load August
    expect(mockOrchestrator.loadMonth).toHaveBeenCalledWith(2026, 8, '2026-08-30');
  });
});
