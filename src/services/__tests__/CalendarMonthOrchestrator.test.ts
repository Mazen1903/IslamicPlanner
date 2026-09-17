import {
  CalendarMonthOrchestrator,
  compareUpcomingTasks,
  type UpcomingTaskItem,
} from '../CalendarMonthOrchestrator';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { RecurringHorizonSync } from '@/features/task-form/recurringHorizonSync';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { TodayTemporalInputProvider, TodayTemporalInputResult, TodayTemporalInputs } from '../types';
import { HijriService } from '@/domain/calendar/HijriService';

describe('CalendarMonthOrchestrator (M14)', () => {
  let taskEngine: TaskEngine;
  let horizonSync: RecurringHorizonSync;
  let orchestrator: CalendarMonthOrchestrator;

  const validTemporalInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  class MockReadyProvider implements TodayTemporalInputProvider {
    constructor(private inputs: TodayTemporalInputs = validTemporalInputs) {}
    async getInputs(): Promise<TodayTemporalInputResult> {
      return { status: 'READY', inputs: this.inputs };
    }
  }

  class MockSetupRequiredProvider implements TodayTemporalInputProvider {
    async getInputs(): Promise<TodayTemporalInputResult> {
      return { status: 'SETUP_REQUIRED' };
    }
  }

  beforeEach(() => {
    createTestDatabase();
    taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
    horizonSync = new RecurringHorizonSync();
    orchestrator = new CalendarMonthOrchestrator(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      horizonSync,
      new MockReadyProvider(),
      new HijriService()
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('SETUP_REQUIRED Handling (M14 §10)', () => {
    it('returns SETUP_REQUIRED with valid grid and Hijri dates, but zero task dots and null selectedDayDetail', async () => {
      const setupOrch = new CalendarMonthOrchestrator(
        taskDefinitionRepository,
        taskOccurrenceRepository,
        horizonSync,
        new MockSetupRequiredProvider(),
        new HijriService()
      );

      const state = await setupOrch.loadMonth(2026, 9);
      expect(state.status).toBe('SETUP_REQUIRED');
      expect(state.grid).toBeDefined();
      expect(state.grid.cells.length).toBe(35);
      expect(state.selectedDayDetail).toBeNull();
      expect(state.upcomingTasks).toHaveLength(0);

      // All cells must have hasTasks = false
      for (const cell of state.grid.cells) {
        expect(cell.hasTasks).toBe(false);
        expect(cell.hijriDate).toBeDefined();
      }
    });
  });

  describe('Historical Safety & Range Sync (M14 §2, §3, §6, §12)', () => {
    it('executes ZERO syncRange for entirely historical months', async () => {
      const syncRangeSpy = jest.spyOn(horizonSync, 'syncRange');

      // Month in the far past (January 2020)
      const state = await orchestrator.loadMonth(2020, 1);
      expect(state.status).toBe('READY');
      expect(syncRangeSpy).not.toHaveBeenCalled();
    });

    it('calls syncRange with candidateSeedRange [monthStart - 2, monthEnd + 2] for current/future months', async () => {
      const syncRangeSpy = jest.spyOn(horizonSync, 'syncRange');

      // Far future month (January 2030)
      const state = await orchestrator.loadMonth(2030, 1);
      expect(state.status).toBe('READY');
      expect(syncRangeSpy).toHaveBeenCalledWith(
        { start: '2029-12-30', end: '2030-02-02' },
        { start: '2030-01-01', end: '2030-01-31' },
        expect.any(Object)
      );
    });
  });

  describe('Stale Row Moving Out / In Behavior (M14 §4, §5)', () => {
    it('existing PENDING row moving out of month is updated and excluded by display query', async () => {
      // Configure orchestrator with CUSTOM planning day mode (boundary 19:00)
      const customInputs: TodayTemporalInputs = {
        ...validTemporalInputs,
        planningDayConfig: { mode: 'CUSTOM', localTime: '19:00' },
      };
      const customOrch = new CalendarMonthOrchestrator(
        taskDefinitionRepository,
        taskOccurrenceRepository,
        horizonSync,
        new MockReadyProvider(customInputs),
        new HijriService()
      );

      // Task at 20:00 (after 19:00 boundary -> canonical planningDayKey is next day: Oct 1)
      const def = await taskEngine.createTask({
        title: 'Shifting Task',
        startDate: '2026-09-30',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '20:00' },
      });

      // Initially persisted with stale planningDayKey = '2026-09-30'
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-shift-out',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-30',
        planningDayKey: '2026-09-30',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      const state = await customOrch.loadMonth(2026, 9);

      // Verify the row was UPDATED to October 1 in the database
      const updatedOcc = await taskOccurrenceRepository.findById(occ.id);
      expect(updatedOcc!.planningDayKey).toBe('2026-10-01');

      // September 30 cell naturally has hasTasks = false
      const sep30Cell = state.grid.cells.find(c => c.date === '2026-09-30')!;
      expect(sep30Cell.hasTasks).toBe(false);
    });

    it('existing PENDING row with planningDayKey in month is included in grid and hasTasks is true', async () => {
      const def = await taskEngine.createTask({
        title: 'September Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      await taskOccurrenceRepository.create({
        id: 'occ-sep-15',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      const state = await orchestrator.loadMonth(2026, 9);
      const sep15Cell = state.grid.cells.find(c => c.date === '2026-09-15')!;
      expect(sep15Cell.hasTasks).toBe(true);
      expect(sep15Cell.taskSummary.total).toBe(1);
    });
  });

  describe('Selected Day Detail Structure (M14 §1, §2, §3, §18)', () => {
    it('preserves exactly five prayer sections in fixed order (Fajr, Dhuhr, Asr, Maghrib, Isha) without Sunrise', async () => {
      const state = await orchestrator.loadMonth(2026, 9, '2026-09-15');
      expect(state.selectedDayDetail).not.toBeNull();
      const detail = state.selectedDayDetail!;

      expect(detail.prayerSections).toHaveLength(5);
      expect(detail.prayerSections.map(s => s.prayer)).toEqual([
        'FAJR',
        'DHUHR',
        'ASR',
        'MAGHRIB',
        'ISHA',
      ]);
      expect(detail.prayerSections.some(s => (s.prayer as any) === 'SUNRISE')).toBe(false);
    });

    it('renders ANYTIME_TODAY tasks into the secondary anytimeTasks area, not in prayer sections', async () => {
      const def = await taskEngine.createTask({
        title: 'Anytime Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      await taskOccurrenceRepository.create({
        id: 'occ-anytime',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      const state = await orchestrator.loadMonth(2026, 9, '2026-09-15');
      const detail = state.selectedDayDetail!;

      // In anytimeTasks array
      expect(detail.anytimeTasks).toHaveLength(1);
      expect(detail.anytimeTasks[0].title).toBe('Anytime Task');

      // NOT in any prayer section
      for (const section of detail.prayerSections) {
        expect(section.tasks).toHaveLength(0);
      }
    });

    it('places timed tasks in the appropriate prayer section', async () => {
      const def = await taskEngine.createTask({
        title: 'Dhuhr Reflection',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '13:30' },
      });

      await taskOccurrenceRepository.create({
        id: 'occ-dhuhr',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedPrayerSection: 'DHUHR',
        calculatedStartTime: '2026-09-15T17:30:00.000Z',
        status: 'PENDING',
      });

      const state = await orchestrator.loadMonth(2026, 9, '2026-09-15');
      const detail = state.selectedDayDetail!;
      const dhuhrSection = detail.prayerSections.find(s => s.prayer === 'DHUHR')!;
      expect(dhuhrSection.tasks).toHaveLength(1);
      expect(dhuhrSection.tasks[0].title).toBe('Dhuhr Reflection');
    });
  });

  describe('Upcoming This Month Sorting (M14 §5)', () => {
    it('orders upcoming tasks strictly by: planningDayKey ASC, timed first, window second, anytime third (important first)', () => {
      const items: UpcomingTaskItem[] = [
        {
          occurrenceId: 'occ-anytime-normal',
          taskDefinitionId: 'd1',
          title: 'Anytime Normal',
          planningDayKey: '2026-09-20',
          scheduleType: 'ANYTIME_TODAY',
          scheduleLabel: 'Anytime Today',
          priority: 'NORMAL',
          calculatedStartTime: null,
          windowStart: null,
          createdAt: '2026-09-01T10:00:00Z',
        },
        {
          occurrenceId: 'occ-anytime-important',
          taskDefinitionId: 'd2',
          title: 'Anytime Important',
          planningDayKey: '2026-09-20',
          scheduleType: 'ANYTIME_TODAY',
          scheduleLabel: 'Anytime Today',
          priority: 'IMPORTANT',
          calculatedStartTime: null,
          windowStart: null,
          createdAt: '2026-09-01T11:00:00Z',
        },
        {
          occurrenceId: 'occ-window',
          taskDefinitionId: 'd3',
          title: 'Prayer Window Task',
          planningDayKey: '2026-09-20',
          scheduleType: 'PRAYER_WINDOW',
          scheduleLabel: 'Dhuhr – Asr',
          priority: 'NORMAL',
          calculatedStartTime: null,
          windowStart: '2026-09-20T17:00:00.000Z',
          createdAt: '2026-09-01T12:00:00Z',
        },
        {
          occurrenceId: 'occ-exact',
          taskDefinitionId: 'd4',
          title: 'Exact Time Task',
          planningDayKey: '2026-09-20',
          scheduleType: 'EXACT_TIME',
          scheduleLabel: '2:00 PM',
          priority: 'NORMAL',
          calculatedStartTime: '2026-09-20T18:00:00.000Z',
          windowStart: null,
          createdAt: '2026-09-01T13:00:00Z',
        },
        {
          occurrenceId: 'occ-earlier-day',
          taskDefinitionId: 'd5',
          title: 'Earlier Day Task',
          planningDayKey: '2026-09-18',
          scheduleType: 'ANYTIME_TODAY',
          scheduleLabel: 'Anytime Today',
          priority: 'NORMAL',
          calculatedStartTime: null,
          windowStart: null,
          createdAt: '2026-09-01T09:00:00Z',
        },
      ];

      items.sort(compareUpcomingTasks);

      const titles = items.map(i => i.title);
      expect(titles).toEqual([
        'Earlier Day Task',     // Sep 18 comes first
        'Exact Time Task',      // Sep 20: Group 1 (timed)
        'Prayer Window Task',   // Sep 20: Group 2 (window)
        'Anytime Important',    // Sep 20: Group 3 (Anytime IMPORTANT)
        'Anytime Normal',       // Sep 20: Group 3 (Anytime NORMAL)
      ]);
    });
  });
});
