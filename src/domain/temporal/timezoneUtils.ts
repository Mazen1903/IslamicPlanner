import { TemporalResolutionError } from './errors';

export interface TimelineWithPeriods {
  periods?: {
    start?: {
      zoneName?: string | null;
    };
  }[];
}

/**
 * Validates whether an IANA timezone string is valid.
 */
export function isValidTimezone(zone: unknown): boolean {
  if (typeof zone !== 'string' || !zone.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts the effective IANA timezone from a timeline context.
 * Throws TemporalResolutionError('INVALID_TIMEZONE') if the timeline has no periods
 * or if the periods do not specify a valid IANA timezone.
 */
export function getEffectiveTimezone(timeline: TimelineWithPeriods): string {
  if (!timeline.periods || timeline.periods.length === 0) {
    throw new TemporalResolutionError(
      'INVALID_TIMEZONE',
      'Cannot determine effective timezone from empty PrayerTimeline'
    );
  }

  const tz = timeline.periods[0]?.start?.zoneName;
  if (!tz || typeof tz !== 'string' || !tz.trim()) {
    throw new TemporalResolutionError(
      'INVALID_TIMEZONE',
      'PrayerTimeline periods do not contain a valid zoneName'
    );
  }

  if (!isValidTimezone(tz)) {
    throw new TemporalResolutionError(
      'INVALID_TIMEZONE',
      `PrayerTimeline periods contain invalid zoneName: "${tz}"`
    );
  }

  return tz;
}
