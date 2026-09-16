import { HijriCalendarAdapter } from '../HijriCalendarAdapter';
import { HijriConversionError, HijriValidationError } from '../errors';

describe('HijriCalendarAdapter (Category A: Adapter Smoke)', () => {
  let adapter: HijriCalendarAdapter;

  beforeEach(() => {
    adapter = new HijriCalendarAdapter();
  });

  it('A1: gregorianToHijri converts valid civil date to HijriDate', () => {
    const result = adapter.gregorianToHijri(2024, 3, 11);
    expect(result).toEqual({ year: 1445, month: 9, day: 1 });
  });

  it('A2: hijriToGregorian converts valid HijriDate to Gregorian object', () => {
    const result = adapter.hijriToGregorian({ year: 1445, month: 9, day: 1 });
    expect(result).toEqual({ year: 2024, month: 3, day: 11 });
  });

  it('A3: getDaysInHijriMonth returns 30 for known 30-day month (Ramadan 1445)', () => {
    const days = adapter.getDaysInHijriMonth(1445, 9);
    expect(days).toBe(30);
  });

  it('A4: getDaysInHijriMonth returns 29 for known 29-day month (Shaban 1445)', () => {
    const days = adapter.getDaysInHijriMonth(1445, 8);
    expect(days).toBe(29);
  });

  it('A5: getDaysInHijriMonth throws OUT_OF_RANGE for years outside [1343, 1500]', () => {
    expect(() => adapter.getDaysInHijriMonth(1342, 1)).toThrow(HijriConversionError);
    expect(() => adapter.getDaysInHijriMonth(1342, 1)).toThrow(/outside supported range/);
    try {
      adapter.getDaysInHijriMonth(1501, 1);
      fail('Expected getDaysInHijriMonth to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HijriConversionError);
      expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
    }
  });

  it('A6: getDaysInHijriMonth throws MONTH_OUT_OF_RANGE for month < 1 or > 12', () => {
    expect(() => adapter.getDaysInHijriMonth(1445, 0)).toThrow(HijriValidationError);
    try {
      adapter.getDaysInHijriMonth(1445, 13);
      fail('Expected getDaysInHijriMonth to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HijriValidationError);
      expect((err as HijriValidationError).code).toBe('MONTH_OUT_OF_RANGE');
    }
  });

  it('A7: gregorianToHijri and hijriToGregorian wrap underlying errors into HijriConversionError', () => {
    try {
      adapter.gregorianToHijri(1800, 1, 1);
      fail('Expected gregorianToHijri to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HijriConversionError);
      expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
    }

    try {
      adapter.hijriToGregorian({ year: 1200, month: 1, day: 1 });
      fail('Expected hijriToGregorian to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HijriConversionError);
      expect((err as HijriConversionError).code).toBe('OUT_OF_RANGE');
    }
  });

  it('A8: isolates package without deep imports and handles double-probe failure with ADAPTER_ERROR', () => {
    // Create an adapter subclass or mock adapter where hijriToGregorian always throws an unexpected error
    const brokenAdapter = new HijriCalendarAdapter();
    jest.spyOn(brokenAdapter, 'hijriToGregorian').mockImplementation(() => {
      throw new Error('Simulated low-level adapter crash');
    });

    expect(() => brokenAdapter.getDaysInHijriMonth(1445, 9)).toThrow(HijriConversionError);
    try {
      brokenAdapter.getDaysInHijriMonth(1445, 9);
      fail('Expected getDaysInHijriMonth to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HijriConversionError);
      expect((err as HijriConversionError).code).toBe('ADAPTER_ERROR');
      expect((err as HijriConversionError).cause).toBeDefined();
    }
  });
});
