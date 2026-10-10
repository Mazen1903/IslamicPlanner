import { buildRescheduleConfig } from '../rescheduleConfigBuilder';

describe('buildRescheduleConfig', () => {
  it('builds PRAYER_RELATIVE with 0 offset (at prayer)', () => {
    const config = buildRescheduleConfig({
      mode: 'PRAYER_RELATIVE',
      targetPrayer: 'ASR',
      direction: 'AFTER',
      offsetMinutes: 0,
    });
    expect(config).toEqual({
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'ASR',
        direction: 'AFTER',
        offsetMinutes: 0,
      },
    });
  });

  it('builds PRAYER_RELATIVE with BEFORE and custom offset', () => {
    const config = buildRescheduleConfig({
      mode: 'PRAYER_RELATIVE',
      targetPrayer: 'MAGHRIB',
      direction: 'BEFORE',
      offsetMinutes: 45,
    });
    expect(config).toEqual({
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'MAGHRIB',
        direction: 'BEFORE',
        offsetMinutes: 45,
      },
    });
  });

  it('clamps PRAYER_RELATIVE offset between 0 and 720', () => {
    const configNegative = buildRescheduleConfig({
      mode: 'PRAYER_RELATIVE',
      targetPrayer: 'FAJR',
      offsetMinutes: -20,
    });
    expect((configNegative.scheduleData as { offsetMinutes: number }).offsetMinutes).toBe(0);

    const configExcess = buildRescheduleConfig({
      mode: 'PRAYER_RELATIVE',
      targetPrayer: 'DHUHR',
      offsetMinutes: 999,
    });
    expect((configExcess.scheduleData as { offsetMinutes: number }).offsetMinutes).toBe(720);
  });

  it('builds EXACT_TIME with normalized 24h format', () => {
    const config = buildRescheduleConfig({
      mode: 'EXACT_TIME',
      targetPrayer: 'DHUHR',
      exactTime: '9:05',
    });
    expect(config).toEqual({
      scheduleType: 'EXACT_TIME',
      scheduleData: {
        localTime: '09:05',
      },
    });
  });

  it('builds PRAYER_WINDOW from targetPrayer to endPrayer', () => {
    const config = buildRescheduleConfig({
      mode: 'PRAYER_WINDOW',
      targetPrayer: 'DHUHR',
      endPrayer: 'ASR',
    });
    expect(config).toEqual({
      scheduleType: 'PRAYER_WINDOW',
      scheduleData: {
        startPrayer: 'DHUHR',
        endPrayer: 'ASR',
      },
    });
  });

  it('builds ANYTIME_TODAY', () => {
    const config = buildRescheduleConfig({
      mode: 'ANYTIME_TODAY',
      targetPrayer: 'ISHA',
    });
    expect(config).toEqual({
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
    });
  });
});
