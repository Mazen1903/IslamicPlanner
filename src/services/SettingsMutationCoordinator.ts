import {
  userSettingsRepository,
  UserSettingsRepository,
  type UserSettingsPatch,
} from '@/data/repositories/UserSettingsRepository';
import {
  plannerRefreshCoordinator as defaultPlannerRefreshCoordinator,
  PlannerRefreshCoordinator,
} from './PlannerRefreshCoordinator';
import {
  hijriMonthOverrideRepository as defaultHijriMonthOverrideRepository,
  HijriMonthOverrideRepository,
  validateMonthOverride,
} from '@/data/repositories/HijriMonthOverrideRepository';
import type {
  CalculationMethodKey,
  AsrMethodKey,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
  PrayerAdjustments,
} from '@/domain/prayer/types';
import type { ThemeMode } from '@/theme/tokens';
import type { HijriBaseMethod } from '@/domain/calendar/types';

export type MutationCategory =
  | 'TEMPORAL_FULL_REFRESH'
  | 'HIJRI_RECURRENCE_REFRESH'
  | 'PRESENTATION_ONLY';

export type SettingsMutationResult =
  | { status: 'SUCCESS'; category: MutationCategory; refreshed: boolean }
  | { status: 'PERSISTED_REFRESH_FAILED'; category: MutationCategory; error: string }
  | { status: 'FAILED'; stage: 'VALIDATION' | 'PERSISTENCE'; error: string };

const VALID_CALCULATION_METHODS: ReadonlySet<string> = new Set<CalculationMethodKey>([
  'MWL',
  'ISNA',
  'EGYPT',
  'MAKKAH',
  'KARACHI',
  'TEHRAN',
  'SINGAPORE',
  'TURKEY',
  'DUBAI',
  'QATAR',
  'KUWAIT',
  'MOONSIGHTING',
]);

const VALID_ASR_METHODS: ReadonlySet<string> = new Set<AsrMethodKey>(['SHAFI', 'HANAFI']);

const VALID_HIGH_LAT_RULES: ReadonlySet<string> = new Set<HighLatitudeRuleKey>([
  'MIDDLE_OF_NIGHT',
  'ONE_SEVENTH',
  'ANGLE_BASED',
  'AUTO',
]);

const VALID_POLAR_RESOLUTIONS: ReadonlySet<string> = new Set<PolarCircleResolutionKey>([
  'AQRAB_YAUM',
  'AQRAB_BALAD',
  'UNRESOLVED',
]);

const VALID_THEME_MODES: ReadonlySet<string> = new Set<ThemeMode>(['SYSTEM', 'LIGHT', 'DARK']);

const VALID_HIJRI_BASE_METHODS: ReadonlySet<string> = new Set<HijriBaseMethod>([
  'UMM_AL_QURA',
  'CALCULATED',
]);

const FORBIDDEN_PATCH_KEYS: ReadonlySet<string> = new Set([
  'isPremium',
  'onboardingCompleted',
  'worshipSuggestionsEnabled',
  'prayerAlertsEnabled',
  'locationMode',
  'manualLatitude',
  'manualLongitude',
  'manualLocationName',
  'manualTimezone',
  'lastAutoLatitude',
  'lastAutoLongitude',
  'lastKnownTimezone',
]);

const TEMPORAL_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'calculationMethod',
  'asrMethod',
  'highLatitudeRule',
  'polarCircleResolution',
  'prayerAdjustments',
]);

const PRESENTATION_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'themeMode',
  'hijriBaseMethod',
]);

const HIJRI_USER_SETTINGS_KEYS: ReadonlySet<string> = new Set([
  'hijriGlobalAdjustment',
]);

export function validatePrayerAdjustments(raw: string | PrayerAdjustments): string {
  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('prayerAdjustments must be valid JSON.');
    }
  } else if (typeof raw === 'object' && raw !== null) {
    parsed = raw;
  } else {
    throw new Error('prayerAdjustments must be a JSON string or PrayerAdjustments object.');
  }

  const requiredPrayers: (keyof PrayerAdjustments)[] = [
    'fajr',
    'sunrise',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];

  for (const prayer of requiredPrayers) {
    const val = parsed[prayer];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < -60 || val > 60) {
      throw new Error(
        `Prayer adjustment for "${prayer}" must be an integer between -60 and +60 minutes. Received: ${val}`
      );
    }
  }

  return JSON.stringify({
    fajr: parsed.fajr,
    sunrise: parsed.sunrise,
    dhuhr: parsed.dhuhr,
    asr: parsed.asr,
    maghrib: parsed.maghrib,
    isha: parsed.isha,
  });
}

