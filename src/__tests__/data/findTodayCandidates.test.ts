import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('Today Candidates Query (CD-01 to CD-05, HI-01)', () => {
  let defId: string;

  beforeEach(async () => {
    createTestDatabase();

    const def = await taskDefinitionRepository.create({
      id: 'def-window-test',
      title: 'Dhuhr to Isha Study Session',
      startDate: '2026-09-15',
      source: 'USER',
      scheduleType: 'PRAYER_WINDOW',
      scheduleData: {
        startPrayer: 'DHUHR',
        endPrayer: 'ISHA',
      },
      seriesId: 'series-window-test',
      seriesVersion: 1,
      priority: 'NORMAL',
      estimatedMinutes: 60,
      isActive: true,
    });
    defId = def.id;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('Cross-Day Window Query (CD-01 to CD-05)', () => {
    it('CD-01: includes active carry-over at 19:10 across planning-day boundary via Rule B', async () => {
      await taskOccurrenceRepository.create({
        id: 'occ-carryover',
        taskDefinitionId: defId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        status: 'PENDING',
      });

      const nowUtc = '2026-09-15T19:10:00.000Z';
      const activePlanningDayKey = '2026-09-16'; // New planning day active after 19:00 boundary

      const candidates = await taskOccurrenceRepository.findTodayCandidates(
        activePlanningDayKey,
        nowUtc
      );

      expect(candidates.some(c => c.id === 'occ-carryover')).toBe(true);
    });

    it('CD-02: excludes carry-over at exact windowEnd boundary 19:30 (half-open window)', async () => {
      await taskOccurrenceRepository.create({
        id: 'occ-carryover-boundary',
        taskDefinitionId: defId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        status: 'PENDING',
      });

      const exactEndUtc = '2026-09-15T19:30:00.000Z';
      const activePlanningDayKey = '2026-09-16';

      const candidates = await taskOccurrenceRepository.findTodayCandidates(
        activePlanningDayKey,
        exactEndUtc
      );

      expect(candidates.some(c => c.id === 'occ-carryover-boundary')).toBe(false);
    });

    it('CD-03: excludes carry-over after windowEnd at 19:35', async () => {
      await taskOccurrenceRepository.create({
        id: 'occ-carryover-after',
        taskDefinitionId: defId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        status: 'PENDING',
      });

      const afterEndUtc = '2026-09-15T19:35:00.000Z';
      const activePlanningDayKey = '2026-09-16';

      const candidates = await taskOccurrenceRepository.findTodayCandidates(
        activePlanningDayKey,
        afterEndUtc
      );

      expect(candidates.some(c => c.id === 'occ-carryover-after')).toBe(false);
    });

    it('CD-04: excludes terminal (COMPLETED) overlapping window from Rule B carry-over', async () => {
      await taskOccurrenceRepository.create({
        id: 'occ-completed-window',
        taskDefinitionId: defId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        status: 'COMPLETED',
        completedAt: '2026-09-15T18:00:00.000Z',
      });

      const nowUtc = '2026-09-15T19:10:00.000Z';
      const activePlanningDayKey = '2026-09-16';

      const candidates = await taskOccurrenceRepository.findTodayCandidates(
        activePlanningDayKey,
        nowUtc
      );

      expect(candidates.some(c => c.id === 'occ-completed-window')).toBe(false);
    });

    it('CD-05: excludes CANCELLED overlapping window from Rule B carry-over', async () => {
      await taskOccurrenceRepository.create({
        id: 'occ-cancelled-window',
        taskDefinitionId: defId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        windowStart: '2026-09-15T12:00:00.000Z',
        windowEnd: '2026-09-15T19:30:00.000Z',
        eligiblePrayerSections: ['DHUHR', 'ASR', 'MAGHRIB'],
        status: 'CANCELLED',
      });

      const nowUtc = '2026-09-15T19:10:00.000Z';
      const activePlanningDayKey = '2026-09-16';

      const candidates = await taskOccurrenceRepository.findTodayCandidates(
        activePlanningDayKey,
        nowUtc
      );

      expect(candidates.some(c => c.id === 'occ-cancelled-window')).toBe(false);
    });
  });

  describe('Historical Inactive Definition Loading (HI-01)', () => {
    it('HI-01: loads deactivated definition for historical occurrence via findByIds without isActive filtering', async () => {
      // Deactivate definition
      await taskDefinitionRepository.update('def-window-test', { isActive: false });

      const defs = await taskDefinitionRepository.findByIds(['def-window-test']);
      expect(defs).toHaveLength(1);
      expect(defs[0].id).toBe('def-window-test');
      expect(defs[0].isActive).toBe(false);
      expect(defs[0].title).toBe('Dhuhr to Isha Study Session');
    });
  });
});
