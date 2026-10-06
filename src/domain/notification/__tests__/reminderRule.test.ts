import {
  normalizeReminderRule,
  formatReminderOffset,
  formatReminderSummary,
  MAX_REMINDERS_PER_TASK,
  DEFAULT_ANYTIME_REMINDER_TIME,
} from '../reminderRule';

describe('reminderRule', () => {
  describe('normalizeReminderRule', () => {
    it('returns null for null, undefined, or empty rule', () => {
      expect(normalizeReminderRule(null)).toBeNull();
      expect(normalizeReminderRule(undefined)).toBeNull();
      expect(normalizeReminderRule({})).toBeNull();
    });

    it('normalizes legacy single offsetMinutes', () => {
      const res = normalizeReminderRule({ offsetMinutes: -10 });
      expect(res).toEqual({ offsetsMinutes: [-10] });
    });

    it('normalizes array of offsetsMinutes, deduplicates and sorts chronologically', () => {
      const res = normalizeReminderRule({ offsetsMinutes: [0, -60, -15, 0, -15] });
      expect(res).toEqual({ offsetsMinutes: [-60, -15, 0] });
    });

    it('does not cap offsets, allowing unlimited unique reminders', () => {
      const res = normalizeReminderRule({ offsetsMinutes: [-120, -60, -30, -15, 0] });
      expect(res?.offsetsMinutes).toHaveLength(5);
      expect(res?.offsetsMinutes).toEqual([-120, -60, -30, -15, 0]);
    });

    it('parses valid timeOfDay for ANYTIME_TODAY', () => {
      const res = normalizeReminderRule({ timeOfDay: '08:30' });
      expect(res).toEqual({ offsetsMinutes: [], timeOfDay: '08:30' });
    });

    it('ignores invalid timeOfDay strings', () => {
      const res = normalizeReminderRule({ timeOfDay: 'invalid' });
      expect(res).toBeNull();
    });
  });

  describe('formatReminderOffset', () => {
    it('formats 0 as "At time of task"', () => {
      expect(formatReminderOffset(0)).toBe('At time of task');
    });

    it('formats negative minutes as "X min before"', () => {
      expect(formatReminderOffset(-10)).toBe('10 min before');
      expect(formatReminderOffset(-45)).toBe('45 min before');
    });

    it('formats 60 and 120 minutes as hours before', () => {
      expect(formatReminderOffset(-60)).toBe('1 hour before');
      expect(formatReminderOffset(-120)).toBe('2 hours before');
    });

    it('formats 1440 minutes as 1 day before', () => {
      expect(formatReminderOffset(-1440)).toBe('1 day before');
    });

    it('formats positive minutes as "X min after"', () => {
      expect(formatReminderOffset(15)).toBe('15 min after');
      expect(formatReminderOffset(60)).toBe('1 hour after');
    });
  });

  describe('formatReminderSummary', () => {
    it('returns "None" for null or empty rules', () => {
      expect(formatReminderSummary(null)).toBe('None');
      expect(formatReminderSummary({})).toBe('None');
    });

    it('returns single offset label when 1 offset present', () => {
      expect(formatReminderSummary({ offsetsMinutes: [-10] })).toBe('10 min before');
    });

    it('returns summary with count suffix when multiple offsets present', () => {
      expect(formatReminderSummary({ offsetsMinutes: [-60, -10] })).toBe('1 hour before +1');
      expect(formatReminderSummary({ offsetsMinutes: [-120, -60, 0] })).toBe('2 hours before +2');
    });

    it('returns time of day for anytime tasks', () => {
      expect(formatReminderSummary({ timeOfDay: '14:30' }, true)).toBe('At 2:30 PM');
      expect(formatReminderSummary({ timeOfDay: '09:00' }, true)).toBe('At 9:00 AM');
      expect(formatReminderSummary(null, true)).toBe('None');
    });
  });
});
