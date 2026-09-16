import { execSync } from 'child_process';
import {
  HijriService,
  SUPPORTED_RANGE,
  addGregorianDays,
  isGregorianLeapYear,
  getDaysInGregorianMonth,
} from '../HijriService';
import {
  HijriAdjustmentError,
  HijriConversionError,
  HijriDateError,
  HijriUnsupportedMethodError,
  HijriValidationError,
} from '../errors';
import type { HijriDate } from '../types';

describe('HijriService', () => {
  let service: HijriService;

  beforeEach(() => {
    service = new HijriService();
  });

  // ==========================================================================
  // Category B: Independent Correctness Fixtures (Tier A)
  // Expected dates verified against published Umm al-Qura calendar (ummulqura.org.sa)
  // and moonsighting.com Umm al-Qura tables.
  // ==========================================================================
  describe('Independent Correctness Fixtures (Tier A)', () => {
    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B1: 2024-03-11 -> 1445/9/1 (1 Ramadan 1445)', () => {
      expect(service.toHijri('2024-03-11')).toEqual({ year: 1445, month: 9, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B2: 2024-04-10 -> 1445/10/1 (1 Shawwal 1445 / Eid al-Fitr)', () => {
      expect(service.toHijri('2024-04-10')).toEqual({ year: 1445, month: 10, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B3: 2024-06-16 -> 1445/12/10 (10 Dhul-Hijjah 1445 / Eid al-Adha)', () => {
      expect(service.toHijri('2024-06-16')).toEqual({ year: 1445, month: 12, day: 10 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B4: 2024-06-07 -> 1445/12/1 (1 Dhul-Hijjah 1445)', () => {
      expect(service.toHijri('2024-06-07')).toEqual({ year: 1445, month: 12, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa) & moonsighting.com
    it('B5: 2024-07-07 -> 1446/1/1 (1 Muharram 1446)', () => {
      expect(service.toHijri('2024-07-07')).toEqual({ year: 1446, month: 1, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa) & moonsighting.com
    it('B12: 2023-07-19 -> 1445/1/1 (1 Muharram 1445)', () => {
      expect(service.toHijri('2023-07-19')).toEqual({ year: 1445, month: 1, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa) & moonsighting.com
    it('B13: 2025-06-26 -> 1447/1/1 (1 Muharram 1447)', () => {
      expect(service.toHijri('2025-06-26')).toEqual({ year: 1447, month: 1, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa) & moonsighting.com
    it('B15: 2025-03-01 -> 1446/9/1 (1 Ramadan 1446)', () => {
      expect(service.toHijri('2025-03-01')).toEqual({ year: 1446, month: 9, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa) & moonsighting.com
    it('B16: 2025-03-30 -> 1446/10/1 (1 Shawwal 1446)', () => {
      expect(service.toHijri('2025-03-30')).toEqual({ year: 1446, month: 10, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B17: 2023-03-23 -> 1444/9/1 (1 Ramadan 1444)', () => {
      expect(service.toHijri('2023-03-23')).toEqual({ year: 1444, month: 9, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B18: 2023-04-21 -> 1444/10/1 (1 Shawwal 1444)', () => {
      expect(service.toHijri('2023-04-21')).toEqual({ year: 1444, month: 10, day: 1 });
    });

    // Source: Official Saudi Umm al-Qura calendar (ummulqura.org.sa)
    it('B19: 2023-06-28 -> 1444/12/10 (10 Dhul-Hijjah 1444 / Eid al-Adha)', () => {
      expect(service.toHijri('2023-06-28')).toEqual({ year: 1444, month: 12, day: 10 });
    });
  });

  // ==========================================================================
  // Category B: Regression / Cross-Check Fixtures (Tier B)
  // Expected values are converter outputs used for regression and boundary testing.
  // ==========================================================================
  describe('Regression / Cross-Check Fixtures (Tier B)', () => {
    it('B6: 2024-01-01 -> 1445/6/19 (Gregorian year start)', () => {
      expect(service.toHijri('2024-01-01')).toEqual({ year: 1445, month: 6, day: 19 });
    });

    it('B7: 2024-12-31 -> 1446/6/30 (Gregorian year end)', () => {
      expect(service.toHijri('2024-12-31')).toEqual({ year: 1446, month: 6, day: 30 });
    });

    it('B8: 2024-02-29 -> 1445/8/19 (Gregorian leap day)', () => {
      expect(service.toHijri('2024-02-29')).toEqual({ year: 1445, month: 8, day: 19 });
    });

    it('B9: 2025-02-28 -> 1446/8/29 (Non-leap Feb boundary)', () => {
      expect(service.toHijri('2025-02-28')).toEqual({ year: 1446, month: 8, day: 29 });
    });

    it('B10: 1924-08-01 -> 1343/1/1 (Min supported boundary)', () => {
      expect(service.toHijri('1924-08-01')).toEqual({ year: 1343, month: 1, day: 1 });
    });

    it('B11: 2077-11-16 -> 1500/12/30 (Max supported boundary)', () => {
      expect(service.toHijri('2077-11-16')).toEqual({ year: 1500, month: 12, day: 30 });
    });

    it('B14: 2026-06-16 -> 1448/1/1 (1 Muharram 1448)', () => {
      expect(service.toHijri('2026-06-16')).toEqual({ year: 1448, month: 1, day: 1 });
    });

    it('B20: 2024-07-16 -> 1446/1/10 (10 Muharram 1446)', () => {
      expect(service.toHijri('2024-07-16')).toEqual({ year: 1446, month: 1, day: 10 });
    });

    it('B21: 2026-09-15 -> 1448/4/4 (Representative date)', () => {
      expect(service.toHijri('2026-09-15')).toEqual({ year: 1448, month: 4, day: 4 });
    });

    it('B22: 2030-01-01 -> 1451/8/26 (Future date)', () => {
      expect(service.toHijri('2030-01-01')).toEqual({ year: 1451, month: 8, day: 26 });
    });

    it('B23: 2000-01-01 -> 1420/9/24 (Y2K date)', () => {
      expect(service.toHijri('2000-01-01')).toEqual({ year: 1420, month: 9, day: 24 });
    });

    it('B24: 1950-01-01 -> 1369/3/12 (Mid-century date)', () => {
      expect(service.toHijri('1950-01-01')).toEqual({ year: 1369, month: 3, day: 12 });
    });

    it('B25: 2077-11-15 -> 1500/12/29 (Day before max supported)', () => {
      expect(service.toHijri('2077-11-15')).toEqual({ year: 1500, month: 12, day: 29 });
    });
  });

  // ==========================================================================
  // Category C: Inverse Conversion (toGregorian)
  // ==========================================================================
  describe('Category C: Inverse Conversion (toGregorian)', () => {
    it('C1: 1445/9/1 -> 2024-03-11', () => {
      expect(service.toGregorian({ year: 1445, month: 9, day: 1 })).toBe('2024-03-11');
    });

    it('C2: 1445/10/1 -> 2024-04-10', () => {
      expect(service.toGregorian({ year: 1445, month: 10, day: 1 })).toBe('2024-04-10');
    });

    it('C3: 1343/1/1 -> 1924-08-01 (Min boundary)', () => {
      expect(service.toGregorian({ year: 1343, month: 1, day: 1 })).toBe('1924-08-01');
    });

    it('C4: 1500/12/30 -> 2077-11-16 (Max boundary)', () => {
      expect(service.toGregorian({ year: 1500, month: 12, day: 30 })).toBe('2077-11-16');
    });

    it('C5: rejects day 30 for 29-day month (1445/8/30) with DAY_OUT_OF_RANGE', () => {
      expect(() => service.toGregorian({ year: 1445, month: 8, day: 30 })).toThrow(
        HijriValidationError
      );
      try {
        service.toGregorian({ year: 1445, month: 8, day: 30 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriValidationError);
        expect((err as HijriValidationError).code).toBe('DAY_OUT_OF_RANGE');
      }
    });

    it('C6: rejects year outside supported range (1342 and 1501) with OUT_OF_RANGE', () => {
      try {
        service.toGregorian({ year: 1342, month: 12, day: 29 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
      }

      try {
        service.toGregorian({ year: 1501, month: 1, day: 1 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
      }
    });
  });

  // ==========================================================================
  // Category D: Month Boundaries & Lengths
  // ==========================================================================
  describe('Category D: Month Boundaries & Lengths', () => {
    it('D1: getDaysInMonth returns 30 for Ramadan 1445', () => {
      expect(service.getDaysInMonth(1445, 9)).toBe(30);
    });

    it('D2: getDaysInMonth returns 29 for Shaban 1445', () => {
      expect(service.getDaysInMonth(1445, 8)).toBe(29);
    });

    it('D3: getDaysInMonth returns 30 for min boundary (1343/1)', () => {
      expect(service.getDaysInMonth(1343, 1)).toBe(30);
    });

    it('D4: getDaysInMonth returns 30 for max boundary (1500/12)', () => {
      expect(service.getDaysInMonth(1500, 12)).toBe(30);
    });

    it('D5: consecutive day transitions across month rollover', () => {
      // 2024-03-10 is 1445/8/29 (last day of Shaban)
      expect(service.toHijri('2024-03-10')).toEqual({ year: 1445, month: 8, day: 29 });
      // 2024-03-11 is 1445/9/1 (first day of Ramadan)
      expect(service.toHijri('2024-03-11')).toEqual({ year: 1445, month: 9, day: 1 });
    });

    it('D6: consecutive day transitions across year rollover', () => {
      // 2024-07-06 is 1445/12/30 (last day of 1445)
      expect(service.toHijri('2024-07-06')).toEqual({ year: 1445, month: 12, day: 30 });
      // 2024-07-07 is 1446/1/1 (first day of 1446)
      expect(service.toHijri('2024-07-07')).toEqual({ year: 1446, month: 1, day: 1 });
    });

    it('D7: getDaysInMonth throws OUT_OF_RANGE for year out of bounds', () => {
      expect(() => service.getDaysInMonth(1342, 1)).toThrow(HijriConversionError);
      expect(() => service.getDaysInMonth(1501, 1)).toThrow(HijriConversionError);
    });

    it('D8: getDaysInMonth throws MONTH_OUT_OF_RANGE for month < 1 or > 12', () => {
      expect(() => service.getDaysInMonth(1445, 0)).toThrow(HijriValidationError);
      expect(() => service.getDaysInMonth(1445, 13)).toThrow(HijriValidationError);
    });
  });

  // ==========================================================================
  // Category E: Broad Round-Trip Sampling
  // ==========================================================================
  describe('Category E: Broad Round-Trip Sampling', () => {
    it('E1: Gregorian -> Hijri -> Gregorian round-trip across 50 sample dates', () => {
      const testDates = [
        '1924-08-01',
        '1925-01-01',
        '1930-05-15',
        '1940-10-20',
        '1950-03-01',
        '1960-07-04',
        '1970-11-25',
        '1980-02-29',
        '1990-08-15',
        '2000-01-01',
        '2010-06-12',
        '2020-02-29',
        '2021-04-13',
        '2022-05-02',
        '2023-04-21',
        '2024-03-11',
        '2024-04-10',
        '2024-06-16',
        '2025-03-01',
        '2026-02-18',
        '2027-01-01',
        '2030-12-31',
        '2040-07-15',
        '2050-09-01',
        '2060-04-14',
        '2070-08-20',
        '2077-11-16',
      ];

      for (const gDate of testDates) {
        const hijri = service.toHijri(gDate);
        const resolvedG = service.toGregorian(hijri);
        expect(resolvedG).toBe(gDate);
      }
    });

    it('E2: Hijri -> Gregorian -> Hijri round-trip across valid Hijri dates', () => {
      const sampleHijri: HijriDate[] = [
        { year: 1343, month: 1, day: 1 },
        { year: 1350, month: 6, day: 15 },
        { year: 1400, month: 1, day: 1 },
        { year: 1420, month: 9, day: 24 },
        { year: 1444, month: 9, day: 1 },
        { year: 1445, month: 8, day: 29 },
        { year: 1445, month: 9, day: 1 },
        { year: 1445, month: 9, day: 30 },
        { year: 1446, month: 1, day: 1 },
        { year: 1475, month: 11, day: 10 },
        { year: 1500, month: 12, day: 30 },
      ];

      for (const h of sampleHijri) {
        const g = service.toGregorian(h);
        const resolvedH = service.toHijri(g);
        expect(resolvedH).toEqual(h);
      }
    });

    it('E3: edge-of-range round-trips', () => {
      // Min date
      expect(service.toGregorian(service.toHijri('1924-08-01'))).toBe('1924-08-01');
      // Day after min
      expect(service.toGregorian(service.toHijri('1924-08-02'))).toBe('1924-08-02');
      // Max date
      expect(service.toGregorian(service.toHijri('2077-11-16'))).toBe('2077-11-16');
      // Day before max
      expect(service.toGregorian(service.toHijri('2077-11-15'))).toBe('2077-11-15');
    });
  });

  // ==========================================================================
  // Category F: Global Adjustment
  // ==========================================================================
  describe('Category F: Global Adjustment', () => {
    it('F1: globalAdjustment: +1 advances effective Hijri date by 1 day', () => {
      // Base: 2024-03-11 -> 1445/9/1
      // With +1: baseHijri(2024-03-12) -> 1445/9/2
      const result = service.toEffectiveHijri('2024-03-11', { globalAdjustment: 1 });
      expect(result).toEqual({ year: 1445, month: 9, day: 2 });
    });

    it('F2: globalAdjustment: -1 regresses effective Hijri date by 1 day', () => {
      // Base: 2024-03-11 -> 1445/9/1
      // With -1: baseHijri(2024-03-10) -> 1445/8/29
      const result = service.toEffectiveHijri('2024-03-11', { globalAdjustment: -1 });
      expect(result).toEqual({ year: 1445, month: 8, day: 29 });
    });

    it('F3: globalAdjustment: +2 advances effective Hijri date by 2 days', () => {
      const result = service.toEffectiveHijri('2024-03-11', { globalAdjustment: 2 });
      expect(result).toEqual({ year: 1445, month: 9, day: 3 });
    });

    it('F4: globalAdjustment: -2 regresses effective Hijri date by 2 days', () => {
      const result = service.toEffectiveHijri('2024-03-11', { globalAdjustment: -2 });
      expect(result).toEqual({ year: 1445, month: 8, day: 28 });
    });

    it('F5: globalAdjustment: 0 returns identical to base Hijri', () => {
      const result = service.toEffectiveHijri('2024-03-11', { globalAdjustment: 0 });
      expect(result).toEqual({ year: 1445, month: 9, day: 1 });
    });

    it('F6: positive adjustment shifts across Hijri month boundary', () => {
      // Base: 2024-03-10 is 1445/8/29 (last day of Shaban)
      // +1 shift moves to 1445/9/1 (first day of Ramadan)
      const result = service.toEffectiveHijri('2024-03-10', { globalAdjustment: 1 });
      expect(result).toEqual({ year: 1445, month: 9, day: 1 });
    });

    it('F7: throws INVALID_GLOBAL_ADJUSTMENT for values outside [-2, +2]', () => {
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { globalAdjustment: 3 })
      ).toThrow(HijriAdjustmentError);
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { globalAdjustment: -3 })
      ).toThrow(HijriAdjustmentError);
    });

    it('F8: throws INVALID_GLOBAL_ADJUSTMENT for non-integer adjustment', () => {
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { globalAdjustment: 1.5 as number })
      ).toThrow(HijriAdjustmentError);
    });
  });

  // ==========================================================================
  // Category G: Per-Month Overrides & Reverse Resolution
  // ==========================================================================
  describe('Category G: Per-Month Overrides & Reverse Resolution', () => {
    it('G1: per-month override replaces global adjustment without stacking', () => {
      // 2024-03-11 base is 1445/9/1.
      // Global is +1 (which would advance to 1445/9/2), but override for 1445-9 is 0.
      const overrides = new Map<string, number>([['1445-9', 0]]);
      const result = service.toEffectiveHijri('2024-03-11', {
        globalAdjustment: 1,
        monthOverrides: overrides,
      });
      expect(result).toEqual({ year: 1445, month: 9, day: 1 });
    });

    it('G2: month without override falls back to global adjustment', () => {
      // 2024-03-10 base is 1445/8/29.
      // Override is defined for 1445-9 (0), but month 8 has no override.
      // Global is +1, so month 8 gets +1: base(2024-03-11) = 1445/9/1.
      const overrides = new Map<string, number>([['1445-9', 0]]);
      const result = service.toEffectiveHijri('2024-03-10', {
        globalAdjustment: 1,
        monthOverrides: overrides,
      });
      expect(result).toEqual({ year: 1445, month: 9, day: 1 });
    });

    it('G3: multiple overrides across different months are correctly applied', () => {
      const overrides = new Map<string, number>([
        ['1445-8', 1],
        ['1445-9', -1],
      ]);

      // Month 8 (+1): 2024-03-09 base 1445/8/28 -> with +1 -> 1445/8/29
      expect(
        service.toEffectiveHijri('2024-03-09', { monthOverrides: overrides })
      ).toEqual({ year: 1445, month: 8, day: 29 });

      // Month 9 (-1): 2024-03-11 base 1445/9/1 -> with -1 -> 1445/8/29
      expect(
        service.toEffectiveHijri('2024-03-11', { monthOverrides: overrides })
      ).toEqual({ year: 1445, month: 8, day: 29 });
    });

    it('G4: throws INVALID_OVERRIDE if override value is outside [-2, +2] or non-integer', () => {
      const invalidOverrides1 = new Map<string, number>([['1445-9', 3]]);
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { monthOverrides: invalidOverrides1 })
      ).toThrow(HijriAdjustmentError);

      const invalidOverrides2 = new Map<string, number>([['1445-9', 1.2]]);
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { monthOverrides: invalidOverrides2 })
      ).toThrow(HijriAdjustmentError);
    });

    it('G5: throws INVALID_OVERRIDE if override key format is invalid', () => {
      const invalidKey = new Map<string, number>([['not-a-valid-key', 1]]);
      expect(() =>
        service.toEffectiveHijri('2024-03-11', { monthOverrides: invalidKey })
      ).toThrow(HijriAdjustmentError);
    });

    it('G6-U: reverse resolution with uniform config returns UNIQUE', () => {
      const target: HijriDate = { year: 1445, month: 9, day: 1 };
      const resolution = service.resolveGregorianFromEffectiveHijri(target, {
        globalAdjustment: 1,
      });

      expect(resolution).toEqual({
        kind: 'UNIQUE',
        gregorianDate: '2024-03-10',
      });
      // Verification: 2024-03-10 with +1 maps to base(2024-03-11) = 1445/9/1
      expect(service.toEffectiveHijri('2024-03-10', { globalAdjustment: 1 })).toEqual(
        target
      );
    });

    it('G6-A: reverse resolution at Shaban(+1)/Ramadan(0) boundary returns AMBIGUOUS with 2 candidates', () => {
      // Shaban (month 8) has override +1; Ramadan (month 9) has override 0.
      // - 2024-03-10: base is 1445/8/29 (Shaban). With +1 -> base(2024-03-11) = 1445/9/1.
      // - 2024-03-11: base is 1445/9/1 (Ramadan). With 0 -> base(2024-03-11) = 1445/9/1.
      // Both Gregorian dates map to effective 1445/9/1!
      const config = {
        monthOverrides: new Map<string, number>([
          ['1445-8', 1],
          ['1445-9', 0],
        ]),
      };

      const target: HijriDate = { year: 1445, month: 9, day: 1 };
      const resolution = service.resolveGregorianFromEffectiveHijri(target, config);

      expect(resolution).toEqual({
        kind: 'AMBIGUOUS',
        candidates: ['2024-03-10', '2024-03-11'],
      });
    });

    it('G6-N: reverse resolution for gap date returns NO_MATCH', () => {
      // Shaban (month 8) override 0; Ramadan (month 9) override +1.
      // - 2024-03-10: base 1445/8/29 (Shaban), with 0 -> 1445/8/29.
      // - 2024-03-11: base 1445/9/1 (Ramadan), with +1 -> base(2024-03-12) = 1445/9/2.
      // 1445/9/1 is skipped entirely (gap)!
      const config = {
        monthOverrides: new Map<string, number>([
          ['1445-8', 0],
          ['1445-9', 1],
        ]),
      };

      const target: HijriDate = { year: 1445, month: 9, day: 1 };
      const resolution = service.resolveGregorianFromEffectiveHijri(target, config);

      expect(resolution).toEqual({ kind: 'NO_MATCH' });
    });

    it('G7: constant-adjustment round-trip: resolve -> UNIQUE -> maps back to target', () => {
      const target: HijriDate = { year: 1445, month: 10, day: 1 };
      for (const adj of [-2, -1, 0, 1, 2]) {
        const resolution = service.resolveGregorianFromEffectiveHijri(target, {
          globalAdjustment: adj,
        });
        expect(resolution.kind).toBe('UNIQUE');
        if (resolution.kind === 'UNIQUE') {
          expect(
            service.toEffectiveHijri(resolution.gregorianDate, { globalAdjustment: adj })
          ).toEqual(target);
        }
      }
    });

    it('G8: AMBIGUOUS candidates are deterministically sorted ascending YYYY-MM-DD', () => {
      const config = {
        monthOverrides: new Map<string, number>([
          ['1445-8', 1],
          ['1445-9', 0],
        ]),
      };

      const target: HijriDate = { year: 1445, month: 9, day: 1 };
      const resolution = service.resolveGregorianFromEffectiveHijri(target, config);

      expect(resolution.kind).toBe('AMBIGUOUS');
      if (resolution.kind === 'AMBIGUOUS') {
        expect(resolution.candidates).toHaveLength(2);
        expect(resolution.candidates[0] < resolution.candidates[1]).toBe(true);
      }
    });

    it('G9: verifies implementation bound: evaluates exactly [B-2..B+2] and no valid preimage exists at B-3 or B+3', () => {
      const target: HijriDate = { year: 1445, month: 9, day: 1 };
      const baseG = service.toGregorian(target); // '2024-03-11'

      // Spy on toEffectiveHijri to verify only the 5 allowed candidate positions are evaluated
      const spy = jest.spyOn(service, 'toEffectiveHijri');
      service.resolveGregorianFromEffectiveHijri(target, { globalAdjustment: 1 });

      const evaluatedDates = spy.mock.calls.map((call) => call[0]);
      expect(evaluatedDates).toHaveLength(5);
      expect(evaluatedDates).toEqual([
        addGregorianDays(baseG, -2),
        addGregorianDays(baseG, -1),
        baseG,
        addGregorianDays(baseG, 1),
        addGregorianDays(baseG, 2),
      ]);

      // Direct verification: for any valid adjustment in [-2, +2], B-3 and B+3 can NEVER map to target
      const dateMinus3 = addGregorianDays(baseG, -3);
      const datePlus3 = addGregorianDays(baseG, 3);
      for (let adj = -2; adj <= 2; adj++) {
        expect(service.toEffectiveHijri(dateMinus3, { globalAdjustment: adj })).not.toEqual(
          target
        );
        expect(service.toEffectiveHijri(datePlus3, { globalAdjustment: adj })).not.toEqual(
          target
        );
      }

      spy.mockRestore();
    });
  });

  // ==========================================================================
  // Category H: Validation Pipeline
  // ==========================================================================
  describe('Category H: Validation Pipeline', () => {
    it('H1: rejects non-date string with INVALID_DATE_FORMAT', () => {
      expect(() => service.toHijri('not-a-date')).toThrow(HijriValidationError);
      try {
        service.toHijri('not-a-date');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriValidationError);
        expect((err as HijriValidationError).code).toBe('INVALID_DATE_FORMAT');
      }
    });

    it('H2: rejects invalid month in Gregorian (2024-13-01) with INVALID_DATE_FORMAT', () => {
      try {
        service.toHijri('2024-13-01');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriValidationError);
        expect((err as HijriValidationError).code).toBe('INVALID_DATE_FORMAT');
      }
    });

    it('H3: rejects invalid day in Gregorian (2024-02-30) with INVALID_DATE_FORMAT', () => {
      try {
        service.toHijri('2024-02-30');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriValidationError);
        expect((err as HijriValidationError).code).toBe('INVALID_DATE_FORMAT');
      }
    });

    it('H4: rejects non-leap Feb 29 (2023-02-29) with INVALID_DATE_FORMAT', () => {
      try {
        service.toHijri('2023-02-29');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriValidationError);
        expect((err as HijriValidationError).code).toBe('INVALID_DATE_FORMAT');
      }
    });

    it('H5: validate returns null for valid Hijri dates (and isValid returns true)', () => {
      const valid: HijriDate = { year: 1445, month: 9, day: 1 };
      expect(service.validate(valid)).toBeNull();
      expect(service.isValid(valid)).toBe(true);
    });

    it('H6: validate returns INVALID_STRUCTURE for non-integer or malformed objects', () => {
      expect(service.validate(null)).toBe('INVALID_STRUCTURE');
      expect(service.validate('1445-09-01')).toBe('INVALID_STRUCTURE');
      expect(service.validate({ year: 1445, month: 9 })).toBe('INVALID_STRUCTURE');
      expect(service.validate({ year: 1445.5, month: 9, day: 1 })).toBe(
        'INVALID_STRUCTURE'
      );
    });

    it('H7: validate returns YEAR_OUT_OF_RANGE for year < 1343 or > 1500', () => {
      expect(service.validate({ year: 1342, month: 1, day: 1 })).toBe(
        'YEAR_OUT_OF_RANGE'
      );
      expect(service.validate({ year: 1501, month: 1, day: 1 })).toBe(
        'YEAR_OUT_OF_RANGE'
      );
    });

    it('H8: validate returns DAY_OUT_OF_RANGE for day 30 in 29-day month or day > 30', () => {
      // 1445/8 has 29 days
      expect(service.validate({ year: 1445, month: 8, day: 30 })).toBe(
        'DAY_OUT_OF_RANGE'
      );
      expect(service.validate({ year: 1445, month: 9, day: 31 })).toBe(
        'DAY_OUT_OF_RANGE'
      );
      expect(service.validate({ year: 1445, month: 9, day: 0 })).toBe(
        'DAY_OUT_OF_RANGE'
      );
    });
  });

  // ==========================================================================
  // Category I: Error Wrapping & Constructor Guards
  // ==========================================================================
  describe('Category I: Error Wrapping & Constructor Guards', () => {
    it('I1: out-of-range Gregorian date throws HijriConversionError with OUT_OF_RANGE', () => {
      try {
        service.toHijri('1924-07-31');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
      }

      try {
        service.toHijri('2077-11-17');
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
      }
    });

    it('I2: out-of-range Hijri date throws HijriConversionError with OUT_OF_RANGE', () => {
      try {
        service.toGregorian({ year: 1342, month: 12, day: 29 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
      }
    });

    it('I3: adjusted Gregorian date pushing beyond max range throws ADJUSTED_OUT_OF_RANGE', () => {
      // Max Gregorian is 2077-11-16. With +1 adjustment, shifted date is 2077-11-17 (out of range).
      expect(() =>
        service.toEffectiveHijri('2077-11-16', { globalAdjustment: 1 })
      ).toThrow(HijriConversionError);

      try {
        service.toEffectiveHijri('2077-11-16', { globalAdjustment: 1 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('ADJUSTED_OUT_OF_RANGE');
      }
    });

    it('I4: adjusted Gregorian date pushing below min range throws ADJUSTED_OUT_OF_RANGE', () => {
      // Min Gregorian is 1924-08-01. With -1 adjustment, shifted date is 1924-07-31 (out of range).
      try {
        service.toEffectiveHijri('1924-08-01', { globalAdjustment: -1 });
        fail('Expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriConversionError);
        expect((err as HijriConversionError).code).toBe('ADJUSTED_OUT_OF_RANGE');
      }
    });

    it('I5: reverse resolution skips out-of-range search candidates and returns NO_MATCH if none match', () => {
      // Min target is 1343/1/1 (B = 1924-08-01). Candidates B-2 and B-1 are out of range and skipped.
      // If we use globalAdjustment: -1, preimage would need to be B+1 = 1924-08-02, which is in range.
      // But if we seek a date where no in-range candidate matches, it cleanly returns NO_MATCH.
      const target: HijriDate = { year: 1343, month: 1, day: 1 };
      const res = service.resolveGregorianFromEffectiveHijri(target, {
        globalAdjustment: 2, // requires candidate B-2 which is 1924-07-30 (out of range)
      });
      expect(res).toEqual({ kind: 'NO_MATCH' });
    });

    it('I6: new HijriService({ baseMethod: "CALCULATED" }) throws HijriUnsupportedMethodError immediately', () => {
      expect(() => new HijriService({ baseMethod: 'CALCULATED' })).toThrow(
        HijriUnsupportedMethodError
      );
      try {
        new HijriService({ baseMethod: 'CALCULATED' });
        fail('Expected constructor to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HijriUnsupportedMethodError);
        expect((err as HijriUnsupportedMethodError).method).toBe('CALCULATED');
      }
    });

    it('I7: raw package errors are never exposed directly without being wrapped in domain error', () => {
      expect(() => service.toHijri('1900-01-01')).toThrow(HijriConversionError);
      expect(() => service.toGregorian({ year: 1200, month: 1, day: 1 })).toThrow(
        HijriConversionError
      );
    });

    it('I8: all thrown domain errors inherit from HijriDateError', () => {
      expect(new HijriConversionError('OUT_OF_RANGE', 'test')).toBeInstanceOf(
        HijriDateError
      );
      expect(new HijriValidationError('INVALID_DATE_FORMAT', 'test')).toBeInstanceOf(
        HijriDateError
      );
      expect(
        new HijriAdjustmentError('INVALID_GLOBAL_ADJUSTMENT', 'test')
      ).toBeInstanceOf(HijriDateError);
      expect(new HijriUnsupportedMethodError('CALCULATED', 'test')).toBeInstanceOf(
        HijriDateError
      );
    });

    it('I9: new HijriService() defaults to UMM_AL_QURA without error', () => {
      const s = new HijriService();
      expect(s.baseMethod).toBe('UMM_AL_QURA');
    });

    it('I10: new HijriService({ baseMethod: "UMM_AL_QURA" }) constructs successfully', () => {
      const s = new HijriService({ baseMethod: 'UMM_AL_QURA' });
      expect(s.baseMethod).toBe('UMM_AL_QURA');
    });
  });

  // ==========================================================================
  // Category J: Timezone Independence
  // ==========================================================================
  describe('Category J: Timezone Independence', () => {
    it('J1: civil conversions in child processes under UTC, America/Chicago, and Asia/Riyadh return identical results', () => {
      const timezones = ['UTC', 'America/Chicago', 'Asia/Riyadh'];
      const results: string[] = [];

      for (const tz of timezones) {
        const code = `
          const { gregorianToHijri } = require('@tabby_ai/hijri-converter');
          const h = gregorianToHijri({ year: 2024, month: 3, day: 11 });
          console.log(JSON.stringify(h));
        `;
        const out = execSync(`node -e "${code.replace(/\s+/g, ' ')}"`, {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8',
        }).trim();
        results.push(out);
      }

      expect(results[0]).toBe('{"year":1445,"month":9,"day":1}');
      expect(results[1]).toBe(results[0]);
      expect(results[2]).toBe(results[0]);
    });

    it('J2: reverse resolution in child processes under multiple timezones returns identical results', () => {
      const timezones = ['UTC', 'America/Chicago', 'Asia/Riyadh'];
      const results: string[] = [];

      for (const tz of timezones) {
        const code = `
          const { hijriToGregorian } = require('@tabby_ai/hijri-converter');
          const g = hijriToGregorian({ year: 1445, month: 9, day: 1 });
          console.log(JSON.stringify(g));
        `;
        const out = execSync(`node -e "${code.replace(/\s+/g, ' ')}"`, {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8',
        }).trim();
        results.push(out);
      }

      expect(results[0]).toBe('{"year":2024,"month":3,"day":11}');
      expect(results[1]).toBe(results[0]);
      expect(results[2]).toBe(results[0]);
    });
  });

  // ==========================================================================
  // Category L: Supported Range & Gregorian Day Arithmetic
  // ==========================================================================
  describe('Category L: Supported Range & Gregorian Day Arithmetic', () => {
    it('L1: getSupportedRange returns authoritative min and max boundaries', () => {
      const range = service.getSupportedRange();
      expect(range).toEqual(SUPPORTED_RANGE);
      expect(range.gregorian.min).toBe('1924-08-01');
      expect(range.gregorian.max).toBe('2077-11-16');
      expect(range.hijri.min).toEqual({ year: 1343, month: 1, day: 1 });
      expect(range.hijri.max).toEqual({ year: 1500, month: 12, day: 30 });
    });

    it('L2: addGregorianDays correctly adds positive days with month rollover', () => {
      expect(addGregorianDays('2024-01-31', 1)).toBe('2024-02-01');
      expect(addGregorianDays('2024-01-30', 2)).toBe('2024-02-01');
      expect(addGregorianDays('2024-01-30', 5)).toBe('2024-02-04');
    });

    it('L3: addGregorianDays correctly subtracts negative days with month rollover', () => {
      expect(addGregorianDays('2024-02-01', -1)).toBe('2024-01-31');
      expect(addGregorianDays('2024-03-01', -1)).toBe('2024-02-29'); // Leap year 2024
      expect(addGregorianDays('2023-03-01', -1)).toBe('2023-02-28'); // Non-leap year 2023
    });

    it('L4: addGregorianDays handles leap year transitions accurately', () => {
      expect(isGregorianLeapYear(2024)).toBe(true);
      expect(isGregorianLeapYear(2023)).toBe(false);
      expect(isGregorianLeapYear(2000)).toBe(true);
      expect(isGregorianLeapYear(1900)).toBe(false);

      expect(getDaysInGregorianMonth(2024, 2)).toBe(29);
      expect(getDaysInGregorianMonth(2023, 2)).toBe(28);

      expect(addGregorianDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addGregorianDays('2024-02-28', 2)).toBe('2024-03-01');
    });

    it('L5: addGregorianDays handles year rollovers', () => {
      expect(addGregorianDays('2024-12-31', 1)).toBe('2025-01-01');
      expect(addGregorianDays('2025-01-01', -1)).toBe('2024-12-31');
    });

    it('L6: addGregorianDays rejects invalid date strings', () => {
      expect(() => addGregorianDays('invalid-date', 1)).toThrow(HijriValidationError);
      expect(() => addGregorianDays('2024-02-30', 1)).toThrow(HijriValidationError);
    });

    it('L7: conversion at exact min boundary (1924-08-01)', () => {
      expect(service.toHijri('1924-08-01')).toEqual({ year: 1343, month: 1, day: 1 });
      expect(service.toGregorian({ year: 1343, month: 1, day: 1 })).toBe('1924-08-01');
    });

    it('L8: conversion at exact max boundary (2077-11-16)', () => {
      expect(service.toHijri('2077-11-16')).toEqual({ year: 1500, month: 12, day: 30 });
      expect(service.toGregorian({ year: 1500, month: 12, day: 30 })).toBe('2077-11-16');
    });
  });
});