export class SettingsMutationCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = userSettingsRepository,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator = defaultPlannerRefreshCoordinator,
    private readonly overrideRepo: HijriMonthOverrideRepository = defaultHijriMonthOverrideRepository
  ) {}

  /**
   * Applies temporal settings changes (Prayer calculation, offsets, planning day).
   * Validates $\to$ Persists $\to$ Triggers TEMPORAL_FULL_REFRESH.
   */
  async applyTemporalSettings(patch: UserSettingsPatch): Promise<SettingsMutationResult> {
    return this.applySettingsChange(patch, 'TEMPORAL_FULL_REFRESH');
  }

  /**
   * Applies presentation-only settings changes (Theme mode, Hijri base method).
   * Validates $\to$ Persists $\to$ No refresh triggered.
   */
  async applyPresentationSettings(patch: UserSettingsPatch): Promise<SettingsMutationResult> {
    return this.applySettingsChange(patch, 'PRESENTATION_ONLY');
  }

  /**
   * Updates global Hijri adjustment.
   * Validates $\to$ Persists $\to$ Triggers HIJRI_RECURRENCE_REFRESH.
   */
  async setHijriGlobalAdjustment(days: number): Promise<SettingsMutationResult> {
    if (typeof days !== 'number' || !Number.isInteger(days) || days < -2 || days > 2) {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        error: `Hijri global adjustment must be an integer between -2 and +2. Received: ${days}`,
      };
    }

    return this.applySettingsChange(
      { hijriGlobalAdjustment: days },
      'HIJRI_RECURRENCE_REFRESH'
    );
  }

  /**
   * Upserts a Hijri month override.
   * Validates $\to$ Mutates hijri_month_overrides $\to$ Triggers HIJRI_RECURRENCE_REFRESH.
   */
  async upsertHijriMonthOverride(
    year: number,
    month: number,
    adjustmentDays: number
  ): Promise<SettingsMutationResult> {
    try {
      validateMonthOverride(year, month, adjustmentDays);
    } catch (err: any) {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        error: err?.message ?? String(err),
      };
    }

    try {
      await this.overrideRepo.upsert(year, month, adjustmentDays);
    } catch (err: any) {
      return {
        status: 'FAILED',
        stage: 'PERSISTENCE',
        error: `Failed to persist month override: ${err?.message ?? String(err)}`,
      };
    }

    try {
      await this.plannerRefreshCoordinator.fullRefresh();
      return {
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      };
    } catch (refreshErr: any) {
      return {
        status: 'PERSISTED_REFRESH_FAILED',
        category: 'HIJRI_RECURRENCE_REFRESH',
        error: `Setting was persisted but planner refresh failed: ${refreshErr?.message ?? String(refreshErr)}`,
      };
    }
  }

  /**
   * Deletes a Hijri month override.
   * Mutates hijri_month_overrides $\to$ Triggers HIJRI_RECURRENCE_REFRESH.
   */
  async deleteHijriMonthOverride(
    year: number,
    month: number
  ): Promise<SettingsMutationResult> {
    if (typeof year !== 'number' || !Number.isInteger(year) || typeof month !== 'number' || !Number.isInteger(month)) {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        error: 'Year and month must be integers.',
      };
    }

    try {
      await this.overrideRepo.delete(year, month);
    } catch (err: any) {
      return {
        status: 'FAILED',
        stage: 'PERSISTENCE',
        error: `Failed to delete month override: ${err?.message ?? String(err)}`,
      };
    }

    try {
      await this.plannerRefreshCoordinator.fullRefresh();
      return {
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      };
    } catch (refreshErr: any) {
      return {
        status: 'PERSISTED_REFRESH_FAILED',
        category: 'HIJRI_RECURRENCE_REFRESH',
        error: `Override was deleted but planner refresh failed: ${refreshErr?.message ?? String(refreshErr)}`,
      };
    }
  }

  /**
   * Generic coordinator entry point:
   * 1. Validates patch keys against category and forbidden sets.
   * 2. Validates value formats and domain constraints.
   * 3. Persists via UserSettingsRepository.
   * 4. Dispatches downstream refresh if category requires it.
   */
  async applySettingsChange(
    patch: UserSettingsPatch,
    category: MutationCategory
  ): Promise<SettingsMutationResult> {
    // 1. Check for forbidden keys
    for (const key of Object.keys(patch)) {
      if (FORBIDDEN_PATCH_KEYS.has(key)) {
        return {
          status: 'FAILED',
          stage: 'VALIDATION',
          error: `Field "${key}" cannot be mutated via user settings.`,
        };
      }
    }

    // 2. Validate allowed keys for category
    const allowedKeys =
      category === 'TEMPORAL_FULL_REFRESH'
        ? TEMPORAL_ALLOWED_KEYS
        : category === 'PRESENTATION_ONLY'
        ? PRESENTATION_ALLOWED_KEYS
        : HIJRI_USER_SETTINGS_KEYS;

    for (const key of Object.keys(patch)) {
      if (!allowedKeys.has(key)) {
        return {
          status: 'FAILED',
          stage: 'VALIDATION',
          error: `Field "${key}" is not permitted in mutation category "${category}".`,
        };
      }
    }

    // 3. Validate specific field contents
    const validatedPatch: UserSettingsPatch = { ...patch };

    try {
      if (patch.calculationMethod !== undefined) {
        if (!VALID_CALCULATION_METHODS.has(patch.calculationMethod)) {
          throw new Error(`Invalid calculationMethod: "${patch.calculationMethod}".`);
        }
      }

      if (patch.asrMethod !== undefined) {
        if (!VALID_ASR_METHODS.has(patch.asrMethod)) {
          throw new Error(`Invalid asrMethod: "${patch.asrMethod}".`);
        }
      }

      if (patch.highLatitudeRule !== undefined) {
        if (!VALID_HIGH_LAT_RULES.has(patch.highLatitudeRule)) {
          throw new Error(`Invalid highLatitudeRule: "${patch.highLatitudeRule}".`);
        }
      }

      if (patch.polarCircleResolution !== undefined) {
        if (!VALID_POLAR_RESOLUTIONS.has(patch.polarCircleResolution)) {
          throw new Error(`Invalid polarCircleResolution: "${patch.polarCircleResolution}".`);
        }
      }

      if (patch.prayerAdjustments !== undefined) {
        validatedPatch.prayerAdjustments = validatePrayerAdjustments(patch.prayerAdjustments);
      }


      if (patch.themeMode !== undefined) {
        if (!VALID_THEME_MODES.has(patch.themeMode as ThemeMode)) {
          throw new Error(`Invalid themeMode: "${patch.themeMode}".`);
        }
      }

      if (patch.hijriBaseMethod !== undefined) {
        if (!VALID_HIJRI_BASE_METHODS.has(patch.hijriBaseMethod as HijriBaseMethod)) {
          throw new Error(`Invalid hijriBaseMethod: "${patch.hijriBaseMethod}".`);
        }
      }

      if (patch.hijriGlobalAdjustment !== undefined) {
        const adj = patch.hijriGlobalAdjustment;
        if (typeof adj !== 'number' || !Number.isInteger(adj) || adj < -2 || adj > 2) {
          throw new Error(`hijriGlobalAdjustment must be an integer between -2 and +2. Received: ${adj}`);
        }
      }
    } catch (validationErr: any) {
      return {
        status: 'FAILED',
        stage: 'VALIDATION',
        error: validationErr?.message ?? String(validationErr),
      };
    }

    // 4. Persist to database
    try {
      await this.userSettingsRepo.upsert(validatedPatch);
    } catch (persistErr: any) {
      return {
        status: 'FAILED',
        stage: 'PERSISTENCE',
        error: `Failed to persist settings: ${persistErr?.message ?? String(persistErr)}`,
      };
    }

    // 5. Downstream dispatch
    if (category === 'PRESENTATION_ONLY') {
      return {
        status: 'SUCCESS',
        category,
        refreshed: false,
      };
    }

    // Both TEMPORAL_FULL_REFRESH and HIJRI_RECURRENCE_REFRESH trigger fullRefresh
    try {
      await this.plannerRefreshCoordinator.fullRefresh();
      return {
        status: 'SUCCESS',
        category,
        refreshed: true,
      };
    } catch (refreshErr: any) {
      return {
        status: 'PERSISTED_REFRESH_FAILED',
        category,
        error: `Settings were saved successfully, but downstream planner refresh encountered an issue: ${refreshErr?.message ?? String(refreshErr)}`,
      };
    }
  }
}

export const settingsMutationCoordinator = new SettingsMutationCoordinator();
