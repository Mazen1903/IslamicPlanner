import { DateTime } from 'luxon';
import { isInsideQuietHours, adjustTriggerForQuietHours } from '../quietHours';

describe('quietHours', () => {
  const zone = 'UTC';

  describe('Midnight-crossing window (22:00 to 06:00)', () => {
    it('detects 23:00 as inside quiet hours', () => {
      const ms = DateTime.fromISO('2026-10-04T23:00:00Z').toMillis();
      expect(isInsideQuietHours(ms, zone, '22:00', '06:00')).toBe(true);
    });

    it('detects 03:00 as inside quiet hours', () => {
      const ms = DateTime.fromISO('2026-10-05T03:00:00Z').toMillis();
      expect(isInsideQuietHours(ms, zone, '22:00', '06:00')).toBe(true);
    });

    it('detects 12:00 as outside quiet hours', () => {
      const ms = DateTime.fromISO('2026-10-04T12:00:00Z').toMillis();
      expect(isInsideQuietHours(ms, zone, '22:00', '06:00')).toBe(false);
    });

    it('detects 06:00 as outside quiet hours (exact boundary)', () => {
      const ms = DateTime.fromISO('2026-10-05T06:00:00Z').toMillis();
      expect(isInsideQuietHours(ms, zone, '22:00', '06:00')).toBe(false);
    });

    it('defers 23:30 to 06:00 on the following morning', () => {
      const ms = DateTime.fromISO('2026-10-04T23:30:00Z').toMillis();
      const adjusted = adjustTriggerForQuietHours(ms, zone, '22:00', '06:00');
      const expected = DateTime.fromISO('2026-10-05T06:00:00Z').toMillis();
      expect(adjusted).toBe(expected);
    });

    it('defers 04:15 to 06:00 on the same morning', () => {
      const ms = DateTime.fromISO('2026-10-05T04:15:00Z').toMillis();
      const adjusted = adjustTriggerForQuietHours(ms, zone, '22:00', '06:00');
      const expected = DateTime.fromISO('2026-10-05T06:00:00Z').toMillis();
      expect(adjusted).toBe(expected);
    });
  });

  describe('Same-day window (13:00 to 15:00)', () => {
    it('detects 14:00 as inside quiet hours', () => {
      const ms = DateTime.fromISO('2026-10-04T14:00:00Z').toMillis();
      expect(isInsideQuietHours(ms, zone, '13:00', '15:00')).toBe(true);
    });

    it('defers 14:00 to 15:00 on the same day', () => {
      const ms = DateTime.fromISO('2026-10-04T14:00:00Z').toMillis();
      const adjusted = adjustTriggerForQuietHours(ms, zone, '13:00', '15:00');
      const expected = DateTime.fromISO('2026-10-04T15:00:00Z').toMillis();
      expect(adjusted).toBe(expected);
    });
  });
});
