# Prayer Engine

**Status:** Source of truth for prayer time computation  
**Updated:** 2026-09-14 (Rev 2 — architecture review)  
**Implements:** MASTER_PRODUCT_SPEC §21, §22, §45  
**Library:** `adhan` (adhan-js)

---

## 1. Purpose

The Prayer Engine computes prayer times for any date, location, and configuration. It produces `PrayerTimesResult` records and assembles them into a `PrayerTimeline` — the foundation that all other engines depend on.

---

## 2. API

```typescript
interface PrayerEngineAPI {
  /**
   * Calculate prayer times for a specific date and location.
   * Returns absolute DateTimes in the location's timezone.
   */
  calculate(
    date: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): PrayerTimesResult;

  /**
   * Calculate prayer times for a date range (batch).
   */
  calculateRange(
    startDate: string,
    endDate: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): Map<string, PrayerTimesResult>;

  /**
   * Build a PrayerTimeline spanning 3 consecutive days centered on centerDate.
   * The timeline contains contiguous PrayerPeriodInstance records covering
   * [prevDate Fajr, nextDate end-of-day] — enough to resolve any time within
   * the center date's planning day regardless of planning-day configuration.
   */
  buildPrayerTimeline(
    centerDate: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): PrayerTimeline;

  /**
   * Determine which prayer period a given time falls in,
   * using the full timeline rather than a single day's prayer times.
   */
  getCurrentPrayer(
    now: DateTime,
    timeline: PrayerTimeline
  ): Prayer;

  /**
   * Get the next prayer after a given time.
   */
  getNextPrayer(
    now: DateTime,
    timeline: PrayerTimeline
  ): { prayer: Prayer; time: DateTime };

  /**
   * Recommend a calculation method based on coordinates.
   */
  recommendCalculationMethod(coordinates: Coordinates): CalculationMethodKey;

  /**
   * Compute a deterministic fingerprint of all calculation inputs.
   * Used as the cache key for prayer time results.
   */
  calculationConfigFingerprint(
    date: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): string;
}
```

---

## 3. Types

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface PrayerCalculationParams {
  method: CalculationMethodKey;
  asrMethod: 'SHAFI' | 'HANAFI';
  highLatitudeRule: HighLatitudeRuleKey;
  polarCircleResolution: PolarCircleResolutionKey;
  adjustments: PrayerAdjustments;
  timezone: string;            // IANA timezone
}

