import { isoWeekday } from '@/domain/recurrence/dateUtils';
import type { ISOWeekday } from '@/domain/recurrence/types';
import type { CustomGregorianDraft, RecurrencePreset } from './types';

const ISO_TO_WEEKDAY: Record<ISOWeekday, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

/**
 * Formats a list of ISO weekdays into canonical comma-separated BYDAY tokens,
 * always numerically sorted (1=MO .. 7=SU) without duplicate tokens.
 * Example: [5, 1, 3] -> 'MO,WE,FR'
 */
export function formatIsoWeekdays(weekdays: ISOWeekday[]): string {
  const unique = Array.from(new Set(weekdays)).sort((a, b) => a - b);
  return unique.map(w => ISO_TO_WEEKDAY[w]).join(',');
}

/**
 * Extracts day of month from a civil date YYYY-MM-DD.
 */
export function monthDayFromCivilDate(dateStr: string): number {
  const parts = dateStr.split('-');
  return parseInt(parts[2], 10);
}

/**
 * Serializes Custom Gregorian draft into a bare RFC 5545 RRULE string.
 * Strictly avoids unsupported tokens (COUNT, UNTIL, BYSETPOS, etc.).
 */
export function serializeCustomGregorian(
  draft: CustomGregorianDraft,
  seedDate: string
): string {
  const interval = Math.max(1, Math.floor(draft.interval || 1));
  const intervalToken = interval > 1 ? `;INTERVAL=${interval}` : '';

  switch (draft.frequency) {
    case 'DAILY':
      return `FREQ=DAILY${intervalToken}`;

    case 'WEEKLY': {
      const weekdays =
        draft.selectedWeekdays && draft.selectedWeekdays.length > 0
          ? draft.selectedWeekdays
          : [isoWeekday(seedDate)];
      const byDay = formatIsoWeekdays(weekdays);
      return `FREQ=WEEKLY${intervalToken};BYDAY=${byDay}`;
    }

    case 'MONTHLY': {
      const monthDays =
        draft.selectedMonthDays && draft.selectedMonthDays.length > 0
          ? draft.selectedMonthDays
          : [monthDayFromCivilDate(seedDate)];
      const sorted = Array.from(new Set(monthDays)).sort((a, b) => a - b);
      return `FREQ=MONTHLY${intervalToken};BYMONTHDAY=${sorted.join(',')}`;
    }
  }
}

/**
 * Serializes preset recurrence options into canonical bare RRULE strings.
 * Returns null if preset is 'NONE'.
 */
export function serializePresetToRRule(
  preset: RecurrencePreset,
  seedDate: string,
  options?: {
    specificDays?: ISOWeekday[];
    customGregorianDraft?: CustomGregorianDraft;
  }
): string | null {
  switch (preset) {
    case 'NONE':
      return null;

    case 'DAILY':
      return 'FREQ=DAILY';

    case 'WEEKDAYS':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';

    case 'WEEKLY': {
      const weekday = isoWeekday(seedDate);
      return `FREQ=WEEKLY;BYDAY=${ISO_TO_WEEKDAY[weekday]}`;
    }

    case 'MONTHLY': {
      const mDay = monthDayFromCivilDate(seedDate);
      return `FREQ=MONTHLY;BYMONTHDAY=${mDay}`;
    }

    case 'SPECIFIC_DAYS': {
      const days = options?.specificDays ?? [];
      const weekdays = days.length > 0 ? days : [isoWeekday(seedDate)];
      return `FREQ=WEEKLY;BYDAY=${formatIsoWeekdays(weekdays)}`;
    }

    case 'CUSTOM': {
      if (!options?.customGregorianDraft) {
        return 'FREQ=DAILY';
      }
      return serializeCustomGregorian(options.customGregorianDraft, seedDate);
    }
  }
}
