import { DateTime } from 'luxon';

/**
 * Checks whether an epoch timestamp falls within quiet hours in the specified timezone.
 * Handles both midnight-crossing windows (e.g., 22:00 to 06:00) and same-day windows (e.g., 13:00 to 15:00).
 */
export function isInsideQuietHours(
  timeMs: number,
  timezone: string,
  startStr = '22:00',
  endStr = '06:00'
): boolean {
  const dt = DateTime.fromMillis(timeMs, { zone: timezone || 'UTC' });
  if (!dt.isValid) return false;

  const currentMinutes = dt.hour * 60 + dt.minute;
  const [sH, sM] = startStr.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const [eH, eM] = endStr.split(':').map(Number);
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Spans midnight: e.g. 22:00 to 06:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  // Same-day: e.g. 13:00 to 15:00
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * If timeMs falls inside quiet hours, defers it to the immediate end of the quiet hours window.
 * Otherwise returns timeMs unchanged.
 */
export function adjustTriggerForQuietHours(
  timeMs: number,
  timezone: string,
  startStr = '22:00',
  endStr = '06:00'
): number {
  if (!isInsideQuietHours(timeMs, timezone, startStr, endStr)) {
    return timeMs;
  }

  const dt = DateTime.fromMillis(timeMs, { zone: timezone || 'UTC' });
  const currentMinutes = dt.hour * 60 + dt.minute;
  const [sH, sM] = startStr.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const [eH, eM] = endStr.split(':').map(Number);
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    if (currentMinutes >= startMinutes) {
      // Before midnight in window: defer to end on the next day
      return dt.plus({ days: 1 }).set({ hour: eH, minute: eM, second: 0, millisecond: 0 }).toMillis();
    }
    // After midnight in window: defer to end on the same day
    return dt.set({ hour: eH, minute: eM, second: 0, millisecond: 0 }).toMillis();
  }

  // Same-day window: defer to end on the same day
  return dt.set({ hour: eH, minute: eM, second: 0, millisecond: 0 }).toMillis();
}
