import { getDatabase } from '@/data/db';
import { userSettings } from '@/data/schema';
import type {
  TodayTemporalInputProvider,
  TodayTemporalInputResult,
  TodayTemporalInputs,
} from './types';
import type {
  CalculationMethodKey,
  AsrMethodKey,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
  PrayerAdjustments,
} from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';
import {
  buildCalculationParams,
  buildPlanningDayConfig,
} from './temporalSettingsHelper';

/**
 * Production location-aware temporal input provider for M12.
 * Reads committed effective location and prayer parameters strictly according to locationMode:
 *
 * AUTO reads ONLY:
 * - last_auto_latitude
 * - last_auto_longitude
 * - last_known_timezone
 *
 * MANUAL reads ONLY:
 * - manual_latitude
 * - manual_longitude
 * - manual_timezone
 *
 * If active mode lacks a complete valid snapshot, returns SETUP_REQUIRED.
 * AUTO never reads manual fields.
 */
export class LocationAwareTodayTemporalInputProvider implements TodayTemporalInputProvider {
  async getInputs(): Promise<TodayTemporalInputResult> {
    try {
      const db = getDatabase();
      const rows = db.select().from(userSettings).limit(1).all();
      const settings = rows[0];

      if (!settings) {
        return { status: 'SETUP_REQUIRED' };
      }

      const mode = settings.locationMode ?? 'AUTO';

      let latitude: number | null = null;
      let longitude: number | null = null;
      let timezone: string | null = null;

      if (mode === 'AUTO') {
        latitude = settings.lastAutoLatitude;
        longitude = settings.lastAutoLongitude;
        timezone = settings.lastKnownTimezone;
      } else if (mode === 'MANUAL') {
        latitude = settings.manualLatitude;
        longitude = settings.manualLongitude;
        timezone = settings.manualTimezone;
      }

      if (
        latitude == null ||
        longitude == null ||
        !timezone ||
        !isValidTimezone(timezone)
      ) {
        return { status: 'SETUP_REQUIRED' };
      }

      const inputs: TodayTemporalInputs = {
        coordinates: {
          latitude,
          longitude,
        },
        params: buildCalculationParams(settings, timezone),
        planningDayConfig: buildPlanningDayConfig(settings.planningDayStart),
      };

      return {
        status: 'READY',
        inputs,
      };
    } catch {
      return { status: 'SETUP_REQUIRED' };
    }
  }
}

/**
 * Legacy production temporal input provider for M7.
 * Preserved for test/bootstrap backwards compatibility.
 */
export class M7BootstrapInputProvider implements TodayTemporalInputProvider {
  async getInputs(): Promise<TodayTemporalInputResult> {
    try {
      const db = getDatabase();
      const rows = db.select().from(userSettings).limit(1).all();
      const settings = rows[0];

      if (
        settings?.manualLatitude != null &&
        settings?.manualLongitude != null &&
        settings?.manualTimezone &&
        settings.manualTimezone.trim() !== ''
      ) {
        let adjustments: PrayerAdjustments = {
          fajr: 0,
          sunrise: 0,
          dhuhr: 0,
          asr: 0,
          maghrib: 0,
          isha: 0,
        };

        if (settings.prayerAdjustments) {
          try {
            adjustments = {
              ...adjustments,
              ...JSON.parse(settings.prayerAdjustments),
            };
          } catch {
            // keep defaults
          }
        }

        let planningDayConfig: PlanningDayConfig = { mode: 'FAJR' };
        if (settings.planningDayStart === 'MIDNIGHT') {
          planningDayConfig = { mode: 'MIDNIGHT' };
        } else if (settings.planningDayStart?.startsWith('CUSTOM:')) {
          planningDayConfig = {
            mode: 'CUSTOM',
            localTime: settings.planningDayStart.substring(7),
          };
        }

        const inputs: TodayTemporalInputs = {
          coordinates: {
            latitude: settings.manualLatitude,
            longitude: settings.manualLongitude,
          },
          params: {
            method: (settings.calculationMethod as CalculationMethodKey) || 'MWL',
            asrMethod: (settings.asrMethod as AsrMethodKey) || 'SHAFI',
            highLatitudeRule: (settings.highLatitudeRule as HighLatitudeRuleKey) || 'AUTO',
            polarCircleResolution:
              (settings.polarCircleResolution as PolarCircleResolutionKey) || 'AQRAB_YAUM',
            adjustments,
            timezone: settings.manualTimezone,
          },
          planningDayConfig,
        };

        return {
          status: 'READY',
          inputs,
        };
      }
    } catch {
      // If table query fails, safely return SETUP_REQUIRED
    }

    return { status: 'SETUP_REQUIRED' };
  }
}

/**
 * Static provider used for tests, storybook, and development fixtures with explicit inputs.
 */
export class StaticTodayTemporalInputProvider implements TodayTemporalInputProvider {
  constructor(private readonly inputs: TodayTemporalInputs) {}

  async getInputs(): Promise<TodayTemporalInputResult> {
    return {
      status: 'READY',
      inputs: this.inputs,
    };
  }
}
