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

/**
 * Production temporal input provider for M7.
 * Reads legitimate configured location and prayer parameters from the user_settings table.
 *
 * CRITICAL PRODUCT INVARIANT:
 * MUST NOT silently fallback to Mecca, Riyadh, or any other geographic default.
 * If legitimate coordinates or timezone are missing, returns SETUP_REQUIRED.
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
