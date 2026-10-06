import { getOccasionsFor, getMajorOccasionForGrid } from '../IslamicOccasions';
import type { HijriDate } from '../types';

describe('IslamicOccasions (Domain Service)', () => {
  it('correctly detects Islamic New Year (1 Muharram)', () => {
    const hijri: HijriDate = { year: 1448, month: 1, day: 1 };
    const occasions = getOccasionsFor(hijri, '2026-06-16');
    const newYear = occasions.find(o => o.id === 'ISLAMIC_NEW_YEAR');
    expect(newYear).toBeDefined();
    expect(newYear?.tier).toBe('MAJOR');
    expect(newYear?.tint).toBe('gold');
  });

  it('correctly detects Ashura (10 Muharram) and Tasua (9 Muharram)', () => {
    const tasua = getOccasionsFor({ year: 1448, month: 1, day: 9 }, '2026-06-24');
    expect(tasua.find(o => o.id === 'TASUA')).toBeDefined();

    const ashura = getOccasionsFor({ year: 1448, month: 1, day: 10 }, '2026-06-25');
    const item = ashura.find(o => o.id === 'ASHURA');
    expect(item).toBeDefined();
    expect(item?.tier).toBe('MAJOR');
    expect(item?.fastingAllowed).toBe(true);
    expect(item?.suggestedTaskTitle).toContain('Ashura');
  });

  it('detects Ramadan start and Laylat al-Qadr odd/even nights', () => {
    const ramadanStart = getOccasionsFor({ year: 1448, month: 9, day: 1 }, '2027-02-08');
    expect(ramadanStart.find(o => o.id === 'RAMADAN_START')).toBeDefined();

    const night27 = getOccasionsFor({ year: 1448, month: 9, day: 27 }, '2027-03-06');
    const qadr27 = night27.find(o => o.id === 'LAYLAT_AL_QADR_27');
    expect(qadr27).toBeDefined();
    expect(qadr27?.name).toContain('Odd Night 27');

    const night24 = getOccasionsFor({ year: 1448, month: 9, day: 24 }, '2027-03-03');
    const even24 = night24.find(o => o.id === 'RAMADAN_LAST_10_24');
    expect(even24).toBeDefined();
  });

  it('prohibits fasting on Eid al-Fitr (1 Shawwal)', () => {
    const eid = getOccasionsFor({ year: 1448, month: 10, day: 1 }, '2027-03-10');
    const eidFitr = eid.find(o => o.id === 'EID_AL_FITR');
    expect(eidFitr).toBeDefined();
    expect(eidFitr?.fastingAllowed).toBe(false);
    expect(eidFitr?.suggestedTaskTitle).not.toContain('Fast');
    expect(eidFitr?.suggestedTaskTitle).toContain('Eid al-Fitr prayer');
  });

  it('detects Six Days of Shawwal from day 2 to 7', () => {
    const shawwal2 = getOccasionsFor({ year: 1448, month: 10, day: 2 }, '2027-03-11');
    const sixDay = shawwal2.find(o => o.id === 'SHAWWAL_SIX_2');
    expect(sixDay).toBeDefined();
    expect(sixDay?.fastingAllowed).toBe(true);
  });

  it('detects Day of Arafah and Eid al-Adha with prohibited fasting on Eid', () => {
    const arafah = getOccasionsFor({ year: 1448, month: 12, day: 9 }, '2027-05-15');
    const arafahItem = arafah.find(o => o.id === 'ARAFAH');
    expect(arafahItem).toBeDefined();
    expect(arafahItem?.fastingAllowed).toBe(true);

    const eidAdha = getOccasionsFor({ year: 1448, month: 12, day: 10 }, '2027-05-16');
    const adhaItem = eidAdha.find(o => o.id === 'EID_AL_ADHA');
    expect(adhaItem).toBeDefined();
    expect(adhaItem?.fastingAllowed).toBe(false);
  });

  it('prohibits fasting on Days of Tashreeq (11, 12, 13 Dhu al-Hijjah) and skips White Day on 13 Dhu al-Hijjah', () => {
    // 13 Dhu al-Hijjah
    const day13 = getOccasionsFor({ year: 1448, month: 12, day: 13 }, '2027-05-19');
    const tashreeq = day13.find(o => o.id === 'TASHREEQ_13');
    expect(tashreeq).toBeDefined();
    expect(tashreeq?.fastingAllowed).toBe(false);

    // Must NOT have a White Day on 13 Dhu al-Hijjah because fasting is prohibited
    const whiteDay13 = day13.find(o => o.id === 'WHITE_DAY_13');
    expect(whiteDay13).toBeUndefined();

    // 14 Dhu al-Hijjah IS a White Day
    const day14 = getOccasionsFor({ year: 1448, month: 12, day: 14 }, '2027-05-20');
    const whiteDay14 = day14.find(o => o.id === 'WHITE_DAY_14');
    expect(whiteDay14).toBeDefined();
    expect(whiteDay14?.fastingAllowed).toBe(true);
  });

  it('detects recurring sunnah days (Monday/Thursday fasts, Friday Jumuah)', () => {
    // 2026-09-14 is a Monday (Sunnah fast)
    const monday = getOccasionsFor({ year: 1448, month: 3, day: 2 }, '2026-09-14');
    const monFast = monday.find(o => o.id === 'SUNNAH_MONDAY');
    expect(monFast).toBeDefined();
    expect(monFast?.isFastingDay).toBe(true);

    // 2026-09-17 is a Thursday (Sunnah fast)
    const thursday = getOccasionsFor({ year: 1448, month: 3, day: 5 }, '2026-09-17');
    const thuFast = thursday.find(o => o.id === 'SUNNAH_THURSDAY');
    expect(thuFast).toBeDefined();
    expect(thuFast?.isFastingDay).toBe(true);

    // 2026-09-18 is a Friday (Jumu'ah - NOT a fasting day)
    const friday = getOccasionsFor({ year: 1448, month: 3, day: 6 }, '2026-09-18');
    const jumuah = friday.find(o => o.id === 'JUMUAH');
    expect(jumuah).toBeDefined();
    expect(jumuah?.isFastingDay).toBe(false);
  });

  it('respects includeCommonlyObserved flag for Mawlid, Isra wal-Miraj, Mid-Shaban', () => {
    const mawlidHijri: HijriDate = { year: 1448, month: 3, day: 12 };
    const withCommon = getOccasionsFor(mawlidHijri, '2026-09-24', { includeCommonlyObserved: true });
    expect(withCommon.find(o => o.id === 'MAWLID')).toBeDefined();

    const withoutCommon = getOccasionsFor(mawlidHijri, '2026-09-24', { includeCommonlyObserved: false });
    expect(withoutCommon.find(o => o.id === 'MAWLID')).toBeUndefined();
  });

  it('getMajorOccasionForGrid returns single major occasion for cell marking', () => {
    const eidCell = getMajorOccasionForGrid({ year: 1448, month: 10, day: 1 }, '2027-03-10');
    expect(eidCell?.id).toBe('EID_AL_FITR');

    // On an ordinary day without major occasion, returns undefined
    const ordinary = getMajorOccasionForGrid({ year: 1448, month: 2, day: 5 }, '2026-07-20');
    expect(ordinary).toBeUndefined();
  });
});
