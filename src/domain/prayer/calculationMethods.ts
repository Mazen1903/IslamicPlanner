import {
  CalculationMethod,
  CalculationParameters,
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  PolarCircleResolution,
} from 'adhan';
import type {
  CalculationMethodKey,
  Coordinates,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
} from './types';

/**
 * Resolves a CalculationMethodKey to an Adhan CalculationParameters instance.
 */
export function resolveCalculationMethod(method: CalculationMethodKey): CalculationParameters {
  switch (method) {
    case 'MWL':
      return CalculationMethod.MuslimWorldLeague();
    case 'ISNA':
      return CalculationMethod.NorthAmerica();
    case 'EGYPT':
      return CalculationMethod.Egyptian();
    case 'MAKKAH':
      return CalculationMethod.UmmAlQura();
    case 'KARACHI':
      return CalculationMethod.Karachi();
    case 'TEHRAN':
      return CalculationMethod.Tehran();
    case 'SINGAPORE':
      return CalculationMethod.Singapore();
    case 'TURKEY':
      return CalculationMethod.Turkey();
    case 'DUBAI':
      return CalculationMethod.Dubai();
    case 'QATAR':
      return CalculationMethod.Qatar();
    case 'KUWAIT':
      return CalculationMethod.Kuwait();
    case 'MOONSIGHTING':
      return CalculationMethod.MoonsightingCommittee();
    default: {
      const _exhaustiveCheck: never = method;
      throw new Error(`Unsupported calculation method: ${String(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Resolves HighLatitudeRuleKey to the internal Adhan HighLatitudeRule constant.
 */
export function resolveHighLatRule(
  rule: HighLatitudeRuleKey,
  coordinates?: Coordinates
): (typeof HighLatitudeRule)[keyof typeof HighLatitudeRule] extends (...args: any[]) => any
  ? ReturnType<(typeof HighLatitudeRule)['recommended']>
  : (typeof HighLatitudeRule)[keyof typeof HighLatitudeRule] {
  switch (rule) {
    case 'MIDDLE_OF_NIGHT':
      return HighLatitudeRule.MiddleOfTheNight;
    case 'ONE_SEVENTH':
      return HighLatitudeRule.SeventhOfTheNight;
    case 'ANGLE_BASED':
      return HighLatitudeRule.TwilightAngle;
    case 'AUTO': {
      if (!coordinates) {
        throw new Error('Coordinates required to resolve AUTO high latitude rule');
      }
      return HighLatitudeRule.recommended(
        new AdhanCoordinates(coordinates.latitude, coordinates.longitude)
      );
    }
    default: {
      const _exhaustiveCheck: never = rule;
      throw new Error(`Unsupported high latitude rule: ${String(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Resolves PolarCircleResolutionKey to the internal Adhan PolarCircleResolution constant.
 */
export function resolvePolarCircle(
  resolution: PolarCircleResolutionKey
): (typeof PolarCircleResolution)[keyof typeof PolarCircleResolution] {
  switch (resolution) {
    case 'AQRAB_YAUM':
      return PolarCircleResolution.AqrabYaum;
    case 'AQRAB_BALAD':
      return PolarCircleResolution.AqrabBalad;
    case 'UNRESOLVED':
      return PolarCircleResolution.Unresolved;
    default: {
      const _exhaustiveCheck: never = resolution;
      throw new Error(`Unsupported polar circle resolution: ${String(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Metadata and descriptive labels for supported calculation methods.
 */
export const CALCULATION_METHOD_LABELS: Record<
  CalculationMethodKey,
  { label: string; description: string }
> = {
  MWL: {
    label: 'Muslim World League',
    description: 'Standard 18° Fajr, 17° Isha. Widely used in Europe, Far East, and parts of the US.',
  },
  ISNA: {
    label: 'Islamic Society of North America (ISNA)',
    description: '15° Fajr and 15° Isha. Common in North America.',
  },
  EGYPT: {
    label: 'Egyptian General Authority of Survey',
    description: '19.5° Fajr and 17.5° Isha. Used in Egypt, Africa, and parts of the Middle East.',
  },
  MAKKAH: {
    label: 'Umm Al-Qura University, Makkah',
    description: '18.5° Fajr and fixed 90-min Isha interval (120-min in Ramadan). Official in Saudi Arabia.',
  },
  KARACHI: {
    label: 'University of Islamic Sciences, Karachi',
    description: '18° Fajr and 18° Isha. Widely used in Pakistan, India, Bangladesh, and Afghanistan.',
  },
  TEHRAN: {
    label: 'Institute of Geophysics, University of Tehran',
    description: '17.7° Fajr, 4.5° Maghrib, and 14° Isha.',
  },
  SINGAPORE: {
    label: 'Majlis Ugama Islam Singapura (MUIS)',
    description: '20° Fajr and 18° Isha. Used in Singapore, Malaysia, and Indonesia.',
  },
  TURKEY: {
    label: 'Diyanet İşleri Başkanlığı, Turkey',
    description: 'Official calculation method of Turkey.',
  },
  DUBAI: {
    label: 'Dubai (UAE)',
    description: '18.2° Fajr and 18.2° Isha with localized offsets for the UAE.',
  },
  QATAR: {
    label: 'Qatar',
    description: '18° Fajr and fixed 90-min Isha interval.',
  },
  KUWAIT: {
    label: 'Kuwait',
    description: '18° Fajr and 17.5° Isha.',
  },
  MOONSIGHTING: {
    label: 'Moonsighting Committee Worldwide',
    description: '18° Fajr and 18° Isha with seasonal twilight adjustments.',
  },
};

/**
 * Standard ISO country code mapping to recommended calculation method (PRAYER_ENGINE.md §7).
 */
export const REGION_METHOD_MAP: Record<string, CalculationMethodKey> = {
  US: 'ISNA',
  CA: 'ISNA',
  GB: 'MWL',
  DE: 'MWL',
  FR: 'MWL',
  NL: 'MWL',
  SA: 'MAKKAH',
  AE: 'DUBAI',
  QA: 'QATAR',
  KW: 'KUWAIT',
  TR: 'TURKEY',
  EG: 'EGYPT',
  SG: 'SINGAPORE',
  MY: 'SINGAPORE',
  ID: 'SINGAPORE',
  PK: 'KARACHI',
  IN: 'KARACHI',
  BD: 'KARACHI',
  IR: 'TEHRAN',
};

/**
 * Recommend calculation method from coordinates (defaults to MWL per PRAYER_ENGINE.md §7).
 */
export function recommendCalculationMethod(_coordinates: Coordinates): CalculationMethodKey {
  return 'MWL';
}
