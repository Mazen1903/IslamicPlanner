import { useEffect, useRef } from 'react';
import { DateTime } from 'luxon';
import { useTodayStore } from '@/stores/useTodayStore';
import { formatCountdown } from './useCountdown';
import { PRAYER_NAMES } from '@/constants/prayers';
import type { TodayRuntimeContext } from '@/services/types';

export interface UsePrayerTimerOptions {
  onFullRefresh: () => void;
  onPrayerTransition: (runtime: TodayRuntimeContext, now: DateTime) => void;
  enabled?: boolean;
}

/**
 * Single 1-second interval owner for the Today screen.
 *
 * Invariants:
 * 1. Exactly one setInterval(1000) exists in the application for Today.
 * 2. Every tick:
 *    A. Updates countdown display from store.viewModel.nextPrayer using pure arithmetic.
 *    B. Compares now to cached runtime.planningDay.start/end (cheap boundary comparison).
 *    C. Compares now to cached runtime.timeline for prayer transitions.
 * 3. Does NOT rebuild PrayerTimeline.
 * 4. Does NOT call PlanningDayEngine.
 * 5. Does NOT query SQLite.
 * 6. Does NOT materialize.
 * 7. Suppresses duplicate full refreshes when one is already in flight.
 */
export function usePrayerTimer(options: UsePrayerTimerOptions): void {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }

    const intervalId = setInterval(() => {
      const now = DateTime.now();
      const store = useTodayStore.getState();
      const { viewModel, runtime, refreshInFlight } = store;

      // A. Update countdown arithmetic
      if (viewModel?.nextPrayer?.time) {
        const nextPrayerMs = DateTime.fromISO(viewModel.nextPrayer.time).toMillis();
        const remainingMs = nextPrayerMs - now.toMillis();
        store.setCountdownDisplay(formatCountdown(remainingMs));
      } else {
        store.setCountdownDisplay(null);
      }

      if (!runtime || !viewModel) {
        return;
      }

      // B. Planning-day boundary comparison
      const nowMs = now.toMillis();
      const planningDayRollover =
        nowMs >= runtime.planningDay.end.toMillis() ||
        nowMs < runtime.planningDay.start.toMillis();

      if (planningDayRollover) {
        // Suppress duplicate full refresh if one is already in flight
        if (refreshInFlight) {
          return;
        }

        // If prayer also changed at rollover, set banner as well
        const currentPeriod = runtime.timeline.findPeriod(now);
        if (currentPeriod.prayer !== viewModel.currentPrayer) {
          store.setPrayerTransition({
            newPrayer: currentPeriod.prayer,
            message: `${PRAYER_NAMES[currentPeriod.prayer]} has begun — View ${PRAYER_NAMES[currentPeriod.prayer]}`,
          });
        }

        optionsRef.current.onFullRefresh();
        return;
      }

      // C. Prayer-only boundary comparison within same planning day
      const currentPeriod = runtime.timeline.findPeriod(now);
      if (currentPeriod.prayer !== viewModel.currentPrayer) {
        store.setPrayerTransition({
          newPrayer: currentPeriod.prayer,
          message: `${PRAYER_NAMES[currentPeriod.prayer]} has begun — View ${PRAYER_NAMES[currentPeriod.prayer]}`,
        });

        // Prayer-only transition re-projects viewModel (no materialization)
        optionsRef.current.onPrayerTransition(runtime, now);
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [options.enabled]);
}
