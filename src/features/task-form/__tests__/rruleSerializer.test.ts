import {
  formatIsoWeekdays,
  monthDayFromCivilDate,
  serializePresetToRRule,
  serializeCustomGregorian,
} from '../rruleSerializer';
import { parseRecurrenceRule } from '@/domain/recurrence/rruleAdapter';
import type { ISOWeekday } from '@/domain/recurrence/types';

describe('rruleSerializer (M10)', () => {
  const testDate = '2026-09-15'; // Tuesday, ISO weekday 2, day of month 15

  describe('formatIsoWeekdays', () => {
    it('sorts weekdays numerically in ISO order and formats codes', () => {
      const input: ISOWeekday[] = [5, 1, 3]; // FR, MO, WE
      expect(formatIsoWeekdays(input)).toBe('MO,WE,FR');
    });

    it('deduplicates identical weekdays', () => {
      const input: ISOWeekday[] = [2, 2, 6, 1];
      expect(formatIsoWeekdays(input)).toBe('MO,TU,SA');
    });
  });

  describe('monthDayFromCivilDate', () => {
    it('extracts day of month correctly', () => {
      expect(monthDayFromCivilDate('2026-09-15')).toBe(15);
      expect(monthDayFromCivilDate('2026-01-05')).toBe(5);
    });
  });

  describe('Preset Serialization & M9 Round-Trip', () => {
    it('serializes NONE to null', () => {
      expect(serializePresetToRRule('NONE', testDate)).toBeNull();
    });

    it('serializes DAILY to FREQ=DAILY and round-trips with M9', () => {
      const rrule = serializePresetToRRule('DAILY', testDate)!;
      expect(rrule).toBe('FREQ=DAILY');
      expect(rrule).not.toMatch(/^RRULE:/);
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('DAILY');
      expect(parsed.interval).toBe(1);
    });

    it('serializes WEEKDAYS to FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR and round-trips with M9', () => {
      const rrule = serializePresetToRRule('WEEKDAYS', testDate)!;
      expect(rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.byWeekday).toEqual([1, 2, 3, 4, 5]);
    });

    it('serializes WEEKLY anchored to seedDate weekday and round-trips with M9', () => {
      const rrule = serializePresetToRRule('WEEKLY', testDate)!; // 2026-09-15 is Tuesday (TU)
      expect(rrule).toBe('FREQ=WEEKLY;BYDAY=TU');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.byWeekday).toEqual([2]);
    });

    it('serializes MONTHLY anchored to seedDate monthday and round-trips with M9', () => {
      const rrule = serializePresetToRRule('MONTHLY', testDate)!; // 15th
      expect(rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('MONTHLY');
      expect(parsed.byMonthDay).toEqual([15]);
    });

    it('serializes SPECIFIC_DAYS and sorts ISO weekdays', () => {
      const rrule = serializePresetToRRule('SPECIFIC_DAYS', testDate, {
        specificDays: [5, 1, 3], // FR, MO, WE
      })!;
      expect(rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.byWeekday).toEqual([1, 3, 5]);
    });
  });

  describe('Custom Gregorian Serialization & M9 Round-Trip', () => {
    it('serializes Every N days', () => {
      const rrule = serializeCustomGregorian(
        {
          frequency: 'DAILY',
          interval: 3,
          selectedWeekdays: [],
          selectedMonthDays: [],
        },
        testDate
      );
      expect(rrule).toBe('FREQ=DAILY;INTERVAL=3');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('DAILY');
      expect(parsed.interval).toBe(3);
    });

    it('serializes Every N weeks with weekdays in ISO order', () => {
      const rrule = serializeCustomGregorian(
        {
          frequency: 'WEEKLY',
          interval: 2,
          selectedWeekdays: [5, 1], // FR, MO
          selectedMonthDays: [],
        },
        testDate
      );
      expect(rrule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('WEEKLY');
      expect(parsed.interval).toBe(2);
      expect(parsed.byWeekday).toEqual([1, 5]);
    });

    it('serializes Every N months on selected month days', () => {
      const rrule = serializeCustomGregorian(
        {
          frequency: 'MONTHLY',
          interval: 3,
          selectedWeekdays: [],
          selectedMonthDays: [25, 10],
        },
        testDate
      );
      expect(rrule).toBe('FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=10,25');
      const parsed = parseRecurrenceRule(rrule);
      expect(parsed.frequency).toBe('MONTHLY');
      expect(parsed.interval).toBe(3);
      expect(parsed.byMonthDay).toEqual([10, 25]);
    });

    it('never emits unsupported tokens (COUNT, UNTIL, BYSETPOS)', () => {
      const rrule = serializeCustomGregorian(
        {
          frequency: 'WEEKLY',
          interval: 1,
          selectedWeekdays: [5],
          selectedMonthDays: [],
        },
        testDate
      );
      expect(rrule).not.toContain('COUNT');
      expect(rrule).not.toContain('UNTIL');
      expect(rrule).not.toContain('BYSETPOS');
      expect(rrule).not.toContain('RRULE:');
    });
  });
});
