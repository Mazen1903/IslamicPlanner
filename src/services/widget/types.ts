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

export type HexColor = `#${string}`;

export interface WidgetPalette {
  /** Opaque #RRGGBB hex background */
  background: HexColor;
  /** Opaque #RRGGBB hex surface (cards/containers) */
  surface: HexColor;
  /** Primary text color */
  textPrimary: HexColor;
  /** Secondary/muted text color */
  textSecondary: HexColor;
  /** Primary brand accent (e.g. current prayer highlight) */
  accent: HexColor;
  /** Text on accent (e.g. white or dark text on accent pill) */
  onAccent: HexColor;
  /** Important task indicator accent */
  important: HexColor;
  /** Divider/border color */
  divider: HexColor;

  // Convenient aliases for widget rendering components
  brandGreen: HexColor;
  text: HexColor;
  textMuted: HexColor;
  separator: HexColor;
  importantAccent: HexColor;
}

export interface WidgetTheme {
  /** FIXED when specific Islamic theme or explicit light/dark is chosen; SYSTEM when following OS */
  mode: 'FIXED' | 'SYSTEM';
  light: WidgetPalette;
  dark: WidgetPalette;
}

/** Default light widget palette */
export const DEFAULT_LIGHT_PALETTE: WidgetPalette = {
  background: '#FAFBFC',
  surface: '#FFFFFF',
  textPrimary: '#1A1D21',
  textSecondary: '#5F6B7A',
  accent: '#0F9F4A',
  onAccent: '#FFFFFF',
  important: '#D4A017',
  divider: '#F0F2F5',
  brandGreen: '#0F9F4A',
  text: '#1A1D21',
  textMuted: '#5F6B7A',
  separator: '#F0F2F5',
  importantAccent: '#D4A017',
};

/** Default dark widget palette */
export const DEFAULT_DARK_PALETTE: WidgetPalette = {
  background: '#0F1114',
  surface: '#1A1D22',
  textPrimary: '#E8ECF0',
  textSecondary: '#8E99A8',
  accent: '#4CAF75',
  onAccent: '#0F1114',
  important: '#F0C040',
  divider: '#1F2328',
  brandGreen: '#4CAF75',
  text: '#E8ECF0',
  textMuted: '#8E99A8',
  separator: '#1F2328',
  importantAccent: '#F0C040',
};

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  mode: 'SYSTEM',
  light: DEFAULT_LIGHT_PALETTE,
  dark: DEFAULT_DARK_PALETTE,
};

/**
 * Immutable widget data snapshot. All dates are UTC ISO strings.
 *
 * Schema invariants:
 *   - allPrayers has exactly 5 entries: FAJR, DHUHR, ASR, MAGHRIB, ISHA.
 *   - tasks has 0-3 entries. Small widget ignores tasks array.
 *   - isSetupRequired = true implies tasks = [] and no fake prayer times.
 *   - generatedAt is always a UTC ISO string.
 *   - schemaVersion is 2 in M18 Overhaul.
 *   - theme provides resolved opaque palette for light and dark modes.
 */
export interface WidgetSnapshot {
  schemaVersion: 2;
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
  /** Resolved color palette for widget presentation surfaces. */
  theme: WidgetTheme;
}

/** SETUP_REQUIRED placeholder snapshot sent when configuration is missing. */
export const SETUP_REQUIRED_SNAPSHOT: WidgetSnapshot = {
  schemaVersion: 2,
  generatedAt: '',
  planningDayKey: '',
  timezone: 'UTC',
  currentPrayer: {
    prayer: 'FAJR',
    name: 'Fajr',
    startsAt: '',
    startsAtLocal: '',
  },
  nextPrayer: null,
  allPrayers: [
    { prayer: 'FAJR', name: 'Fajr', startsAt: '', startsAtLocal: '' },
    { prayer: 'DHUHR', name: 'Dhuhr', startsAt: '', startsAtLocal: '' },
    { prayer: 'ASR', name: 'Asr', startsAt: '', startsAtLocal: '' },
    { prayer: 'MAGHRIB', name: 'Maghrib', startsAt: '', startsAtLocal: '' },
    { prayer: 'ISHA', name: 'Isha', startsAt: '', startsAtLocal: '' },
  ],
  tasks: [],
  isSetupRequired: true,
  theme: DEFAULT_WIDGET_THEME,
};
