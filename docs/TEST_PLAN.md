# Test Plan

**Status:** Source of truth for testing strategy  
**Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Implements:** MASTER_PRODUCT_SPEC §54, §58  
**Framework:** Jest + React Native Testing Library

---

## 1. Testing Philosophy

The core scheduling logic (PrayerEngine → PrayerTimeline → PlanningDayEngine → SchedulingEngine → RecurrenceEngine) is the most critical and most error-prone part of the application. It must be tested exhaustively with automated tests.

UI tests verify that domain logic is correctly wired to the presentation layer.

E2E tests are deferred to post-MVP (Detox or Maestro).

---

## 2. Test Categories

| Category | Tool | Location | Purpose |
|---|---|---|---|
| Unit tests | Jest | `src/domain/**/*.test.ts` | Pure domain logic |
| Repository tests | Jest + SQLite | `src/data/**/*.test.ts` | Database queries |
| Integration tests | Jest | `__tests__/integration/` | Multi-module flows |
| Component tests | RNTL | `src/components/**/*.test.tsx` | UI rendering + interaction |

---

## 3. Unit Test Matrix

### 3.1 PrayerEngine

| # | Test | Input | Expected |
|---|---|---|---|
| PE-01 | Known Mecca prayer times | Mecca coords, known date, Umm al-Qura | Match published timetable ±1 min |
| PE-02 | Known NYC prayer times | NYC coords, known date, ISNA | Match published timetable ±1 min |
| PE-03 | London summer solstice | London coords, Jun 21 | Fajr/Isha valid (not NaN) |
| PE-04 | Tromsø polar | 69.6°N, Jun 21 | Falls back to high-lat rule, no crash |
| PE-05 | Asr Shafi vs Hanafi | Same coords/date | Hanafi Asr is later |
| PE-06 | Manual adjustments | Fajr +5 min | Fajr shifted by exactly 5 min |
| PE-07 | getCurrentPrayer via timeline at Fajr exact | now = fajr | Returns FAJR |
| PE-08 | getCurrentPrayer before Fajr | now = 3:00 AM, fajr = 5:00 AM | Returns ISHA (previous day's, via timeline) |
| PE-09 | getCurrentPrayer at each boundary | All 5 transition points | Correct prayer returned |
| PE-10 | getNextPrayer | Various times | Correct next prayer + time |
| PE-11 | Determinism | Same input twice | Identical output |
| PE-12 | DST transition date | NYC, March DST spring-forward | Valid times, no crash |

### 3.2 PrayerTimeline

| # | Test | Input | Expected |
|---|---|---|---|
| PT-01 | Timeline contains 15 contiguous periods | Any 3 dates | 15 PrayerPeriodInstances |
| PT-02 | No gaps between periods | Any timeline | period[i].end === period[i+1].start |
| PT-03 | findPeriod(02:00 Tuesday) | Fajr Tuesday = 05:30 | Returns Monday's ISHA, sourceDate=Monday |
| PT-04 | findPeriod(05:30 Tuesday) | Fajr Tuesday = 05:30 | Returns Tuesday's FAJR, sourceDate=Tuesday |
| PT-05 | findPeriod at each prayer boundary | All 5 boundaries for center date | Correct period (>= boundary = new period) |
| PT-06 | All periods have valid sourceDate | Any timeline | sourceDate matches the calendar date of the prayer |
| PT-07 | fullPeriodStart/End match start/end | Unclipped timeline | They are identical before clipping |
| PT-08 | DST spring-forward day | NYC Mar DST | Timeline valid, no NaN, contiguous |
| PT-09 | DST fall-back day | NYC Nov DST | Timeline valid, contiguous |

### 3.3 PlanningDayEngine

| # | Test | Input | Expected |
|---|---|---|---|
| PD-01 | Fajr-based: midday | 1:00 PM, Fajr=5:30 AM | Today's planning day |
| PD-02 | Fajr-based: 2 AM | 2:00 AM, Fajr=5:30 AM | Previous day's planning day |
| PD-03 | Fajr-based: 11 PM | 11:00 PM, Fajr=5:30 AM | Today's planning day (Isha period) |
| PD-04 | Fajr-based: day boundary at Fajr | 5:29 AM → prev day; 5:30 AM → today |
| PD-05 | Midnight-based: 12:30 AM | 12:30 AM | Today's planning day |
| PD-06 | Custom 19:00: at 18:59 | | Previous planning day |
| PD-07 | Custom 19:00: at 19:00 | | Today's planning day |
| PD-08 | Custom start does NOT reorder prayers | Custom 19:00 | Tabs always Fajr→Isha |
| PD-09 | planningDayKey format | Any | 'YYYY-MM-DD' string |
| PD-10 | DST spring: planning day near 2 AM | Custom start at 2:00 AM, DST forward | Handles gracefully |
| PD-11 | Custom 19:00 clips Maghrib (summer) | Maghrib=20:30, Isha=22:00 | No Maghrib clip at boundary (Maghrib starts after 19:00) |
| PD-12 | Custom 19:00 clips Maghrib (winter) | Maghrib=16:45, Isha=18:15 | Isha period clipped at 19:00 start, NO Maghrib in current day from prev-day |
| PD-13 | Custom 19:00 summer long days | Maghrib=21:00, Isha=22:30 | Planning day starts in Asr/Maghrib of prev day |
| PD-14 | Multi-instance tab: Maghrib appears twice | Custom 19:00, Maghrib=18:30, Isha=20:00 | Two MAGHRIB PrayerPeriodInstances in planning day |
| PD-15 | Clipped period has correct fullPeriodStart/End | Any clipped period | fullPeriodStart/End reflect original unclipped boundaries |

### 3.4 WallClockResolver

| # | Test | Input | Expected |
|---|---|---|---|
| WC-01 | Normal time | 14:30, NYC, regular day | resolution='NORMAL', correct DateTime |
| WC-02 | Spring-forward gap (2:30 AM NYC March) | 02:30, NYC, DST day | resolution='SPRING_FORWARD_SHIFTED', time=03:00 |
| WC-03 | Fall-back overlap (1:30 AM NYC November) | 01:30, NYC, DST day | resolution='FALL_BACK_FIRST', earlier offset |
| WC-04 | Spring-forward in Europe/London | 01:30, London, March DST | resolution='SPRING_FORWARD_SHIFTED' |
| WC-05 | Fall-back in Europe/London | 01:30, London, October DST | resolution='FALL_BACK_FIRST' |
| WC-06 | Non-DST timezone | 02:30, Asia/Riyadh | resolution='NORMAL' always |
| WC-07 | Boundary of gap start | Exact gap start time | Shifted forward |
| WC-08 | Boundary of gap end | First valid time after gap | resolution='NORMAL' |

### 3.5 SchedulingEngine — Exact Time

| # | Test | Scenario | Expected |
|---|---|---|---|
| SE-01 | Basic placement | Soccer 6 PM, Asr=3 PM, Maghrib=7 PM | Placed in ASR |
| SE-02 | Seasonal shift | Soccer 6 PM, Maghrib=5:40 PM | Placed in MAGHRIB |
| SE-03 | Task stays at 6 PM | Soccer 6 PM, any season | calculatedTime is always 6:00 PM |
| SE-04 | Near prayer boundary | Task at 7:00 PM, Maghrib=7:00 PM | Placed in MAGHRIB (>= boundary) |
| SE-05 | Before Fajr via timeline | Task at 2:00 AM Tue, Fajr Tue=5:30 AM | Placed in Monday's ISHA |
| SE-06 | Before Fajr planning day | Task at 2:00 AM Tue, Fajr start | planningDayKey = Monday |
| SE-07 | Midnight task | Task at 12:00 AM | Placed correctly per planning day config |
| SE-08 | DST spring forward | Task at 2:30 AM NYC DST day | wallClockResolution='SPRING_FORWARD_SHIFTED' |
| SE-09 | DST fall back | Task at 1:30 AM NYC DST day | wallClockResolution='FALL_BACK_FIRST', single occurrence |

### 3.6 SchedulingEngine — Prayer Relative

| # | Test | Scenario | Expected |
|---|---|---|---|
| SR-01 | Basic after | Maghrib+30, Maghrib=7:37 PM | 8:07 PM |
| SR-02 | Basic before | Dhuhr-15, Dhuhr=1:00 PM | 12:45 PM |
| SR-03 | Zero offset | Fajr+0 | Exact Fajr time |
| SR-04 | Cross-prayer | Maghrib+90, Maghrib=5:40 PM, Isha=6:52 PM | 7:10 PM, placed in ISHA |
| SR-05 | Large offset | Fajr+300 (5 hrs), Fajr=5:00 AM | 10:00 AM, correct prayer via timeline |
| SR-06 | Daily recalculation | Same task, two different days | Different calculated times |

### 3.7 SchedulingEngine — Prayer Window

| # | Test | Scenario | Expected |
|---|---|---|---|
| SW-01 | Fajr→Asr | | Eligible: [FAJR, DHUHR] |
| SW-02 | Dhuhr→Isha | | Eligible: [DHUHR, ASR, MAGHRIB] |
| SW-03 | Single prayer | Asr→Maghrib | Eligible: [ASR] |
| SW-04 | Full day | Fajr→Isha | Eligible: [FAJR, DHUHR, ASR, MAGHRIB] |
| SW-05 | Single occurrence | Fajr→Asr window task | ONE row in DB, appears in 2 tabs |
| SW-06 | Complete from one tab | Complete in Fajr tab | Completed in Dhuhr tab too |
| SW-07 | Window ends | Now >= Asr, task incomplete | Status → MISSED |

### 3.8 SchedulingEngine — Anytime Today

| # | Test | Scenario | Expected |
|---|---|---|---|
| SA-01 | No time, no prayer section | | calculatedTime=null, prayerSection=null |
| SA-02 | Visible all day | | Appears in Anytime section of every tab |
| SA-03 | Planning day ends | Incomplete at day end | MISSED |
| SA-04 | No auto-rollforward | Missed yesterday | Does NOT appear today |

### 3.9 RecurrenceEngine

| # | Test | Scenario | Expected |
|---|---|---|---|
| RE-01 | Daily | Every day | Occurrence on every date |
| RE-02 | Weekdays | Mon-Fri | No occurrence on Sat/Sun |
| RE-03 | Selected days | Mon/Wed/Fri | Only those days |
| RE-04 | Weekly | Every Tuesday | Only Tuesdays |
| RE-05 | Monthly | 15th of month | Correct dates |
| RE-06 | No duplicates | Any pattern, run twice | Same number of occurrences |
| RE-07 | UNTIL date | Until Dec 31 | No occurrences after |
| RE-08 | COUNT | Count=10 | Exactly 10 occurrences |

### 3.10 HijriRecurrenceEngine

| # | Test | Scenario | Expected |
|---|---|---|---|
| HR-01 | White Days | 13, 14, 15 of any Hijri month | Correct Gregorian dates |
| HR-02 | Global adjustment +1 | White Days with +1 global adj | Shifted by 1 day |
| HR-03 | Per-month override | Ramadan override +1, other months global 0 | Only Ramadan shifted |
| HR-04 | Override replaces global | Global=+1, Ramadan override=-1 | Ramadan uses -1, others use +1 |
| HR-05 | Hijri monthly | 1st of each Hijri month | Correct Gregorian dates |
| HR-06 | Ramadan | Ramadan days | Correct Gregorian dates for current/next Ramadan |
| HR-07 | Shawwal | Shawwal 2-7 | Correct dates |
| HR-08 | Variable month length | Hijri month with 29 vs 30 days | Day 30 skipped for 29-day months |
| HR-09 | Historical override preserved | Override set last month | Still present, correct |

### 3.11 Missed/Completed/Overdue

| # | Test | Scenario | Expected |
|---|---|---|---|
| MC-01 | Overdue derived | now > calculatedTime, PENDING | isOverdue=true |
| MC-02 | Overdue not stored | Check DB | No 'OVERDUE' in status column |
| MC-03 | Complete transitions | Complete a PENDING task | status=COMPLETED, completedAt set |
| MC-04 | Miss on period end | PrayerPeriodInstance ends, task PENDING | status=MISSED |
| MC-05 | Missed stays in place | Missed task | Remains in original prayer section |
| MC-06 | No auto-rollforward | Missed task | Does NOT appear in next period |
| MC-07 | Cancel | Cancel task | status=CANCELLED |

### 3.12 Cache Fingerprint

| # | Test | Scenario | Expected |
|---|---|---|---|
| CF-01 | Same inputs | Identical params twice | Identical fingerprint |
| CF-02 | Change method | MWL → ISNA | Different fingerprint |
| CF-03 | Change asr method | SHAFI → HANAFI | Different fingerprint |
| CF-04 | Change high-lat rule | AUTO → ANGLE_BASED | Different fingerprint |
| CF-05 | Change polar resolution | AQRAB_YAUM → AQRAB_BALAD | Different fingerprint |
| CF-06 | Change one adjustment | Fajr +0 → Fajr +1 | Different fingerprint |
| CF-07 | Change lat by 0.01 | 40.71 → 40.72 | Different fingerprint |
| CF-08 | Change timezone | America/New_York → America/Chicago | Different fingerprint |

### 3.13 Schedule Data Validation

| # | Test | Scenario | Expected |
|---|---|---|---|
| SD-01 | Parse EXACT_TIME | scheduleType='EXACT_TIME', data='{"localTime":"18:00"}' | Returns ExactTimeData |
| SD-02 | Parse PRAYER_RELATIVE | Valid JSON | Returns PrayerRelativeData |
| SD-03 | Parse PRAYER_WINDOW | Valid JSON | Returns PrayerWindowData |
| SD-04 | Parse ANYTIME_TODAY | '{}' | Returns empty Record |
| SD-05 | Invalid JSON shape | scheduleType='EXACT_TIME', data='{"anchorPrayer":"FAJR"}' | Throws DataIntegrityError |
| SD-06 | No type field in data | data='{"type":"EXACT_TIME","localTime":"18:00"}' | Validation does not break but type field ignored |

### 3.9 planningDayKey Resolution

| # | Test | Input | Expected |
|---|---|---|---|
| PK-01 | Exact task 02:00 Tue, Fajr-start day (Fajr 05:30) | EXACT_TIME 02:00, recurrence date=Tuesday | planningDayKey=Monday, prayerSection=ISHA |
| PK-02 | Exact task 20:00 Tue, custom start 19:00 | EXACT_TIME 20:00, recurrence date=Tuesday | planningDayKey=Tuesday (new planning day started at 19:00) |
| PK-03 | Exact task 18:00 Tue, custom start 19:00 | EXACT_TIME 18:00, recurrence date=Tuesday | planningDayKey=Monday (19:00 boundary not yet reached) |
| PK-04 | Anytime Today, Fajr-start day | ANYTIME_TODAY, recurrence date=Tuesday | planningDayKey=Tuesday (recurrence date = planning day by definition) |
| PK-05 | Prayer-relative Maghrib+30, before-Fajr result | PRAYER_RELATIVE Fajr-120, Fajr 05:30 | planningDayKey derived from 03:30 AM placement |
| PK-06 | Prayer window FAJR→ASR, Fajr-start day | PRAYER_WINDOW, recurrence date=Tuesday | planningDayKey=Tuesday (anchored to Tuesday Fajr instance) |

### 3.10 PrayerWindow Instance Anchoring

| # | Test | Input | Expected |
|---|---|---|---|
| PW-01 | MAGHRIB→ISHA with duplicate Maghrib (custom 19:00) | PlanningDay has 2 MAGHRIB instances (Mon sourceDate + Tue sourceDate) | Window anchored to occurrence’s sourceDate instance; does NOT span ~24h |
| PW-02 | FAJR→ASR window with Fajr-start day | Standard Fajr-start planning day | Anchored to correct sourceDate Fajr instance; window = Fajr start → Asr start |
| PW-03 | DHUHR→MAGHRIB with no duplicates | Standard planning day | Window = Dhuhr start → Maghrib start, eligible = [DHUHR, ASR] |

### 3.11 PrayerTimeline Exactness

| # | Test | Input | Expected |
|---|---|---|---|
| TX-01 | Final Isha has exact end | Build timeline for any date | D+1 Isha.end === D+2 Fajr (calculated, not approximated) |
| TX-02 | Timeline has 15 contiguous periods | Build timeline for any date | Exactly 15 periods, no gaps, no overlaps |
| TX-03 | Timeline covers 3 full days | Build timeline for D | Covers D-1 Fajr through D+1 Isha (which ends at D+2 Fajr) |

### 3.12 Recurring Series

| # | Test | Input | Expected |
|---|---|---|---|
| RS-01 | "This occurrence" edit | Edit one occurrence of daily task | overrideData set on occurrence, definition unchanged, no duplicate occurrences |
| RS-02 | "This and future" split | Split daily task at date D | predecessor.effectiveToDate=D-1, new definition with same seriesId, seriesVersion+1, effectiveFromDate=D |
| RS-03 | Entire series edit | Edit title of recurring task | Definition updated in-place, all non-completed occurrences rematerialized with new title |
| RS-04 | Split does not create duplicate TaskOccurrences | "This and future" at D | No two occurrences share (taskDefinitionId, localDate) |
| RS-05 | Hijri recurrence uses HijriService from M8 | Daily Hijri recurrence | HijriService.getEffectiveDate() called, dependency satisfied |
| RS-06 | Delete one occurrence | Cancel occurrence at date D | occurrence.status=CANCELLED, definition unchanged |
| RS-07 | Delete entire series | Delete series | All definitions isActive=false, completed/missed history retained, pending cancelled |

---

## 4. Integration Tests

| # | Test | Modules involved |
|---|---|---|
| IT-01 | Full scheduling pipeline: create exact-time task → timeline → appears in correct prayer tab | TaskEngine + PrayerEngine + PrayerTimeline + SchedulingEngine |
| IT-02 | Location change → prayer times change → task moves prayer section | LocationService + PrayerEngine + SchedulingEngine |
| IT-03 | Recurring task: create → materialize 7 days → verify all occurrences | RecurrenceEngine + SchedulingEngine + Repository |
| IT-04 | Worship item enabled → generates task definition → materializes correctly | WorshipEngine + SchedulingEngine |
| IT-05 | Notification scheduled → task time changes → notification rescheduled | NotificationEngine + SchedulingEngine |
| IT-06 | Planning day boundary: 2 AM task belongs to yesterday | PlanningDayEngine + PrayerTimeline + SchedulingEngine |
| IT-07 | Edit recurring series (this and future) → old occurrences preserved | TaskEngine + RecurrenceEngine |
| IT-08 | Custom planning day 19:00: tasks placed in clipped periods | PlanningDayEngine + SchedulingEngine |
| IT-09 | Calendar date selection → loads correct prayer tabs and tasks | CalendarEngine + SchedulingEngine |
| IT-10 | DST spring forward → exact-time tasks preserve wall clock | WallClockResolver + SchedulingEngine |
| IT-11 | DST fall back → single occurrence, correct resolution | WallClockResolver + SchedulingEngine |
| IT-12 | Hijri per-month override → worship items shift correctly | HijriService + WorshipEngine |
| IT-13 | Cache fingerprint invalidation → settings change → new prayer times | PrayerEngine + PrayerCacheRepo |

---

## 5. Component Tests

| # | Component | Test |
|---|---|---|
| CT-01 | PrayerTabBar | Renders 5 tabs in correct order (Fajr→Isha always) |
| CT-02 | PrayerTabBar | Highlights current prayer tab |
| CT-03 | PrayerHeader | Shows prayer name, time, countdown |
| CT-04 | TaskCard | Shows task title, time, checkbox |
| CT-05 | TaskCard | Tap checkbox → calls completion handler |
| CT-06 | TaskCard | Completed state: strikethrough, muted |
| CT-07 | TaskCard | Overdue state: shows "X min overdue" |
| CT-08 | EmptyPrayerState | Shows correct next-prayer name |
| CT-09 | AllDoneState | Shows "All done until [next prayer]" |
| CT-10 | AnytimeTodaySection | Collapsible with count |
| CT-11 | ScheduleModePicker | All 4 modes selectable |
| CT-12 | PrayerRelativePicker | Prayer + direction + offset controls |
| CT-13 | PrayerWindowPicker | Start/end prayer selectors |
| CT-14 | RecurrencePicker | Preset patterns + custom |
| CT-15 | MonthGrid | Correct Gregorian/Hijri dates |
| CT-16 | PrayerTabBar multi-instance | Tab aggregates 2 Maghrib instances (custom start) |

---

## 6. Critical Path Tests (§58 Definition of Done)

These 28 tests MUST pass before the scheduler is considered complete:

| # | Assertion | Test IDs |
|---|---|---|
| 1 | 6 PM exact-time task changes prayer section when prayer times change | SE-01, SE-02 |
| 2 | The task itself remains at 6 PM | SE-03 |
| 3 | Maghrib+30 task recalculates correctly every day | SR-01, SR-06 |
| 4 | Prayer-relative task may land in next prayer section | SR-04 |
| 5 | Fajr→Asr window appears in eligible tabs, single occurrence | SW-01, SW-05 |
| 6 | Completion in one tab completes everywhere | SW-06 |
| 7 | Missed tasks remain in original period | MC-05 |
| 8 | 2 AM belongs to previous day (Fajr start) | PT-03, SE-05, SE-06 |
| 9 | Custom day start changes grouping, not prayer order | PD-06, PD-07, PD-08 |
| 10 | Location changes cause recalculation | IT-02 |
| 11 | Manual location works without GPS | IT-02 (variant) |
| 12 | DST preserves wall clock | SE-08, SE-09, IT-10, IT-11 |
| 13 | Recurrence doesn't create duplicates | RE-06 |
| 14 | Hijri recurrence respects adjustment | HR-02, HR-03, HR-04 |
| 15 | App restart doesn't corrupt data | IT-03 (re-run after simulated restart) |
| 16 | 02:00 Tuesday exact-time → Monday Isha (Fajr start) | PT-03, SE-05, SE-06 |
| 17 | Custom 19:00 clips Maghrib correctly summer+winter | PD-11, PD-12, PD-14 |
| 18 | Custom planning day multi-instance tab aggregation | PD-14, CT-16 |
| 19 | WallClockResolver spring-forward shifts forward | WC-02, WC-04 |
| 20 | WallClockResolver fall-back chooses first occurrence | WC-03, WC-05 |
| 21 | DST tests cover ≥2 timezones | WC-02+WC-04, WC-03+WC-05 |
| 22 | planningDayKey derived from resolved time, not recurrence date | PK-01, PK-02, PK-03 |
| 23 | PrayerWindow with duplicate labels anchored correctly via sourceDate | PW-01 |
| 24 | PrayerTimeline has no approximate boundaries (D+1 Isha = exact D+2 Fajr) | TX-01 |
| 25 | "This and future" split preserves historical occurrences | RS-02, RS-04 |
| 26 | Hijri recurrence depends on HijriService (M8, not a stub) | RS-05 |
| 27 | ANYTIME_TODAY planningDayKey = recurrence date directly | PK-04 |
| 28 | Delete entire series retains completed/missed history | RS-07 |

---

## 7. Test Data Fixtures

### 7.1 Location Fixtures

```typescript
export const LOCATIONS = {
  mecca:    { lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
  newYork:  { lat: 40.7128, lng: -74.0060, tz: 'America/New_York' },
  chicago:  { lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
  london:   { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  tromso:   { lat: 69.6496, lng: 18.9560, tz: 'Europe/Oslo' },
  tokyo:    { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  sydney:   { lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
};
```

### 7.2 Date Fixtures

```typescript
export const DATES = {
  summerSolstice2026: '2026-06-21',
  winterSolstice2026: '2026-12-21',
  // DST transitions — America/New_York
  dstSpringForwardNY2026: '2026-03-08',   // 2:00 AM → 3:00 AM
  dstFallBackNY2026: '2026-11-01',        // 2:00 AM → 1:00 AM
  // DST transitions — Europe/London
  dstSpringForwardLondon2026: '2026-03-29', // 1:00 AM → 2:00 AM
  dstFallBackLondon2026: '2026-10-25',     // 2:00 AM → 1:00 AM
  regular: '2026-09-15',
};
```

---

## 8. Test Configuration

```typescript
// jest.config.ts
export default {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|adhan|rrule|luxon)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    '!src/domain/**/*.test.ts',
    '!src/domain/**/types.ts',
  ],
  coverageThresholds: {
    'src/domain/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

---

## 9. Test Execution

```bash
# All unit tests
npx jest src/domain/

# Specific engine
npx jest src/domain/scheduling/

# Integration tests
npx jest __tests__/integration/

# Coverage report
npx jest --coverage

# Watch mode during development
npx jest --watch src/domain/
```

---

## 10. CI/CD Requirements

On every PR:
1. TypeScript compilation (`tsc --noEmit`)
2. Lint (`eslint`)
3. Unit tests (`jest src/domain/`)
4. Component tests (`jest src/components/`)
5. Integration tests (`jest __tests__/integration/`)
6. Coverage check (domain ≥ 90%)

Failure on any step blocks merge.
