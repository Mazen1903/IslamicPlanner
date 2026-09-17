import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import {
  deriveNotificationTrigger,
  deriveDesiredNotification,
} from '../notificationTrigger';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DEFAULT_SLOT,
  NOTIFICATION_PAYLOAD_VERSION,
} from '../types';

describe('Notification Trigger Derivation', () => {
  const baseDef: TaskDefinition = {
    id: 'def-1',
    title: 'Read Quran',
    description: null,
    startDate: '2026-09-17',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'EXACT_TIME',
    scheduleData: { localTime: '14:30' },
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: 'series-1',
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: { offsetMinutes: 0 },
    priority: 'NORMAL',
    estimatedMinutes: 30,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  };

  const baseOcc: TaskOccurrence = {
    id: 'occ-1',
    taskDefinitionId: 'def-1',
    seriesId: 'series-1',
    localDate: '2026-09-17',
    planningDayKey: '2026-09-17',
    timezone: 'UTC',
    calculatedStartTime: '2026-09-17T14:30:00.000Z',
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

  const nowMs = Date.parse('2026-09-17T12:00:00.000Z');

  describe('Schedule Types', () => {
    it('derives trigger for EXACT_TIME from calculatedStartTime + offsetMinutes', () => {
      const def = { ...baseDef, scheduleType: 'EXACT_TIME' as const, reminderRule: { offsetMinutes: 10 } };
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T14:30:00.000Z' };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      const expected = Date.parse('2026-09-17T14:30:00.000Z') + 10 * 60_000;
      expect(trigger).toBe(expected);
    });

    it('derives trigger for PRAYER_RELATIVE from calculatedStartTime + offsetMinutes', () => {
      const def = {
        ...baseDef,
        scheduleType: 'PRAYER_RELATIVE' as const,
        reminderRule: { offsetMinutes: 0 },
      };
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T13:15:00.000Z' };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      const expected = Date.parse('2026-09-17T13:15:00.000Z');
      expect(trigger).toBe(expected);
    });

    it('derives trigger for PRAYER_WINDOW from windowStart + offsetMinutes', () => {
      const def = {
        ...baseDef,
        scheduleType: 'PRAYER_WINDOW' as const,
        reminderRule: { offsetMinutes: 15 },
      };
      const occ = {
        ...baseOcc,
        calculatedStartTime: null,
        windowStart: '2026-09-17T12:30:00.000Z',
        windowEnd: '2026-09-17T15:45:00.000Z',
      };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      const expected = Date.parse('2026-09-17T12:30:00.000Z') + 15 * 60_000;
      expect(trigger).toBe(expected);
    });

    it('returns null for ANYTIME_TODAY (no concrete anchor)', () => {
      const def = {
        ...baseDef,
        scheduleType: 'ANYTIME_TODAY' as const,
        reminderRule: { offsetMinutes: 0 },
      };
      const occ = { ...baseOcc };

      expect(deriveNotificationTrigger(occ, def, nowMs)).toBeNull();
    });
  });

  describe('Status Invariants', () => {
    it('returns null for COMPLETED occurrences', () => {
      const occ = { ...baseOcc, status: 'COMPLETED' as const, completedAt: '2026-09-17T14:00:00.000Z' };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });

    it('returns null for MISSED occurrences', () => {
      const occ = { ...baseOcc, status: 'MISSED' as const, missedAt: '2026-09-17T15:00:00.000Z' };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });

    it('returns null for CANCELLED occurrences', () => {
      const occ = { ...baseOcc, status: 'CANCELLED' as const };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });
  });

  describe('Time & Grace Invariants', () => {
    it('returns null if triggerAtMs is in the past (triggerAtMs < nowMs)', () => {
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T11:00:00.000Z' };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });

    it('returns null if triggerAtMs equals nowMs (no arbitrary grace window)', () => {
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T12:00:00.000Z' };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });

    it('returns trigger if triggerAtMs is strictly in the future (triggerAtMs > nowMs)', () => {
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T12:00:01.000Z' };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBe(Date.parse('2026-09-17T12:00:01.000Z'));
    });
  });

  describe('Eligibility & Missing Data', () => {
    it('returns null if reminderRule is null', () => {
      const def = { ...baseDef, reminderRule: null };
      expect(deriveNotificationTrigger(baseOcc, def, nowMs)).toBeNull();
    });

    it('returns null if reminderRule offsetMinutes is missing or non-numeric', () => {
      const def = { ...baseDef, reminderRule: {} as any };
      expect(deriveNotificationTrigger(baseOcc, def, nowMs)).toBeNull();
    });

    it('returns null if calculatedStartTime is missing for EXACT_TIME', () => {
      const occ = { ...baseOcc, calculatedStartTime: null };
      expect(deriveNotificationTrigger(occ, baseDef, nowMs)).toBeNull();
    });

    it('returns null if windowStart is missing for PRAYER_WINDOW', () => {
      const def = { ...baseDef, scheduleType: 'PRAYER_WINDOW' as const, reminderRule: { offsetMinutes: 0 } };
      const occ = { ...baseOcc, windowStart: null };
      expect(deriveNotificationTrigger(occ, def, nowMs)).toBeNull();
    });
  });

  describe('deriveDesiredNotification', () => {
    it('builds canonical DesiredNotification with minimal version 1 payload', () => {
      const desired = deriveDesiredNotification(baseOcc, baseDef, nowMs);
      expect(desired).not.toBeNull();
      expect(desired!.identifier).toBe('task-reminder:occ-1:default');
      expect(desired!.occurrenceId).toBe('occ-1');
      expect(desired!.taskDefinitionId).toBe('def-1');
      expect(desired!.title).toBe('Read Quran');
      expect(desired!.channelId).toBe(NOTIFICATION_CHANNEL_ID);
      expect(desired!.triggerAtMs).toBe(Date.parse('2026-09-17T14:30:00.000Z'));
      expect(desired!.data).toEqual({
        kind: 'task-reminder',
        occurrenceId: 'occ-1',
        taskDefinitionId: 'def-1',
        reminderSlot: NOTIFICATION_DEFAULT_SLOT,
        triggerAtMs: Date.parse('2026-09-17T14:30:00.000Z'),
        payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
      });
    });

    it('returns null if trigger derivation returns null', () => {
      const pastOcc = { ...baseOcc, calculatedStartTime: '2026-09-17T10:00:00.000Z' };
      expect(deriveDesiredNotification(pastOcc, baseDef, nowMs)).toBeNull();
    });
  });
});
