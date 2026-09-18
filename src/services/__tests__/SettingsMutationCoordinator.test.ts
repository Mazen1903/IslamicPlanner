import {
  SettingsMutationCoordinator,
  validatePrayerAdjustments,
} from '../SettingsMutationCoordinator';

describe('SettingsMutationCoordinator', () => {
  let mockUserRepo: any;
  let mockPlannerRefresh: any;
  let mockOverrideRepo: any;
  let coordinator: SettingsMutationCoordinator;

  beforeEach(() => {
    mockUserRepo = {
      upsert: jest.fn().mockResolvedValue({ id: 'default' }),
      get: jest.fn().mockResolvedValue({ id: 'default' }),
    };

    mockPlannerRefresh = {
      fullRefresh: jest.fn().mockResolvedValue({ status: 'READY' }),
    };

    mockOverrideRepo = {
      upsert: jest.fn().mockResolvedValue({ id: 'override-1', hijriYear: 1448, hijriMonth: 9, adjustmentDays: 1 }),
      delete: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
    };

    coordinator = new SettingsMutationCoordinator(
      mockUserRepo,
      mockPlannerRefresh,
      mockOverrideRepo
    );
  });

  describe('validation and safe contract', () => {
    it('rejects forbidden patch keys (isPremium, onboardingCompleted, worshipSuggestionsEnabled, prayerAlertsEnabled)', async () => {
      const forbiddenKeys = [
        'isPremium',
        'onboardingCompleted',
        'worshipSuggestionsEnabled',
        'prayerAlertsEnabled',
        'locationMode',
        'manualLatitude',
      ];

      for (const key of forbiddenKeys) {
        const res = await coordinator.applySettingsChange(
          { [key]: true } as any,
          'PRESENTATION_ONLY'
        );
        expect(res.status).toBe('FAILED');
        if (res.status === 'FAILED') {
          expect(res.stage).toBe('VALIDATION');
          expect(res.error).toContain('cannot be mutated via user settings');
        }
      }

      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    it('rejects patch keys that do not belong to the specified category', async () => {
      // calculationMethod in PRESENTATION_ONLY
      const res1 = await coordinator.applySettingsChange(
        { calculationMethod: 'ISNA' },
        'PRESENTATION_ONLY'
      );
      expect(res1.status).toBe('FAILED');
      if (res1.status === 'FAILED') {
        expect(res1.stage).toBe('VALIDATION');
        expect(res1.error).toContain('not permitted in mutation category "PRESENTATION_ONLY"');
      }

      // themeMode in TEMPORAL_FULL_REFRESH
      const res2 = await coordinator.applySettingsChange(
        { themeMode: 'DARK' },
        'TEMPORAL_FULL_REFRESH'
      );
      expect(res2.status).toBe('FAILED');
      if (res2.status === 'FAILED') {
        expect(res2.stage).toBe('VALIDATION');
        expect(res2.error).toContain('not permitted in mutation category "TEMPORAL_FULL_REFRESH"');
      }

      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    });

    it('rejects invalid calculation method', async () => {
      const res = await coordinator.applyTemporalSettings({
        calculationMethod: 'INVALID_METHOD' as any,
      });
      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('VALIDATION');
        expect(res.error).toContain('Invalid calculationMethod');
      }
    });

    it('rejects invalid asr method', async () => {
      const res = await coordinator.applyTemporalSettings({
        asrMethod: 'INVALID_ASR' as any,
      });
      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('VALIDATION');
        expect(res.error).toContain('Invalid asrMethod');
      }
    });

    it('rejects non-FAJR planning day start in M17', async () => {
      const resMidnight = await coordinator.applyTemporalSettings({
        planningDayStart: 'MIDNIGHT' as any,
      });
      expect(resMidnight.status).toBe('FAILED');
      if (resMidnight.status === 'FAILED') {
        expect(resMidnight.stage).toBe('VALIDATION');
        expect(resMidnight.error).toContain('only FAJR planning day start can be selected');
      }

      const resCustom = await coordinator.applyTemporalSettings({
        planningDayStart: 'CUSTOM:04:00' as any,
      });
      expect(resCustom.status).toBe('FAILED');
      if (resCustom.status === 'FAILED') {
        expect(resCustom.stage).toBe('VALIDATION');
      }
    });

    it('allows FAJR planning day start in M17', async () => {
      const res = await coordinator.applyTemporalSettings({
        planningDayStart: 'FAJR',
      });
      expect(res.status).toBe('SUCCESS');
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    it('validates prayer adjustments properly', () => {
      const validAdjustments = {
        fajr: 2,
        sunrise: 0,
        dhuhr: -1,
        asr: 3,
        maghrib: 0,
        isha: -5,
      };

      const serialized = validatePrayerAdjustments(validAdjustments);
      expect(JSON.parse(serialized)).toEqual(validAdjustments);

      // Out of bounds: > 60
      expect(() =>
        validatePrayerAdjustments({ ...validAdjustments, fajr: 61 })
      ).toThrow(/between -60 and \+60/);

      // Out of bounds: < -60
      expect(() =>
        validatePrayerAdjustments({ ...validAdjustments, isha: -61 })
      ).toThrow(/between -60 and \+60/);

      // Non-integer
      expect(() =>
        validatePrayerAdjustments({ ...validAdjustments, asr: 2.5 })
      ).toThrow(/integer/);

      // Missing required key
      const incomplete: any = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0 };
      expect(() => validatePrayerAdjustments(incomplete)).toThrow(/integer/);
    });

    it('rejects out of range Hijri global adjustment', async () => {
      const resHigh = await coordinator.setHijriGlobalAdjustment(3);
      expect(resHigh.status).toBe('FAILED');
      if (resHigh.status === 'FAILED') {
        expect(resHigh.stage).toBe('VALIDATION');
      }

      const resLow = await coordinator.setHijriGlobalAdjustment(-3);
      expect(resLow.status).toBe('FAILED');
      if (resLow.status === 'FAILED') {
        expect(resLow.stage).toBe('VALIDATION');
      }

      const resFloat = await coordinator.setHijriGlobalAdjustment(1.5);
      expect(resFloat.status).toBe('FAILED');
    });
  });

  describe('mutation persistence and refresh order', () => {
    it('persists via upsert before downstream call and calls fullRefresh exactly once for TEMPORAL_FULL_REFRESH', async () => {
      let upsertDone = false;
      mockUserRepo.upsert.mockImplementation(async () => {
        upsertDone = true;
        return { id: 'default' };
      });
      mockPlannerRefresh.fullRefresh.mockImplementation(async () => {
        expect(upsertDone).toBe(true);
        return { status: 'READY' };
      });

      const res = await coordinator.applyTemporalSettings({
        calculationMethod: 'ISNA',
        asrMethod: 'HANAFI',
      });

      expect(res).toEqual({
        status: 'SUCCESS',
        category: 'TEMPORAL_FULL_REFRESH',
        refreshed: true,
      });
      expect(mockUserRepo.upsert).toHaveBeenCalledTimes(1);
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    it('persists via upsert and calls fullRefresh exactly once for HIJRI_RECURRENCE_REFRESH', async () => {
      const res = await coordinator.setHijriGlobalAdjustment(1);

      expect(res).toEqual({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      });
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ hijriGlobalAdjustment: 1 });
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    it('does NOT invoke fullRefresh for PRESENTATION_ONLY changes', async () => {
      const res = await coordinator.applyPresentationSettings({
        themeMode: 'DARK',
      });

      expect(res).toEqual({
        status: 'SUCCESS',
        category: 'PRESENTATION_ONLY',
        refreshed: false,
      });
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ themeMode: 'DARK' });
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    it('prevents downstream refresh if persistence fails', async () => {
      mockUserRepo.upsert.mockRejectedValue(new Error('DB write failed'));

      const res = await coordinator.applyTemporalSettings({
        calculationMethod: 'KARACHI',
      });

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('PERSISTENCE');
        expect(res.error).toContain('DB write failed');
      }
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    it('returns PERSISTED_REFRESH_FAILED when persistence succeeds but refresh fails', async () => {
      mockPlannerRefresh.fullRefresh.mockRejectedValue(new Error('Network timeout during refresh'));

      const res = await coordinator.applyTemporalSettings({
        calculationMethod: 'MAKKAH',
      });

      expect(res.status).toBe('PERSISTED_REFRESH_FAILED');
      if (res.status === 'PERSISTED_REFRESH_FAILED') {
        expect(res.category).toBe('TEMPORAL_FULL_REFRESH');
        expect(res.error).toContain('Network timeout during refresh');
      }

      // Invariant: setting was committed
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ calculationMethod: 'MAKKAH' });
    });
  });

  describe('Hijri month overrides orchestration', () => {
    it('upsertHijriMonthOverride validates, calls overrideRepo.upsert, and triggers fullRefresh', async () => {
      const res = await coordinator.upsertHijriMonthOverride(1448, 9, -1);

      expect(res).toEqual({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      });
      expect(mockOverrideRepo.upsert).toHaveBeenCalledWith(1448, 9, -1);
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    it('upsertHijriMonthOverride rejects invalid inputs without persistence or refresh', async () => {
      const res = await coordinator.upsertHijriMonthOverride(1448, 13, 0);

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('VALIDATION');
      }
      expect(mockOverrideRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    it('upsertHijriMonthOverride returns PERSISTED_REFRESH_FAILED if refresh throws', async () => {
      mockPlannerRefresh.fullRefresh.mockRejectedValue(new Error('Refresh coordinator failed'));

      const res = await coordinator.upsertHijriMonthOverride(1448, 9, 1);

      expect(res.status).toBe('PERSISTED_REFRESH_FAILED');
      expect(mockOverrideRepo.upsert).toHaveBeenCalledWith(1448, 9, 1);
    });

    it('deleteHijriMonthOverride validates, calls overrideRepo.delete, and triggers fullRefresh', async () => {
      const res = await coordinator.deleteHijriMonthOverride(1448, 9);

      expect(res).toEqual({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      });
      expect(mockOverrideRepo.delete).toHaveBeenCalledWith(1448, 9);
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    it('deleteHijriMonthOverride returns PERSISTED_REFRESH_FAILED if refresh throws', async () => {
      mockPlannerRefresh.fullRefresh.mockRejectedValue(new Error('Refresh failed'));

      const res = await coordinator.deleteHijriMonthOverride(1448, 9);

      expect(res.status).toBe('PERSISTED_REFRESH_FAILED');
      expect(mockOverrideRepo.delete).toHaveBeenCalledWith(1448, 9);
    });
  });
});
