import {
  userSettingsRepository,
  UserSettingsRepository,
} from '@/data/repositories/UserSettingsRepository';
import {
  plannerRefreshCoordinator as defaultPlannerRefreshCoordinator,
  PlannerRefreshCoordinator,
} from '@/services/PlannerRefreshCoordinator';
import { CALCULATION_METHOD_LABELS } from '@/domain/prayer/calculationMethods';
import type { CalculationMethodKey } from '@/domain/prayer/types';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';

export type OnboardingCompleteResult =
  | { status: 'SUCCESS' }
  | { status: 'PERSISTED_REFRESH_FAILED'; error: string }
  | { status: 'LOCATION_REQUIRED' }
  | { status: 'SETUP_INCOMPLETE'; reason: string }
  | { status: 'FAILED'; error: string };

export interface OnboardingCompleteInput {
  calculationMethod: CalculationMethodKey;
  // NOTE: themeMode is NOT included. Theme is persisted via ThemeProvider.setThemeMode()
  // on explicit user tap during Screen 4. The coordinator does not own theme persistence.
}

export class OnboardingCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = userSettingsRepository,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator = defaultPlannerRefreshCoordinator
  ) {}

  /**
   * Validates prerequisites, persists final onboarding fields, marks onboarding complete,
   * and triggers a full planner refresh.
   *
   * Execution order (MUST be respected):
   * Step 1 - Read: read current committed user_settings (not React state)
   * Step 2 - Validate location: confirm usable committed location exists
   *   If no usable location: return LOCATION_REQUIRED. Do NOT write onboardingCompleted.
   * Step 3 - Validate inputs: validate calculationMethod (CalculationMethodKey)
   *   If invalid: return SETUP_INCOMPLETE. Do NOT write onboardingCompleted.
   *   NOTE: themeMode is NOT validated here — it is persisted via ThemeProvider
   *   on each tap during Screen 4. The coordinator has no theme responsibility.
   * Step 4 - Persist final fields: upsert { calculationMethod }
   *   If fails: return FAILED. Do NOT write onboardingCompleted.
   * Step 5 - Persist onboardingCompleted: upsert { onboardingCompleted: true }
   *   If fails: return FAILED. onboardingCompleted not written.
   * Step 6 - Refresh: call PlannerRefreshCoordinator.fullRefresh()
   *   If throws: return PERSISTED_REFRESH_FAILED. Do NOT rollback onboardingCompleted.
   *   If returns SETUP_REQUIRED: return PERSISTED_REFRESH_FAILED (NOT SUCCESS).
   *   If succeeds: return SUCCESS.
   */
  async complete(input: OnboardingCompleteInput): Promise<OnboardingCompleteResult> {
    // Step 1: Read current committed settings
    let settings;
    try {
      settings = await this.userSettingsRepo.get();
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message ?? 'Failed to read user settings',
      };
    }

    if (!settings) {
      return { status: 'LOCATION_REQUIRED' };
    }

    // Step 2: Validate usable committed location
    const mode = settings.locationMode ?? 'AUTO';
    const hasValidAuto =
      settings.lastAutoLatitude !== null &&
      settings.lastAutoLongitude !== null &&
      !(settings.lastAutoLatitude === 0 && settings.lastAutoLongitude === 0) &&
      Boolean(settings.lastKnownTimezone && isValidTimezone(settings.lastKnownTimezone));

    const hasValidManual =
      settings.manualLatitude !== null &&
      settings.manualLongitude !== null &&
      !(settings.manualLatitude === 0 && settings.manualLongitude === 0) &&
      Boolean(settings.manualTimezone && isValidTimezone(settings.manualTimezone));

    const isLocationUsable = mode === 'MANUAL' ? hasValidManual : hasValidAuto;
    if (!isLocationUsable) {
      return { status: 'LOCATION_REQUIRED' };
    }

    // Step 3: Validate calculationMethod input
    const validMethods = Object.keys(CALCULATION_METHOD_LABELS);
    if (!input.calculationMethod || !validMethods.includes(input.calculationMethod)) {
      return {
        status: 'SETUP_INCOMPLETE',
        reason: `Invalid calculation method: ${String(input.calculationMethod)}`,
      };
    }

    // Step 4: Persist calculationMethod
    try {
      await this.userSettingsRepo.upsert({
        calculationMethod: input.calculationMethod,
      });
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message ?? 'Failed to persist calculation method',
      };
    }

    // Step 5: Persist onboardingCompleted = true
    try {
      await this.userSettingsRepo.upsert({
        onboardingCompleted: true,
      });
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message ?? 'Failed to persist onboarding completion',
      };
    }

    // Step 6: Full refresh
    try {
      const refreshResult = await this.plannerRefreshCoordinator.fullRefresh();
      if (refreshResult.status === 'SETUP_REQUIRED') {
        return {
          status: 'PERSISTED_REFRESH_FAILED',
          error: 'Planner refresh returned SETUP_REQUIRED',
        };
      }
      return { status: 'SUCCESS' };
    } catch (err: any) {
      return {
        status: 'PERSISTED_REFRESH_FAILED',
        error: err?.message ?? 'Planner refresh threw an exception',
      };
    }
  }
}

export const onboardingCoordinator = new OnboardingCoordinator();
