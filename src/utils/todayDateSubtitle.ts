import { DateTime } from 'luxon';
import { HijriCalendarAdapter } from '@/domain/calendar/HijriCalendarAdapter';
import { HIJRI_MONTH_NAMES, type HijriMonthNumber } from '@/domain/calendar/types';

export function getTodayDateSubtitle(now: DateTime = DateTime.now()): string {
  const gregorianPart = now.toFormat('ccc, LLL d');
  try {
    const adapter = new HijriCalendarAdapter();
    const hijri = adapter.gregorianToHijri(now.year, now.month, now.day);
    const monthName = HIJRI_MONTH_NAMES[hijri.month as HijriMonthNumber] ?? '';
    return `${gregorianPart} • ${hijri.day} ${monthName} ${hijri.year} AH`;
  } catch {
    return gregorianPart;
  }
}
