import { computeCurrentStreak, computeLongestStreak } from '@/utils/journalStreakUtils';
import type { JournalEntryMetadata } from '@/domain/journal/types';

function createMeta(planningDayKey: string): JournalEntryMetadata {
  return {
    id: `id-${planningDayKey}`,
    planningDayKey,
    revision: 1,
    createdAt: `${planningDayKey}T12:00:00.000Z`,
    updatedAt: `${planningDayKey}T12:00:00.000Z`,
  };
}

describe('journalStreakUtils', () => {
  describe('computeCurrentStreak', () => {
    it('returns 0 for empty entries or missing todayKey', () => {
      expect(computeCurrentStreak([], '2026-09-24')).toBe(0);
      expect(computeCurrentStreak([createMeta('2026-09-24')], '')).toBe(0);
    });

    it('returns 1 if only today is present', () => {
      const entries = [createMeta('2026-09-24')];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(1);
    });

    it('returns 1 if today has no entry yet but yesterday has an entry', () => {
      const entries = [createMeta('2026-09-23')];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(1);
    });

    it('returns consecutive streak ending at today', () => {
      const entries = [
        createMeta('2026-09-22'),
        createMeta('2026-09-23'),
        createMeta('2026-09-24'),
      ];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(3);
    });

    it('returns consecutive streak ending at yesterday if today has not been written yet', () => {
      const entries = [
        createMeta('2026-09-21'),
        createMeta('2026-09-22'),
        createMeta('2026-09-23'),
      ];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(3);
    });

    it('returns 0 if last entry was 2 days ago', () => {
      const entries = [
        createMeta('2026-09-20'),
        createMeta('2026-09-21'),
        createMeta('2026-09-22'),
      ];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(0);
    });

    it('stops counting on gap', () => {
      const entries = [
        createMeta('2026-09-18'),
        createMeta('2026-09-19'),
        // gap on 20
        createMeta('2026-09-21'),
        createMeta('2026-09-22'),
        createMeta('2026-09-23'),
        createMeta('2026-09-24'),
      ];
      expect(computeCurrentStreak(entries, '2026-09-24')).toBe(4);
    });
  });

  describe('computeLongestStreak', () => {
    it('returns 0 for empty entries', () => {
      expect(computeLongestStreak([])).toBe(0);
    });

    it('returns 1 for a single entry', () => {
      expect(computeLongestStreak([createMeta('2026-09-20')])).toBe(1);
    });

    it('computes longest streak with multiple runs', () => {
      const entries = [
        createMeta('2026-09-01'),
        createMeta('2026-09-02'),
        createMeta('2026-09-03'),
        createMeta('2026-09-04'),
        createMeta('2026-09-05'), // run of 5
        createMeta('2026-09-10'),
        createMeta('2026-09-11'), // run of 2
        createMeta('2026-09-20'),
        createMeta('2026-09-21'),
        createMeta('2026-09-22'), // run of 3
      ];
      expect(computeLongestStreak(entries)).toBe(5);
    });
  });
});
