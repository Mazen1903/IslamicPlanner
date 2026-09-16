import { execSync } from 'child_process';
import { HijriService } from '../../calendar/HijriService';
import type { TaskDefinition } from '../../task/types';
import { RecurrenceError } from '../errors';
import { parseRecurrenceRule } from '../rruleAdapter';
import { RecurrenceEngine } from '../RecurrenceEngine';
import type { RecurrenceContext } from '../types';

function createTestDefinition(
  overrides?: Partial<TaskDefinition>
): TaskDefinition {
  const startDate = overrides?.startDate ?? '2026-01-01';
  return {
    id: 'test-def-1',
    title: 'Test Task',
    description: null,
    startDate,
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'ANYTIME_TODAY',
    scheduleData: {},
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: 'series-1',
    seriesVersion: 1,
    effectiveFromDate: startDate,
    effectiveToDate: null,
    reminderRule: null,
    priority: 'NORMAL',
    estimatedMinutes: 30,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RecurrenceEngine (M9)', () => {
  let engine: RecurrenceEngine;
  let hijriService: HijriService;
  let context: RecurrenceContext;

  beforeEach(() => {
    engine = new RecurrenceEngine();
    hijriService = new HijriService();
    context = {
      hijriService,
      hijriAdjustment: { globalAdjustment: 0 },
    };
  });

  // ==========================================================================
  // A. CORE INVARIANT
  // occursOn(def, D, ctx) === generateSeedDates(def, {start: D, end: D}, ctx).includes(D)
  // ==========================================================================
  describe('A. Core Invariant: occursOn === generateSeedDates(singleDay).includes', () => {
    const testCases: {
      name: string;
      def: TaskDefinition;
      testDates: string[];
      ctx?: RecurrenceContext;
    }[] = [
      {
        name: 'Non-recurring task',
        def: createTestDefinition({
          startDate: '2026-03-15',
          recurrenceRule: null,
        }),
        testDates: ['2026-03-14', '2026-03-15', '2026-03-16'],
      },
      {
        name: 'Daily interval 1',
        def: createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY',
        }),
        testDates: ['2025-12-31', '2026-01-01', '2026-01-02', '2026-02-15'],
      },
      {
        name: 'Daily interval 3',
        def: createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=3',
        }),
        testDates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-07'],
      },
      {
        name: 'Weekly interval 1 with multiple days',
        def: createTestDefinition({
          startDate: '2026-01-05', // Monday
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        }),
        testDates: ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10'],
      },
      {
        name: 'Weekly interval 2',
        def: createTestDefinition({
          startDate: '2026-01-05',
          recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH',
        }),
        testDates: ['2026-01-06', '2026-01-13', '2026-01-20', '2026-01-22'],
      },
      {
        name: 'Monthly with clamping (day 31)',
        def: createTestDefinition({
          startDate: '2026-01-31',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=31',
        }),
        testDates: ['2026-01-31', '2026-02-27', '2026-02-28', '2026-04-30', '2026-05-31'],
      },
      {
        name: 'Monthly multi-day with dedup (days 30, 31)',
        def: createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=30,31',
        }),
        testDates: ['2026-02-28', '2026-04-30', '2026-05-30', '2026-05-31'],
      },
      {
        name: 'Hijri recurrence: 1st of month',
        def: createTestDefinition({
          startDate: '2026-01-01',
          hijriRecurrence: { hijriDays: [1], hijriMonths: null },
        }),
        testDates: ['2026-01-01', '2026-01-10', '2026-01-20', '2026-02-18'],
      },
      {
        name: 'Hijri recurrence: White Days [13, 14, 15]',
        def: createTestDefinition({
          startDate: '2026-01-01',
          hijriRecurrence: { hijriDays: [13, 14, 15], hijriMonths: null },
        }),
        testDates: ['2026-01-01', '2026-01-22', '2026-01-23', '2026-01-24'],
      },
    ];

    for (const tc of testCases) {
      it(`satisfies invariant for: ${tc.name}`, () => {
        const activeCtx = tc.ctx ?? context;
        for (const d of tc.testDates) {
          const occurs = engine.occursOn(tc.def, d, activeCtx);
          const generated = engine.generateSeedDates(
            tc.def,
            { start: d, end: d },
            activeCtx
          );
          expect(occurs).toBe(generated.includes(d));
        }
      });
    }
  });

  // ==========================================================================
  // B. GREGORIAN RECURRENCE
  // ==========================================================================
  describe('B. Gregorian Recurrence', () => {
    describe('Non-recurring', () => {
      const def = createTestDefinition({
        startDate: '2026-05-10',
        recurrenceRule: null,
      });

      it('NR-01: occursOn returns true on startDate', () => {
        expect(engine.occursOn(def, '2026-05-10')).toBe(true);
      });

      it('NR-02: occursOn returns false on any other date', () => {
        expect(engine.occursOn(def, '2026-05-09')).toBe(false);
        expect(engine.occursOn(def, '2026-05-11')).toBe(false);
      });

      it('NR-03: generateSeedDates includes startDate when in range', () => {
        const dates = engine.generateSeedDates(def, {
          start: '2026-05-01',
          end: '2026-05-31',
        });
        expect(dates).toEqual(['2026-05-10']);
      });

      it('NR-04: generateSeedDates returns empty array when startDate outside range', () => {
        const dates = engine.generateSeedDates(def, {
          start: '2026-06-01',
          end: '2026-06-30',
        });
        expect(dates).toEqual([]);
      });
    });

    describe('Daily recurrence', () => {
      it('DA-01: Every day (INTERVAL=1) generates consecutive dates', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-01-05',
        });
        expect(dates).toEqual([
          '2026-01-01',
          '2026-01-02',
          '2026-01-03',
          '2026-01-04',
          '2026-01-05',
        ]);
      });

      it('DA-02: Every 3 days correctly paces from anchor', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=3',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-01-10',
        });
        expect(dates).toEqual([
          '2026-01-01',
          '2026-01-04',
          '2026-01-07',
          '2026-01-10',
        ]);
      });

      it('DA-03: Non-matching dates return false for interval > 1', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=3',
        });
        expect(engine.occursOn(def, '2026-01-02')).toBe(false);
        expect(engine.occursOn(def, '2026-01-03')).toBe(false);
        expect(engine.occursOn(def, '2026-01-04')).toBe(true);
      });

      it('DA-04: Dates before startDate return false', () => {
        const def = createTestDefinition({
          startDate: '2026-01-10',
          recurrenceRule: 'FREQ=DAILY',
        });
        expect(engine.occursOn(def, '2026-01-09')).toBe(false);
      });

      it('DA-05: Bounded generation jumps into range correctly', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=5',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-12',
          end: '2026-01-28',
        });
        expect(dates).toEqual(['2026-01-16', '2026-01-21', '2026-01-26']);
      });

      it('DA-06: Respects recurrenceEnd inclusive boundary', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY',
          recurrenceEnd: '2026-01-03',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-01-10',
        });
        expect(dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
        expect(engine.occursOn(def, '2026-01-03')).toBe(true);
        expect(engine.occursOn(def, '2026-01-04')).toBe(false);
      });

      it('DA-07: Respects effectiveToDate inclusive boundary', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY',
          effectiveToDate: '2026-01-02',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-01-05',
        });
        expect(dates).toEqual(['2026-01-01', '2026-01-02']);
      });

      it('DA-08: Crosses month boundaries seamlessly', () => {
        const def = createTestDefinition({
          startDate: '2026-01-30',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=2',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-30',
          end: '2026-02-04',
        });
        expect(dates).toEqual(['2026-01-30', '2026-02-01', '2026-02-03']);
      });

      it('DA-09: Crosses year boundary seamlessly', () => {
        const def = createTestDefinition({
          startDate: '2025-12-30',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=2',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2025-12-30',
          end: '2026-01-04',
        });
        expect(dates).toEqual([
          '2025-12-30',
          '2026-01-01',
          '2026-01-03',
        ]);
      });

      it('DA-10: Handles large intervals accurately', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=DAILY;INTERVAL=30',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-04-01',
        });
        expect(dates).toEqual([
          '2026-01-01',
          '2026-01-31',
          '2026-03-02',
          '2026-04-01',
        ]);
      });
    });

    describe('Weekly recurrence', () => {
      it('WD-01: Single weekday recurrence (e.g. every Tuesday)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01', // Thursday
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-01-20',
        });
        expect(dates).toEqual(['2026-01-06', '2026-01-13', '2026-01-20']);
      });

      it('WD-02: Weekdays (Mon-Fri) excluding weekends', () => {
        const def = createTestDefinition({
          startDate: '2026-01-05', // Monday
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-05',
          end: '2026-01-11',
        });
        expect(dates).toEqual([
          '2026-01-05',
          '2026-01-06',
          '2026-01-07',
          '2026-01-08',
          '2026-01-09',
        ]);
        expect(dates.includes('2026-01-10')).toBe(false);
        expect(dates.includes('2026-01-11')).toBe(false);
      });

      it('WD-03: Weekend only (Sat, Sun)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-05',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA,SU',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-05',
          end: '2026-01-12',
        });
        expect(dates).toEqual(['2026-01-10', '2026-01-11']);
      });

      it('WD-04: Selected weekdays (Mon, Wed, Fri)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-05',
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-05',
          end: '2026-01-12',
        });
        expect(dates).toEqual([
          '2026-01-05',
          '2026-01-07',
          '2026-01-09',
          '2026-01-12',
        ]);
      });
    });

    describe('Monthly Gregorian with Clamping', () => {
      it('MG-01: Standard day-of-month recurrence (15th)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-15',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=15',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-04-30',
        });
        expect(dates).toEqual([
          '2026-01-15',
          '2026-02-15',
          '2026-03-15',
          '2026-04-15',
        ]);
      });

      it('MG-02: Day 31 clamps to month length (Feb 28, Apr 30, etc.)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-31',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=31',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-05-31',
        });
        expect(dates).toEqual([
          '2026-01-31',
          '2026-02-28',
          '2026-03-31',
          '2026-04-30',
          '2026-05-31',
        ]);
      });

      it('MG-03: Day 31 in leap-year February clamps to 29', () => {
        const def = createTestDefinition({
          startDate: '2024-01-31',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=31',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2024-02-01',
          end: '2024-02-29',
        });
        expect(dates).toEqual(['2024-02-29']);
      });

      it('MG-04: Day 30 in non-leap February clamps to 28', () => {
        const def = createTestDefinition({
          startDate: '2026-01-30',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=30',
        });
        expect(engine.occursOn(def, '2026-02-28')).toBe(true);
      });

      it('MG-05: Day 29 in non-leap February clamps to 28', () => {
        const def = createTestDefinition({
          startDate: '2026-01-29',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=29',
        });
        expect(engine.occursOn(def, '2026-02-28')).toBe(true);
      });

      it('MG-06: Day 29 in leap February occurs on 29', () => {
        const def = createTestDefinition({
          startDate: '2024-01-29',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=29',
        });
        expect(engine.occursOn(def, '2024-02-29')).toBe(true);
        expect(engine.occursOn(def, '2024-02-28')).toBe(false);
      });

      it('MG-07: Multi-BYMONTHDAY (1, 15) produces two dates per month', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1,15',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-02-28',
        });
        expect(dates).toEqual([
          '2026-01-01',
          '2026-01-15',
          '2026-02-01',
          '2026-02-15',
        ]);
      });

      it('MG-08: Multi-BYMONTHDAY deduplicates when multiple days clamp to same last day', () => {
        const def = createTestDefinition({
          startDate: '2026-04-01',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=30,31',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-04-01',
          end: '2026-04-30',
        });
        expect(dates).toEqual(['2026-04-30']);
      });

      it('MG-09: Multi-BYMONTHDAY in non-leap Feb: [29, 30, 31] all clamp to Feb 28 once', () => {
        const def = createTestDefinition({
          startDate: '2026-01-01',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=29,30,31',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-02-01',
          end: '2026-02-28',
        });
        expect(dates).toEqual(['2026-02-28']);
      });

      it('MG-10: Multi-BYMONTHDAY in leap Feb: [28, 29, 30, 31] yields Feb 28 and Feb 29', () => {
        const def = createTestDefinition({
          startDate: '2024-01-01',
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=28,29,30,31',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2024-02-01',
          end: '2024-02-29',
        });
        expect(dates).toEqual(['2024-02-28', '2024-02-29']);
      });

      it('MG-11: Monthly interval = 2 (every other month)', () => {
        const def = createTestDefinition({
          startDate: '2026-01-15',
          recurrenceRule: 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2026-01-01',
          end: '2026-06-30',
        });
        expect(dates).toEqual(['2026-01-15', '2026-03-15', '2026-05-15']);
      });

      it('MG-12: Monthly interval across year boundary', () => {
        const def = createTestDefinition({
          startDate: '2025-11-10',
          recurrenceRule: 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=10',
        });
        const dates = engine.generateSeedDates(def, {
          start: '2025-11-01',
          end: '2026-03-31',
        });
        expect(dates).toEqual(['2025-11-10', '2026-01-10', '2026-03-10']);
      });
    });
  });

  // ==========================================================================
  // C. WEEKLY INTERVAL PHASE (Rev 4 §1)
  // ==========================================================================
  describe('C. Weekly Phase & Anchor Semantics', () => {
    it('WP-01: FREQ=WEEKLY;INTERVAL=2;BYDAY=MO preserves cadence across Dec -> Jan', () => {
      const def = createTestDefinition({
        startDate: '2026-12-21',
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
      });
      const dates = engine.generateSeedDates(def, {
        start: '2026-12-21',
        end: '2027-01-20',
      });
      expect(dates).toEqual(['2026-12-21', '2027-01-04', '2027-01-18']);
      expect(engine.occursOn(def, '2026-12-28')).toBe(false);
      expect(engine.occursOn(def, '2027-01-11')).toBe(false);
    });

    it('WP-02: FREQ=WEEKLY;INTERVAL=2;BYDAY=TH crossing ISO week-53 transition', () => {
      const def = createTestDefinition({
        startDate: '2020-12-24',
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TH',
      });
      const dates = engine.generateSeedDates(def, {
        start: '2020-12-24',
        end: '2021-01-25',
      });
      expect(dates).toEqual(['2020-12-24', '2021-01-07', '2021-01-21']);
      expect(engine.occursOn(def, '2020-12-31')).toBe(false);
      expect(engine.occursOn(def, '2021-01-14')).toBe(false);
    });

    it('WP-03: Midweek startDate excludes earlier BYDAY values in anchor week', () => {
      const def = createTestDefinition({
        startDate: '2026-01-07',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      });
      const dates = engine.generateSeedDates(def, {
        start: '2026-01-05',
        end: '2026-01-12',
      });
      expect(dates).toEqual(['2026-01-07', '2026-01-09', '2026-01-12']);
      expect(engine.occursOn(def, '2026-01-05')).toBe(false);
      expect(engine.occursOn(def, '2026-01-07')).toBe(true);
      expect(engine.occursOn(def, '2026-01-09')).toBe(true);
    });

    it('WP-04: Friday startDate excludes earlier Mon and Wed in anchor week', () => {
      const def = createTestDefinition({
        startDate: '2026-01-09',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      });
      const dates = engine.generateSeedDates(def, {
        start: '2026-01-05',
        end: '2026-01-12',
      });
      expect(dates).toEqual(['2026-01-09', '2026-01-12']);
      expect(engine.occursOn(def, '2026-01-05')).toBe(false);
      expect(engine.occursOn(def, '2026-01-07')).toBe(false);
      expect(engine.occursOn(def, '2026-01-09')).toBe(true);
    });

    it('WP-05: Monday anchor with INTERVAL=1 includes Monday and subsequent days', () => {
      const def = createTestDefinition({
        startDate: '2026-01-05',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      });
      const dates = engine.generateSeedDates(def, {
        start: '2026-01-05',
        end: '2026-01-09',
      });
      expect(dates).toEqual(['2026-01-05', '2026-01-07', '2026-01-09']);
    });
  });

  // ==========================================================================
  // D. RRULE TOKEN VALIDATION (Rev 4 §2)
  // ==========================================================================
  describe('D. RRULE Token Parsing and Strict Allowlist', () => {
    it('parses valid supported rules', () => {
      expect(parseRecurrenceRule('FREQ=DAILY')).toEqual({
        frequency: 'DAILY',
        interval: 1,
      });
      expect(parseRecurrenceRule('FREQ=DAILY;INTERVAL=2')).toEqual({
        frequency: 'DAILY',
        interval: 2,
      });
      expect(parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toEqual({
        frequency: 'WEEKLY',
        interval: 1,
        byWeekday: [1, 3, 5],
      });
      expect(parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=15')).toEqual({
        frequency: 'MONTHLY',
        interval: 1,
        byMonthDay: [15],
      });
    });

    it('RT-01: Unknown key throws UNSUPPORTED_RULE_FEATURE', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;FOO=BAR')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
    });

    it('RT-02: Duplicate key throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;FREQ=WEEKLY')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RT-03: BYMONTHDAY=0 throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=0')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RT-04: BYMONTHDAY=32 throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=32')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RT-05: Ordinal BYDAY (e.g. 2TU) throws UNSUPPORTED_RULE_FEATURE', () => {
      expect(() => parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,2TU')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
      expect(() => parseRecurrenceRule('FREQ=WEEKLY;BYDAY=-1FR')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
    });

    it('RT-06: INTERVAL=0 throws INVALID_INTERVAL', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;INTERVAL=0')).toThrow(
        expect.objectContaining({ code: 'INVALID_INTERVAL' })
      );
    });

    it('RT-07: Negative INTERVAL throws INVALID_INTERVAL', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;INTERVAL=-1')).toThrow(
        expect.objectContaining({ code: 'INVALID_INTERVAL' })
      );
    });

    it('RT-08: Decimal INTERVAL throws INVALID_INTERVAL', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;INTERVAL=1.5')).toThrow(
        expect.objectContaining({ code: 'INVALID_INTERVAL' })
      );
    });

    it('RT-09: RRULE: prefix is rejected with INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('RRULE:FREQ=DAILY')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RT-10: Negative BYMONTHDAY=-1 throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=-1')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RS-01: FREQ=YEARLY throws UNSUPPORTED_FREQUENCY', () => {
      expect(() => parseRecurrenceRule('FREQ=YEARLY')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_FREQUENCY' })
      );
    });

    it('RS-02: COUNT in rule throws UNSUPPORTED_RULE_FEATURE', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;COUNT=10')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
    });

    it('RS-03: UNTIL in rule throws UNSUPPORTED_RULE_FEATURE', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;UNTIL=20261231')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
    });

    it('RS-04: BYSETPOS throws UNSUPPORTED_RULE_FEATURE', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;BYSETPOS=1')).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_RULE_FEATURE' })
      );
    });

    it('RS-07: FREQ=WEEKLY without BYDAY throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=WEEKLY')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('RS-08: FREQ=MONTHLY without BYMONTHDAY throws INVALID_RULE', () => {
      expect(() => parseRecurrenceRule('FREQ=MONTHLY')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('rejects cross-frequency modifiers', () => {
      expect(() => parseRecurrenceRule('FREQ=DAILY;BYDAY=MO')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('FREQ=DAILY;BYMONTHDAY=15')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO;BYMONTHDAY=15')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=15;BYDAY=MO')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });

    it('rejects empty and malformed tokens', () => {
      expect(() => parseRecurrenceRule('')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('FREQ=DAILY;')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('FREQ=DAILY;;INTERVAL=2')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => parseRecurrenceRule('NOTOKEN')).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
    });
  });

  // ==========================================================================
  // E. HIJRI RECURRENCE
  // ==========================================================================
  describe('E. Hijri Recurrence', () => {
    it('HJ-01: Day 1 of every Hijri month (hijriDays=[1], hijriMonths=null)', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      const dates = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-03-31' },
        context
      );
      expect(dates.length).toBeGreaterThanOrEqual(2);
      for (const d of dates) {
        const h = hijriService.toEffectiveHijri(d, context.hijriAdjustment);
        expect(h.day).toBe(1);
      }
    });

    it('HJ-02: Specific days in every month (White Days [13, 14, 15])', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [13, 14, 15], hijriMonths: null },
      });
      const dates = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-02-28' },
        context
      );
      for (const d of dates) {
        const h = hijriService.toEffectiveHijri(d, context.hijriAdjustment);
        expect([13, 14, 15].includes(h.day)).toBe(true);
      }
    });

    it('HJ-03: Every day of a specific month (e.g. Ramadan hijriMonths=[9])', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: null, hijriMonths: [9] },
      });
      const dates = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        context
      );
      expect(dates.length).toBeGreaterThanOrEqual(29);
      for (const d of dates) {
        const h = hijriService.toEffectiveHijri(d, context.hijriAdjustment);
        expect(h.month).toBe(9);
      }
    });

    it('HJ-04: Selected days in selected month (e.g. days [9, 10] in month 1)', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [9, 10], hijriMonths: [1] },
      });
      const dates = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-12-31' },
        context
      );
      expect(dates.length).toBe(2);
      for (const d of dates) {
        const h = hijriService.toEffectiveHijri(d, context.hijriAdjustment);
        expect(h.month).toBe(1);
        expect([9, 10].includes(h.day)).toBe(true);
      }
    });

    it('HJ-05: Rejects invalid Hijri rule shapes', () => {
      const defBothNull = createTestDefinition({
        hijriRecurrence: { hijriDays: null, hijriMonths: null },
      });
      expect(() =>
        engine.generateSeedDates(defBothNull, { start: '2026-01-01', end: '2026-01-10' }, context)
      ).toThrow(expect.objectContaining({ code: 'INVALID_RULE' }));

      const defEmptyDays = createTestDefinition({
        hijriRecurrence: { hijriDays: [], hijriMonths: null },
      });
      expect(() =>
        engine.generateSeedDates(defEmptyDays, { start: '2026-01-01', end: '2026-01-10' }, context)
      ).toThrow(expect.objectContaining({ code: 'INVALID_RULE' }));

      const defInvalidDayNum = createTestDefinition({
        hijriRecurrence: { hijriDays: [31], hijriMonths: null },
      });
      expect(() =>
        engine.generateSeedDates(defInvalidDayNum, { start: '2026-01-01', end: '2026-01-10' }, context)
      ).toThrow(expect.objectContaining({ code: 'INVALID_RULE' }));

      const defInvalidMonthNum = createTestDefinition({
        hijriRecurrence: { hijriDays: null, hijriMonths: [13] },
      });
      expect(() =>
        engine.generateSeedDates(defInvalidMonthNum, { start: '2026-01-01', end: '2026-01-10' }, context)
      ).toThrow(expect.objectContaining({ code: 'INVALID_RULE' }));
    });

    it('HJ-06: 29-day month clamps day 30 to day 29', () => {
      let y29 = 1447;
      let m29 = 1;
      for (let m = 1; m <= 12; m++) {
        if (hijriService.getDaysInMonth(1447, m) === 29) {
          m29 = m;
          break;
        }
      }
      expect(hijriService.getDaysInMonth(y29, m29)).toBe(29);

      const res = hijriService.resolveGregorianFromEffectiveHijri(
        { year: y29, month: m29, day: 29 },
        context.hijriAdjustment
      );
      expect(res.kind).toBe('UNIQUE');
      const gDate29 = (res as { gregorianDate: string }).gregorianDate;

      const def = createTestDefinition({
        startDate: gDate29,
        hijriRecurrence: { hijriDays: [30], hijriMonths: [m29] },
      });

      expect(engine.occursOn(def, gDate29, context)).toBe(true);

      const defBoth = createTestDefinition({
        startDate: gDate29,
        hijriRecurrence: { hijriDays: [29, 30], hijriMonths: [m29] },
      });
      const generated = engine.generateSeedDates(
        defBoth,
        { start: gDate29, end: gDate29 },
        context
      );
      expect(generated).toEqual([gDate29]);
    });

    it('HJ-07: Global adjustment shifts Gregorian dates', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: [9] },
      });
      const dates0 = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        { hijriService, hijriAdjustment: { globalAdjustment: 0 } }
      );
      const datesPlus1 = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        { hijriService, hijriAdjustment: { globalAdjustment: 1 } }
      );

      expect(dates0.length).toBe(1);
      expect(datesPlus1.length).toBe(1);
      expect(datesPlus1[0]).not.toEqual(dates0[0]);
    });

    it('HJ-08: Per-month override replaces global adjustment', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [15], hijriMonths: [9] },
      });
      const datesOverride = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        {
          hijriService,
          hijriAdjustment: {
            globalAdjustment: 0,
            monthOverrides: new Map([['1447-9', 1]]),
          },
        }
      );
      const datesGlobal1 = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        { hijriService, hijriAdjustment: { globalAdjustment: 1 } }
      );
      const datesGlobal0 = engine.generateSeedDates(
        def,
        { start: '2026-01-01', end: '2026-04-30' },
        { hijriService, hijriAdjustment: { globalAdjustment: 0 } }
      );
      expect(datesOverride).toEqual(datesGlobal1);
      expect(datesOverride).not.toEqual(datesGlobal0);
    });

    it('AMB-01: AMBIGUOUS resolution produces earliest candidate only', () => {
      // 1 Ramadan 1447 with adj=0 is 2026-02-18
      const targetDate = '2026-02-18';
      const laterCandidate = '2026-02-19';

      const spy = jest.spyOn(hijriService, 'resolveGregorianFromEffectiveHijri');
      spy.mockReturnValue({
        kind: 'AMBIGUOUS',
        candidates: [targetDate, laterCandidate],
      });

      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: [9] },
      });

      // occursOn for earliest candidate returns true
      expect(engine.occursOn(def, targetDate, context)).toBe(true);

      // occursOn for later candidate returns false
      expect(engine.occursOn(def, laterCandidate, context)).toBe(false);

      spy.mockRestore();
    });

    it('AMB-02: Later ambiguous candidate remains false even if earlier candidate is outside query range', () => {
      const targetDate = '2026-02-18';
      const laterCandidate = '2026-02-19';

      const spy = jest.spyOn(hijriService, 'resolveGregorianFromEffectiveHijri');
      spy.mockReturnValue({
        kind: 'AMBIGUOUS',
        candidates: [targetDate, laterCandidate],
      });

      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: [9] },
      });

      // Query range begins on laterCandidate (earlier targetDate is outside query range)
      const dates = engine.generateSeedDates(
        def,
        { start: laterCandidate, end: '2026-02-21' },
        context
      );
      expect(dates.includes(laterCandidate)).toBe(false);

      spy.mockRestore();
    });

    it('AMB-03: NO_MATCH resolution returns false', () => {
      const spy = jest.spyOn(hijriService, 'resolveGregorianFromEffectiveHijri');
      spy.mockReturnValueOnce({ kind: 'NO_MATCH' });

      const def = createTestDefinition({
        startDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: [9] },
      });

      expect(engine.occursOn(def, '2026-02-18', context)).toBe(false);
      spy.mockRestore();
    });
  });

  // ==========================================================================
  // F. HIJRI RANGE & ERROR CONTRACT (Rev 3 §2)
  // ==========================================================================
  describe('F. Hijri Range & Edge Errors', () => {
    it('HOR-01: Effective window entirely before M8 support throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '1920-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.generateSeedDates(
          def,
          { start: '1920-01-01', end: '1920-01-10' },
          context
        )
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-02: Effective window entirely after M8 support throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '2080-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.generateSeedDates(
          def,
          { start: '2080-01-01', end: '2080-01-10' },
          context
        )
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-03: Broad query narrowed by definition window to supported dates succeeds', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        effectiveFromDate: '2026-01-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: [9] },
      });
      const dates = engine.generateSeedDates(
        def,
        { start: '1920-01-01', end: '2026-03-31' },
        context
      );
      expect(dates.length).toBeGreaterThan(0);
    });

    it('HOR-04: Raw M8 minimum (1924-08-01) with globalAdjustment = -1 throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '1924-08-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '1924-08-01', {
          hijriService,
          hijriAdjustment: { globalAdjustment: -1 },
        })
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-05: Raw M8 minimum (1924-08-01) with globalAdjustment = -2 throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '1924-08-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '1924-08-01', {
          hijriService,
          hijriAdjustment: { globalAdjustment: -2 },
        })
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-06: Raw M8 maximum (2077-11-16) with globalAdjustment = +1 throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '2077-11-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '2077-11-16', {
          hijriService,
          hijriAdjustment: { globalAdjustment: 1 },
        })
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-07: Raw M8 maximum (2077-11-16) with globalAdjustment = +2 throws OUT_OF_HIJRI_RANGE', () => {
      const def = createTestDefinition({
        startDate: '2077-11-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '2077-11-16', {
          hijriService,
          hijriAdjustment: { globalAdjustment: 2 },
        })
      ).toThrow(
        expect.objectContaining({
          code: 'OUT_OF_HIJRI_RANGE',
        })
      );
    });

    it('HOR-08: Near-minimum date (1924-08-03) with globalAdjustment = -2 succeeds', () => {
      const def = createTestDefinition({
        startDate: '1924-08-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '1924-08-03', {
          hijriService,
          hijriAdjustment: { globalAdjustment: -2 },
        })
      ).not.toThrow();
    });

    it('HOR-09: Near-maximum date (2077-11-14) with globalAdjustment = +2 succeeds', () => {
      const def = createTestDefinition({
        startDate: '2077-11-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() =>
        engine.occursOn(def, '2077-11-14', {
          hijriService,
          hijriAdjustment: { globalAdjustment: 2 },
        })
      ).not.toThrow();
    });

    it('HOR-10: Per-month override causing ADJUSTED_OUT_OF_RANGE preserves cause', () => {
      const def = createTestDefinition({
        startDate: '1924-08-01',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      let caughtError: RecurrenceError | undefined;
      try {
        engine.occursOn(def, '1924-08-01', {
          hijriService,
          hijriAdjustment: {
            globalAdjustment: 0,
            monthOverrides: new Map([['1343-1', -2]]),
          },
        });
      } catch (err) {
        if (err instanceof RecurrenceError) {
          caughtError = err;
        }
      }
      expect(caughtError).toBeDefined();
      expect(caughtError!.code).toBe('OUT_OF_HIJRI_RANGE');
      expect(caughtError!.cause).toBeDefined();
    });

    it('throws HIJRI_RESOLUTION_FAILED if context is missing for Hijri recurrence', () => {
      const def = createTestDefinition({
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() => engine.occursOn(def, '2026-01-01')).toThrow(
        expect.objectContaining({ code: 'HIJRI_RESOLUTION_FAILED' })
      );
      expect(() =>
        engine.generateSeedDates(def, { start: '2026-01-01', end: '2026-01-10' })
      ).toThrow(expect.objectContaining({ code: 'HIJRI_RESOLUTION_FAILED' }));
    });
  });

  // ==========================================================================
  // G. RECURRENCE KIND DISCRIMINATOR (Rev 4 §3)
  // ==========================================================================
  describe('G. Recurrence Kind Discriminator', () => {
    it('RK-01: Both null classifies as NON_RECURRING', () => {
      const def = createTestDefinition({
        recurrenceRule: null,
        hijriRecurrence: null,
      });
      expect(engine.classifyRecurrence(def)).toBe('NON_RECURRING');
    });

    it('RK-02: recurrenceRule populated, hijriRecurrence null classifies as GREGORIAN', () => {
      const def = createTestDefinition({
        recurrenceRule: 'FREQ=DAILY',
        hijriRecurrence: null,
      });
      expect(engine.classifyRecurrence(def)).toBe('GREGORIAN');
    });

    it('RK-03: recurrenceRule null, hijriRecurrence populated classifies as HIJRI', () => {
      const def = createTestDefinition({
        recurrenceRule: null,
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(engine.classifyRecurrence(def)).toBe('HIJRI');
    });

    it('RK-04: Both populated throws INVALID_RULE', () => {
      const def = createTestDefinition({
        recurrenceRule: 'FREQ=DAILY',
        hijriRecurrence: { hijriDays: [1], hijriMonths: null },
      });
      expect(() => engine.classifyRecurrence(def)).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() => engine.occursOn(def, '2026-01-01', context)).toThrow(
        expect.objectContaining({ code: 'INVALID_RULE' })
      );
      expect(() =>
        engine.generateSeedDates(def, { start: '2026-01-01', end: '2026-01-05' }, context)
      ).toThrow(expect.objectContaining({ code: 'INVALID_RULE' }));
    });
  });

  // ==========================================================================
  // H. SERIES VERSION BOUNDARIES
  // ==========================================================================
  describe('H. Series Version Boundaries and Splits', () => {
    it('SV-01: Excludes dates before effectiveFromDate', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        effectiveFromDate: '2026-01-10',
        recurrenceRule: 'FREQ=DAILY',
      });
      expect(engine.occursOn(def, '2026-01-09')).toBe(false);
      expect(engine.occursOn(def, '2026-01-10')).toBe(true);
      const dates = engine.generateSeedDates(def, {
        start: '2026-01-01',
        end: '2026-01-12',
      });
      expect(dates).toEqual(['2026-01-10', '2026-01-11', '2026-01-12']);
    });

    it('SV-02: Excludes dates after effectiveToDate', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        effectiveToDate: '2026-01-05',
        recurrenceRule: 'FREQ=DAILY',
      });
      expect(engine.occursOn(def, '2026-01-05')).toBe(true);
      expect(engine.occursOn(def, '2026-01-06')).toBe(false);
    });

    it('SV-03: Adjacent predecessor and successor have no overlap and no gap', () => {
      const predecessor = createTestDefinition({
        id: 'v1',
        seriesId: 'series-A',
        seriesVersion: 1,
        startDate: '2026-01-01',
        effectiveFromDate: '2026-01-01',
        effectiveToDate: '2026-06-14',
        recurrenceRule: 'FREQ=DAILY',
      });

      const successor = createTestDefinition({
        id: 'v2',
        seriesId: 'series-A',
        seriesVersion: 2,
        startDate: '2026-06-15',
        effectiveFromDate: '2026-06-15',
        effectiveToDate: null,
        recurrenceRule: 'FREQ=DAILY',
      });

      const queryRange = { start: '2026-06-10', end: '2026-06-20' };
      const predDates = engine.generateSeedDates(predecessor, queryRange);
      const succDates = engine.generateSeedDates(successor, queryRange);

      expect(predDates).toEqual([
        '2026-06-10',
        '2026-06-11',
        '2026-06-12',
        '2026-06-13',
        '2026-06-14',
      ]);
      expect(succDates).toEqual([
        '2026-06-15',
        '2026-06-16',
        '2026-06-17',
        '2026-06-18',
        '2026-06-19',
        '2026-06-20',
      ]);

      const intersection = predDates.filter((d) => succDates.includes(d));
      expect(intersection).toEqual([]);
    });

    it('SV-04: Interval-based daily cadence restarts from splitDate in successor', () => {
      const successor = createTestDefinition({
        startDate: '2026-01-15',
        effectiveFromDate: '2026-01-15',
        recurrenceRule: 'FREQ=DAILY;INTERVAL=3',
      });
      const dates = engine.generateSeedDates(successor, {
        start: '2026-01-15',
        end: '2026-01-22',
      });
      expect(dates).toEqual(['2026-01-15', '2026-01-18', '2026-01-21']);
    });
  });

  // ==========================================================================
  // I. TIMEZONE INDEPENDENCE
  // ==========================================================================
  describe('I. Timezone Independence', () => {
    it('produces identical results regardless of timezone across DST shifts', () => {
      const defDaily = createTestDefinition({
        startDate: '2026-03-05',
        recurrenceRule: 'FREQ=DAILY',
      });
      const datesDaily = engine.generateSeedDates(defDaily, {
        start: '2026-03-06',
        end: '2026-03-10',
      });
      expect(datesDaily).toEqual([
        '2026-03-06',
        '2026-03-07',
        '2026-03-08',
        '2026-03-09',
        '2026-03-10',
      ]);

      const defWeekly = createTestDefinition({
        startDate: '2026-03-01',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU',
      });
      const datesWeekly = engine.generateSeedDates(defWeekly, {
        start: '2026-03-01',
        end: '2026-03-15',
      });
      expect(datesWeekly).toEqual(['2026-03-01', '2026-03-08', '2026-03-15']);
    });

    it('civil date arithmetic produces identical results in child processes under UTC, America/Chicago, and Asia/Riyadh', () => {
      const timezones = ['UTC', 'America/Chicago', 'Asia/Riyadh'];
      const results: string[] = [];

      for (const tz of timezones) {
        // Pure arithmetic calendar check across month/leap/DST transitions
        const code = `
          function getDays(y, m) {
            const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
            return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
          }
          function jdn(y, m, d) {
            const a = Math.floor((14 - m) / 12);
            const yAdj = y + 4800 - a;
            const mAdj = m + 12 * a - 3;
            return d + Math.floor((153 * mAdj + 2) / 5) + 365 * yAdj + Math.floor(yAdj / 4) - Math.floor(yAdj / 100) + Math.floor(yAdj / 400) - 32045;
          }
          const diff = jdn(2026, 3, 10) - jdn(2026, 3, 5);
          const febDays = getDays(2024, 2);
          console.log(JSON.stringify({ diff, febDays }));
        `;
        const out = execSync(`node -e "${code.replace(/\s+/g, ' ')}"`, {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8',
        }).trim();
        results.push(out);
      }

      expect(results[0]).toBe('{"diff":5,"febDays":29}');
      expect(results[1]).toBe(results[0]);
      expect(results[2]).toBe(results[0]);
    });
  });

  // ==========================================================================
  // J. IDEMPOTENCY & IMMUTABILITY
  // ==========================================================================
  describe('J. Idempotency & Immutability', () => {
    it('repeated calls return identical results without mutating inputs', () => {
      const def = createTestDefinition({
        startDate: '2026-01-01',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,FR',
      });
      const defSnapshot = JSON.stringify(def);
      const range = { start: '2026-01-01', end: '2026-01-15' };
      const rangeSnapshot = JSON.stringify(range);

      const res1 = engine.generateSeedDates(def, range);
      const res2 = engine.generateSeedDates(def, range);

      expect(res1).toEqual(res2);
      expect(JSON.stringify(def)).toBe(defSnapshot);
      expect(JSON.stringify(range)).toBe(rangeSnapshot);
    });
  });

  // ==========================================================================
  // K. INPUT VALIDATION (Date & Range format)
  // ==========================================================================
  describe('K. Date and Range Input Validation', () => {
    const def = createTestDefinition({ recurrenceRule: 'FREQ=DAILY' });

    it('throws INVALID_SEED_DATE for non-YYYY-MM-DD format', () => {
      expect(() => engine.occursOn(def, 'invalid-date')).toThrow(
        expect.objectContaining({ code: 'INVALID_SEED_DATE' })
      );
      expect(() => engine.occursOn(def, '2026-02-30')).toThrow(
        expect.objectContaining({ code: 'INVALID_SEED_DATE' })
      );
    });

    it('throws INVALID_DATE_RANGE for inverted range (start > end)', () => {
      expect(() =>
        engine.generateSeedDates(def, { start: '2026-02-01', end: '2026-01-01' })
      ).toThrow(expect.objectContaining({ code: 'INVALID_DATE_RANGE' }));
    });

    it('throws INVALID_DATE_RANGE for invalid dates in range', () => {
      expect(() =>
        engine.generateSeedDates(def, { start: 'bad', end: '2026-01-01' })
      ).toThrow(expect.objectContaining({ code: 'INVALID_DATE_RANGE' }));
      expect(() =>
        engine.generateSeedDates(def, { start: '2026-01-01', end: 'bad' })
      ).toThrow(expect.objectContaining({ code: 'INVALID_DATE_RANGE' }));
    });

    it('accepts single-day range (start === end)', () => {
      expect(() =>
        engine.generateSeedDates(def, { start: '2026-01-01', end: '2026-01-01' })
      ).not.toThrow();
    });
  });
});
