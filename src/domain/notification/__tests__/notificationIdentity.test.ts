import {
  buildNotificationId,
  parseNotificationId,
  isAppOwnedNotificationId,
} from '../notificationIdentity';
import { NOTIFICATION_ID_PREFIX } from '../types';

describe('Notification Identity', () => {
  it('builds canonical deterministic ID with default slot', () => {
    const id = buildNotificationId('occ-123');
    expect(id).toBe('task-reminder:occ-123:default');
    expect(id.startsWith(NOTIFICATION_ID_PREFIX)).toBe(true);
  });

  it('builds canonical deterministic ID with custom slot', () => {
    const id = buildNotificationId('occ-456', 'slot-2');
    expect(id).toBe('task-reminder:occ-456:slot-2');
  });

  it('throws on empty occurrenceId', () => {
    expect(() => buildNotificationId('')).toThrow('occurrenceId must be a non-empty string');
    expect(() => buildNotificationId(null as any)).toThrow();
  });

  it('parses valid notification ID into occurrenceId and slot', () => {
    const parsed = parseNotificationId('task-reminder:occ-123:default');
    expect(parsed).toEqual({
      occurrenceId: 'occ-123',
      slot: 'default',
    });
  });

  it('parses occurrence IDs containing hyphens or underscores', () => {
    const parsed = parseNotificationId('task-reminder:550e8400-e29b-41d4-a716-446655440000:default');
    expect(parsed).toEqual({
      occurrenceId: '550e8400-e29b-41d4-a716-446655440000',
      slot: 'default',
    });
  });

  it('returns null when parsing invalid IDs', () => {
    expect(parseNotificationId('unrelated-notification:123')).toBeNull();
    expect(parseNotificationId('task-reminder:')).toBeNull();
    expect(parseNotificationId('task-reminder:no-slot')).toBeNull();
    expect(parseNotificationId('')).toBeNull();
    expect(parseNotificationId(null as any)).toBeNull();
  });

  it('identifies app-owned IDs by prefix', () => {
    expect(isAppOwnedNotificationId('task-reminder:occ-1:default')).toBe(true);
    expect(isAppOwnedNotificationId('task-reminder:any-suffix')).toBe(true);
    expect(isAppOwnedNotificationId('other-app:notification-1')).toBe(false);
    expect(isAppOwnedNotificationId('')).toBe(false);
    expect(isAppOwnedNotificationId(null as any)).toBe(false);
  });
});
