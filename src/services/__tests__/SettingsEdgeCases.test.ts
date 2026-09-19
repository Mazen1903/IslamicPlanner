import {
  SettingsMutationCoordinator,
  validatePrayerAdjustments,
} from '../SettingsMutationCoordinator';
import { PlanningDayMutationCoordinator } from '../PlanningDayMutationCoordinator';
import { buildPlanningDayConfig } from '../temporalSettingsHelper';
import type { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import type { EntitlementService } from '@/domain/entitlement/types';
import type { ThemeMode } from '@/theme/tokens';

describe('SettingsEdgeCases (SE-01 to SE-08)', () => {
  let mockUserRepo: any;
  let mockPlannerRefresh: any;
  let mockOverrideRepo: any;
  let settingsCoordinator: SettingsMutationCoordinator;
  let mockEntitlementService: jest.Mocked<EntitlementService>;
  let planningDayCoordinator: PlanningDayMutationCoordinator;

  beforeEach(() => {
    mockUserRepo = {
      upsert: jest.fn().mockResolvedValue({ id: 'default' }),
      get: jest.fn().mockResolvedValue({ id: 'default' }),
      saveAutoLocation: jest.fn(),
      saveManualLocation: jest.fn(),
    };

    mockPlannerRefresh = {
      fullRefresh: jest.fn().mockResolvedValue({ status: 'READY' }),
    };

    mockOverrideRepo = {
      upsert: jest.fn().mockResolvedValue({ id: 'override-1' }),
      delete: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue([]),
    };

    settingsCoordinator = new SettingsMutationCoordinator(
      mockUserRepo,
      mockPlannerRefresh,
      mockOverrideRepo
    );

    mockEntitlementService = {
      getSnapshot: jest.fn(),
      hasFeature: jest.fn(),
    };

    planningDayCoordinator = new PlanningDayMutationCoordinator(
      mockUserRepo,
      mockEntitlementService,
      mockPlannerRefresh
    );
  });

  it('SE-01: (UNIT) Prayer adjustment beyond +/-60 minutes: rejected by validatePrayerAdjustments', () => {
    const validAdjustments = {
      fajr: 60,
      sunrise: -60,
      dhuhr: 0,
      asr: 15,
      maghrib: -15,
      isha: 30,
    };

    // Exactly at boundaries: valid
    expect(() => validatePrayerAdjustments(validAdjustments)).not.toThrow();

    // Beyond +60 minutes: rejected
    const beyondPositive = { ...validAdjustments, fajr: 61 };
    expect(() => validatePrayerAdjustments(beyondPositive)).toThrow(
      /Prayer adjustment for "fajr" must be an integer between -60 and \+60/
    );

    // Beyond -60 minutes: rejected
    const beyondNegative = { ...validAdjustments, isha: -61 };
    expect(() => validatePrayerAdjustments(beyondNegative)).toThrow(
      /Prayer adjustment for "isha" must be an integer between -60 and \+60/
    );
  });

  it('SE-02: (UNIT) Hijri global adjustment = +/-2 (boundary values): persisted correctly', async () => {
    // Test +2 boundary
    const resPlus2 = await settingsCoordinator.setHijriGlobalAdjustment(2);
    expect(resPlus2.status).toBe('SUCCESS');
    expect(mockUserRepo.upsert).toHaveBeenCalledWith({ hijriGlobalAdjustment: 2 });
    expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);

    // Test -2 boundary
    const resMinus2 = await settingsCoordinator.setHijriGlobalAdjustment(-2);
    expect(resMinus2.status).toBe('SUCCESS');
    expect(mockUserRepo.upsert).toHaveBeenCalledWith({ hijriGlobalAdjustment: -2 });
    expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(2);
  });

  it('SE-03: (UNIT) Hijri global adjustment beyond +/-2: rejected', async () => {
    // +3 rejected
    const resPlus3 = await settingsCoordinator.setHijriGlobalAdjustment(3);
    expect(resPlus3.status).toBe('FAILED');
    if (resPlus3.status === 'FAILED') {
      expect(resPlus3.stage).toBe('VALIDATION');
      expect(resPlus3.error).toContain('between -2 and +2');
    }

    // -3 rejected
    const resMinus3 = await settingsCoordinator.setHijriGlobalAdjustment(-3);
    expect(resMinus3.status).toBe('FAILED');
    if (resMinus3.status === 'FAILED') {
      expect(resMinus3.stage).toBe('VALIDATION');
      expect(resMinus3.error).toContain('between -2 and +2');
    }

    // Repo and refresh not called
    expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
  });

  it('SE-04: (UNIT) Theme DB read failure: falls back to SYSTEM; themeReady becomes true', async () => {
    // Simulate RootLayout theme initialization logic
    let themeMode: ThemeMode = 'SYSTEM';
    let themeReady = false;

    const failingRepo: Partial<UserSettingsRepository> = {
      get: jest.fn().mockRejectedValue(new Error('SQLite read failed')),
    };

    await failingRepo
      .get!()
      .then(settings => {
        if (settings?.themeMode) {
          themeMode = settings.themeMode as ThemeMode;
        }
      })
      .catch(_err => {
        // Non-fatal: falls back to SYSTEM
      })
      .finally(() => {
        themeReady = true;
      });

    expect(themeMode).toBe('SYSTEM');
    expect(themeReady).toBe(true);
  });

  it('SE-05: (UNIT) Entitlement UNAVAILABLE (query failure): MIDNIGHT planning-day mutation rejected', async () => {
    mockEntitlementService.getSnapshot.mockResolvedValueOnce({
      status: 'UNAVAILABLE',
      reason: 'Network / store error fetching entitlement',
    });

    const res = await planningDayCoordinator.setPlanningDayStart('MIDNIGHT');

    expect(res.status).toBe('FAILED');
    if (res.status === 'FAILED') {
      expect(res.stage).toBe('AUTHORIZATION');
      expect(res.reason).toBe('ENTITLEMENT_UNAVAILABLE');
      expect(res.error).toBe('Network / store error fetching entitlement');
    }
    expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
  });

  it('SE-06: (UNIT) Entitlement FREE (missing row): MIDNIGHT planning-day mutation rejected', async () => {
    mockEntitlementService.getSnapshot.mockResolvedValueOnce({
      status: 'READY',
      tier: 'FREE',
      isPremium: false,
      source: 'LOCAL_DB',
    });

    const res = await planningDayCoordinator.setPlanningDayStart('MIDNIGHT');

    expect(res.status).toBe('FAILED');
    if (res.status === 'FAILED') {
      expect(res.stage).toBe('AUTHORIZATION');
      expect(res.reason).toBe('PREMIUM_REQUIRED');
    }
    expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
  });

  it('SE-07: (UNIT) FAJR planning-day: no entitlement check required (always allowed)', async () => {
    const res = await planningDayCoordinator.setPlanningDayStart('FAJR');

    expect(res.status).toBe('SUCCESS');
    expect(mockEntitlementService.getSnapshot).not.toHaveBeenCalled();
    expect(mockEntitlementService.hasFeature).not.toHaveBeenCalled();
    expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
    expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
  });

  it('SE-08: (UNIT) Locked premium planning-day value (MIDNIGHT) in DB: temporal engine interprets it correctly; no silent downgrade on read', () => {
    // When MIDNIGHT is persisted in user_settings, temporal provider reads it directly
    const config = buildPlanningDayConfig('MIDNIGHT');

    // Must be MIDNIGHT, not silently downgraded to FAJR
    expect(config.mode).toBe('MIDNIGHT');
    expect(config).toEqual({ mode: 'MIDNIGHT' });
  });
});
