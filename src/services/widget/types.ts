/**
 * M18 Widget types.
 *
 * WidgetSnapshot is the single, platform-neutral, serializable data contract
 * between the canonical planner and widget rendering surfaces.
 *
 * Privacy invariants:
 *   - No Journal content, no Journal keys, no encrypted metadata.
 *   - No latitude/longitude coordinates.
 *   - No task notes or descriptions (only title and scheduleLabel).
 *   - Sunrise is never exposed (FAJR | DHUHR | ASR | MAGHRIB | ISHA only).
 */

export type WidgetPrayer = 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';

export interface WidgetPrayerEntry {
  /** Canonical prayer key. Never 'SUNRISE'. */
  prayer: WidgetPrayer;
  /** English name, e.g. "Fajr" */
  name: string;
  /** Arabic name, e.g. "الفجر" */
  arabicName: string;
  /** Prayer start time as ISO 8601 UTC string, e.g. "2026-09-18T03:47:00.000Z" */
  startsAt: string;
  /** Formatted local time string for display, e.g. "5:23 AM" */
  startsAtLocal: string;
}

export interface WidgetTaskEntry {
  /** Occurrence ID for debugging. Not displayed. */
  occurrenceId: string;
  /** Task title for display on home screen. */
  title: string;
  /** Schedule label for display, e.g. "Asr +10 min" or "Anytime Today" */
  scheduleLabel: string;
  /** Task priority for visual emphasis. */
  priority: 'NORMAL' | 'IMPORTANT';
  /**
   * ISO UTC string for sort ordering. Null for ANYTIME_TODAY tasks.
   * Not displayed.
   */
  sortInstant: string | null;
}

/**
 * Immutable widget data snapshot. All dates are UTC ISO strings.
 *
 * Schema invariants:
 *   - allPrayers has exactly 5 entries: FAJR, DHUHR, ASR, MAGHRIB, ISHA.
 *   - tasks has 0-3 entries. Small widget ignores tasks array.
 *   - isSetupRequired = true implies tasks = [] and no fake prayer times.
 *   - generatedAt is always a UTC ISO string.
 *   - schemaVersion is always 1 in M18.
 */
export interface WidgetSnapshot {
  schemaVersion: 1;
  /** UTC ISO string of when this snapshot was built. */
  generatedAt: string;
  /** YYYY-MM-DD key identifying the active planning day. Empty string if SETUP_REQUIRED. */
  planningDayKey: string;
  /** IANA timezone string, e.g. "America/Chicago". "UTC" if SETUP_REQUIRED. */
  timezone: string;
  /** Currently active prayer. */
  currentPrayer: WidgetPrayerEntry;
  /** Next upcoming prayer. Null if at the end of the planning day. */
  nextPrayer: WidgetPrayerEntry | null;
  /** All five canonical prayers for the planning day, in FAJR-ISHA order. */
  allPrayers: WidgetPrayerEntry[];
  /** Next 0-3 pending tasks ordered by Today screen sort order. */
  tasks: WidgetTaskEntry[];
  /** True when location/prayer config is missing. Widget shows a setup prompt. */
  isSetupRequired: boolean;
}

/** SETUP_REQUIRED placeholder snapshot sent when configuration is missing. */
export const SETUP_REQUIRED_SNAPSHOT: WidgetSnapshot = {
  schemaVersion: 1,
  generatedAt: '',
  planningDayKey: '',
  timezone: 'UTC',
  currentPrayer: {
    prayer: 'FAJR',
    name: 'Fajr',
    arabicName: 'الفجر',
    startsAt: '',
    startsAtLocal: '',
  },
  nextPrayer: null,
  allPrayers: [
    { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startsAt: '', startsAtLocal: '' },
    { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startsAt: '', startsAtLocal: '' },
    { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startsAt: '', startsAtLocal: '' },
    { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startsAt: '', startsAtLocal: '' },
    { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startsAt: '', startsAtLocal: '' },
  ],
  tasks: [],
  isSetupRequired: true,
};
