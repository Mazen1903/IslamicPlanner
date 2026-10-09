export function getRecurrenceLabel(
  recurrenceRule?: string | null,
  hijriRecurrence?: any
): string {
  if (hijriRecurrence) {
    if (typeof hijriRecurrence === 'string') {
      try {
        const parsed = JSON.parse(hijriRecurrence);
        if (parsed.pattern === 'DAYS_OF_SELECTED_MONTHS') return 'Selected Hijri Months';
        if (parsed.pattern === 'DAYS_OF_MONTH') return 'Hijri Monthly';
      } catch {
        // fallback
      }
    } else if (typeof hijriRecurrence === 'object') {
      if (hijriRecurrence.pattern === 'DAYS_OF_SELECTED_MONTHS') return 'Selected Hijri Months';
      if (hijriRecurrence.pattern === 'DAYS_OF_MONTH') return 'Hijri Monthly';
    }
    return 'Hijri';
  }

  if (!recurrenceRule) return 'Repeating';

  const parts = recurrenceRule.split(';').reduce<Record<string, string>>((acc, token) => {
    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const k = token.slice(0, eqIdx).trim().toUpperCase();
      const v = token.slice(eqIdx + 1).trim().toUpperCase();
      acc[k] = v;
    }
    return acc;
  }, {});

  const freq = parts.FREQ;
  const interval = parts.INTERVAL ? parseInt(parts.INTERVAL, 10) : 1;
  const byday = parts.BYDAY;
  const bymonthday = parts.BYMONTHDAY;

  if (freq === 'DAILY') {
    if (interval === 1) return 'Daily';
    return `Every ${interval} days`;
  }

  if (freq === 'WEEKLY') {
    if (byday === 'MO,TU,WE,TH,FR') return 'Weekdays';
    if (byday === 'SA,SU') return 'Weekends';
    if (interval > 1) return `Every ${interval} weeks`;
    if (byday) {
      const dayNames: Record<string, string> = {
        MO: 'Mon',
        TU: 'Tue',
        WE: 'Wed',
        TH: 'Thu',
        FR: 'Fri',
        SA: 'Sat',
        SU: 'Sun',
      };
      const days = byday.split(',').map(d => dayNames[d] ?? d);
      if (days.length <= 3) return days.join(', ');
      return 'Weekly';
    }
    return 'Weekly';
  }

  if (freq === 'MONTHLY') {
    if (interval > 1) return `Every ${interval} months`;
    if (bymonthday) return `Monthly (${bymonthday})`;
    return 'Monthly';
  }

  return 'Repeating';
}
