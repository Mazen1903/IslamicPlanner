import { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import type { EntitlementService } from '@/domain/entitlement/types';
import { localEntitlementService } from '@/domain/entitlement/EntitlementService';
import {
  PlannerRefreshCoordinator,
  plannerRefreshCoordinator as defaultPlannerRefreshCoordinator,
} from '@/services/PlannerRefreshCoordinator';

export type PlanningDayMutationFailureReason =
  | 'PREMIUM_REQUIRED'
  | 'ENTITLEMENT_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'PERSISTENCE_FAILED';

export type PlanningDayMutationResult =
  | { status: 'SUCCESS'; refreshed: boolean }
  | { status: 'PERSISTED_REFRESH_FAILED'; error: string }
  | {
      status: 'FAILED';
      stage: 'VALIDATION' | 'AUTHORIZATION' | 'PERSISTENCE';
      reason: PlanningDayMutationFailureReason;
      error: string;
    };

const CUSTOM_REGEX = /^CUSTOM:([01][0-9]|2[0-3]):([0-5][0-9])$/;

export class PlanningDayMutationCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = new UserSettingsRepository(),
    private readonly entitlementService: EntitlementService = localEntitlementService,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator = defaultPlannerRefreshCoordinator
  ) {}

  async setPlanningDayStart(value: string): Promise<PlanningDayMutationResult> {
    // 1. VALIDATION
    if (!value || typeof value !== 'string') {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        reason: 'VALIDATION_FAILED',
        error: 'Planning day start value must be a non-empty string.',
      };
    }

    const isFajr = value === 'FAJR';
    const isMidnight = value === 'MIDNIGHT';
    const isCustom = CUSTOM_REGEX.test(value);

    if (!isFajr && !isMidnight && !isCustom) {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        reason: 'VALIDATION_FAILED',
        error: `Invalid planning day start value: "${value}". Must be "FAJR", "MIDNIGHT", or "CUSTOM:HH:mm".`,
      };
    }

    // 2. AUTHORIZATION (skip if value === 'FAJR')
    if (!isFajr) {
      const snapshot = await this.entitlementService.getSnapshot();

      if (snapshot.status === 'UNAVAILABLE') {
        return {
          status: 'FAILED',
          stage: 'AUTHORIZATION',
          reason: 'ENTITLEMENT_UNAVAILABLE',
          error: snapshot.reason,
        };
      }

      if (snapshot.tier !== 'PREMIUM') {
        return {
          status: 'FAILED',
          stage: 'AUTHORIZATION',
          reason: 'PREMIUM_REQUIRED',
          error: 'Premium entitlement is required to select Midnight or Custom planning day boundary.',
        };
      }
    }

    // 3. PERSISTENCE
    try {
      await this.userSettingsRepo.upsert({
        planningDayStart: value,
      });
    } catch (err: any) {
      return {
        status: 'FAILED',
        stage: 'PERSISTENCE',
        reason: 'PERSISTENCE_FAILED',
        error: `Failed to persist planning day start: ${err?.message ?? String(err)}`,
      };
    }

    // 4. REFRESH
    try {
      await this.plannerRefreshCoordinator.fullRefresh();
      return {
        status: 'SUCCESS',
        refreshed: true,
      };
    } catch (refreshErr: any) {
      return {
        status: 'PERSISTED_REFRESH_FAILED',
        error: `Planning day start was persisted, but planner refresh failed: ${refreshErr?.message ?? String(refreshErr)}`,
      };
    }
  }
}

export const planningDayMutationCoordinator = new PlanningDayMutationCoordinator();
