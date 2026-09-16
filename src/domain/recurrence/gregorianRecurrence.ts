import type { TaskDefinition } from '../task/types';
import {
  addCivilDays,
  civilDaysBetween,
  getDaysInGregorianMonth,
  isoWeekday,
  mondayOfWeek,
} from './dateUtils';
import type { GregorianRecurrenceRule } from './types';

/**
 * Evaluates whether a candidate date belongs to a Gregorian recurring series.
 */
export function isGregorianMember(
  candidateDate: string,
  definition: TaskDefinition,
  rule: GregorianRecurrenceRule
): boolean {
  if (candidateDate < definition.startDate) {
    return false;
  }

  if (rule.frequency === 'DAILY') {
    const dayDistance = civilDaysBetween(definition.startDate, candidateDate);
    return dayDistance >= 0 && dayDistance % rule.interval === 0;
  }

  if (rule.frequency === 'WEEKLY') {
    const anchorMonday = mondayOfWeek(definition.startDate);
    const candidateMonday = mondayOfWeek(candidateDate);
    const dayDistance = civilDaysBetween(anchorMonday, candidateMonday);
    const weekDistance = dayDistance / 7;

    const inActiveWeek = weekDistance >= 0 && weekDistance % rule.interval === 0;
    const inByWeekday = rule.byWeekday!.includes(isoWeekday(candidateDate));
    const afterStart = candidateDate >= definition.startDate;

    return inActiveWeek && inByWeekday && afterStart;
  }

  if (rule.frequency === 'MONTHLY') {
    const [candYStr, candMStr, candDStr] = candidateDate.split('-');
    const candY = parseInt(candYStr, 10);
    const candM = parseInt(candMStr, 10);
    const candD = parseInt(candDStr, 10);

    const [anchorYStr, anchorMStr] = definition.startDate.split('-');
    const anchorY = parseInt(anchorYStr, 10);
    const anchorM = parseInt(anchorMStr, 10);

    const monthDist = (candY - anchorY) * 12 + (candM - anchorM);
    if (monthDist < 0 || monthDist % rule.interval !== 0) {
      return false;
    }

    const daysInM = getDaysInGregorianMonth(candY, candM);
    const clampedDaySet = new Set(rule.byMonthDay!.map((d) => Math.min(d, daysInM)));
    return clampedDaySet.has(candD);
  }

  return false;
}

/**
 * Generates all Gregorian seed dates for a definition within the effective window.
 * Uses bounded jumping algorithms (no full day-by-day scans for interval > 1).
 */
export function generateGregorianSeedDates(
  definition: TaskDefinition,
  rule: GregorianRecurrenceRule,
  effectiveBegin: string,
  effectiveEnd: string
): string[] {
  if (effectiveBegin > effectiveEnd) {
    return [];
  }

  if (rule.frequency === 'DAILY') {
    const offset = civilDaysBetween(definition.startDate, effectiveBegin);
    const remainder = ((offset % rule.interval) + rule.interval) % rule.interval;
    const daysToFirst = remainder === 0 ? 0 : rule.interval - remainder;
    const firstDate = addCivilDays(effectiveBegin, daysToFirst);

    const result: string[] = [];
    let curr = firstDate;
    while (curr <= effectiveEnd) {
      result.push(curr);
      curr = addCivilDays(curr, rule.interval);
    }
    return result;
  }

  if (rule.frequency === 'WEEKLY') {
    const anchorMonday = mondayOfWeek(definition.startDate);
    const beginMonday = mondayOfWeek(effectiveBegin);
    const dayDistance = civilDaysBetween(anchorMonday, beginMonday);
    let weekDist = Math.floor(dayDistance / 7);

    if (weekDist < 0) {
      weekDist = 0;
    } else {
      const rem = weekDist % rule.interval;
      if (rem !== 0) {
        weekDist += rule.interval - rem;
      }
    }

    const result: string[] = [];
    let currMonday = addCivilDays(anchorMonday, weekDist * 7);

    while (currMonday <= effectiveEnd) {
      for (const dow of rule.byWeekday!) {
        const candidate = addCivilDays(currMonday, dow - 1);
        if (
          candidate >= effectiveBegin &&
          candidate <= effectiveEnd &&
          candidate >= definition.startDate
        ) {
          result.push(candidate);
        }
      }
      weekDist += rule.interval;
      currMonday = addCivilDays(anchorMonday, weekDist * 7);
    }

    return result;
  }

  if (rule.frequency === 'MONTHLY') {
    const [anchorYStr, anchorMStr] = definition.startDate.split('-');
    const anchorY = parseInt(anchorYStr, 10);
    const anchorM = parseInt(anchorMStr, 10);

    const [beginYStr, beginMStr] = effectiveBegin.split('-');
    const beginY = parseInt(beginYStr, 10);
    const beginM = parseInt(beginMStr, 10);

    const [endYStr, endMStr] = effectiveEnd.split('-');
    const endY = parseInt(endYStr, 10);
    const endM = parseInt(endMStr, 10);

    const startMonthDist = (beginY - anchorY) * 12 + (beginM - anchorM);
    let monthDist = startMonthDist < 0 ? 0 : startMonthDist;
    const rem = monthDist % rule.interval;
    if (rem !== 0) {
      monthDist += rule.interval - rem;
    }

    const maxMonthDist = (endY - anchorY) * 12 + (endM - anchorM);
    const result: string[] = [];

    while (monthDist <= maxMonthDist) {
      const totalM = anchorM - 1 + monthDist;
      const year = anchorY + Math.floor(totalM / 12);
      const month = (totalM % 12) + 1;
      const daysInM = getDaysInGregorianMonth(year, month);

      const clampedDaySet = new Set(rule.byMonthDay!.map((d) => Math.min(d, daysInM)));
      const sortedDays = Array.from(clampedDaySet).sort((a, b) => a - b);

      const yearStr = String(year).padStart(4, '0');
      const monthStr = String(month).padStart(2, '0');

      for (const d of sortedDays) {
        const candidate = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`;
        if (
          candidate >= effectiveBegin &&
          candidate <= effectiveEnd &&
          candidate >= definition.startDate
        ) {
          result.push(candidate);
        }
      }

      monthDist += rule.interval;
    }

    return result;
  }

  return [];
}
