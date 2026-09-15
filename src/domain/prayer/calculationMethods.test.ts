import {
  CALCULATION_METHOD_LABELS,
  recommendCalculationMethod,
  REGION_METHOD_MAP,
  resolveCalculationMethod,
  resolveHighLatRule,
  resolvePolarCircle,
} from './calculationMethods';
import type {
  CalculationMethodKey,
  Coordinates,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
} from './types';

describe('calculationMethods', () => {
  const supportedMethods: CalculationMethodKey[] = [
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
  ];

  it.each(supportedMethods)(
    'resolves %s calculation method successfully',
    (method: CalculationMethodKey) => {
      const params = resolveCalculationMethod(method);
      expect(params).toBeDefined();
      expect(params.fajrAngle).toBeDefined();
      expect(CALCULATION_METHOD_LABELS[method]).toBeDefined();
      expect(CALCULATION_METHOD_LABELS[method].label).toBeTruthy();
    }
  );

  it('throws for unsupported calculation method', () => {
    expect(() => resolveCalculationMethod('UNKNOWN' as CalculationMethodKey)).toThrow(
      'Unsupported calculation method'
    );
  });

  const highLatRules: HighLatitudeRuleKey[] = [
    'MIDDLE_OF_NIGHT',
    'ONE_SEVENTH',
    'ANGLE_BASED',
    'AUTO',
  ];

  it.each(highLatRules)('resolves high-latitude rule %s', (rule: HighLatitudeRuleKey) => {
    const coords: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
    const resolved = resolveHighLatRule(rule, coords);
    expect(resolved).toBeDefined();
  });

  it('throws when AUTO high-latitude rule is resolved without coordinates', () => {
    expect(() => resolveHighLatRule('AUTO')).toThrow('Coordinates required');
  });

  it('throws for unsupported high-latitude rule', () => {
    expect(() => resolveHighLatRule('UNKNOWN' as HighLatitudeRuleKey)).toThrow(
      'Unsupported high latitude rule'
    );
  });

  const polarResolutions: PolarCircleResolutionKey[] = [
    'AQRAB_YAUM',
    'AQRAB_BALAD',
    'UNRESOLVED',
  ];

  it.each(polarResolutions)(
    'resolves polar circle resolution %s',
    (resolution: PolarCircleResolutionKey) => {
      const resolved = resolvePolarCircle(resolution);
      expect(resolved).toBeDefined();
    }
  );

  it('throws for unsupported polar circle resolution', () => {
    expect(() => resolvePolarCircle('UNKNOWN' as PolarCircleResolutionKey)).toThrow(
      'Unsupported polar circle resolution'
    );
  });

  it('recommendCalculationMethod returns MWL and REGION_METHOD_MAP contains key regional mappings', () => {
    expect(recommendCalculationMethod({ latitude: 25.2, longitude: 55.27 })).toBe('MWL');
    expect(REGION_METHOD_MAP.US).toBe('ISNA');
    expect(REGION_METHOD_MAP.SA).toBe('MAKKAH');
    expect(REGION_METHOD_MAP.GB).toBe('MWL');
    expect(REGION_METHOD_MAP.TR).toBe('TURKEY');
    expect(REGION_METHOD_MAP.EG).toBe('EGYPT');
  });
});
