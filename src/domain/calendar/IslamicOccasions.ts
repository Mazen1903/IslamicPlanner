import { DateTime } from 'luxon';
import type { HijriDate } from './types';

export type OccasionTier = 'MAJOR' | 'RECURRING';
export type OccasionGroup = 'CORE' | 'SUNNAH' | 'COMMONLY_OBSERVED';
export type OccasionTint = 'gold' | 'indigo' | 'teal' | 'green' | 'rose';

export interface Occasion {
  id: string;
  name: string;
  tier: OccasionTier;
  group: OccasionGroup;
  tint: OccasionTint;
  fastingAllowed: boolean;
  isFastingDay?: boolean;
  suggestedTaskTitle?: string;
  description?: string;
}

export interface GetOccasionsOptions {
  includeCommonlyObserved?: boolean;
}

/**
 * Pure domain service to compute Islamic occasions for a given Hijri + Civil date.
 * Strictly respects prohibition of fasting on Eid days (1 Shawwal, 10-13 Dhu al-Hijjah).
 */
export function getOccasionsFor(
  hijri: HijriDate,
  civilDateStr: string,
  options: GetOccasionsOptions = {}
): Occasion[] {
  const { includeCommonlyObserved = true } = options;
  const occasions: Occasion[] = [];
  const { month, day } = hijri;

  // Determine civil weekday: 1 = Mon, 4 = Thu, 5 = Fri
  let weekday = 0;
  try {
    const dt = DateTime.fromISO(civilDateStr);
    if (dt.isValid) {
      weekday = dt.weekday;
    }
  } catch {
    // fallback if unparseable
  }

  // 1. Prohibited Fasting Days check:
  // - 1 Shawwal (Eid al-Fitr)
  // - 10 Dhu al-Hijjah (Eid al-Adha)
  // - 11, 12, 13 Dhu al-Hijjah (Days of Tashreeq)
  const isEidAlFitr = month === 10 && day === 1;
  const isEidAlAdha = month === 12 && day === 10;
  const isTashreeq = month === 12 && (day === 11 || day === 12 || day === 13);
  const fastingProhibited = isEidAlFitr || isEidAlAdha || isTashreeq;

  // ── MAJOR OCCASIONS ────────────────────────────────────────────────────────

  // Islamic New Year (1 Muharram)
  if (month === 1 && day === 1) {
    occasions.push({
      id: 'ISLAMIC_NEW_YEAR',
      name: 'Islamic New Year',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'gold',
      fastingAllowed: true,
      isFastingDay: false,
      suggestedTaskTitle: 'Reflect & set intentions for the new Hijri year',
      description: 'First day of the Hijri year (1 Muharram).',
    });
  }

  // Tasu'a (9 Muharram)
  if (month === 1 && day === 9) {
    occasions.push({
      id: 'TASUA',
      name: "Tasu'a (Day before Ashura)",
      tier: 'MAJOR',
      group: 'SUNNAH',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: "Fast on Tasu'a",
      description: 'Recommended sunnah fasting alongside Ashura.',
    });
  }

  // Ashura (10 Muharram)
  if (month === 1 && day === 10) {
    occasions.push({
      id: 'ASHURA',
      name: 'Day of Ashura',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Fast on the Day of Ashura',
      description: 'The day Allah saved Prophet Musa (Moses) and his people.',
    });
  }

  // Mawlid al-Nabi (12 Rabi' al-Awwal)
  if (includeCommonlyObserved && month === 3 && day === 12) {
    occasions.push({
      id: 'MAWLID',
      name: 'Mawlid al-Nabi',
      tier: 'MAJOR',
      group: 'COMMONLY_OBSERVED',
      tint: 'green',
      fastingAllowed: true,
      isFastingDay: false,
      suggestedTaskTitle: 'Send Salawat upon the Prophet (peace be upon him)',
      description: 'Commonly observed commemoration of the birth of the Prophet Muhammad (peace be upon him).',
    });
  }

  // Al-Isra' wal-Mi'raj (27 Rajab)
  if (includeCommonlyObserved && month === 7 && day === 27) {
    occasions.push({
      id: 'ISRA_MIRAJ',
      name: "Al-Isra' wal-Mi'raj",
      tier: 'MAJOR',
      group: 'COMMONLY_OBSERVED',
      tint: 'indigo',
      fastingAllowed: true,
      isFastingDay: false,
      suggestedTaskTitle: "Read the story of Al-Isra' wal-Mi'raj",
      description: 'Night journey and ascension of the Prophet (peace be upon him).',
    });
  }

  // Mid-Sha'ban (15 Sha'ban)
  if (includeCommonlyObserved && month === 8 && day === 15) {
    occasions.push({
      id: 'MID_SHABAN',
      name: "Mid-Sha'ban (15th Night)",
      tier: 'MAJOR',
      group: 'COMMONLY_OBSERVED',
      tint: 'indigo',
      fastingAllowed: true,
      isFastingDay: false,
      suggestedTaskTitle: "Make Du'a & night prayer (Qiyam)",
      description: '15th night of Sha\'ban, commonly observed with prayer and supplication.',
    });
  }

  // First day of Ramadan (1 Ramadan)
  if (month === 9 && day === 1) {
    occasions.push({
      id: 'RAMADAN_START',
      name: 'First Day of Ramadan',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'indigo',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Fast the first day of Ramadan',
      description: 'Beginning of the blessed month of Ramadan.',
    });
  }

  // Laylat al-Qadr / Last 10 nights of Ramadan (21–30 Ramadan)
  if (month === 9 && day >= 21) {
    const isOddNight = day % 2 === 1;
    if (isOddNight) {
      occasions.push({
        id: `LAYLAT_AL_QADR_${day}`,
        name: `Laylat al-Qadr (Odd Night ${day})`,
        tier: 'MAJOR',
        group: 'CORE',
        tint: 'indigo',
        fastingAllowed: true,
        isFastingDay: false,
        suggestedTaskTitle: "Seek Laylat al-Qadr with Qiyam & Du'a",
        description: 'One of the odd nights of the last 10 days of Ramadan.',
      });
    } else {
      occasions.push({
        id: `RAMADAN_LAST_10_${day}`,
        name: `Last 10 Nights of Ramadan (Night ${day})`,
        tier: 'MAJOR',
        group: 'CORE',
        tint: 'indigo',
        fastingAllowed: true,
        isFastingDay: false,
        suggestedTaskTitle: "Qiyam & I'tikaf in last 10 nights",
        description: 'Part of the blessed last ten nights of Ramadan.',
      });
    }
  }

  // Eid al-Fitr (1 Shawwal)
  if (isEidAlFitr) {
    occasions.push({
      id: 'EID_AL_FITR',
      name: 'Eid al-Fitr',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'gold',
      fastingAllowed: false,
      isFastingDay: false,
      suggestedTaskTitle: 'Attend Eid al-Fitr prayer & celebrate',
      description: 'Celebration marking the conclusion of Ramadan. Fasting is prohibited.',
    });
  }

  // Six days of Shawwal (Shawwal 2–7)
  if (month === 10 && day >= 2 && day <= 7) {
    occasions.push({
      id: `SHAWWAL_SIX_${day}`,
      name: `Six Days of Shawwal (${day - 1}/6)`,
      tier: 'MAJOR',
      group: 'SUNNAH',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Fast one of the Six Days of Shawwal',
      description: 'Whoever fasts Ramadan then follows it with six days of Shawwal, it is like fasting the entire year.',
    });
  }

  // Day of Arafah (9 Dhu al-Hijjah)
  if (month === 12 && day === 9) {
    occasions.push({
      id: 'ARAFAH',
      name: 'Day of Arafah',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'teal',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Fast on the Day of Arafah & make Du\'a',
      description: 'The pinnacle day of Hajj. Fasting expiates sins of the preceding and coming year.',
    });
  }

  // Eid al-Adha (10 Dhu al-Hijjah)
  if (isEidAlAdha) {
    occasions.push({
      id: 'EID_AL_ADHA',
      name: 'Eid al-Adha',
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'gold',
      fastingAllowed: false,
      isFastingDay: false,
      suggestedTaskTitle: 'Attend Eid al-Adha prayer & Qurbani',
      description: 'Feast of the Sacrifice. Fasting is prohibited.',
    });
  }

  // Days of Tashreeq (11, 12, 13 Dhu al-Hijjah)
  if (isTashreeq) {
    occasions.push({
      id: `TASHREEQ_${day}`,
      name: `Days of Tashreeq (Day ${day - 10})`,
      tier: 'MAJOR',
      group: 'CORE',
      tint: 'gold',
      fastingAllowed: false,
      isFastingDay: false,
      suggestedTaskTitle: 'Takbeerat & remembrance of Allah',
      description: 'Days of eating, drinking, and remembrance of Allah. Fasting is prohibited.',
    });
  }

  // ── RECURRING SUNNAH DAYS ──────────────────────────────────────────────────

  // White Days (13, 14, 15 of every month)
  // Exception: in Dhu al-Hijjah (month 12), day 13 is Tashreeq (fasting prohibited).
  if (day === 13 || day === 14 || day === 15) {
    if (!(month === 12 && day === 13)) {
      occasions.push({
        id: `WHITE_DAY_${day}`,
        name: `White Day (${day}th Hijri)`,
        tier: 'RECURRING',
        group: 'SUNNAH',
        tint: 'teal',
        fastingAllowed: !fastingProhibited,
        isFastingDay: true,
        suggestedTaskTitle: 'Sunnah Fast (White Day)',
        description: 'Recommended sunnah fasting on the 13th, 14th, and 15th of each lunar month.',
      });
    }
  }

  // Jumu'ah (Friday) - Weekly congregation and prayer (NOT a fast day; singling out Friday for fasting is discouraged)
  if (weekday === 5) {
    occasions.push({
      id: 'JUMUAH',
      name: "Jumu'ah",
      tier: 'RECURRING',
      group: 'SUNNAH',
      tint: 'teal',
      fastingAllowed: !fastingProhibited,
      isFastingDay: false,
      suggestedTaskTitle: 'Read Surah Al-Kahf & attend Jumu\'ah prayer',
      description: 'Blessed Friday weekly congregation.',
    });
  }

  // Monday Sunnah Fast
  if (weekday === 1 && !fastingProhibited && month !== 9) {
    occasions.push({
      id: 'SUNNAH_MONDAY',
      name: 'Monday Sunnah Fast',
      tier: 'RECURRING',
      group: 'SUNNAH',
      tint: 'green',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Sunnah Fast (Monday)',
      description: 'The Prophet (peace be upon him) was born on Monday and received revelation on it.',
    });
  }

  // Thursday Sunnah Fast
  if (weekday === 4 && !fastingProhibited && month !== 9) {
    occasions.push({
      id: 'SUNNAH_THURSDAY',
      name: 'Thursday Sunnah Fast',
      tier: 'RECURRING',
      group: 'SUNNAH',
      tint: 'green',
      fastingAllowed: true,
      isFastingDay: true,
      suggestedTaskTitle: 'Sunnah Fast (Thursday)',
      description: 'Deeds are presented to Allah on Thursdays.',
    });
  }

  return occasions;
}

/**
 * Returns the single most prominent major occasion for marking on the calendar grid, or undefined if none.
 */
export function getMajorOccasionForGrid(
  hijri: HijriDate,
  civilDateStr: string,
  options: GetOccasionsOptions = {}
): Occasion | undefined {
  const occasions = getOccasionsFor(hijri, civilDateStr, options);
  return occasions.find(o => o.tier === 'MAJOR');
}
