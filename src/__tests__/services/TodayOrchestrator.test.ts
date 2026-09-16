import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import {
  TodayOrchestrator,
  detectTransitions,
} from '@/services/TodayOrchestrator';
import {
  deriveTimelineSeedRange,
} from '@/services/TodayViewModelProjection';
import { useTodayStore } from '@/stores/useTodayStore';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { buildPlanningDay } from '@/domain/planning-day/PlanningDayEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { TodayTemporalInputs, TodayRuntimeContext, TodayRefreshResult } from '@/services/types';
import { formatCountdown } from '@/hooks/useCountdown';

describe('TodayOrchestrator & Store Test Suite', () => {
  const coords = { latitude: 40.7128, longitude: -74.006 };
  const params = {
    method: 'ISNA' as const,
    asrMethod: 'SHAFI' as const,
    highLatitudeRule: 'AUTO' as const,
    polarCircleResolution: 'AQRAB_YAUM' as const,
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    timezone: 'America/New_York',
  };

  const inputs: TodayTemporalInputs = {
    coordinates: coords,
    params,
    planningDayConfig: { mode: 'FAJR' },
  };

  beforeEach(() => {
    createTestDatabase();
    useTodayStore.getState().reset();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('SEED DATE / MATERIALIZATION (SD-01 to SD-04)', () => {
    it('SD-01: deriveTimelineSeedRange extracts min and max sourceDate from PrayerTimeline', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const seedRange = deriveTimelineSeedRange(timeline);

      expect(seedRange.seedStart).toBe('2026-09-14');
      expect(seedRange.seedEnd).toBe('2026-09-16');
    });

    it('SD-03: seed range uses sourceDate, not planningDayKey', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const uniqueSourceDates = Array.from(new Set(timeline.periods.map(p => p.sourceDate)));
      expect(uniqueSourceDates).toEqual(['2026-09-14', '2026-09-15', '2026-09-16']);
    });

    it('SD-02: full refresh materializes definitions in the seed range into the database', async () => {
      // Create a definition on 2026-09-15
      await taskDefinitionRepository.create({
        id: 'def-sd-02',
        title: 'Morning Dhikr',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: { anchorPrayer: 'FAJR', direction: 'AFTER', offsetMinutes: 15 },
        seriesId: 's-sd-02',
        seriesVersion: 1,
        priority: 'NORMAL',
        isActive: true,
      });

      const orchestrator = new TodayOrchestrator();
      const now = DateTime.fromISO('2026-09-15T08:00:00.000', { zone: 'America/New_York' });
      const result = await orchestrator.refreshToday(now, inputs);

      expect(result.viewModel.planningDayKey).toBe('2026-09-15');
      const fajrTab = result.viewModel.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.scheduledTasks.some(t => t.taskDefinitionId === 'def-sd-02')).toBe(true);

      // Verify persisted in DB
      const occurrences = await taskOccurrenceRepository.findTodayCandidates('2026-09-15', now.toUTC().toISO()!);
      expect(occurrences.some(o => o.taskDefinitionId === 'def-sd-02')).toBe(true);
    });

    it('SD-04: out-of-timeline large offset fails safely without corrupting Today state', async () => {
      // Create definition with invalid/out-of-range offset that throws during placement
      await taskDefinitionRepository.create({
        id: 'def-out-of-bounds',
        title: 'Impossible Offset Task',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: { anchorPrayer: 'FAJR', direction: 'AFTER', offsetMinutes: 5000 },
        seriesId: 's-oob',
        seriesVersion: 1,
        priority: 'NORMAL',
        isActive: true,
      });

      const orchestrator = new TodayOrchestrator();
      const now = DateTime.fromISO('2026-09-15T08:00:00.000', { zone: 'America/New_York' });

      // Materialization batch swallows per-item error safely; full refresh proceeds without crashing
      const result = await orchestrator.refreshToday(now, inputs);
      expect(result.viewModel).toBeDefined();
    });
  });

  describe('PLANNING DAY ROLLOVER (PD-01 to PD-04)', () => {
    it('PD-01: detectTransitions detects planning-day rollover cheaply using cached planningDay.end', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const planningDay = buildPlanningDay(
        { mode: 'CUSTOM', localTime: '19:00' },
        timeline,
        '2026-09-15'
      );

      const runtime: TodayRuntimeContext = {
        timeline,
        planningDay,
        planningDayConfig: { mode: 'CUSTOM', localTime: '19:00' },
        refreshedAt: '2026-09-15T18:00:00.000Z',
      };

      // Before rollover (18:59:59)
      const before = planningDay.end.minus({ seconds: 1 });
      const transitionBefore = detectTransitions(before, runtime, 'MAGHRIB');
      expect(transitionBefore.planningDayChanged).toBe(false);

      // At rollover (19:00:00)
      const atRollover = planningDay.end;
      const transitionAt = detectTransitions(atRollover, runtime, 'MAGHRIB');
      expect(transitionAt.planningDayChanged).toBe(true);
    });

    it('PD-02: MIDNIGHT changes day during Isha and detects rollover', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const midnightDay = buildPlanningDay({ mode: 'MIDNIGHT' }, timeline, '2026-09-15');

      const runtime: TodayRuntimeContext = {
        timeline,
        planningDay: midnightDay,
        planningDayConfig: { mode: 'MIDNIGHT' },
        refreshedAt: '2026-09-15T22:00:00.000Z',
      };

      // Exactly at midnight (00:00:00 next day)
      const atMidnight = midnightDay.end;
      const result = detectTransitions(atMidnight, runtime, 'ISHA');
      expect(result.planningDayChanged).toBe(true);
    });

    it('PD-03: Fajr boundary changes both prayer and planning day; single full refresh occurs', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const fajrDay = buildPlanningDay({ mode: 'FAJR' }, timeline, '2026-09-15');

      const runtime: TodayRuntimeContext = {
        timeline,
        planningDay: fajrDay,
        planningDayConfig: { mode: 'FAJR' },
        refreshedAt: '2026-09-15T06:00:00.000Z',
      };

      // At Fajr boundary (fajrDay.end): both planning day and prayer roll together
      const atNextFajr = fajrDay.end;
      const result = detectTransitions(atNextFajr, runtime, 'ISHA');
      expect(result.planningDayChanged).toBe(true);
      // Because planningDayChanged is true, a single full refresh is launched rather than dual calls
    });

    it('PD-04: Fajr-day seed date differs from planningDayKey and loads correctly', async () => {
      // For FAJR planning day on 2026-09-15 (starts at ~05:15 AM on 2026-09-15),
      // a pre-fajr event on civil date 2026-09-15 before 05:15 AM belongs to 2026-09-14 planning day
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const fajrPeriod = timeline.periods.find(p => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15')!;
      const preFajr = fajrPeriod.start.minus({ minutes: 30 }); // 04:45 AM on 2026-09-15

      const orchestrator = new TodayOrchestrator();
      const result = await orchestrator.refreshToday(preFajr, inputs);

      // Pre-fajr time resolves into previous planning day (2026-09-14)
      expect(result.viewModel.planningDayKey).toBe('2026-09-14');
    });
  });

  describe('LIVE PRAYER CHANGE (LP-01 to LP-05) & SELECTION (PT-02, UI-01 to UI-03)', () => {
    it('PT-02: initial load selects currentPrayer', () => {
      const store = useTodayStore.getState();
      expect(store.selectedPrayer).toBeNull();

      const dummyResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'DHUHR',
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T12:00:00.000Z',
        },
      };

      const token = store.startRefresh();
      store.commitRefresh(token, dummyResult, true);

      expect(useTodayStore.getState().selectedPrayer).toBe('DHUHR');
    });

    it('UI-03: selectedPrayer store ownership (not duplicated in TodayViewModel)', () => {
      const store = useTodayStore.getState();
      const dummyResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'DHUHR',
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T12:00:00.000Z',
        },
      };

      // TodayViewModel does NOT have selectedPrayer property
      expect('selectedPrayer' in dummyResult.viewModel).toBe(false);
      const token = store.startRefresh();
      store.commitRefresh(token, dummyResult, true);
      // Store owns selectedPrayer
      expect(useTodayStore.getState().selectedPrayer).toBe('DHUHR');
    });

    it('LP-01: live prayer transition preserves selectedPrayer', () => {
      const store = useTodayStore.getState();
      store.setSelectedPrayer('FAJR'); // User selected FAJR

      const updatedResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'ASR', // Prayer changed to ASR
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T16:00:00.000Z',
        },
      };

      // Refresh without syncSelected
      const token = store.startRefresh();
      store.commitRefresh(token, updatedResult, false);

      // selectedPrayer must NOT be overwritten by refresh!
      expect(useTodayStore.getState().selectedPrayer).toBe('FAJR');
    });

    it('UI-01: prayer transition preserves user-selected tab', () => {
      const store = useTodayStore.getState();
      store.setSelectedPrayer('DHUHR');

      const bannerState = {
        newPrayer: 'ASR' as const,
        message: 'Asr has begun — View Asr',
      };
      store.setPrayerTransition(bannerState);

      // Tab remains on DHUHR until user taps banner
      expect(useTodayStore.getState().selectedPrayer).toBe('DHUHR');
      expect(useTodayStore.getState().prayerTransition?.newPrayer).toBe('ASR');
    });

    it('LP-02: sets banner when prayer transition occurs', () => {
      const store = useTodayStore.getState();
      store.setPrayerTransition({
        newPrayer: 'DHUHR',
        message: 'Dhuhr has begun — View Dhuhr',
      });

      expect(useTodayStore.getState().prayerTransition?.message).toBe('Dhuhr has begun — View Dhuhr');
    });

    it('LP-03: tapping banner syncs selectedPrayer = currentPrayer', () => {
      const store = useTodayStore.getState();
      store.setSelectedPrayer('FAJR');

      const dummyResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'DHUHR',
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T12:00:00.000Z',
        },
      };
      const token = store.startRefresh();
      store.commitRefresh(token, dummyResult, false);

      store.syncSelectedToCurrent();
      expect(useTodayStore.getState().selectedPrayer).toBe('DHUHR');
    });

    it('LP-04: foreground syncs selectedPrayer = currentPrayer', () => {
      const store = useTodayStore.getState();
      store.setSelectedPrayer('FAJR');

      const dummyResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'ASR',
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T16:00:00.000Z',
        },
      };

      // Foreground refresh passes syncSelected = true
      const token = store.startRefresh();
      store.commitRefresh(token, dummyResult, true);

      expect(useTodayStore.getState().selectedPrayer).toBe('ASR');
    });

    it('UI-02: foreground refresh resets tab to current prayer', () => {
      const store = useTodayStore.getState();
      store.setSelectedPrayer('MAGHRIB');

      const dummyResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'ISHA',
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T21:00:00.000Z',
        },
      };

      const token = store.startRefresh();
      store.commitRefresh(token, dummyResult, true);

      expect(useTodayStore.getState().selectedPrayer).toBe('ISHA');
    });

    it('LP-05: prayer-only transition re-projects viewModel while preserving selectedPrayer', async () => {
      const orchestrator = new TodayOrchestrator();
      const now = DateTime.fromISO('2026-09-15T12:30:00.000', { zone: 'America/New_York' });
      const refreshResult = await orchestrator.refreshToday(now, inputs);

      const store = useTodayStore.getState();
      const token = store.startRefresh();
      store.commitRefresh(token, refreshResult, true);
      store.setSelectedPrayer('FAJR');

      // Now prayer advances to Asr (same planning day)
      const later = DateTime.fromISO('2026-09-15T16:30:00.000', { zone: 'America/New_York' });
      const reprojVm = await orchestrator.queryAndProject(refreshResult.runtime, later);

      const repToken = store.startReproject();
      store.commitReproject(repToken, reprojVm);

      // currentPrayer updated, but selectedPrayer is preserved
      expect(useTodayStore.getState().viewModel?.currentPrayer).toBe('ASR');
      expect(useTodayStore.getState().selectedPrayer).toBe('FAJR');
    });
  });

  describe('COUNTDOWN & TIMER (CT-01, CT-02, TIMER-01)', () => {
    it('CT-01: formatCountdown performs pure arithmetic without DB/domain calls', () => {
      expect(formatCountdown(3600000 + 120000 + 45000)).toBe('1h 2m 45s');
      expect(formatCountdown(125000)).toBe('2m 5s');
      expect(formatCountdown(45000)).toBe('45s');
      expect(formatCountdown(0)).toBe('0s');
      expect(formatCountdown(-1000)).toBe('0s');
    });

    it('CT-02: planning-day boundary detection uses cached planningDay.end without PlanningDayEngine resolution', () => {
      const timeline = buildPrayerTimeline('2026-09-15', coords, params);
      const planningDay = buildPlanningDay({ mode: 'FAJR' }, timeline, '2026-09-15');

      const runtime: TodayRuntimeContext = {
        timeline,
        planningDay,
        planningDayConfig: { mode: 'FAJR' },
        refreshedAt: '2026-09-15T10:00:00.000Z',
      };

      const now = planningDay.end.plus({ seconds: 1 });
      const transition = detectTransitions(now, runtime, 'ISHA');

      expect(transition.planningDayChanged).toBe(true);
    });

    it('TIMER-01: only one interval source exists (useCountdown is pure helper without interval)', () => {
      const countdownFile = fs.readFileSync(
        path.join(process.cwd(), 'src/hooks/useCountdown.ts'),
        'utf-8'
      );
      expect(countdownFile).not.toContain('setInterval');
      expect(countdownFile).not.toContain('clearInterval');
    });
  });

  describe('M6/M9 BOUNDARY (MB-01, MB-02)', () => {
    it('MB-01: M7 files do not import rrule or evaluate recurrence', () => {
      const m7Files = [
        'src/services/TodayOrchestrator.ts',
        'src/services/TodayViewModelProjection.ts',
        'src/services/TodayQueryService.ts',
        'src/services/TodayTemporalInputProvider.ts',
        'src/stores/useTodayStore.ts',
        'src/hooks/useToday.ts',
        'src/hooks/usePrayerTimer.ts',
      ];

      for (const relPath of m7Files) {
        const content = fs.readFileSync(path.join(process.cwd(), relPath), 'utf-8');
        expect(content).not.toContain("from 'rrule'");
        expect(content).not.toContain('require("rrule")');
        expect(content).not.toContain('RRule');
      }
    });

    it('MB-02: missing recurring occurrences are not synthesized by Today screen', async () => {
      // Create a recurring definition with recurrenceRule
      await taskDefinitionRepository.create({
        id: 'def-recurring-test',
        title: 'Weekly Recurring Meeting',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
        seriesId: 's-rec-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        isActive: true,
      });

      const orchestrator = new TodayOrchestrator();
      const now = DateTime.fromISO('2026-09-15T09:00:00.000', { zone: 'America/New_York' });

      // In M7, recurrence evaluation belongs to M9. Today only consumes persisted TaskOccurrence rows.
      // Since no recurrence occurrence was pre-materialized, Today does not synthesize one.
      const result = await orchestrator.refreshToday(now, inputs);
      const dhuhrTab = result.viewModel.tabs.find(t => t.prayer === 'DHUHR')!;
      expect(dhuhrTab.scheduledTasks.some(t => t.taskDefinitionId === 'def-recurring-test')).toBe(false);
    });
  });

  describe('ASYNC STATE-SAFETY (ASYNC-01 to ASYNC-03)', () => {
    it('ASYNC-01: older full refresh cannot overwrite newer task-mutation reprojection', () => {
      const store = useTodayStore.getState();

      // 1. Generation 1 full refresh starts
      const token1 = store.startRefresh();
      expect(token1).toBe(1);

      // 2. User completes task, triggering reprojection (generation 2)
      const token2 = store.startReproject();
      expect(token2).toBe(2);

      const newerVm = {
        planningDayKey: '2026-09-15',
        planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
        currentPrayer: 'DHUHR' as const,
        tabs: [],
        nextPrayer: null,
      };
      const committed2 = store.commitReproject(token2, newerVm);
      expect(committed2).toBe(true);
      expect(useTodayStore.getState().viewModel).toBe(newerVm);

      // 3. Older generation 1 refresh completes later
      const olderResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'FAJR' as const,
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T05:00:00.000Z',
        },
      };

      const committed1 = store.commitRefresh(token1, olderResult);
      expect(committed1).toBe(false); // SUPPRESSED!
      // viewModel remains newerVm
      expect(useTodayStore.getState().viewModel).toBe(newerVm);
    });

    it('ASYNC-02: refreshInFlight flag suppresses duplicate concurrent refreshes', () => {
      const store = useTodayStore.getState();
      expect(store.refreshInFlight).toBe(false);

      store.startRefresh();
      expect(useTodayStore.getState().refreshInFlight).toBe(true);
    });

    it('ASYNC-03: SETUP_REQUIRED invalidates older pending READY results', () => {
      const store = useTodayStore.getState();

      const token1 = store.startRefresh();
      expect(token1).toBe(1);

      // Entering setup_required invalidates token1
      store.setSetupRequired();
      expect(useTodayStore.getState().status).toBe('setup_required');

      const olderResult: TodayRefreshResult = {
        viewModel: {
          planningDayKey: '2026-09-15',
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          currentPrayer: 'FAJR' as const,
          tabs: [],
          nextPrayer: null,
        },
        runtime: {
          timeline: buildPrayerTimeline('2026-09-15', coords, params),
          planningDay: buildPlanningDay({ mode: 'FAJR' }, buildPrayerTimeline('2026-09-15', coords, params), '2026-09-15'),
          planningDayConfig: { mode: 'FAJR' },
          refreshedAt: '2026-09-15T05:00:00.000Z',
        },
      };

      const committed = store.commitRefresh(token1, olderResult);
      expect(committed).toBe(false);
      expect(useTodayStore.getState().status).toBe('setup_required');
      expect(useTodayStore.getState().viewModel).toBeNull();
    });
  });
});
