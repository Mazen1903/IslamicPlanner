/**
 * Canonical Hijri date representation.
 * Month numbering is strictly 1-based (1 = Muharram .. 12 = Dhu al-Hijjah).
 */
export interface HijriDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * 1-based Hijri month numbers (1..12).
 */
export type HijriMonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Canonical 1-based Hijri month constants.
 */
export const HIJRI_MONTHS = {
  MUHARRAM: 1,
  SAFAR: 2,
  RABI_AL_AWWAL: 3,
  RABI_AL_THANI: 4,
  JUMADA_AL_ULA: 5,
  JUMADA_AL_THANI: 6,
  RAJAB: 7,
  SHABAN: 8,
  RAMADAN: 9,
  SHAWWAL: 10,
  DHU_AL_QIDAH: 11,
  DHU_AL_HIJJAH: 12,
} as const;

/**
 * Standard English transliterations of Hijri month names.
 */
export const HIJRI_MONTH_NAMES: Record<HijriMonthNumber, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: 'Rabi al-Awwal',
  4: 'Rabi al-Thani',
  5: 'Jumada al-Ula',
  6: 'Jumada al-Thani',
  7: 'Rajab',
  8: "Sha'ban",
  9: 'Ramadan',
  10: 'Shawwal',
  11: "Dhu al-Qi'dah",
  12: 'Dhu al-Hijjah',
};

/**
 * Supported Hijri calculation base methods.
 */
export type HijriBaseMethod = 'UMM_AL_QURA' | 'CALCULATED';

/**
 * Configuration for Hijri day adjustments.
 * Per ADR-005 and ADR-018:
 * - globalAdjustment: integer in [-2, +2], default conceptually 0.
 * - monthOverrides: Map where key is "${year}-${month}" (e.g. "1445-9") and value is integer in [-2, +2].
 *   When an override exists for a base Hijri month, it REPLACES the global adjustment (does not stack).
 */
export interface HijriAdjustmentConfig {
  readonly globalAdjustment?: number;
  readonly monthOverrides?: ReadonlyMap<string, number>;
}

/**
 * Generates the canonical string key for month overrides: "${year}-${month}".
 */
export function getHijriMonthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

/**
 * Supported date range for the calendar converter.
 */
export interface HijriSupportedRange {
  readonly gregorian: {
    readonly min: string; // '1924-08-01'
    readonly max: string; // '2077-11-16'
  };
  readonly hijri: {
    readonly min: HijriDate; // { year: 1343, month: 1, day: 1 }
    readonly max: HijriDate; // { year: 1500, month: 12, day: 30 }
  };
}

/**
 * Result of reverse-resolving a Gregorian civil date from an effective Hijri date.
 */
export type HijriReverseResolution =
  | { readonly kind: 'UNIQUE'; readonly gregorianDate: string }
  | { readonly kind: 'AMBIGUOUS'; readonly candidates: readonly string[] }
  | { readonly kind: 'NO_MATCH' };

/**
 * Service configuration passed to HijriService constructor.
 */
export interface HijriServiceConfig {
  readonly baseMethod?: HijriBaseMethod;
}
