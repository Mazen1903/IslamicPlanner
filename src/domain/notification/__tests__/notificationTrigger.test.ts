import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import {
  deriveNotificationTrigger,
  deriveNotificationTriggers,
  deriveDesiredNotification,
  deriveDesiredNotifications,
  buildNotificationBody,
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
    it('derives trigger for EXACT_TIME with negative offset (10 min before)', () => {
      const def = { ...baseDef, scheduleType: 'EXACT_TIME' as const, reminderRule: { offsetMinutes: -10 } };
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T14:30:00.000Z' };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      const expected = Date.parse('2026-09-17T14:30:00.000Z') - 10 * 60_000;
      expect(trigger).toBe(expected);
    });

    it('derives trigger for PRAYER_RELATIVE at task time (offset 0)', () => {
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

    it('derives trigger for PRAYER_WINDOW from windowStart with negative offset', () => {
      const def = {
        ...baseDef,
        scheduleType: 'PRAYER_WINDOW' as const,
        reminderRule: { offsetMinutes: -15 },
      };
      const occ = {
        ...baseOcc,
        calculatedStartTime: null,
        windowStart: '2026-09-17T12:30:00.000Z',
        windowEnd: '2026-09-17T15:45:00.000Z',
      };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      const expected = Date.parse('2026-09-17T12:30:00.000Z') - 15 * 60_000;
      expect(trigger).toBe(expected);
    });

    it('returns null for ANYTIME_TODAY if no timeOfDay is set', () => {
      const def = {
        ...baseDef,
        scheduleType: 'ANYTIME_TODAY' as const,
        reminderRule: { offsetMinutes: 0 },
      };
      const occ = { ...baseOcc };

      expect(deriveNotificationTrigger(occ, def, nowMs)).toBeNull();
    });

    it('derives trigger for ANYTIME_TODAY when timeOfDay is set', () => {
      const def = {
        ...baseDef,
        scheduleType: 'ANYTIME_TODAY' as const,
        reminderRule: { timeOfDay: '15:00' },
      };
      const occ = { ...baseOcc, localDate: '2026-09-17', timezone: 'UTC' };

      const trigger = deriveNotificationTrigger(occ, def, nowMs);
      expect(trigger).toBe(Date.parse('2026-09-17T15:00:00.000Z'));
    });
  });

  describe('Multi-Slot Triggers', () => {
    it('returns multiple trigger slots for offsetsMinutes array', () => {
      const def = {
        ...baseDef,
        scheduleType: 'EXACT_TIME' as const,
        reminderRule: { offsetsMinutes: [-60, -15, 0] },
      };
      const occ = { ...baseOcc, calculatedStartTime: '2026-09-17T14:00:00.000Z' };

      const triggers = deriveNotificationTriggers(occ, def, nowMs);
      expect(triggers).toHaveLength(3);
      expect(triggers[0].slot).toBe('r0');
      expect(triggers[0].triggerAtMs).toBe(Date.parse('2026-09-17T13:00:00.000Z'));
      expect(triggers[1].slot).toBe('r1');
      expect(triggers[1].triggerAtMs).toBe(Date.parse('2026-09-17T13:45:00.000Z'));
      expect(triggers[2].slot).toBe('r2');
      expect(triggers[2].triggerAtMs).toBe(Date.parse('2026-09-17T14:00:00.000Z'));
    });

    it('uses "default" slot when exactly 1 offset is configured', () => {
      const def = {
        ...baseDef,
        reminderRule: { offsetsMinutes: [-10] },
      };
      const triggers = deriveNotificationTriggers(baseOcc, def, nowMs);
      expect(triggers[0].slot).toBe(NOTIFICATION_DEFAULT_SLOT);
    });
  });

  describe('Rich Notification Body', () => {
    it('builds body for before-offset with start time', () => {
      const body = buildNotificationBody(baseOcc, baseDef, -10);
      expect(body).toContain('Starts in 10 min');
      expect(body).toContain('2:30 PM');
    });

    it('builds body for at-time offset', () => {
      const body = buildNotificationBody(baseOcc, baseDef, 0);
      expect(body).toContain('Starting now');
      expect(body).toContain('2:30 PM');
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
    it('builds canonical DesiredNotification with payload version 2 and rich body', () => {
      const desired = deriveDesiredNotification(baseOcc, baseDef, nowMs);
      expect(desired).not.toBeNull();
      expect(desired!.identifier).toBe('task-reminder:occ-1:default');
      expect(desired!.occurrenceId).toBe('occ-1');
      expect(desired!.taskDefinitionId).toBe('def-1');
      expect(desired!.title).toBe('Read Quran');
      expect(desired!.channelId).toBe(NOTIFICATION_CHANNEL_ID);
      expect(desired!.triggerAtMs).toBe(Date.parse('2026-09-17T14:30:00.000Z'));
      expect(desired!.data.kind).toBe('task-reminder');
      expect(desired!.data.payloadVersion).toBe(NOTIFICATION_PAYLOAD_VERSION);
      expect(desired!.data.body).toContain('Starting now');
    });

    it('returns null if trigger derivation returns null', () => {
      const pastOcc = { ...baseOcc, calculatedStartTime: '2026-09-17T10:00:00.000Z' };
      expect(deriveDesiredNotification(pastOcc, baseDef, nowMs)).toBeNull();
    });
  });
});
