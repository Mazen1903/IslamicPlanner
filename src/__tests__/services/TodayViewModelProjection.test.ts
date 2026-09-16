import { DateTime } from 'luxon';
import {
  computeVisibleTabs,
  formatScheduleLabel,
  getRepresentativePeriodForTab,
  projectTodayViewModel,
  computeEmptyState,
  getEmptyStateMessage,
} from '@/services/TodayViewModelProjection';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { buildPlanningDay } from '@/domain/planning-day/PlanningDayEngine';
import type { PlanningDay } from '@/domain/planning-day/types';
import type { PrayerTimeline, PrayerCalculationParams, Coordinates } from '@/domain/prayer/types';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import { PRAYER_ORDER } from '@/constants/prayers';

describe('TodayViewModelProjection Test Suite', () => {
  const coords: Coordinates = { latitude: 40.7128, longitude: -74.006 };
  const params: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    timezone: 'America/New_York',
  };

  let timeline: PrayerTimeline;
  let fajrPlanningDay: PlanningDay;
  let customPlanningDay: PlanningDay;

  beforeAll(() => {
    timeline = buildPrayerTimeline('2026-09-15', coords, params);
    fajrPlanningDay = buildPlanningDay({ mode: 'FAJR' }, timeline, '2026-09-15');
    customPlanningDay = buildPlanningDay(
      { mode: 'CUSTOM', localTime: '19:00' },
      timeline,
      '2026-09-15'
    );
  });

  describe('WINDOW PROJECTION (WP-01 to WP-07)', () => {
    it('WP-01: ordinary FAJR->ASR window projects into FAJR and DHUHR (end exclusive)', () => {
      const fajrPeriod = fajrPlanningDay.periods.find(p => p.prayer === 'FAJR')!;
      const asrPeriod = fajrPlanningDay.periods.find(p => p.prayer === 'ASR')!;

      const occ: Partial<TaskOccurrence> = {
        windowStart: fajrPeriod.start.toUTC().toISO()!,
        windowEnd: asrPeriod.start.toUTC().toISO()!, // Asr start is windowEnd
      };

      const visible = computeVisibleTabs(occ as TaskOccurrence, fajrPlanningDay);
      expect(visible).toEqual(['FAJR', 'DHUHR']);
      expect(visible).not.toContain('ASR');
    });

    it('WP-02: cross-CUSTOM-day carryover at 19:10 for DHUHR->ISHA projects into MAGHRIB only in new day', () => {
      // Worked example from Rev 4 §1.2:
      // On Tuesday: Dhuhr [12:00, 15:30), Asr [15:30, 18:20), Maghrib [18:20, 19:30), Isha [19:30, 23:00)
      // Window: Dhuhr start (12:00) to Isha start (19:30) (end exclusive)
      // Custom day boundary at 19:00: Wednesday planning day starts at Tuesday 19:00 and ends at Wednesday 19:00
      // In Wednesday's planning day, Tuesday's Maghrib fragment is clipped to [19:00, 19:30)
      const t1200 = DateTime.fromISO('2026-09-15T12:00:00.000Z');
      const t1820 = DateTime.fromISO('2026-09-15T18:20:00.000Z');
      const t1900 = DateTime.fromISO('2026-09-15T19:00:00.000Z');
      const t1930 = DateTime.fromISO('2026-09-15T19:30:00.000Z');
      const wedFajr = DateTime.fromISO('2026-09-16T05:00:00.000Z');
      const wedDhuhr = DateTime.fromISO('2026-09-16T12:00:00.000Z');
      const wedAsr = DateTime.fromISO('2026-09-16T15:30:00.000Z');
      const wedEnd = DateTime.fromISO('2026-09-16T19:00:00.000Z');

      const customWedPlanningDay: PlanningDay = {
        key: '2026-09-16',
        start: t1900,
        end: wedEnd,
        periods: [
          {
            prayer: 'MAGHRIB',
            start: t1900,
            end: t1930,
            fullPeriodStart: t1820,
            fullPeriodEnd: t1930,
            sourceDate: '2026-09-15',
          },
          {
            prayer: 'ISHA',
            start: t1930,
            end: wedFajr,
            fullPeriodStart: t1930,
            fullPeriodEnd: wedFajr,
            sourceDate: '2026-09-15',
          },
          {
            prayer: 'FAJR',
            start: wedFajr,
            end: wedDhuhr,
            fullPeriodStart: wedFajr,
            fullPeriodEnd: wedDhuhr,
            sourceDate: '2026-09-16',
          },
          {
            prayer: 'DHUHR',
            start: wedDhuhr,
            end: wedAsr,
            fullPeriodStart: wedDhuhr,
            fullPeriodEnd: wedAsr,
            sourceDate: '2026-09-16',
          },
          {
            prayer: 'ASR',
            start: wedAsr,
            end: wedEnd,
            fullPeriodStart: wedAsr,
            fullPeriodEnd: wedEnd,
            sourceDate: '2026-09-16',
          },
        ],
      };

      const occ: Partial<TaskOccurrence> = {
        windowStart: t1200.toISO()!,
        windowEnd: t1930.toISO()!,
      };

      const visible = computeVisibleTabs(occ as TaskOccurrence, customWedPlanningDay);
      expect(visible).toEqual(['MAGHRIB']);
      expect(visible).not.toContain('ISHA');
      expect(visible).not.toContain('DHUHR');
      expect(visible).not.toContain('ASR');
    });

    it('WP-03: carryover is NOT shown under new day future DHUHR/ASR tabs', () => {
      const t1200 = DateTime.fromISO('2026-09-15T12:00:00.000Z');
      const t1820 = DateTime.fromISO('2026-09-15T18:20:00.000Z');
      const t1900 = DateTime.fromISO('2026-09-15T19:00:00.000Z');
      const t1930 = DateTime.fromISO('2026-09-15T19:30:00.000Z');
      const wedFajr = DateTime.fromISO('2026-09-16T05:00:00.000Z');
      const wedDhuhr = DateTime.fromISO('2026-09-16T12:00:00.000Z');
      const wedAsr = DateTime.fromISO('2026-09-16T15:30:00.000Z');
      const wedEnd = DateTime.fromISO('2026-09-16T19:00:00.000Z');

      const customWedPlanningDay: PlanningDay = {
        key: '2026-09-16',
        start: t1900,
        end: wedEnd,
        periods: [
          {
            prayer: 'MAGHRIB',
            start: t1900,
            end: t1930,
            fullPeriodStart: t1820,
            fullPeriodEnd: t1930,
            sourceDate: '2026-09-15',
          },
          {
            prayer: 'ISHA',
            start: t1930,
            end: wedFajr,
            fullPeriodStart: t1930,
            fullPeriodEnd: wedFajr,
            sourceDate: '2026-09-15',
          },
          {
            prayer: 'FAJR',
            start: wedFajr,
            end: wedDhuhr,
            fullPeriodStart: wedFajr,
            fullPeriodEnd: wedDhuhr,
            sourceDate: '2026-09-16',
          },
          {
            prayer: 'DHUHR',
            start: wedDhuhr,
            end: wedAsr,
            fullPeriodStart: wedDhuhr,
            fullPeriodEnd: wedAsr,
            sourceDate: '2026-09-16',
          },
          {
            prayer: 'ASR',
            start: wedAsr,
            end: wedEnd,
            fullPeriodStart: wedAsr,
            fullPeriodEnd: wedEnd,
            sourceDate: '2026-09-16',
          },
        ],
      };

      const occ: Partial<TaskOccurrence> = {
        windowStart: t1200.toISO()!,
        windowEnd: t1930.toISO()!,
      };

      const visible = computeVisibleTabs(occ as TaskOccurrence, customWedPlanningDay);
      expect(visible).not.toContain('DHUHR');
      expect(visible).not.toContain('ASR');
    });

    it('WP-04: duplicate same-label fragments deduplicate to a single tab', () => {
      // In custom planning day, there may be two fragments of the same prayer
      const visible = computeVisibleTabs(
        {
          windowStart: customPlanningDay.start.toUTC().toISO()!,
          windowEnd: customPlanningDay.end.toUTC().toISO()!,
        } as TaskOccurrence,
        customPlanningDay
      );

      // Check for uniqueness
      const uniqueVisible = Array.from(new Set(visible));
      expect(visible).toEqual(uniqueVisible);
    });

    it('WP-05: terminal historical occurrence on own day preserves original projection', () => {
      const occ: TaskOccurrence = {
        id: 'term-1',
        taskDefinitionId: 'def-1',
        seriesId: 'series-1',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        wallClockResolution: 'NORMAL',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        status: 'COMPLETED',
        completedAt: '2026-09-15T15:00:00.000Z',
        missedAt: null,
        overrideData: null,
      };

      const def: TaskDefinition = {
        id: 'def-1',
        title: 'Historical Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: { startPrayer: 'DHUHR', endPrayer: 'ISHA' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 'series-1',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      };

      const defs = new Map([[def.id, def]]);
      const now = DateTime.fromISO('2026-09-15T14:00:00.000', { zone: 'America/New_York' });

      const vm = projectTodayViewModel([occ], defs, fajrPlanningDay, timeline, now, 'America/New_York');

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      const asrTab = vm.tabs.find(t => t.prayer === 'ASR')!;
      const maghribTab = vm.tabs.find(t => t.prayer === 'MAGHRIB')!;
      const ishaTab = vm.tabs.find(t => t.prayer === 'ISHA')!;

      expect(dhuhrTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(asrTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(maghribTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(ishaTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(false);
    });

    it('WP-06: DHUHR->ISHA never projects into ISHA (end exclusive)', () => {
      const dhuhr = fajrPlanningDay.periods.find(p => p.prayer === 'DHUHR')!;
      const isha = fajrPlanningDay.periods.find(p => p.prayer === 'ISHA')!;

      const occ: Partial<TaskOccurrence> = {
        windowStart: dhuhr.start.toUTC().toISO()!,
        windowEnd: isha.start.toUTC().toISO()!,
      };

      const visible = computeVisibleTabs(occ as TaskOccurrence, fajrPlanningDay);
      expect(visible).not.toContain('ISHA');
    });

    it('WP-07: terminal PRAYER_WINDOW uses frozen eligiblePrayerSections despite changed planning-day config', () => {
      // Completed task with frozen eligible sections
      const occ: TaskOccurrence = {
        id: 'term-frozen',
        taskDefinitionId: 'def-1',
        seriesId: 'series-1',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: ['DHUHR', 'ASR'],
        wallClockResolution: 'NORMAL',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T18:00:00.000Z',
        status: 'COMPLETED',
        completedAt: '2026-09-15T14:00:00.000Z',
        missedAt: null,
        overrideData: null,
      };

      const def: TaskDefinition = {
        id: 'def-1',
        title: 'Frozen Placement Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: { startPrayer: 'DHUHR', endPrayer: 'MAGHRIB' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 'series-1',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      };

      const defs = new Map([[def.id, def]]);
      const now = DateTime.fromISO('2026-09-15T14:00:00.000', { zone: 'America/New_York' });

      // Render with custom planning day that would have cut differently
      const vm = projectTodayViewModel([occ], defs, customPlanningDay, timeline, now, 'America/New_York');

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      const asrTab = vm.tabs.find(t => t.prayer === 'ASR')!;
      const maghribTab = vm.tabs.find(t => t.prayer === 'MAGHRIB')!;

      expect(dhuhrTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(asrTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(maghribTab.completedTasks.some(t => t.occurrenceId === occ.id)).toBe(false);
    });
  });

  describe('PRAYER FRAGMENTS (PF-01 to PF-04) & PRAYER TABS (PT-01 to PT-05)', () => {
    it('PF-01: for past + future same-label fragments, nearest future is chosen with FUTURE state', () => {
      // With custom boundary at 20:00, Maghrib (approx 19:10 -> 20:25) is cut at both ends:
      // Fragment 1 (past): Sept 14 20:00 -> 20:25
      // Fragment 2 (future): Sept 15 19:08 -> 20:00
      const customDay20 = buildPlanningDay(
        { mode: 'CUSTOM', localTime: '20:00' },
        timeline,
        '2026-09-15'
      );
      // Midday on Sept 15 (12:00)
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const rep = getRepresentativePeriodForTab('MAGHRIB', customDay20, now);

      expect(rep.temporalState).toBe('FUTURE');
      expect(rep.period.start > now).toBe(true);
    });

    it('PF-02: containing fragment is chosen with CURRENT state', () => {
      const dhuhr = fajrPlanningDay.periods.find(p => p.prayer === 'DHUHR')!;
      const now = dhuhr.start.plus({ minutes: 30 });

      const rep = getRepresentativePeriodForTab('DHUHR', fajrPlanningDay, now);
      expect(rep.temporalState).toBe('CURRENT');
      expect(rep.period).toBe(dhuhr);
    });

    it('PF-03: when all fragments are in past, most recent past is chosen with PAST state', () => {
      const isha = fajrPlanningDay.periods.find(p => p.prayer === 'ISHA')!;
      const now = isha.end.plus({ minutes: 30 });

      const rep = getRepresentativePeriodForTab('FAJR', fajrPlanningDay, now);
      expect(rep.temporalState).toBe('PAST');
    });

    it('PF-04: always exactly five tabs in planning day', () => {
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([], new Map(), fajrPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs).toHaveLength(5);
    });

    it('PT-01: five tabs in fixed canonical order FAJR -> ISHA', () => {
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([], new Map(), fajrPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs.map(t => t.prayer)).toEqual(PRAYER_ORDER);
    });

    it('PT-03: temporalState is independent from selection state', () => {
      const dhuhr = fajrPlanningDay.periods.find(p => p.prayer === 'DHUHR')!;
      const now = dhuhr.start.plus({ minutes: 10 });
      const vm = projectTodayViewModel([], new Map(), fajrPlanningDay, timeline, now, 'America/New_York');

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      const asrTab = vm.tabs.find(t => t.prayer === 'ASR')!;

      expect(fajrTab.temporalState).toBe('PAST');
      expect(dhuhrTab.temporalState).toBe('CURRENT');
      expect(asrTab.temporalState).toBe('FUTURE');
    });

    it('PT-04: no Sunrise tab exists in the planner', () => {
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([], new Map(), fajrPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs.some(t => (t.prayer as any) === 'SUNRISE')).toBe(false);
    });

    it('PT-05: custom duplicate fragments still project to exactly 5 tabs', () => {
      const now = customPlanningDay.start.plus({ hours: 2 });
      const vm = projectTodayViewModel([], new Map(), customPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs).toHaveLength(5);
    });
  });

  describe('EXACT & RELATIVE TASKS (ER-01 to ER-03)', () => {
    it('ER-01: EXACT_TIME task projects to single tab specified by calculatedPrayerSection', () => {
      const occ: TaskOccurrence = {
        id: 'exact-1',
        taskDefinitionId: 'def-exact',
        seriesId: 's-exact',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T13:30:00.000-04:00',
        calculatedPrayerSection: 'DHUHR',
        eligiblePrayerSections: ['DHUHR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const def: TaskDefinition = {
        id: 'def-exact',
        title: 'Exact Time Meeting',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '13:30' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-exact',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: 30,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      };

      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      const asrTab = vm.tabs.find(t => t.prayer === 'ASR')!;

      expect(dhuhrTab.scheduledTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
      expect(asrTab.scheduledTasks.some(t => t.occurrenceId === occ.id)).toBe(false);
    });

    it('ER-02: PRAYER_RELATIVE task projects to single tab specified by calculatedPrayerSection', () => {
      const occ: TaskOccurrence = {
        id: 'rel-1',
        taskDefinitionId: 'def-rel',
        seriesId: 's-rel',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T19:00:00.000-04:00',
        calculatedPrayerSection: 'MAGHRIB',
        eligiblePrayerSections: ['MAGHRIB'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const def: TaskDefinition = {
        id: 'def-rel',
        title: 'Maghrib Quran',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: { anchorPrayer: 'MAGHRIB', direction: 'AFTER', offsetMinutes: 30 },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-rel',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'IMPORTANT',
        estimatedMinutes: 20,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      };

      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const maghribTab = vm.tabs.find(t => t.prayer === 'MAGHRIB')!;
      expect(maghribTab.scheduledTasks.some(t => t.occurrenceId === occ.id)).toBe(true);
    });

    it('ER-03: formats schedule display labels correctly', () => {
      const defExact: Partial<TaskDefinition> = {
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
      };
      const occExact: Partial<TaskOccurrence> = {
        calculatedStartTime: '2026-09-15T18:00:00.000-04:00',
      };
      expect(formatScheduleLabel(defExact as TaskDefinition, occExact as TaskOccurrence, 'America/New_York')).toBe('6:00 PM');

      const defRel: Partial<TaskDefinition> = {
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: { anchorPrayer: 'MAGHRIB', direction: 'AFTER', offsetMinutes: 30 },
      };
      expect(formatScheduleLabel(defRel as TaskDefinition, {} as TaskOccurrence, 'America/New_York')).toBe('Maghrib +30 min');

      const defWin: Partial<TaskDefinition> = {
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: { startPrayer: 'DHUHR', endPrayer: 'ISHA' },
      };
      expect(formatScheduleLabel(defWin as TaskDefinition, {} as TaskOccurrence, 'America/New_York')).toBe('Dhuhr – Isha');

      const defAny: Partial<TaskDefinition> = {
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      };
      expect(formatScheduleLabel(defAny as TaskDefinition, {} as TaskOccurrence, 'America/New_York')).toBe('Anytime Today');
    });
  });

  describe('ANYTIME TODAY (AT-01 to AT-04)', () => {
    const makeAnytimeDefAndOcc = () => {
      const def: TaskDefinition = {
        id: 'def-anytime',
        title: 'Walk 10k Steps',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-anytime',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: 60,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-09-15T08:00:00.000Z',
      };

      const occ: TaskOccurrence = {
        id: 'anytime-occ-1',
        taskDefinitionId: 'def-anytime',
        seriesId: 's-anytime',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      return { def, occ };
    };

    it('AT-01: anytime tasks project into bottom anytime section of every tab', () => {
      const { def, occ } = makeAnytimeDefAndOcc();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      for (const tab of vm.tabs) {
        expect(tab.anytimeTasks).toHaveLength(1);
        expect(tab.anytimeTasks[0].occurrenceId).toBe('anytime-occ-1');
      }
    });

    it('AT-02: anytime tasks never create a sixth tab', () => {
      const { def, occ } = makeAnytimeDefAndOcc();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs).toHaveLength(5);
    });

    it('AT-03: same occurrenceId everywhere across all five tabs', () => {
      const { def, occ } = makeAnytimeDefAndOcc();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const occurrenceIds = vm.tabs.map(tab => tab.anytimeTasks[0].occurrenceId);
      expect(new Set(occurrenceIds).size).toBe(1);
      expect(occurrenceIds[0]).toBe('anytime-occ-1');
    });

    it('AT-04: identified semantically by scheduleType === ANYTIME_TODAY', () => {
      const { def, occ } = makeAnytimeDefAndOcc();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      expect(vm.tabs[0].anytimeTasks[0].scheduleType).toBe('ANYTIME_TODAY');
    });
  });

  describe('STATUS SECTIONS (ST-01 to ST-05)', () => {
    const makeStatusFixtures = () => {
      const def: TaskDefinition = {
        id: 'def-status',
        title: 'Status Task Title',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '05:30' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-status',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T04:00:00.000Z',
        updatedAt: '2026-09-15T04:00:00.000Z',
      };

      const missedOcc: TaskOccurrence = {
        id: 'occ-st-missed',
        taskDefinitionId: 'def-status',
        seriesId: 's-status',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:30:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'MISSED',
        completedAt: null,
        missedAt: '2026-09-15T07:00:00.000Z',
        overrideData: null,
      };

      const completedOcc: TaskOccurrence = {
        id: 'occ-st-completed',
        taskDefinitionId: 'def-status',
        seriesId: 's-status',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:40:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'COMPLETED',
        completedAt: '2026-09-15T05:45:00.000Z',
        missedAt: null,
        overrideData: null,
      };

      const pendingOcc: TaskOccurrence = {
        id: 'occ-st-pending',
        taskDefinitionId: 'def-status',
        seriesId: 's-status',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:50:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      return { def, missedOcc, completedOcc, pendingOcc };
    };

    it('ST-01: COMPLETED tasks appear in completedTasks section as muted', () => {
      const { def, completedOcc } = makeStatusFixtures();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([completedOcc], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.completedTasks).toHaveLength(1);
      expect(fajrTab.completedTasks[0].occurrenceId).toBe('occ-st-completed');
      expect(fajrTab.completedTasks[0].status).toBe('COMPLETED');
    });

    it('ST-02: MISSED tasks appear in missedTasks section with explicit badge', () => {
      const { def, missedOcc } = makeStatusFixtures();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([missedOcc], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.missedTasks).toHaveLength(1);
      expect(fajrTab.missedTasks[0].occurrenceId).toBe('occ-st-missed');
      expect(fajrTab.missedTasks[0].status).toBe('MISSED');
    });

    it('ST-03: no auto-roll of any status to next prayer tab', () => {
      const { def, missedOcc, pendingOcc } = makeStatusFixtures();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([missedOcc, pendingOcc], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      expect(dhuhrTab.scheduledTasks).toHaveLength(0);
      expect(dhuhrTab.missedTasks).toHaveLength(0);
    });

    it('ST-04: Completed (N) counts COMPLETED tasks only, never MISSED', () => {
      const { def, missedOcc, completedOcc } = makeStatusFixtures();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([missedOcc, completedOcc], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.completedTasks).toHaveLength(1);
      expect(fajrTab.completedTasks[0].occurrenceId).toBe('occ-st-completed');
    });

    it('ST-05: MISSED tasks are never rendered inside Completed section', () => {
      const { def, missedOcc, completedOcc } = makeStatusFixtures();
      const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([missedOcc, completedOcc], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.completedTasks.some(t => t.occurrenceId === 'occ-st-missed')).toBe(false);
    });
  });

  describe('SORTING (SO-01 to SO-04 & SORT-01)', () => {
    it('SO-01: chronological order first, priority as tie-breaker', () => {
      const defNormal: TaskDefinition = {
        id: 'def-normal',
        title: 'Earlier Normal Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:15' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-normal',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      };

      const defImportant: TaskDefinition = {
        id: 'def-imp',
        title: 'Later Important Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '13:00' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-imp',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'IMPORTANT',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      };

      const occNormal: TaskOccurrence = {
        id: 'occ-normal',
        taskDefinitionId: 'def-normal',
        seriesId: 's-normal',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T12:15:00.000-04:00',
        calculatedPrayerSection: 'DHUHR',
        eligiblePrayerSections: ['DHUHR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const occImportant: TaskOccurrence = {
        id: 'occ-imp',
        taskDefinitionId: 'def-imp',
        seriesId: 's-imp',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T13:00:00.000-04:00',
        calculatedPrayerSection: 'DHUHR',
        eligiblePrayerSections: ['DHUHR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const now = DateTime.fromISO('2026-09-15T11:00:00.000', { zone: 'America/New_York' });
      const defs = new Map([
        [defNormal.id, defNormal],
        [defImportant.id, defImportant],
      ]);

      const vm = projectTodayViewModel(
        [occImportant, occNormal], // passed in reverse order
        defs,
        fajrPlanningDay,
        timeline,
        now,
        'America/New_York'
      );

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      expect(dhuhrTab.scheduledTasks).toHaveLength(2);
      // Earlier normal task must appear before later important task!
      expect(dhuhrTab.scheduledTasks[0].occurrenceId).toBe('occ-normal');
      expect(dhuhrTab.scheduledTasks[1].occurrenceId).toBe('occ-imp');
    });

    it('SORT-01 / SO-02: same PrayerWindow occurrence projected into two tabs has two different sortInstant values', () => {
      const dhuhr = fajrPlanningDay.periods.find(p => p.prayer === 'DHUHR')!;
      const asr = fajrPlanningDay.periods.find(p => p.prayer === 'ASR')!;
      const maghrib = fajrPlanningDay.periods.find(p => p.prayer === 'MAGHRIB')!;

      const occ: TaskOccurrence = {
        id: 'occ-pw-sort',
        taskDefinitionId: 'def-pw-sort',
        seriesId: 's-pw-sort',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: ['DHUHR', 'ASR'],
        wallClockResolution: 'NORMAL',
        windowStart: dhuhr.start.toUTC().toISO()!,
        windowEnd: maghrib.start.toUTC().toISO()!,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const def: TaskDefinition = {
        id: 'def-pw-sort',
        title: 'Dhuhr to Maghrib Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: { startPrayer: 'DHUHR', endPrayer: 'MAGHRIB' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-pw-sort',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      };

      const now = DateTime.fromISO('2026-09-15T11:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel([occ], new Map([[def.id, def]]), fajrPlanningDay, timeline, now, 'America/New_York');

      const dhuhrTab = vm.tabs.find(t => t.prayer === 'DHUHR')!;
      const asrTab = vm.tabs.find(t => t.prayer === 'ASR')!;

      const cardInDhuhr = dhuhrTab.scheduledTasks.find(t => t.occurrenceId === occ.id)!;
      const cardInAsr = asrTab.scheduledTasks.find(t => t.occurrenceId === occ.id)!;

      expect(cardInDhuhr).toBeDefined();
      expect(cardInAsr).toBeDefined();

      // Same occurrenceId
      expect(cardInDhuhr.occurrenceId).toBe(cardInAsr.occurrenceId);

      // Different sortInstant!
      // In Dhuhr tab: sortInstant is start of window intersection with Dhuhr (dhuhr.start)
      // In Asr tab: sortInstant is start of window intersection with Asr (asr.start)
      expect(cardInDhuhr.sortInstant).not.toBe(cardInAsr.sortInstant);
      expect(cardInAsr.sortInstant).toBe(asr.start.toUTC().toISO());
      expect(DateTime.fromISO(cardInDhuhr.sortInstant!).toMillis()).toBeLessThan(
        DateTime.fromISO(cardInAsr.sortInstant!).toMillis()
      );
    });

    it('SO-03: MISSED tasks are segregated into missedTasks and separated from completedTasks', () => {
      const defMissed: TaskDefinition = {
        id: 'def-so-m',
        title: 'Missed Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '05:00' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-so-m',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T04:00:00.000Z',
        updatedAt: '2026-09-15T04:00:00.000Z',
      };

      const defCompleted: TaskDefinition = {
        id: 'def-so-c',
        title: 'Completed Task',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '05:30' },
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-so-c',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T04:00:00.000Z',
        updatedAt: '2026-09-15T04:00:00.000Z',
      };

      const occMissed: TaskOccurrence = {
        id: 'occ-so-m',
        taskDefinitionId: 'def-so-m',
        seriesId: 's-so-m',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:00:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'MISSED',
        completedAt: null,
        missedAt: '2026-09-15T06:00:00.000Z',
        overrideData: null,
      };

      const occCompleted: TaskOccurrence = {
        id: 'occ-so-c',
        taskDefinitionId: 'def-so-c',
        seriesId: 's-so-c',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:30:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        windowStart: null,
        windowEnd: null,
        status: 'COMPLETED',
        completedAt: '2026-09-15T05:35:00.000Z',
        missedAt: null,
        overrideData: null,
      };

      const now = DateTime.fromISO('2026-09-15T11:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel(
        [occCompleted, occMissed],
        new Map([[defMissed.id, defMissed], [defCompleted.id, defCompleted]]),
        fajrPlanningDay,
        timeline,
        now,
        'America/New_York'
      );

      const fajrTab = vm.tabs.find(t => t.prayer === 'FAJR')!;
      expect(fajrTab.missedTasks).toHaveLength(1);
      expect(fajrTab.missedTasks[0].occurrenceId).toBe('occ-so-m');
      expect(fajrTab.completedTasks).toHaveLength(1);
      expect(fajrTab.completedTasks[0].occurrenceId).toBe('occ-so-c');
      // Missed task is NOT in completedTasks
      expect(fajrTab.completedTasks.some(t => t.status === 'MISSED')).toBe(false);
    });

    it('SO-04: Anytime section sorts IMPORTANT first, then creation order', () => {
      const def1: TaskDefinition = {
        id: 'def-a1',
        title: 'Normal Earlier',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-a1',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-09-15T08:00:00.000Z',
      };

      const def2: TaskDefinition = {
        id: 'def-a2',
        title: 'Important Later',
        description: null,
        startDate: '2026-09-15',
        source: 'USER',
        worshipItemKey: null,
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: null,
        hijriRecurrence: null,
        recurrenceEnd: null,
        seriesId: 's-a2',
        seriesVersion: 1,
        effectiveFromDate: null,
        effectiveToDate: null,
        reminderRule: null,
        priority: 'IMPORTANT',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
        createdAt: '2026-09-15T09:00:00.000Z',
        updatedAt: '2026-09-15T09:00:00.000Z',
      };

      const occ1: TaskOccurrence = {
        id: 'occ-a1',
        taskDefinitionId: 'def-a1',
        seriesId: 's-a1',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const occ2: TaskOccurrence = {
        id: 'occ-a2',
        taskDefinitionId: 'def-a2',
        seriesId: 's-a2',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
        status: 'PENDING',
        completedAt: null,
        missedAt: null,
        overrideData: null,
      };

      const now = DateTime.fromISO('2026-09-15T11:00:00.000', { zone: 'America/New_York' });
      const vm = projectTodayViewModel(
        [occ1, occ2],
        new Map([[def1.id, def1], [def2.id, def2]]),
        fajrPlanningDay,
        timeline,
        now,
        'America/New_York'
      );

      const tab = vm.tabs[0];
      expect(tab.anytimeTasks).toHaveLength(2);
      expect(tab.anytimeTasks[0].occurrenceId).toBe('occ-a2'); // IMPORTANT first
      expect(tab.anytimeTasks[1].occurrenceId).toBe('occ-a1');
    });
  });

  describe('EMPTY STATES (ES-01 to ES-05)', () => {
    it('ES-01: current tab empty shows "Nothing scheduled until [NextPrayer]"', () => {
      const msg = getEmptyStateMessage('NOTHING_SCHEDULED', 'DHUHR', 'DHUHR', 'ASR');
      expect(msg).toBe('Nothing scheduled until Asr.');
    });

    it('ES-02: current tab all completed shows "All done until [NextPrayer]"', () => {
      const msg = getEmptyStateMessage('ALL_DONE', 'DHUHR', 'DHUHR', 'ASR');
      expect(msg).toBe('All done until Asr.');
    });

    it('ES-03: Isha current shows "until Fajr"', () => {
      const msg = getEmptyStateMessage('NOTHING_SCHEDULED', 'ISHA', 'ISHA', 'FAJR');
      expect(msg).toBe('Nothing scheduled until Fajr.');
    });

    it('ES-04: non-current tab shows "for [SelectedPrayer]"', () => {
      const msgNothing = getEmptyStateMessage('NOTHING_SCHEDULED', 'FAJR', 'DHUHR', 'ASR');
      expect(msgNothing).toBe('Nothing scheduled for Fajr.');

      const msgDone = getEmptyStateMessage('ALL_DONE', 'FAJR', 'DHUHR', 'ASR');
      expect(msgDone).toBe('All done for Fajr.');
    });

    it('ES-05: MISSED task present prevents "All done" empty state', () => {
      const dummyTab = {
        prayer: 'FAJR' as const,
        name: 'Fajr',
        arabicName: 'الفجر',
        startTime: '5:00 AM',
        startDateTime: '2026-09-15T05:00:00.000Z',
        temporalState: 'PAST' as const,
        scheduledTasks: [],
        missedTasks: [
          {
            occurrenceId: 'm1',
            taskDefinitionId: 'd1',
            title: 'Missed Task',
            scheduleType: 'EXACT_TIME' as const,
            scheduleLabel: '5:00 AM',
            priority: 'NORMAL' as const,
            status: 'MISSED' as const,
            estimatedMinutes: null,
            sortInstant: null,
            createdAt: '2026-09-15T04:00:00.000Z',
            completedAt: null,
            missedAt: '2026-09-15T06:00:00.000Z',
          },
        ],
        completedTasks: [
          {
            occurrenceId: 'c1',
            taskDefinitionId: 'd2',
            title: 'Completed Task',
            scheduleType: 'EXACT_TIME' as const,
            scheduleLabel: '5:30 AM',
            priority: 'NORMAL' as const,
            status: 'COMPLETED' as const,
            estimatedMinutes: null,
            sortInstant: null,
            createdAt: '2026-09-15T04:00:00.000Z',
            completedAt: '2026-09-15T05:35:00.000Z',
            missedAt: null,
          },
        ],
        anytimeTasks: [],
      };

      const emptyState = computeEmptyState(dummyTab);
      // Must be null — NOT ALL_DONE
      expect(emptyState).toBeNull();
    });
  });
});
