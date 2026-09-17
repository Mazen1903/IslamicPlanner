import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { DateTime } from 'luxon';
import {
  CalendarMonthOrchestrator,
  calendarMonthOrchestrator as defaultOrchestrator,
  type CalendarMonthState,
} from '@/services/CalendarMonthOrchestrator';
import type { CalendarDayCellModel } from '@/domain/calendar/calendarGrid';
import { useAppForeground } from './useAppForeground';

export interface UseCalendarOptions {
  orchestrator?: CalendarMonthOrchestrator;
  initialYear?: number;
  initialMonth?: number;
  initialSelectedDate?: string;
}

export function useCalendar(options: UseCalendarOptions = {}) {
  const orchestrator = options.orchestrator ?? defaultOrchestrator;
  const orchRef = useRef(orchestrator);

  // Initial state derived from local civil date (M14 §7)
  const now = DateTime.now();
  const initYear = options.initialYear ?? now.year;
  const initMonth = options.initialMonth ?? now.month;
  const initDate = options.initialSelectedDate ?? now.toISODate()!;

  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>({
    year: initYear,
    month: initMonth,
  });
  const [selectedDate, setSelectedDate] = useState<string>(initDate);
  const [state, setState] = useState<CalendarMonthState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Keep refs for callbacks to avoid re-subscription churn
  const visibleMonthRef = useRef(visibleMonth);
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    orchRef.current = orchestrator;
    visibleMonthRef.current = visibleMonth;
    selectedDateRef.current = selectedDate;
  }, [orchestrator, visibleMonth, selectedDate]);

  const loadData = useCallback(
    async (year: number, month: number, targetDate?: string) => {
      setLoading(true);
      try {
        const result = await orchRef.current.loadMonth(year, month, targetDate);
        setState(result);
        setVisibleMonth({ year: result.year, month: result.month });
        setSelectedDate(result.selectedDate);
      } catch (err: any) {
        // Fallback error state
        setState(prev =>
          prev
            ? {
                ...prev,
                status: 'ERROR',
                error: err?.message ?? 'Failed to load calendar month',
              }
            : null
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial mount data load
  useEffect(() => {
    let isMounted = true;
    orchRef.current
      .loadMonth(initYear, initMonth, initDate)
      .then(result => {
        if (isMounted) {
          setState(result);
          setVisibleMonth({ year: result.year, month: result.month });
          setSelectedDate(result.selectedDate);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setState(prev =>
            prev
              ? {
                  ...prev,
                  status: 'ERROR',
                  error: err?.message ?? 'Failed to load calendar month',
                }
              : null
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initYear, initMonth, initDate]);

  // Tab focus: reload effective temporal inputs and visible month (M14 §12)
  useFocusEffect(
    useCallback(() => {
      loadData(visibleMonthRef.current.year, visibleMonthRef.current.month, selectedDateRef.current);
    }, [loadData])
  );

  // App foreground: preserve visibleMonth, refresh under latest committed environment (M14 §12)
  useAppForeground(
    useCallback(() => {
      loadData(visibleMonthRef.current.year, visibleMonthRef.current.month, selectedDateRef.current);
    }, [loadData])
  );

  const goToPreviousMonth = useCallback(() => {
    const { year, month } = visibleMonthRef.current;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    loadData(prevYear, prevMonth);
  }, [loadData]);

  const goToNextMonth = useCallback(() => {
    const { year, month } = visibleMonthRef.current;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    loadData(nextYear, nextMonth);
  }, [loadData]);

  const goToToday = useCallback(() => {
    const today = DateTime.now();
    loadData(today.year, today.month, today.toISODate()!);
  }, [loadData]);

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      loadData(visibleMonthRef.current.year, visibleMonthRef.current.month, date);
    },
    [loadData]
  );

  /**
   * Cell tap handler enforcing M14 §8:
   * - In-month cell: select date and load day detail.
   * - Filler cell: navigate visibleMonth to that cell's month, select date, and load target month.
   */
  const onCellTap = useCallback(
    (cell: CalendarDayCellModel) => {
      if (cell.isCurrentMonth) {
        selectDate(cell.date);
      } else {
        const dt = DateTime.fromISO(cell.date);
        loadData(dt.year, dt.month, cell.date);
      }
    },
    [selectDate, loadData]
  );

  const refresh = useCallback(() => {
    loadData(visibleMonthRef.current.year, visibleMonthRef.current.month, selectedDateRef.current);
  }, [loadData]);

  return {
    visibleMonth,
    selectedDate,
    state,
    loading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    onCellTap,
    refresh,
  };
}
