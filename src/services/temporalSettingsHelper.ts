import type { UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type {
  CalculationMethodKey,
  AsrMethodKey,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
  PrayerAdjustments,
  PrayerCalculationParams,
} from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';

export function buildPrayerAdjustments(rawJson?: string | null): PrayerAdjustments {
  const defaults: PrayerAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  if (!rawJson) return defaults;
  try {
    return {
      ...defaults,
      ...JSON.parse(rawJson),
    };
  } catch {
    return defaults;
  }
}

export function buildPlanningDayConfig(rawStart?: string | null): PlanningDayConfig {
  if (rawStart === 'MIDNIGHT') {
    return { mode: 'MIDNIGHT' };
  }
  if (rawStart?.startsWith('CUSTOM:')) {
    return {
      mode: 'CUSTOM',
      localTime: rawStart.substring(7),
    };
  }
  return { mode: 'FAJR' };
}

export function buildCalculationParams(
  settings: Partial<UserSettingsRow> | null | undefined,
  timezone: string
): PrayerCalculationParams {
  return {
    method: (settings?.calculationMethod as CalculationMethodKey) || 'MWL',
    asrMethod: (settings?.asrMethod as AsrMethodKey) || 'SHAFI',
    highLatitudeRule: (settings?.highLatitudeRule as HighLatitudeRuleKey) || 'AUTO',
    polarCircleResolution:
      (settings?.polarCircleResolution as PolarCircleResolutionKey) || 'AQRAB_YAUM',
    adjustments: buildPrayerAdjustments(settings?.prayerAdjustments),
    timezone,
  };
}
