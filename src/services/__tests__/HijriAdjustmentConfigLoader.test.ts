import {
  loadUserHijriAdjustmentConfig,
  HijriAdjustmentLoadError,
} from '../HijriAdjustmentConfigLoader';

describe('HijriAdjustmentConfigLoader', () => {
  it('loads global adjustment and month overrides from database', async () => {
    const mockDb: any = {
      select: jest.fn().mockImplementation((fields?: any) => {
        if (fields && 'hijriGlobalAdjustment' in fields) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  all: jest.fn().mockReturnValue([{ hijriGlobalAdjustment: 1 }]),
                }),
              }),
            }),
          };
        }
        return {
          from: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([
              { hijriYear: 1448, hijriMonth: 9, adjustmentDays: -1 },
              { hijriYear: 1448, hijriMonth: 10, adjustmentDays: 1 },
            ]),
          }),
        };
      }),
    };

    const config = await loadUserHijriAdjustmentConfig(mockDb);

    expect(config.globalAdjustment).toBe(1);
    expect(config.monthOverrides).toBeDefined();
    expect(config.monthOverrides?.get('1448-9')).toBe(-1);
    expect(config.monthOverrides?.get('1448-10')).toBe(1);
  });

  it('returns valid default config when no settings row exists and overrides table is empty', async () => {
    const mockDb: any = {
      select: jest.fn().mockImplementation((fields?: any) => {
        if (fields && 'hijriGlobalAdjustment' in fields) {
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  all: jest.fn().mockReturnValue([]),
                }),
              }),
            }),
          };
        }
        return {
          from: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
        };
      }),
    };

    const config = await loadUserHijriAdjustmentConfig(mockDb);

    expect(config.globalAdjustment).toBe(0);
    expect(config.monthOverrides).toBeUndefined();
  });

  it('throws HijriAdjustmentLoadError on database query failure and does NOT silently return zero', async () => {
    const dbError = new Error('SQLite disk I/O error');
    const mockDb: any = {
      select: jest.fn().mockImplementation(() => {
        throw dbError;
      }),
    };

    await expect(loadUserHijriAdjustmentConfig(mockDb)).rejects.toThrow(
      HijriAdjustmentLoadError
    );
  });

  it('preserves error cause in HijriAdjustmentLoadError', async () => {
    const dbError = new Error('Connection closed');
    const mockDb: any = {
      select: jest.fn().mockImplementation(() => {
        throw dbError;
      }),
    };

    try {
      await loadUserHijriAdjustmentConfig(mockDb);
      fail('Expected loadUserHijriAdjustmentConfig to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HijriAdjustmentLoadError);
      expect(err.cause).toBe(dbError);
      expect(err.message).toContain('Connection closed');
    }
  });
});
