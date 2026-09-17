import { isNotificationEquivalent } from '../notificationEquality';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DEFAULT_SLOT,
  NOTIFICATION_PAYLOAD_VERSION,
  type DesiredNotification,
  type ScheduledNotificationSnapshot,
} from '../types';

describe('Notification Equality', () => {
  const desired: DesiredNotification = {
    identifier: 'task-reminder:occ-1:default',
    occurrenceId: 'occ-1',
    taskDefinitionId: 'def-1',
    title: 'Fajr Dhikr',
    triggerAtMs: 1789640000000,
    channelId: NOTIFICATION_CHANNEL_ID,
    data: {
      kind: 'task-reminder',
      occurrenceId: 'occ-1',
      taskDefinitionId: 'def-1',
      reminderSlot: NOTIFICATION_DEFAULT_SLOT,
      triggerAtMs: 1789640000000,
      payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
    },
  };

  const matchingSnapshot: ScheduledNotificationSnapshot = {
    identifier: 'task-reminder:occ-1:default',
    title: 'Fajr Dhikr',
    triggerAtMs: 1789640000000,
    channelId: NOTIFICATION_CHANNEL_ID,
    data: {
      kind: 'task-reminder',
      occurrenceId: 'occ-1',
      taskDefinitionId: 'def-1',
      reminderSlot: NOTIFICATION_DEFAULT_SLOT,
      triggerAtMs: 1789640000000,
      payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
    },
  };

  it('returns true when all relevant fields match', () => {
    expect(isNotificationEquivalent(desired, matchingSnapshot)).toBe(true);
  });

  it('returns false when identifier differs', () => {
    const current = { ...matchingSnapshot, identifier: 'task-reminder:occ-2:default' };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  it('returns false when title differs (stale title with identical trigger)', () => {
    const current = { ...matchingSnapshot, title: 'Old Title' };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  it('returns false when triggerAtMs differs', () => {
    const current = { ...matchingSnapshot, triggerAtMs: 1789640005000 };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  it('returns false when payload data is missing or not an object', () => {
    expect(isNotificationEquivalent(desired, { ...matchingSnapshot, data: undefined })).toBe(false);
    expect(isNotificationEquivalent(desired, { ...matchingSnapshot, data: null as any })).toBe(false);
    expect(isNotificationEquivalent(desired, { ...matchingSnapshot, data: 'string' as any })).toBe(false);
  });

  it('returns false when payload kind differs', () => {
    const current = {
      ...matchingSnapshot,
      data: { ...matchingSnapshot.data!, kind: 'other-reminder' },
    };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  it('returns false when payload occurrenceId differs', () => {
    const current = {
      ...matchingSnapshot,
      data: { ...matchingSnapshot.data!, occurrenceId: 'occ-999' },
    };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  it('returns false when payload payloadVersion differs (stale payloadVersion)', () => {
    const current = {
      ...matchingSnapshot,
      data: { ...matchingSnapshot.data!, payloadVersion: 2 },
    };
    expect(isNotificationEquivalent(desired, current)).toBe(false);
  });

  describe('Platform-Aware Channel Equality', () => {
    it('returns false on Android when channelId differs', () => {
      const current = { ...matchingSnapshot, channelId: 'wrong-channel' };
      expect(isNotificationEquivalent(desired, current, { isAndroid: true })).toBe(false);
    });

    it('returns true on Android when channelId matches task-reminders', () => {
      const current = { ...matchingSnapshot, channelId: NOTIFICATION_CHANNEL_ID };
      expect(isNotificationEquivalent(desired, current, { isAndroid: true })).toBe(true);
    });

    it('returns true on iOS even when snapshot channelId differs or is null (channels not applicable on iOS)', () => {
      const current = { ...matchingSnapshot, channelId: null };
      expect(isNotificationEquivalent(desired, current, { isAndroid: false })).toBe(true);

      const currentWithOtherChannel = { ...matchingSnapshot, channelId: 'other' };
      expect(isNotificationEquivalent(desired, currentWithOtherChannel, { isAndroid: false })).toBe(true);
    });
  });
});
