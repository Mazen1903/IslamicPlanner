import { DateTime } from 'luxon';
import type { WallClockResolution } from './types';
import { TemporalResolutionError } from './errors';
import { isValidTimezone } from './timezoneUtils';

/**
 * Resolves a local wall-clock time string (HH:mm) on a given calendar date in an IANA timezone
 * following the deterministic DST policy defined in SCHEDULING_ENGINE.md §2.4:
 *
 * 1. NORMAL: Unambiguous local time exists.
 * 2. SPRING_FORWARD_SHIFTED: Nonexistent local time (falls in DST gap).
 *    Resolves to the first valid instant after the actual gap.
 * 3. FALL_BACK_FIRST: Duplicated local time (falls in DST overlap).
 *    Deterministically selects the earlier absolute occurrence.
 *
 * Throws TemporalResolutionError on invalid time format, invalid date, invalid timezone,
 * or unresolvable datetime.
 */
export function resolveWallClock(
  dateStr: string,
  timeStr: string,
  timezone: string
): WallClockResolution {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(timeStr)) {
    throw new TemporalResolutionError(
      'INVALID_TIME_FORMAT',
      `Invalid time format "${timeStr}". Expected "HH:mm" (00:00 to 23:59).`
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new TemporalResolutionError(
      'INVALID_DATE_FORMAT',
      `Invalid date format "${dateStr}". Expected "YYYY-MM-DD".`
    );
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDt = DateTime.fromObject({ year, month, day }, { zone: 'utc' });
  if (!utcDt.isValid || utcDt.toISODate() !== dateStr) {
    throw new TemporalResolutionError(
      'INVALID_DATE_FORMAT',
      `Invalid calendar date "${dateStr}".`
    );
  }

  if (!isValidTimezone(timezone)) {
    throw new TemporalResolutionError(
      'INVALID_TIMEZONE',
      `Invalid IANA timezone "${timezone}".`
    );
  }

  const [hour, minute] = timeStr.split(':').map(Number);

  const candidate = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0, millisecond: 0 },
    { zone: timezone }
  );

  if (!candidate.isValid) {
    throw new TemporalResolutionError(
      'UNRESOLVABLE_DATETIME',
      `Invalid DateTime for date "${dateStr}", time "${timeStr}" in timezone "${timezone}": ${
        candidate.invalidReason ?? 'Unknown error'
      }`
    );
  }

  // 1. Fall-back overlap check:
  // getPossibleOffsets() returns all valid DateTime instances for this wall-clock time.
  const possibleOffsets = candidate.getPossibleOffsets();
  if (possibleOffsets.length > 1) {
    // Sort deterministically by absolute timestamp to select the earlier occurrence.
    possibleOffsets.sort((a, b) => a.toMillis() - b.toMillis());
    return {
      resolvedTime: possibleOffsets[0],
      resolution: 'FALL_BACK_FIRST',
    };
  }

  // 2. Spring-forward gap check:
  // When the requested wall-clock time does not exist, candidate local hour/minute differs from requested.
  if (candidate.hour !== hour || candidate.minute !== minute) {
    // Binary-search between start of day and candidate to locate the exact millisecond
    // of the transition, finding the first valid instant after the actual gap.
    let low = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: timezone }
    ).toMillis();
    let high = candidate.toMillis();

    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2);
      const midDt = DateTime.fromMillis(mid, { zone: timezone });
      if (
        midDt.toISODate() === dateStr &&
        (midDt.hour < hour || (midDt.hour === hour && midDt.minute < minute))
      ) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const firstValid = DateTime.fromMillis(high, { zone: timezone });
    return {
      resolvedTime: firstValid,
      resolution: 'SPRING_FORWARD_SHIFTED',
    };
  }

  // 3. Normal unambiguous local time
  return {
    resolvedTime: candidate,
    resolution: 'NORMAL',
  };
}
