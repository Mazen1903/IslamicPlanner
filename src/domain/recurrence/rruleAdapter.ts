import { RecurrenceError } from './errors';
import type {
  GregorianRecurrenceFrequency,
  GregorianRecurrenceRule,
  ISOWeekday,
} from './types';

const ALLOWED_KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY']);

const WEEKDAY_MAP: Record<string, ISOWeekday> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

/**
 * Parses and validates a bare RRULE body string into a typed GregorianRecurrenceRule.
 *
 * Implements strict M9 token validation and allowlist enforcement:
 * - Reject RRULE: prefix with INVALID_RULE
 * - Reject unknown/unsupported keys with UNSUPPORTED_RULE_FEATURE
 * - Reject duplicate keys with INVALID_RULE
 * - Reject unsupported frequencies with UNSUPPORTED_FREQUENCY
 * - Enforce frequency / modifier compatibility
 */
export function parseRecurrenceRule(raw: string): GregorianRecurrenceRule {
  if (typeof raw !== 'string') {
    throw new RecurrenceError('INVALID_RULE', 'Recurrence rule must be a string');
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new RecurrenceError('INVALID_RULE', 'Recurrence rule cannot be empty');
  }

  if (/^RRULE:/i.test(trimmed)) {
    throw new RecurrenceError(
      'INVALID_RULE',
      'RRULE prefix "RRULE:" is not accepted; bare rule body required'
    );
  }

  const tokens = trimmed.split(';');
  const tokenMap = new Map<string, string>();

  for (const token of tokens) {
    if (token === '') {
      throw new RecurrenceError('INVALID_RULE', 'Malformed rule: empty token');
    }

    const eqIdx = token.indexOf('=');
    if (eqIdx === -1) {
      throw new RecurrenceError('INVALID_RULE', `Malformed token "${token}": missing "="`);
    }

    const key = token.slice(0, eqIdx).trim().toUpperCase();
    const value = token.slice(eqIdx + 1).trim();

    if (key === '' || value === '') {
      throw new RecurrenceError(
        'INVALID_RULE',
        `Malformed token "${token}": key and value cannot be empty`
      );
    }

    if (tokenMap.has(key)) {
      throw new RecurrenceError('INVALID_RULE', `Duplicate key "${key}"`);
    }

    if (!ALLOWED_KEYS.has(key)) {
      throw new RecurrenceError(
        'UNSUPPORTED_RULE_FEATURE',
        `Unsupported rule feature or key "${key}"`
      );
    }

    tokenMap.set(key, value);
  }

  // Validate FREQ
  if (!tokenMap.has('FREQ')) {
    throw new RecurrenceError('INVALID_RULE', 'Missing required key FREQ');
  }

  const freqStr = tokenMap.get('FREQ')!;
  if (freqStr !== 'DAILY' && freqStr !== 'WEEKLY' && freqStr !== 'MONTHLY') {
    throw new RecurrenceError(
      'UNSUPPORTED_FREQUENCY',
      `Unsupported frequency "${freqStr}"`
    );
  }
  const frequency = freqStr as GregorianRecurrenceFrequency;

  // Validate INTERVAL
  let interval = 1;
  if (tokenMap.has('INTERVAL')) {
    const intStr = tokenMap.get('INTERVAL')!;
    if (!/^[1-9]\d*$/.test(intStr)) {
      throw new RecurrenceError('INVALID_INTERVAL', `Invalid interval "${intStr}"`);
    }
    interval = parseInt(intStr, 10);
  }

  // Validate frequency and modifier compatibility
  let byWeekday: ISOWeekday[] | undefined;
  let byMonthDay: number[] | undefined;

  if (frequency === 'DAILY') {
    if (tokenMap.has('BYDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'BYDAY is not permitted with FREQ=DAILY');
    }
    if (tokenMap.has('BYMONTHDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'BYMONTHDAY is not permitted with FREQ=DAILY');
    }
  } else if (frequency === 'WEEKLY') {
    if (!tokenMap.has('BYDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'FREQ=WEEKLY requires BYDAY');
    }
    if (tokenMap.has('BYMONTHDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'BYMONTHDAY is not permitted with FREQ=WEEKLY');
    }

    const byDayStr = tokenMap.get('BYDAY')!;
    const dayTokens = byDayStr.split(',');
    if (dayTokens.length === 0 || dayTokens.some((t) => t.trim() === '')) {
      throw new RecurrenceError('INVALID_RULE', 'Invalid empty BYDAY value');
    }

    const weekdays: ISOWeekday[] = [];
    for (const rawToken of dayTokens) {
      const dt = rawToken.trim().toUpperCase();
      if (/^[-+]?[0-9]+[A-Za-z]+$/.test(dt)) {
        throw new RecurrenceError(
          'UNSUPPORTED_RULE_FEATURE',
          `Ordinal weekday "${dt}" is not supported`
        );
      }
      const mapped = WEEKDAY_MAP[dt];
      if (mapped === undefined) {
        throw new RecurrenceError('INVALID_RULE', `Invalid weekday "${dt}"`);
      }
      weekdays.push(mapped);
    }
    byWeekday = Array.from(new Set(weekdays)).sort((a, b) => a - b);
  } else if (frequency === 'MONTHLY') {
    if (!tokenMap.has('BYMONTHDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'FREQ=MONTHLY requires BYMONTHDAY');
    }
    if (tokenMap.has('BYDAY')) {
      throw new RecurrenceError('INVALID_RULE', 'BYDAY is not permitted with FREQ=MONTHLY');
    }

    const byMonthDayStr = tokenMap.get('BYMONTHDAY')!;
    const mDayTokens = byMonthDayStr.split(',');
    if (mDayTokens.length === 0 || mDayTokens.some((t) => t.trim() === '')) {
      throw new RecurrenceError('INVALID_RULE', 'Invalid empty BYMONTHDAY value');
    }

    const monthDays: number[] = [];
    for (const rawToken of mDayTokens) {
      const mt = rawToken.trim();
      if (!/^-?\d+$/.test(mt)) {
        throw new RecurrenceError('INVALID_RULE', `Invalid BYMONTHDAY value "${mt}"`);
      }
      const dayNum = parseInt(mt, 10);
      if (dayNum <= 0 || dayNum > 31) {
        throw new RecurrenceError(
          'INVALID_RULE',
          `BYMONTHDAY value "${mt}" out of range [1, 31]`
        );
      }
      monthDays.push(dayNum);
    }
    byMonthDay = Array.from(new Set(monthDays)).sort((a, b) => a - b);
  }

  return {
    frequency,
    interval,
    ...(byWeekday !== undefined ? { byWeekday } : {}),
    ...(byMonthDay !== undefined ? { byMonthDay } : {}),
  };
}
