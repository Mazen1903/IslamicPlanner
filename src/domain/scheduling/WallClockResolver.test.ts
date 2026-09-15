import { resolveWallClock } from '@/domain/temporal';
import { TemporalResolutionError } from '@/domain/temporal/errors';

describe('WallClockResolver (WC-01 to WC-08)', () => {
  it('WC-01: Normal time resolves correctly with NORMAL status', () => {
    const res = resolveWallClock('2026-09-15', '14:30', 'America/New_York');
    expect(res.resolution).toBe('NORMAL');
    expect(res.resolvedTime.toISO()).toBe('2026-09-15T14:30:00.000-04:00');
    expect(res.resolvedTime.offset).toBe(-240); // EDT (-4h)
  });

  it('WC-02: Spring-forward gap (NYC) shifts nonexistent time to first valid instant', () => {
    // March 8, 2026 in America/New_York: 02:00 -> 03:00 is skipped.
    const res = resolveWallClock('2026-03-08', '02:30', 'America/New_York');
    expect(res.resolution).toBe('SPRING_FORWARD_SHIFTED');
    expect(res.resolvedTime.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
    expect(res.resolvedTime.offset).toBe(-240);
  });

  it('WC-03: Fall-back overlap (NYC) deterministically selects earlier occurrence', () => {
    // Nov 1, 2026 in America/New_York: 01:30 occurs twice (EDT -04:00 and EST -05:00)
    const res = resolveWallClock('2026-11-01', '01:30', 'America/New_York');
    expect(res.resolution).toBe('FALL_BACK_FIRST');
    expect(res.resolvedTime.toISO()).toBe('2026-11-01T01:30:00.000-04:00');
    expect(res.resolvedTime.offset).toBe(-240);
  });

  it('WC-04: Spring-forward (London) shifts nonexistent time in 01:00-02:00 gap', () => {
    // March 29, 2026 in Europe/London: 01:00 GMT jumps to 02:00 BST
    const res = resolveWallClock('2026-03-29', '01:30', 'Europe/London');
    expect(res.resolution).toBe('SPRING_FORWARD_SHIFTED');
    expect(res.resolvedTime.toISO()).toBe('2026-03-29T02:00:00.000+01:00');
    expect(res.resolvedTime.offset).toBe(60); // BST (+1h)
  });

  it('WC-05: Fall-back (London) selects earlier BST occurrence for duplicate time', () => {
    // Oct 25, 2026 in Europe/London: 01:30 occurs in BST (+01:00) and GMT (+00:00)
    const res = resolveWallClock('2026-10-25', '01:30', 'Europe/London');
    expect(res.resolution).toBe('FALL_BACK_FIRST');
    expect(res.resolvedTime.toISO()).toBe('2026-10-25T01:30:00.000+01:00');
    expect(res.resolvedTime.offset).toBe(60);
  });

  it('WC-06: Non-DST timezone always resolves as NORMAL', () => {
    // Asia/Riyadh does not observe DST
    const res = resolveWallClock('2026-03-08', '02:30', 'Asia/Riyadh');
    expect(res.resolution).toBe('NORMAL');
    expect(res.resolvedTime.toISO()).toBe('2026-03-08T02:30:00.000+03:00');
    expect(res.resolvedTime.offset).toBe(180);
  });

  it('WC-07: Exact gap start time (02:00 in NYC) shifts to first valid instant', () => {
    const res = resolveWallClock('2026-03-08', '02:00', 'America/New_York');
    expect(res.resolution).toBe('SPRING_FORWARD_SHIFTED');
    expect(res.resolvedTime.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
  });

  it('WC-08: First valid post-gap time (03:00 in NYC) resolves as NORMAL', () => {
    const res = resolveWallClock('2026-03-08', '03:00', 'America/New_York');
    expect(res.resolution).toBe('NORMAL');
    expect(res.resolvedTime.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
  });

  it('throws TemporalResolutionError with appropriate codes on invalid inputs', () => {
    expect(() => resolveWallClock('2026-09-15', '25:00', 'America/New_York')).toThrow(
      TemporalResolutionError
    );
    try {
      resolveWallClock('2026-09-15', '25:00', 'America/New_York');
    } catch (e) {
      expect((e as TemporalResolutionError).code).toBe('INVALID_TIME_FORMAT');
    }

    expect(() => resolveWallClock('2026-02-31', '12:00', 'America/New_York')).toThrow(
      TemporalResolutionError
    );
    try {
      resolveWallClock('2026-02-31', '12:00', 'America/New_York');
    } catch (e) {
      expect((e as TemporalResolutionError).code).toBe('INVALID_DATE_FORMAT');
    }

    expect(() => resolveWallClock('2026-09-15', '12:00', 'Invalid/Zone')).toThrow(
      TemporalResolutionError
    );
    try {
      resolveWallClock('2026-09-15', '12:00', 'Invalid/Zone');
    } catch (e) {
      expect((e as TemporalResolutionError).code).toBe('INVALID_TIMEZONE');
    }
  });
});
