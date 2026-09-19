import {
  PlanningDayMutationCoordinator,
} from '../PlanningDayMutationCoordinator';
import type { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import type { EntitlementService } from '@/domain/entitlement/types';
import type { PlannerRefreshCoordinator } from '../PlannerRefreshCoordinator';

describe('PlanningDayMutationCoordinator', () => {
  let mockUserRepo: jest.Mocked<UserSettingsRepository>;
  let mockEntitlementService: jest.Mocked<EntitlementService>;
  let mockPlannerRefresh: jest.Mocked<PlannerRefreshCoordinator>;
  let coordinator: PlanningDayMutationCoordinator;

  beforeEach(() => {
    mockUserRepo = {
      get: jest.fn(),
      upsert: jest.fn().mockResolvedValue({} as any),
      saveAutoLocation: jest.fn(),
      saveManualLocation: jest.fn(),
    } as any;

    mockEntitlementService = {
      getSnapshot: jest.fn(),
      hasFeature: jest.fn(),
    };

    mockPlannerRefresh = {
      fullRefresh: jest.fn().mockResolvedValue({ status: 'READY' } as any),
    } as any;

    coordinator = new PlanningDayMutationCoordinator(
      mockUserRepo,
      mockEntitlementService,
      mockPlannerRefresh
    );
  });

  // ==========================================
  // Authorization Tests (A-Series)
  // ==========================================
  describe('Authorization (A-Series)', () => {
    // A-01: FREE + FAJR allowed AND entitlement service NOT called
    it('A-01: allows FAJR for FREE users without querying entitlement service', async () => {
      const res = await coordinator.setPlanningDayStart('FAJR');

      expect(res.status).toBe('SUCCESS');
      expect(mockEntitlementService.getSnapshot).not.toHaveBeenCalled();
      expect(mockEntitlementService.hasFeature).not.toHaveBeenCalled();
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    // A-02: FREE + MIDNIGHT → PREMIUM_REQUIRED
    it('A-02: rejects MIDNIGHT for FREE users with PREMIUM_REQUIRED', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      });

      const res = await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('AUTHORIZATION');
        expect(res.reason).toBe('PREMIUM_REQUIRED');
      }
      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // A-03: FREE + CUSTOM valid → PREMIUM_REQUIRED
    it('A-03: rejects CUSTOM for FREE users with PREMIUM_REQUIRED', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      });

      const res = await coordinator.setPlanningDayStart('CUSTOM:04:00');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('AUTHORIZATION');
        expect(res.reason).toBe('PREMIUM_REQUIRED');
      }
      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // A-04: PREMIUM + MIDNIGHT allowed
    it('A-04: allows MIDNIGHT for PREMIUM users', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'PREMIUM',
        isPremium: true,
        source: 'LOCAL_DB',
      });

      const res = await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(res.status).toBe('SUCCESS');
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'MIDNIGHT' });
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    // A-05: PREMIUM + CUSTOM allowed
    it('A-05: allows valid CUSTOM for PREMIUM users', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'PREMIUM',
        isPremium: true,
        source: 'LOCAL_DB',
      });

      const res = await coordinator.setPlanningDayStart('CUSTOM:19:30');

      expect(res.status).toBe('SUCCESS');
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'CUSTOM:19:30' });
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    // A-06: CUSTOM:25:00 → VALIDATION_FAILED BEFORE entitlement lookup
    it('A-06: rejects CUSTOM:25:00 at VALIDATION stage before entitlement lookup', async () => {
      const res = await coordinator.setPlanningDayStart('CUSTOM:25:00');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('VALIDATION');
        expect(res.reason).toBe('VALIDATION_FAILED');
      }
      expect(mockEntitlementService.getSnapshot).not.toHaveBeenCalled();
      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // A-07: CUSTOM malformed → VALIDATION_FAILED BEFORE entitlement lookup
    it('A-07: rejects malformed CUSTOM strings before entitlement lookup', async () => {
      const malformedCases = ['CUSTOM:', 'CUSTOM:2pm', 'CUSTOM:99:99', 'CUSTOM:4:00', 'UNKNOWN'];

      for (const val of malformedCases) {
        const res = await coordinator.setPlanningDayStart(val);
        expect(res.status).toBe('FAILED');
        if (res.status === 'FAILED') {
          expect(res.stage).toBe('VALIDATION');
          expect(res.reason).toBe('VALIDATION_FAILED');
        }
      }
      expect(mockEntitlementService.getSnapshot).not.toHaveBeenCalled();
      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    });

    // A-08: UNAVAILABLE + MIDNIGHT → ENTITLEMENT_UNAVAILABLE
    it('A-08: returns ENTITLEMENT_UNAVAILABLE when entitlement source is UNAVAILABLE', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'UNAVAILABLE',
        reason: 'Disk read failure',
      });

      const res = await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('AUTHORIZATION');
        expect(res.reason).toBe('ENTITLEMENT_UNAVAILABLE');
        expect(res.error).toBe('Disk read failure');
      }
      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // A-09: UNAVAILABLE environment + FAJR allowed AND entitlement NOT called
    it('A-09: allows FAJR even when entitlement environment is UNAVAILABLE', async () => {
      mockEntitlementService.getSnapshot.mockRejectedValue(new Error('Fatal DB failure'));

      const res = await coordinator.setPlanningDayStart('FAJR');

      expect(res.status).toBe('SUCCESS');
      expect(mockEntitlementService.getSnapshot).not.toHaveBeenCalled();
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
    });

    // A-12: Authorization failure performs ZERO persistence and ZERO refresh
    it('A-12: authorization failure performs ZERO persistence calls and ZERO refresh calls', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      });

      await coordinator.setPlanningDayStart('MIDNIGHT');
      await coordinator.setPlanningDayStart('CUSTOM:04:00');

      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // Strict Service Rule: Calling with already-stored mode while FREE still rejects
    it('enforces authorization strictly even if requested value is already stored in DB', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      });

      // Even if user requests MIDNIGHT which happens to be currently stored
      const res = await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('AUTHORIZATION');
        expect(res.reason).toBe('PREMIUM_REQUIRED');
      }
    });
  });

  // ==========================================
  // Persistence Tests (P-Series)
  // ==========================================
  describe('Persistence (P-Series)', () => {
    beforeEach(() => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'PREMIUM',
        isPremium: true,
        source: 'LOCAL_DB',
      });
    });

    // P-01: MIDNIGHT persists exact value
    it('P-01: persists exact string "MIDNIGHT"', async () => {
      await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'MIDNIGHT' });
    });

    // P-02: CUSTOM persists exact CUSTOM:HH:mm
    it('P-02: persists exact string "CUSTOM:04:00"', async () => {
      await coordinator.setPlanningDayStart('CUSTOM:04:00');

      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'CUSTOM:04:00' });
    });

    // P-03: Success calls exactly one fullRefresh()
    it('P-03: calls fullRefresh() exactly once on successful persistence', async () => {
      const res = await coordinator.setPlanningDayStart('FAJR');

      expect(res.status).toBe('SUCCESS');
      expect(mockPlannerRefresh.fullRefresh).toHaveBeenCalledTimes(1);
    });

    // P-04: Persistence failure → no refresh
    it('P-04: does not call fullRefresh() if persistence fails', async () => {
      mockUserRepo.upsert.mockRejectedValue(new Error('SQLite write lock error'));

      const res = await coordinator.setPlanningDayStart('FAJR');

      expect(res.status).toBe('FAILED');
      if (res.status === 'FAILED') {
        expect(res.stage).toBe('PERSISTENCE');
        expect(res.reason).toBe('PERSISTENCE_FAILED');
        expect(res.error).toContain('SQLite write lock error');
      }
      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });

    // P-05: Persist success + refresh failure → PERSISTED_REFRESH_FAILED
    it('P-05: returns PERSISTED_REFRESH_FAILED if refresh throws after persistence without rolling back', async () => {
      mockPlannerRefresh.fullRefresh.mockRejectedValue(new Error('Refresh pipeline error'));

      const res = await coordinator.setPlanningDayStart('FAJR');

      expect(res.status).toBe('PERSISTED_REFRESH_FAILED');
      if (res.status === 'PERSISTED_REFRESH_FAILED') {
        expect(res.error).toContain('Refresh pipeline error');
      }
      // Proves persistence succeeded
      expect(mockUserRepo.upsert).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
      // Proves no rollback upsert was attempted
      expect(mockUserRepo.upsert).toHaveBeenCalledTimes(1);
    });

    // P-06: FAJR universally succeeds
    it('P-06: FAJR succeeds without error for any user', async () => {
      const res = await coordinator.setPlanningDayStart('FAJR');
      expect(res.status).toBe('SUCCESS');
    });

    // P-07: Upsert patch contains ONLY planningDayStart
    it('P-07: upsert patch contains ONLY planningDayStart (no isPremium or other fields)', async () => {
      await coordinator.setPlanningDayStart('CUSTOM:23:59');

      const calledPatch = mockUserRepo.upsert.mock.calls[0][0];
      expect(Object.keys(calledPatch)).toEqual(['planningDayStart']);
      expect(calledPatch.planningDayStart).toBe('CUSTOM:23:59');
      expect((calledPatch as any).isPremium).toBeUndefined();
    });

    // P-08: Validation failure performs ZERO fullRefresh calls
    it('P-08: validation failure performs ZERO fullRefresh calls', async () => {
      await coordinator.setPlanningDayStart('CUSTOM:invalid');

      expect(mockPlannerRefresh.fullRefresh).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Planner Safety Tests (S-Series)
  // ==========================================
  describe('Planner Safety (S-Series)', () => {
    // S-01: Entitlement failure does NOT rewrite stored planningDayStart
    it('S-01: entitlement failure does NOT rewrite or modify stored planningDayStart', async () => {
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'UNAVAILABLE',
        reason: 'DB error',
      });

      await coordinator.setPlanningDayStart('MIDNIGHT');

      expect(mockUserRepo.upsert).not.toHaveBeenCalled();
    });

    // S-05: Switch to FAJR works regardless of tier
    it('S-05: switch to FAJR works regardless of whether tier is FREE, PREMIUM, or UNAVAILABLE', async () => {
      // Test when UNAVAILABLE
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'UNAVAILABLE',
        reason: 'Broken',
      });
      const res1 = await coordinator.setPlanningDayStart('FAJR');
      expect(res1.status).toBe('SUCCESS');

      // Test when FREE
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      });
      const res2 = await coordinator.setPlanningDayStart('FAJR');
      expect(res2.status).toBe('SUCCESS');

      // Test when PREMIUM
      mockEntitlementService.getSnapshot.mockResolvedValue({
        status: 'READY',
        tier: 'PREMIUM',
        isPremium: true,
        source: 'LOCAL_DB',
      });
      const res3 = await coordinator.setPlanningDayStart('FAJR');
      expect(res3.status).toBe('SUCCESS');
    });
  });
});
