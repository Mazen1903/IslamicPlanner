import type { DateTime } from 'luxon';
import type { TemporalEnvironment } from '@/domain/location/types';
import { isMaterialChange } from '@/domain/location/environmentComparator';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';
import {
  UserSettingsRepository,
  userSettingsRepository as defaultUserSettingsRepo,
} from '@/data/repositories/UserSettingsRepository';
import {
  ILocationService,
  locationService as defaultLocationService,
} from './LocationService';
import {
  buildCalculationParams,
  buildPlanningDayConfig,
} from './temporalSettingsHelper';

export type LocationResolutionResult =
  | {
      status: 'READY';
      changed: boolean;
      environment: TemporalEnvironment;
    }
  | {
      status: 'SETUP_REQUIRED';
    };

/**
 * Coordinates location resolution, material-change comparison, and persistence.
 *
 * CRITICAL ARCHITECTURAL BOUNDARIES:
 * 1. Performs ONLY: resolution, comparison, commit.
 * 2. MUST NOT call MaterializationEngine, TodayOrchestrator, or RecurringHorizonSync.
 * 3. Ordinary resolution strictly calls getForegroundPermission() (NO unsolicited permission prompts).
 * 4. Insignificant GPS observations (<10 km delta, same timezone) are discarded and NOT returned as effective.
 * 5. Downstream scheduling/rematerialization is owned exclusively by PlannerRefreshCoordinator.fullRefresh().
 */
export class LocationRefreshCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = defaultUserSettingsRepo,
    private readonly locationService: ILocationService = defaultLocationService
  ) {}

  async resolve(_now?: DateTime): Promise<LocationResolutionResult> {
    const settings = await this.userSettingsRepo.get();
    const mode = settings?.locationMode ?? 'AUTO';

    // ==========================================
    // 1. MANUAL MODE
    // ==========================================
    if (mode === 'MANUAL') {
      const hasValidManual =
        settings?.manualLatitude != null &&
        settings?.manualLongitude != null &&
        settings?.manualTimezone &&
        isValidTimezone(settings.manualTimezone);

      if (!hasValidManual) {
        return { status: 'SETUP_REQUIRED' };
      }

      const timezone = settings!.manualTimezone!;
      const environment: TemporalEnvironment = {
        location: {
          latitude: settings!.manualLatitude!,
          longitude: settings!.manualLongitude!,
          timezone,
          cityName: settings!.manualLocationName ?? null,
          source: 'MANUAL',
        },
        calculationParams: buildCalculationParams(settings, timezone),
        planningDayConfig: buildPlanningDayConfig(settings?.planningDayStart),
      };

      // Ordinary resolution in MANUAL mode does not poll GPS and reports changed: false.
      // (Explicit manual city changes are initiated via useLocation which runs a canonical fullRefresh).
      return {
        status: 'READY',
        changed: false,
        environment,
      };
    }

    // ==========================================
    // 2. AUTO MODE
    // ==========================================
    const hasCommittedAuto =
      settings?.lastAutoLatitude != null &&
      settings?.lastAutoLongitude != null &&
      settings?.lastKnownTimezone &&
      isValidTimezone(settings.lastKnownTimezone);

    let committedEnvironment: TemporalEnvironment | null = null;
    if (hasCommittedAuto) {
      const timezone = settings!.lastKnownTimezone!;
      committedEnvironment = {
        location: {
          latitude: settings!.lastAutoLatitude!,
          longitude: settings!.lastAutoLongitude!,
          timezone,
          source: 'AUTO',
        },
        calculationParams: buildCalculationParams(settings, timezone),
        planningDayConfig: buildPlanningDayConfig(settings?.planningDayStart),
      };
    }

    // Check foreground permission without prompting
    const permission = await this.locationService.getForegroundPermission();

    if (permission !== 'GRANTED') {
      // Permission denied or undetermined
      if (committedEnvironment) {
        // Fallback to valid committed AUTO snapshot
        return {
          status: 'READY',
          changed: false,
          environment: committedEnvironment,
        };
      }
      return { status: 'SETUP_REQUIRED' };
    }

    // Permission is granted: attempt to acquire fresh GPS coordinates
    const coords = await this.locationService.getCurrentCoordinates();
    const systemTz = this.locationService.getDeviceTimezone();
    const effectiveTz =
      systemTz ?? (hasCommittedAuto ? settings!.lastKnownTimezone! : null);

    if (!coords || !effectiveTz || !isValidTimezone(effectiveTz)) {
      // Temporary GPS failure or timezone unavailable
      if (committedEnvironment) {
        return {
          status: 'READY',
          changed: false,
          environment: committedEnvironment,
        };
      }
      return { status: 'SETUP_REQUIRED' };
    }

    // Candidate evaluation
    const candidate = {
      coordinates: coords,
      timezone: effectiveTz,
      calculationParams: buildCalculationParams(settings, effectiveTz),
      planningDayConfig: buildPlanningDayConfig(settings?.planningDayStart),
      mode: 'AUTO' as const,
    };

    const isMaterial = isMaterialChange(committedEnvironment, candidate);

    if (isMaterial) {
      // Commit candidate to persistent store
      await this.userSettingsRepo.saveAutoLocation(coords, effectiveTz);

      const newEnvironment: TemporalEnvironment = {
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          timezone: effectiveTz,
          source: 'AUTO',
        },
        calculationParams: candidate.calculationParams,
        planningDayConfig: candidate.planningDayConfig,
      };

      return {
        status: 'READY',
        changed: true,
        environment: newEnvironment,
      };
    }

    // Sub-threshold movement (<10 km) and unchanged timezone/config:
    // Raw observation is discarded; existing committed environment is returned.
    return {
      status: 'READY',
      changed: false,
      environment: committedEnvironment!,
    };
  }
}

export const locationRefreshCoordinator = new LocationRefreshCoordinator();
