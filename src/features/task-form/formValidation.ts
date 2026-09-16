import { isValidCivilDate } from '@/domain/recurrence/dateUtils';
import { PRAYER_ORDER } from '@/constants/prayers';
import type { FormState } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateForm(state: FormState): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Title validation
  if (!state.title || state.title.trim() === '') {
    errors.title = 'Title is required';
  }

  // 2. Date validation
  if (state.scheduleMode === 'ANYTIME_TODAY') {
    if (!isValidCivilDate(state.planningDayDate)) {
      errors.planningDayDate = 'Valid planning day date is required';
    }
  } else {
    if (!isValidCivilDate(state.civilSeedDate)) {
      errors.civilSeedDate = 'Valid date is required';
    }
  }

  // If THIS_OCCURRENCE scope, only title and notes are editable, so skip schedule/recurrence validation
  if (state.mode === 'EDIT' && state.editScope === 'THIS_OCCURRENCE') {
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // 3. Schedule mode validation
  switch (state.scheduleMode) {
    case 'EXACT_TIME': {
      const time = state.exactDraft.localTime?.trim();
      if (!time) {
        errors.localTime = 'Time is required';
      } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        errors.localTime = 'Time must be in 24-hour HH:mm format (00:00 - 23:59)';
      }
      break;
    }

    case 'PRAYER_RELATIVE': {
      const prayer = state.relativeDraft.prayer;
      if (!prayer || (prayer as string) === 'SUNRISE') {
        errors.prayer = 'Valid prayer anchor is required (Sunrise cannot be selected)';
      }
      const offset = state.relativeDraft.offsetMinutes;
      if (typeof offset !== 'number' || isNaN(offset) || offset < 0 || !Number.isInteger(offset)) {
        errors.offsetMinutes = 'Offset must be a non-negative whole number of minutes';
      }
      break;
    }

    case 'PRAYER_WINDOW': {
      const { startPrayer, endPrayer } = state.windowDraft;
      if (!startPrayer || !endPrayer) {
        errors.prayerWindow = 'Both start and end prayers are required';
      } else if (startPrayer === endPrayer) {
        errors.prayerWindow = 'Start and end prayers cannot be the same';
      } else {
        const startIdx = PRAYER_ORDER.indexOf(startPrayer);
        const endIdx = PRAYER_ORDER.indexOf(endPrayer);
        if (startIdx >= endIdx) {
          errors.prayerWindow = 'Prayer window cannot wrap around midnight in v1';
        }
      }
      break;
    }

    case 'ANYTIME_TODAY':
      // No fixed schedule fields to validate
      break;
  }

  // 4. Recurrence validation
  if (state.recurrencePreset === 'CUSTOM') {
    if (state.recurrenceCalendar === 'GREGORIAN') {
      const greg = state.customGregorianDraft;
      if (!greg.interval || greg.interval < 1 || !Number.isInteger(greg.interval)) {
        errors.interval = 'Interval must be a positive integer';
      }
      if (greg.frequency === 'MONTHLY' && greg.selectedMonthDays.length > 0) {
        const invalidDay = greg.selectedMonthDays.some(d => d < 1 || d > 31 || !Number.isInteger(d));
        if (invalidDay) {
          errors.selectedMonthDays = 'Days of month must be between 1 and 31';
        }
      }
    } else if (state.recurrenceCalendar === 'HIJRI') {
      const hij = state.customHijriDraft;
      if (hij.pattern === 'DAYS_OF_MONTH' || hij.pattern === 'DAYS_OF_SELECTED_MONTHS') {
        if (!hij.selectedDays || hij.selectedDays.length === 0) {
          errors.hijriDays = 'Select at least one Hijri day';
        } else if (hij.selectedDays.some(d => d < 1 || d > 30 || !Number.isInteger(d))) {
          errors.hijriDays = 'Hijri days must be between 1 and 30';
        }
      }
      if (hij.pattern === 'MONTHS_OF_YEAR' || hij.pattern === 'DAYS_OF_SELECTED_MONTHS') {
        if (!hij.selectedMonths || hij.selectedMonths.length === 0) {
          errors.hijriMonths = 'Select at least one Hijri month';
        } else if (hij.selectedMonths.some(m => m < 1 || m > 12 || !Number.isInteger(m))) {
          errors.hijriMonths = 'Hijri months must be between 1 and 12';
        }
      }
    }
  }

  // 5. More Options validation
  if (state.estimatedMinutes !== null) {
    if (state.estimatedMinutes < 1 || !Number.isInteger(state.estimatedMinutes)) {
      errors.estimatedMinutes = 'Duration must be a positive integer';
    }
  }

  if (state.reminderMinutes !== null) {
    if (state.reminderMinutes < 0 || !Number.isInteger(state.reminderMinutes)) {
      errors.reminderMinutes = 'Reminder offset must be a non-negative integer';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