interface PrayerAdjustments {
  fajr: number;    // minutes
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

interface PrayerTimesResult {
  date: string;           // ISO date
  timezone: string;       // IANA
  fajr: DateTime;
  sunrise: DateTime;
  dhuhr: DateTime;
  asr: DateTime;
  maghrib: DateTime;
  isha: DateTime;
}

interface PrayerPeriodInstance {
  prayer: Prayer;
  start: DateTime;
  end: DateTime;
  fullPeriodStart: DateTime;
  fullPeriodEnd: DateTime;
  sourceDate: string;
}

interface PrayerTimeline {
  periods: PrayerPeriodInstance[];
  findPeriod(time: DateTime): PrayerPeriodInstance;
}

type CalculationMethodKey =
  | 'MWL' | 'ISNA' | 'EGYPT' | 'MAKKAH' | 'KARACHI'
  | 'TEHRAN' | 'SINGAPORE' | 'TURKEY' | 'DUBAI'
  | 'QATAR' | 'KUWAIT' | 'MOONSIGHTING';

type HighLatitudeRuleKey =
  | 'MIDDLE_OF_NIGHT' | 'ONE_SEVENTH' | 'ANGLE_BASED' | 'AUTO';

type PolarCircleResolutionKey =
  | 'AQRAB_YAUM' | 'AQRAB_BALAD' | 'UNRESOLVED';
```

---

## 4. Implementation Using `adhan`

```typescript
import {
  Coordinates as AdhanCoordinates,
  PrayerTimes as AdhanPrayerTimes,
  CalculationMethod, Madhab, HighLatitudeRule, PolarCircleResolution,
} from 'adhan';
import { DateTime } from 'luxon';

function calculate(
  date: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimesResult {
  const adhanCoords = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
  const calcParams = resolveCalculationMethod(params.method);

  calcParams.madhab = params.asrMethod === 'HANAFI' ? Madhab.Hanafi : Madhab.Shafi;

  // High latitude rule
  if (params.highLatitudeRule === 'AUTO') {
    calcParams.highLatitudeRule = HighLatitudeRule.recommended(adhanCoords);
  } else {
    calcParams.highLatitudeRule = resolveHighLatRule(params.highLatitudeRule);
  }

  // Polar circle resolution
  calcParams.polarCircleResolution = resolvePolarCircle(params.polarCircleResolution);

  // Manual adjustments
  calcParams.adjustments.fajr = params.adjustments.fajr;
  calcParams.adjustments.sunrise = params.adjustments.sunrise;
  calcParams.adjustments.dhuhr = params.adjustments.dhuhr;
  calcParams.adjustments.asr = params.adjustments.asr;
  calcParams.adjustments.maghrib = params.adjustments.maghrib;
  calcParams.adjustments.isha = params.adjustments.isha;

  const [year, month, day] = date.split('-').map(Number);
  const jsDate = new Date(year, month - 1, day);
  const adhanTimes = new AdhanPrayerTimes(adhanCoords, jsDate, calcParams);

  const zone = params.timezone;
  return {
    date, timezone: zone,
    fajr:    DateTime.fromJSDate(adhanTimes.fajr, { zone }),
    sunrise: DateTime.fromJSDate(adhanTimes.sunrise, { zone }),
    dhuhr:   DateTime.fromJSDate(adhanTimes.dhuhr, { zone }),
    asr:     DateTime.fromJSDate(adhanTimes.asr, { zone }),
    maghrib: DateTime.fromJSDate(adhanTimes.maghrib, { zone }),
    isha:    DateTime.fromJSDate(adhanTimes.isha, { zone }),
  };
}
```

---

## 5. PrayerTimeline Construction

```typescript
function buildPrayerTimeline(
  centerDate: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimeline {
  const prevDate = subtractDay(centerDate);
  const nextDate = addDay(centerDate);
  const dayAfterNext = addDay(nextDate);

  const prevTimes  = calculate(prevDate, coordinates, params);
  const currTimes  = calculate(centerDate, coordinates, params);
  const nextTimes  = calculate(nextDate, coordinates, params);
  // Only need dayAfterNext Fajr for the last Isha period end
  const dayAfterNextTimes = calculate(dayAfterNext, coordinates, params);

  const periods: PrayerPeriodInstance[] = [];

  // Previous day — all 5 periods
  appendDayPeriods(periods, prevTimes, prevDate, currTimes.fajr);

  // Center day — all 5 periods
  appendDayPeriods(periods, currTimes, centerDate, nextTimes.fajr);

  // Next day — all 5 periods
  appendDayPeriods(periods, nextTimes, nextDate, dayAfterNextTimes.fajr);

  return {
    periods,
    findPeriod: (time: DateTime) => findPeriodInList(periods, time),
  };
}

function appendDayPeriods(
  out: PrayerPeriodInstance[],
  times: PrayerTimesResult,
  sourceDate: string,
  nextDayFajr: DateTime
): void {
  const raw = [
    { prayer: 'FAJR'    as Prayer, start: times.fajr,    end: times.dhuhr },
    { prayer: 'DHUHR'   as Prayer, start: times.dhuhr,   end: times.asr },
    { prayer: 'ASR'     as Prayer, start: times.asr,     end: times.maghrib },
    { prayer: 'MAGHRIB' as Prayer, start: times.maghrib, end: times.isha },
    { prayer: 'ISHA'    as Prayer, start: times.isha,    end: nextDayFajr },
  ];
  for (const r of raw) {
    out.push({
      prayer: r.prayer,
      start: r.start,
      end: r.end,
      fullPeriodStart: r.start,
      fullPeriodEnd: r.end,
      sourceDate,
    });
  }
}
```

The timeline spans **3 full days** of prayer periods (15 `PrayerPeriodInstance` records), ensuring that any time within the center date's planning day — regardless of planning-day configuration — can be resolved.

---

## 6. Current Prayer Determination

```typescript
function getCurrentPrayer(now: DateTime, timeline: PrayerTimeline): Prayer {
  return timeline.findPeriod(now).prayer;
}

function getNextPrayer(
  now: DateTime,
  timeline: PrayerTimeline
): { prayer: Prayer; time: DateTime } {
  const currentPeriod = timeline.findPeriod(now);
  // The next period in the timeline starts at currentPeriod.end
  const nextIdx = timeline.periods.indexOf(currentPeriod) + 1;
  if (nextIdx < timeline.periods.length) {
    const next = timeline.periods[nextIdx];
    return { prayer: next.prayer, time: next.start };
  }
  throw new Error('Timeline does not extend far enough to determine next prayer');
}
```

---

## 7. Calculation Method Recommendation

```typescript
const REGION_METHOD_MAP: Record<string, CalculationMethodKey> = {
  'US': 'ISNA', 'CA': 'ISNA',
  'GB': 'MWL', 'DE': 'MWL', 'FR': 'MWL', 'NL': 'MWL',
  'SA': 'MAKKAH', 'AE': 'DUBAI', 'QA': 'QATAR', 'KW': 'KUWAIT',
  'TR': 'TURKEY', 'EG': 'EGYPT',
  'SG': 'SINGAPORE', 'MY': 'SINGAPORE', 'ID': 'SINGAPORE',
  'PK': 'KARACHI', 'IN': 'KARACHI', 'BD': 'KARACHI',
  'IR': 'TEHRAN',
};

function recommendCalculationMethod(coordinates: Coordinates): CalculationMethodKey {
  // Reverse geocode to country code, then look up. Default: MWL.
  return 'MWL';
}
```

---

## 8. High-Latitude Handling

| Latitude | Location example | Expected behavior |
|---|---|---|
| 30°N | Cairo | Standard — all times valid |
| 51°N | London | Summer Fajr/Isha may be close; AngleBased recommended |
| 60°N | Stockholm | Fajr/Isha may not exist in summer; MiddleOfTheNight or OneSeventh |
| 70°N | Tromsø | Polar — AqrabYaum resolution |

Strategy:
1. `AUTO` → `adhan`'s `HighLatitudeRule.recommended(coordinates)`
2. If prayer times are NaN → fall back to `MiddleOfTheNight`
3. Polar regions → `PolarCircleResolution.AqrabYaum`
4. Surface settings prompt if automatic recommendation is insufficient

---

## 9. Calculation Config Fingerprint and Caching

Prayer times for a given set of inputs are deterministic. The cache key must include **every input** that can change the output.

```typescript
function calculationConfigFingerprint(
  date: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): string {
  const components = [
    date,
    coordinates.latitude.toFixed(2),    // ~1.1 km precision
    coordinates.longitude.toFixed(2),
    params.timezone,
    params.method,
    params.asrMethod,
    params.highLatitudeRule,
    params.polarCircleResolution,
    params.adjustments.fajr.toString(),
    params.adjustments.sunrise.toString(),
    params.adjustments.dhuhr.toString(),
    params.adjustments.asr.toString(),
    params.adjustments.maghrib.toString(),
    params.adjustments.isha.toString(),
  ];
  return components.join('|');
}
```

**Cache storage:**
- Key: the fingerprint string
- Value: serialized `PrayerTimesResult`
- Stored in `prayer_cache` SQLite table
- Indexed by fingerprint for fast lookup

**Invalidation:** Changing ANY calculation parameter produces a different fingerprint, which is a cache miss — stale data is never reused.

Pre-compute and cache today ± 7 days on app open.

---

## 10. Offline Behavior

The `adhan` library performs pure astronomical calculations — zero network needed. Prayer times are always computable locally. Cached times survive app restarts and airplane mode. Only geocoding (city name → coordinates) may need network; mitigated by bundled city dataset and caching last-used location.

---

## 11. Test Requirements

### Unit tests

| # | Test |
|---|---|
| PE-01 | Known prayer times for Mecca on a specific date match expected values (±1 min) |
| PE-02 | Known prayer times for London (51°N) on summer solstice |
| PE-03 | Known prayer times for New York during DST transition day |
| PE-04 | Asr Shafi vs Hanafi difference (Hanafi later) |
| PE-05 | Manual adjustment applies correctly (+5 min to Fajr) |
| PE-06 | High-latitude rule changes Fajr/Isha times |
| PE-07 | PolarCircleResolution produces valid times at 70°N |
| PE-08 | `getCurrentPrayer` via timeline at each boundary (exact millisecond) |
| PE-09 | `getNextPrayer` returns correct result at each boundary |
| PE-10 | `buildPrayerTimeline` produces 15 contiguous periods for 3 dates |
| PE-11 | Timeline periods have no gaps (period[i].end === period[i+1].start) |
| PE-12 | `findPeriod(02:00 Tuesday)` returns Monday's ISHA (sourceDate=Monday) |
| PE-13 | Determinism: same input twice → identical output |
| PE-14 | Cache fingerprint changes when any single param changes |
| PE-15 | Cache fingerprint is identical for identical inputs |
| PE-16 | Consecutive days' periods are contiguous across the timeline |
| PE-17 | DST spring-forward day produces valid timeline (no NaN/invalid periods) |
| PE-18 | DST fall-back day produces valid timeline |

### Reference data
- Use AlAdhan API or published prayer timetables as reference
- Allow ±1 minute tolerance for method-specific rounding
