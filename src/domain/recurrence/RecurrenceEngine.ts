import type { TaskDefinition } from '../task/types';
import { isValidCivilDate, maxDate, minDate } from './dateUtils';
import { RecurrenceError } from './errors';
import {
  generateGregorianSeedDates,
  isGregorianMember,
} from './gregorianRecurrence';
import {
  generateHijriSeedDates,
  isHijriRecurrenceMember,
  validateHijriRule,
} from './hijriRecurrence';
import { parseRecurrenceRule } from './rruleAdapter';
import type { CivilDateRange, RecurrenceContext, RecurrenceKind } from './types';

/**
 * Authoritative domain engine for task recurrence membership and seed date generation.
 * Pure, deterministic, and timezone-independent.
 */
export class RecurrenceEngine {
  /**
   * Classifies the recurrence kind of a task definition.
   * Throws INVALID_RULE if both recurrenceRule and hijriRecurrence are populated.
   */
  classifyRecurrence(definition: TaskDefinition): RecurrenceKind {
    const hasGregorian = definition.recurrenceRule != null;
    const hasHijri = definition.hijriRecurrence != null;

    if (hasGregorian && hasHijri) {
      throw new RecurrenceError(
        'INVALID_RULE',
        `TaskDefinition ${definition.id} has both recurrenceRule and hijriRecurrence populated. ` +
          `A definition must use exactly one calendar system for recurrence.`
      );
    }

    if (hasGregorian) return 'GREGORIAN';
    if (hasHijri) return 'HIJRI';
    return 'NON_RECURRING';
  }

  /**
   * Evaluates whether a task definition occurs on a specific civil date.
   */
  occursOn(
    definition: TaskDefinition,
    seedDate: string,
    context?: RecurrenceContext
  ): boolean {
    if (!isValidCivilDate(seedDate)) {
      throw new RecurrenceError(
        'INVALID_SEED_DATE',
        `Invalid seed date "${seedDate}". Expected YYYY-MM-DD.`
      );
    }

    const kind = this.classifyRecurrence(definition);

    if (kind === 'NON_RECURRING') {
      if (seedDate < definition.startDate) return false;
      if (
        definition.effectiveFromDate != null &&
        seedDate < definition.effectiveFromDate
      ) {
        return false;
      }
      if (
        definition.effectiveToDate != null &&
        seedDate > definition.effectiveToDate
      ) {
        return false;
      }
      if (
        definition.recurrenceEnd != null &&
        seedDate > definition.recurrenceEnd
      ) {
        return false;
      }
      return seedDate === definition.startDate;
    }

    if (kind === 'GREGORIAN') {
      const rule = parseRecurrenceRule(definition.recurrenceRule!);
      if (seedDate < definition.startDate) return false;
      if (
        definition.effectiveFromDate != null &&
        seedDate < definition.effectiveFromDate
      ) {
        return false;
      }
      if (
        definition.effectiveToDate != null &&
        seedDate > definition.effectiveToDate
      ) {
        return false;
      }
      if (
        definition.recurrenceEnd != null &&
        seedDate > definition.recurrenceEnd
      ) {
        return false;
      }
      return isGregorianMember(seedDate, definition, rule);
    }

    // Hijri Recurrence
    if (!context || !context.hijriService || !context.hijriAdjustment) {
      throw new RecurrenceError(
        'HIJRI_RESOLUTION_FAILED',
        'Hijri recurrence evaluation requires a RecurrenceContext with hijriService and hijriAdjustment'
      );
    }

    const validatedRule = validateHijriRule(definition.hijriRecurrence);

    // Evaluate canonical membership first.
    // If seedDate is unevaluable in the Hijri calendar, this throws OUT_OF_HIJRI_RANGE.
    const isMember = isHijriRecurrenceMember(
      seedDate,
      validatedRule,
      context.hijriService,
      context.hijriAdjustment
    );

    if (!isMember) {
      return false;
    }

    // Boundary guards
    if (seedDate < definition.startDate) return false;
    if (
      definition.effectiveFromDate != null &&
      seedDate < definition.effectiveFromDate
    ) {
      return false;
    }
    if (
      definition.effectiveToDate != null &&
      seedDate > definition.effectiveToDate
    ) {
      return false;
    }
    if (
      definition.recurrenceEnd != null &&
      seedDate > definition.recurrenceEnd
    ) {
      return false;
    }

    return true;
  }

  /**
   * Generates all civil seed dates for a definition within an inclusive date range.
   */
  generateSeedDates(
    definition: TaskDefinition,
    range: CivilDateRange,
    context?: RecurrenceContext
  ): string[] {
    if (
      !range ||
      !isValidCivilDate(range.start) ||
      !isValidCivilDate(range.end)
    ) {
      throw new RecurrenceError(
        'INVALID_DATE_RANGE',
        `Invalid date range: [${range?.start}, ${range?.end}]. Expected YYYY-MM-DD.`
      );
    }

    if (range.start > range.end) {
      throw new RecurrenceError(
        'INVALID_DATE_RANGE',
        `Invalid date range: start "${range.start}" is after end "${range.end}"`
      );
    }

    const kind = this.classifyRecurrence(definition);

    // Rule validation upfront for deterministic error signaling
    let gregorianRule;
    let hijriRule;

    if (kind === 'GREGORIAN') {
      gregorianRule = parseRecurrenceRule(definition.recurrenceRule!);
    } else if (kind === 'HIJRI') {
      if (!context || !context.hijriService || !context.hijriAdjustment) {
        throw new RecurrenceError(
          'HIJRI_RESOLUTION_FAILED',
          'Hijri recurrence evaluation requires a RecurrenceContext with hijriService and hijriAdjustment'
        );
      }
      hijriRule = validateHijriRule(definition.hijriRecurrence);
    }

    // Intersect effective definition window
    const effectiveBegin = maxDate(
      definition.startDate,
      definition.effectiveFromDate,
      range.start
    );
    const effectiveEnd = minDate(
      definition.effectiveToDate,
      definition.recurrenceEnd,
      range.end
    );

    if (effectiveBegin > effectiveEnd) {
      return [];
    }

    if (kind === 'NON_RECURRING') {
      if (
        definition.startDate >= effectiveBegin &&
        definition.startDate <= effectiveEnd
      ) {
        return [definition.startDate];
      }
      return [];
    }

    if (kind === 'GREGORIAN') {
      return generateGregorianSeedDates(
        definition,
        gregorianRule!,
        effectiveBegin,
        effectiveEnd
      );
    }

    // Hijri
    return generateHijriSeedDates(
      hijriRule!,
      effectiveBegin,
      effectiveEnd,
      context!.hijriService,
      context!.hijriAdjustment
    );
  }
}
