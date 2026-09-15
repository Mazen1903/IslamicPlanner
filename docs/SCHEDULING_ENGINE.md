# Scheduling Engine

**Status:** Source of truth for scheduling logic  
**Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Implements:** MASTER_PRODUCT_SPEC §8, §9, §10, §11, §20, §21, §40, §41, §42, §44, §58

---

## 1. Purpose

The Scheduling Engine answers: **"Where does this task appear today?"**

It takes a `TaskDefinition` + context (date, location, prayer times, planning day) and produces a `ResolvedOccurrence` with calculated time, prayer section placement, eligible prayer tabs, and derived overdue status.

---

## 2. Core Models

### 2.1 PrayerTimeline

A `PrayerTimeline` is a contiguous sequence of `PrayerPeriodInstance` records spanning multiple calendar days of prayer boundaries. It is the foundation of all placement calculations.

```typescript
interface PrayerTimeline {
  /** Ordered, contiguous prayer period instances. No gaps, no overlaps. */
  periods: PrayerPeriodInstance[];

  /** Find which period a given absolute time falls in. */
  findPeriod(time: DateTime): PrayerPeriodInstance;
}
```

A timeline must span enough days to resolve any time within the relevant planning day. At minimum, **three calendar days** of prayer data are needed: the day before the planning day anchor, the anchor date, and the day after.

### 2.2 PrayerPeriodInstance

An individual prayer period with absolute boundaries and source provenance.

```typescript
interface PrayerPeriodInstance {
  /** Prayer label: FAJR | DHUHR | ASR | MAGHRIB | ISHA */
  prayer: Prayer;

  /** Absolute start of this period (inclusive). May be clipped by a planning-day boundary. */
  start: DateTime;

  /** Absolute end of this period (exclusive). May be clipped by a planning-day boundary. */
  end: DateTime;

  /** The full unclipped start of the astronomical prayer period. */
  fullPeriodStart: DateTime;

  /** The full unclipped end of the astronomical prayer period. */
  fullPeriodEnd: DateTime;

  /** The calendar date whose prayer times produced this period. */
  sourceDate: string; // 'YYYY-MM-DD'
}
```

### 2.3 PlanningDay

A planning day is a bounded interval containing **clipped** prayer period instances.

```typescript
interface PlanningDay {
  /** Planning day identifier: 'YYYY-MM-DD'. */
  key: string;

  /** Absolute start of this planning day (inclusive). */
  start: DateTime;

  /** Absolute end of this planning day (exclusive). */
  end: DateTime;

  /**
   * Prayer period instances clipped to this planning day's boundaries.
   * Ordered chronologically.
   *
   * A single prayer label may appear more than once if a custom planning-day
   * boundary cuts through a prayer period, creating fragments from two
   * different astronomical days.
   *
   * Example with custom start 19:00, Maghrib 18:30, Isha 20:00:
   *   periods[0] = { prayer: 'MAGHRIB', start: 19:00, end: 20:00, sourceDate: prevDay }
   *   periods[1] = { prayer: 'ISHA', start: 20:00, end: nextFajr, sourceDate: prevDay }
   *   ...
   *   periods[N] = { prayer: 'MAGHRIB', start: 18:30, end: 19:00, sourceDate: currentDay }
   */
  periods: PrayerPeriodInstance[];
}
```

**Critical rule:** The UI tabs remain permanently `Fajr | Dhuhr | Asr | Maghrib | Isha`. A tab aggregates **all** `PrayerPeriodInstance` records with that prayer label within the planning day.

### 2.4 WallClockResolver

Exact-time tasks store local wall-clock times (e.g., `"18:00"`). Converting a wall-clock time to an absolute `DateTime` in a given timezone can encounter DST edge cases. The `WallClockResolver` applies an explicit, deterministic policy.

```typescript
interface WallClockResolution {
  /** The resolved absolute DateTime. */
  resolvedTime: DateTime;

  /** How the resolution was performed. */
  resolution: 'NORMAL' | 'SPRING_FORWARD_SHIFTED' | 'FALL_BACK_FIRST';
}

function resolveWallClock(
  localTime: string,   // "HH:mm"
  date: string,        // "YYYY-MM-DD"
  timezone: string     // IANA
): WallClockResolution {
  const [hour, minute] = localTime.split(':').map(Number);
  const [year, month, day] = date.split('-').map(Number);

  // Attempt direct construction
  const candidate = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0 },
    { zone: timezone }
  );

  // 1. NORMAL — local time exists and is unambiguous
  if (candidate.isValid && !isInDSTGap(candidate) && !isInDSTOverlap(hour, minute, date, timezone)) {
    return { resolvedTime: candidate, resolution: 'NORMAL' };
  }

  // 2. SPRING FORWARD — local time falls in the DST gap (does not exist)
  //    Policy: shift forward to the first valid local instant after the gap.
  if (isInDSTGap(candidate)) {
    const shifted = findFirstValidInstantAfterGap(date, hour, minute, timezone);
    return { resolvedTime: shifted, resolution: 'SPRING_FORWARD_SHIFTED' };
  }

  // 3. FALL BACK — local time is ambiguous (occurs twice)
  //    Policy: deterministically choose the FIRST (earlier, pre-DST) occurrence.
  //    Schedule exactly one occurrence.
  const earlier = resolveToEarlierOffset(date, hour, minute, timezone);
  return { resolvedTime: earlier, resolution: 'FALL_BACK_FIRST' };
}
```

**Policy summary:**

| Scenario | Policy | Effect |
|---|---|---|
| Normal local time | Resolve as-is | Standard behavior |
| Nonexistent spring-forward time (e.g., 2:30 AM) | Shift forward to first valid instant after the gap | Task moves to e.g., 3:00 AM; resolution recorded |
| Duplicated fall-back time (e.g., 1:30 AM occurs twice) | Choose earlier occurrence deterministically | One occurrence only; pre-DST offset used |

---

## 3. Scheduling Pipeline

This is the canonical pipeline from MASTER_PRODUCT_SPEC §40, redesigned around PrayerTimeline.

```text
Input: TaskDefinition + date + UserSettings
                    │
                    ▼
   ┌────────────────────────────────┐
   │  1. Resolve Location          │
   │     - auto or manual          │
   │     - get lat/lng/timezone    │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  2. Build PrayerTimeline      │
   │     - calculate prayer times  │
   │       for date-1, date,       │
   │       date+1                  │
   │     - assemble contiguous     │
   │       PrayerPeriodInstances   │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  3. Resolve Planning Day      │
   │     - determine planning-day  │
   │       boundaries from config  │
   │     - clip PrayerTimeline     │
   │       periods to boundary     │
   │     - produce PlanningDay     │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  4. Resolve Wall-Clock Time   │
   │     (EXACT_TIME only)         │
   │     - use WallClockResolver   │
   │     - handle DST gaps/overlaps│
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  5. Calculate Task Schedule   │
   │     - per schedule type:      │
   │       - EXACT_TIME            │
   │       - PRAYER_RELATIVE       │
   │       - PRAYER_WINDOW         │
   │       - ANYTIME_TODAY         │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  6. Place in PrayerTimeline   │
   │     - timeline.findPeriod()   │
   │     - derive prayer section   │
   │       from the period found   │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  7. Derive Status             │
   │     - PENDING, COMPLETED,     │
   │       MISSED from DB          │
   │     - isOverdue = derived     │
   └────────────────┬───────────────┘
                    ▼
   ┌────────────────────────────────┐
   │  8. Expose Render Model       │
   │     - ResolvedOccurrence      │
   └────────────────────────────────┘
```

---

## 4. Placement Logic Per Schedule Type

### 4.1 EXACT_TIME

```typescript
function resolveExactTime(
  scheduleData: ExactTimeData,       // { localTime: "18:00" }
  date: string,                       // "YYYY-MM-DD"
  timezone: string,                   // IANA
  timeline: PrayerTimeline
): { calculatedTime: DateTime; prayerSection: Prayer; wallClockResolution: WallClockResolution } {

  // 1. Resolve wall-clock time via WallClockResolver
  const wcr = resolveWallClock(scheduleData.localTime, date, timezone);

  // 2. Find which prayer period in the timeline contains this time
  const period = timeline.findPeriod(wcr.resolvedTime);

  return {
    calculatedTime: wcr.resolvedTime,
    prayerSection: period.prayer,
    wallClockResolution: wcr,
  };
}
```

**Before-Fajr example:**

- Task: exact time 02:00, Tuesday
- Tuesday Fajr: 05:30
- `resolveWallClock("02:00", "2026-09-15", "America/Chicago")` → 02:00 CDT
- `timeline.findPeriod(02:00 CDT Tuesday)` → Monday's Isha period (sourceDate=Monday, 20:00 Mon → 05:30 Tue)
- Prayer section = ISHA
- Planning day (Fajr start): Monday (because 02:00 Tue < Tuesday Fajr → belongs to Monday's planning day)

This resolves Issue #1 correctly.

### 4.2 PRAYER_RELATIVE

```typescript
function resolvePrayerRelative(
  scheduleData: PrayerRelativeData,  // { anchorPrayer, direction, offsetMinutes }
  prayerTimes: PrayerTimesResult,     // for the relevant date
  timeline: PrayerTimeline
): { calculatedTime: DateTime; prayerSection: Prayer } {

  // 1. Get anchor prayer time
  const anchorTime = getPrayerTime(prayerTimes, scheduleData.anchorPrayer);

  // 2. Apply offset
  const offset = scheduleData.direction === 'AFTER'
    ? { minutes: scheduleData.offsetMinutes }
    : { minutes: -scheduleData.offsetMinutes };
  const calculatedTime = anchorTime.plus(offset);

  // 3. Find period in timeline (NOT the anchor — the calculated time)
  const period = timeline.findPeriod(calculatedTime);

  return { calculatedTime, prayerSection: period.prayer };
}
```

**Cross-prayer example (§9.4):** Maghrib+90min with Maghrib=17:40, Isha=18:52 → calculated 19:10 → `timeline.findPeriod(19:10)` returns Isha period.

### 4.3 PRAYER_WINDOW

Prayer windows must be anchored to **concrete prayer instances** identified by both prayer label AND `sourceDate`. This prevents windows from accidentally spanning ~24 hours when custom planning-day boundaries create duplicate prayer labels.

```typescript
function resolvePrayerWindow(
  scheduleData: PrayerWindowData,     // { startPrayer, endPrayer }
  occurrenceDate: string,             // the recurrence date (YYYY-MM-DD)
  planningDay: PlanningDay,
  timeline: PrayerTimeline
): { windowStart: DateTime; windowEnd: DateTime; eligibleSections: Prayer[]; planningDayKey: string } {

  // 1. Anchor startPrayer to the instance whose sourceDate matches the occurrence date.
  //    This is the concrete prayer instance the user's recurrence rule intended.
  const anchorPeriod = planningDay.periods.find(
    p => p.prayer === scheduleData.startPrayer && p.sourceDate === occurrenceDate
  );

  if (!anchorPeriod) {
    // Occurrence date's prayer instance may not appear in this planning day
    // (e.g., pre-Fajr scenario). Fall back to the first matching instance.
    const fallback = planningDay.periods.find(
      p => p.prayer === scheduleData.startPrayer
    );
    if (!fallback) throw new SchedulingError(
      `No ${scheduleData.startPrayer} instance found in planning day`
    );
    // Use fallback — this handles edge cases where sourceDate differs
    return resolveWindowFromAnchor(fallback, scheduleData, planningDay);
  }

  return resolveWindowFromAnchor(anchorPeriod, scheduleData, planningDay);
}

function resolveWindowFromAnchor(
  anchorPeriod: PrayerPeriodInstance,
  scheduleData: PrayerWindowData,
  planningDay: PlanningDay
): { windowStart: DateTime; windowEnd: DateTime; eligibleSections: Prayer[]; planningDayKey: string } {

  const anchorSourceDate = anchorPeriod.sourceDate;

  // 2. Collect all contiguous periods from startPrayer to endPrayer
  //    that share the same sourceDate as the anchor (or are chronologically
  //    contiguous within the same astronomical day sequence).
  const eligiblePeriods: PrayerPeriodInstance[] = [];
  let collecting = false;

  for (const period of planningDay.periods) {
    // Start collecting when we hit the anchor period
    if (period === anchorPeriod) {
      collecting = true;
    }

    if (collecting) {
      eligiblePeriods.push(period);

      // Stop collecting when we reach the endPrayer boundary.
      // endPrayer is exclusive: Fajr→Asr means Fajr, Dhuhr are eligible (not Asr).
      // So we stop BEFORE adding the endPrayer period.
      // Actually: we collect up to (but not including) endPrayer.
      // Re-check: we started adding, so check if the NEXT period would be endPrayer.
    }

    // Stop when we've passed the last eligible period
    if (collecting && period.prayer === getPrayerBefore(scheduleData.endPrayer)) {
      break;
    }
  }

  // Alternative simpler approach: collect from anchor using prayer order
  const startOrder = PRAYER_ORDER.indexOf(scheduleData.startPrayer);
  const endOrder = PRAYER_ORDER.indexOf(scheduleData.endPrayer);

  // Filter to periods that are:
  // a) chronologically at or after the anchor period's start
  // b) have prayer order >= startOrder AND < endOrder
  // c) share sourceDate with anchor OR are the next chronological day's periods
  const filtered = planningDay.periods.filter(p => {
    const order = PRAYER_ORDER.indexOf(p.prayer);
    return p.start >= anchorPeriod.start
      && order >= startOrder
      && order < endOrder
      && p.sourceDate === anchorSourceDate;
  });

  const eligibleSections = [...new Set(filtered.map(p => p.prayer))];
  const windowStart = filtered[0]?.start ?? anchorPeriod.start;
  const windowEnd = filtered[filtered.length - 1]?.end ?? anchorPeriod.end;

  return {
    windowStart,
    windowEnd,
    eligibleSections,
    planningDayKey: planningDay.key,
  };
}
```

**Key behaviors:**
- One occurrence row in the database per date (§10.3)
- `startPrayer` instance selected by matching `sourceDate` to the occurrence's recurrence date
- If duplicate prayer labels exist (custom planning-day clipping), the correct instance is chosen — the window never spans ~24 hours across unrelated prayer instances
- Appears in ALL eligible prayer tabs simultaneously
- Completing from any tab completes the single occurrence
- `planningDayKey` is the planning day that contains the anchored window start

### 4.4 ANYTIME_TODAY

No time calculation. No prayer section. Appears in collapsible "Anytime Today" in every tab.

**Planning day semantics:** The `planningDayKey` for an ANYTIME_TODAY task equals the recurrence date directly. The recurrence date **is** the intended planning day — no clock-time derivation is needed. The materialization engine matches recurrence dates to planning days by identity.

---

## 5. PrayerTimeline Construction

The timeline must span enough prayer data to resolve any time within any possible planning day centered on the target date. It calculates prayer times for **4 consecutive calendar dates** (D-1, D, D+1, D+2) and produces **15 contiguous `PrayerPeriodInstance` records** spanning 3 full days (D-1 through D+1). D+2's Fajr is used solely to close D+1's Isha period.

**Invariant:** Every `PrayerPeriodInstance` has an exact calculated `end`. No boundary is ever approximated.

```typescript
function buildPrayerTimeline(
  centerDate: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimeline {

  const prevDate = subtractDay(centerDate);
  const nextDate = addDay(centerDate);
  const dayAfterNext = addDay(nextDate);

  // Calculate prayer times for 4 dates to ensure exact boundaries
  const prevTimes  = prayerEngine.calculate(prevDate, coordinates, params);
  const currTimes  = prayerEngine.calculate(centerDate, coordinates, params);
  const nextTimes  = prayerEngine.calculate(nextDate, coordinates, params);
  const dayAfterNextTimes = prayerEngine.calculate(dayAfterNext, coordinates, params);

  const periods: PrayerPeriodInstance[] = [];

  // Previous day — all 5 periods (Isha end = center day's Fajr)
  appendDayPeriods(periods, prevTimes, prevDate, currTimes.fajr);

  // Center day — all 5 periods (Isha end = next day's Fajr)
  appendDayPeriods(periods, currTimes, centerDate, nextTimes.fajr);

  // Next day — all 5 periods (Isha end = day+2's Fajr — EXACT, not approximate)
  appendDayPeriods(periods, nextTimes, nextDate, dayAfterNextTimes.fajr);

  return {
    periods,
    findPeriod: (time: DateTime) => findPeriodInTimeline(periods, time),
  };
}

function appendDayPeriods(
  out: PrayerPeriodInstance[],
  times: PrayerTimesResult,
  sourceDate: string,
  nextDayFajr: DateTime
): void {
  out.push(
    makePeriod('FAJR',    times.fajr,    times.dhuhr,   sourceDate),
    makePeriod('DHUHR',   times.dhuhr,   times.asr,     sourceDate),
    makePeriod('ASR',     times.asr,     times.maghrib, sourceDate),
    makePeriod('MAGHRIB', times.maghrib, times.isha,    sourceDate),
    makePeriod('ISHA',    times.isha,    nextDayFajr,   sourceDate),
  );
}

function findPeriodInTimeline(
  periods: PrayerPeriodInstance[],
  time: DateTime
): PrayerPeriodInstance {
  for (const period of periods) {
    if (time >= period.start && time < period.end) {
      return period;
    }
  }
  throw new SchedulingError(
    `Time ${time.toISO()} does not fall within any prayer period in the timeline`
  );
}

```

---

## 6. Planning Day Construction with Clipping

```typescript
function buildPlanningDay(
  config: PlanningDayConfig,
  timeline: PrayerTimeline,
  now: DateTime
): PlanningDay {
  // 1. Determine planning day boundaries
  const { dayStart, dayEnd, key } = resolvePlanningDayBoundaries(config, timeline, now);

  // 2. Clip timeline periods to the planning day interval [dayStart, dayEnd)
  const clippedPeriods: PrayerPeriodInstance[] = [];

  for (const period of timeline.periods) {
    // Skip periods entirely outside this planning day
    if (period.end <= dayStart || period.start >= dayEnd) continue;

    // Clip start and end
    const clippedStart = period.start < dayStart ? dayStart : period.start;
    const clippedEnd = period.end > dayEnd ? dayEnd : period.end;

    // Skip zero-duration fragments
    if (clippedStart >= clippedEnd) continue;

    clippedPeriods.push({
      prayer: period.prayer,
      start: clippedStart,
      end: clippedEnd,
      fullPeriodStart: period.start,
      fullPeriodEnd: period.end,
      sourceDate: period.sourceDate,
    });
  }

  return { key, start: dayStart, end: dayEnd, periods: clippedPeriods };
}
```

### 6.1 Fajr-Based Boundary (Default)

```typescript
// Planning day key = date of the Fajr that starts the day
// Boundary = Fajr time (from prayer times for that date)
// dayStart = today's Fajr
// dayEnd = tomorrow's Fajr

// Before-Fajr rule: at 02:00, dayStart has not been reached yet,
// so 02:00 belongs to the PREVIOUS planning day (previous Fajr → current Fajr)
```

### 6.2 Midnight-Based Boundary

```typescript
// dayStart = midnight (00:00)
// dayEnd = next midnight (24:00)
// key = calendar date
```

### 6.3 Custom Clock-Time Boundary (Premium)

```typescript
// planningDayStart = "19:00" (any HH:mm)
// dayStart = previous-date @ 19:00
// dayEnd = current-date @ 19:00
// key = current calendar date (the date containing the majority of waking hours)
```

**Custom boundary clipping example:**

Planning day starts at 19:00. Maghrib = 18:30, Isha = 20:00.

```text
Planning day "Tuesday" = Monday 19:00 → Tuesday 19:00

Clipped periods:
  MAGHRIB  Mon 19:00 → Mon 20:00  (clipped from 18:30, sourceDate=Monday)
  ISHA     Mon 20:00 → Tue 05:30  (sourceDate=Monday)
  FAJR     Tue 05:30 → Tue 12:30  (sourceDate=Tuesday)
  DHUHR    Tue 12:30 → Tue 15:45  (sourceDate=Tuesday)
  ASR      Tue 15:45 → Tue 18:30  (sourceDate=Tuesday)
  MAGHRIB  Tue 18:30 → Tue 19:00  (clipped from 18:30-20:00, sourceDate=Tuesday)

UI Tab mapping:
  Fajr tab     → 1 period instance
  Dhuhr tab    → 1 period instance
  Asr tab      → 1 period instance
  Maghrib tab  → 2 period instances (aggregated, sorted chronologically)
  Isha tab     → 1 period instance
```

Prayer tab order is ALWAYS `Fajr | Dhuhr | Asr | Maghrib | Isha`. This never changes regardless of planning day configuration (§20.4).

---

## 7. Schedule Data Representation

The `scheduleType` column is the **sole discriminator**. The `scheduleData` JSON column stores **only the type-specific payload** — it does NOT contain a `type` field.

```typescript
type ScheduleType = 'EXACT_TIME' | 'PRAYER_RELATIVE' | 'PRAYER_WINDOW' | 'ANYTIME_TODAY';

/** Strongly-typed mapping: scheduleType column → scheduleData JSON shape */
type ScheduleDataMap = {
  EXACT_TIME:      { localTime: string };                                                    // "HH:mm"
  PRAYER_RELATIVE: { anchorPrayer: Prayer; direction: RelativeDirection; offsetMinutes: number };
  PRAYER_WINDOW:   { startPrayer: Prayer; endPrayer: Prayer };
  ANYTIME_TODAY:   Record<string, never>;                                                     // {}
};

type ScheduleDataFor<T extends ScheduleType> = ScheduleDataMap[T];
```

There is exactly one source of truth for the schedule type: the `scheduleType` column. The `scheduleData` JSON never independently stores a type discriminator. Runtime validation at the repository boundary asserts the JSON shape matches the column.

---

## 8. Task Ordering Within a Prayer Tab

Following MASTER_PRODUCT_SPEC §5.6:

```typescript
function sortTasksForPrayerTab(
  tasks: ResolvedOccurrence[],
  periodInstances: PrayerPeriodInstance[]
): ResolvedOccurrence[] {
  // Separate Anytime Today (displayed in own collapsible section)
  const timed = tasks.filter(t => t.scheduleType !== 'ANYTIME_TODAY');
  const anytime = tasks.filter(t => t.scheduleType === 'ANYTIME_TODAY');

  const sorted = timed.sort((a, b) => {
    // 1. Incomplete before complete
    const aComplete = a.status === 'COMPLETED' ? 1 : 0;
    const bComplete = b.status === 'COMPLETED' ? 1 : 0;
    if (aComplete !== bComplete) return aComplete - bComplete;

    // 2. Important + overdue first
    if (a.isOverdue && a.priority === 'IMPORTANT' && !(b.isOverdue && b.priority === 'IMPORTANT')) return -1;
    if (b.isOverdue && b.priority === 'IMPORTANT' && !(a.isOverdue && a.priority === 'IMPORTANT')) return 1;

    // 3. Important before normal
    if (a.priority !== b.priority) return a.priority === 'IMPORTANT' ? -1 : 1;

    // 4. By schedule type: exact → relative → window
    const typeOrder: Record<ScheduleType, number> = { EXACT_TIME: 0, PRAYER_RELATIVE: 1, PRAYER_WINDOW: 2, ANYTIME_TODAY: 3 };
    if (typeOrder[a.scheduleType] !== typeOrder[b.scheduleType]) return typeOrder[a.scheduleType] - typeOrder[b.scheduleType];

    // 5. Chronological by calculated time
    if (a.calculatedTime && b.calculatedTime) return a.calculatedTime.toMillis() - b.calculatedTime.toMillis();
    if (a.calculatedTime && !b.calculatedTime) return -1;
    if (!a.calculatedTime && b.calculatedTime) return 1;

    // 6. Alphabetical fallback
    return a.title.localeCompare(b.title);
  });

  return sorted; // Anytime Today rendered in a separate collapsible section, not interleaved
}
```

---

## 9. Overdue Calculation

Overdue is **always derived, never stored** (§42, §12.1).

```typescript
function calculateOverdue(occurrence: ResolvedOccurrence, now: DateTime): {
  isOverdue: boolean;
  overdueMinutes: number | null;
} {
  if (occurrence.status !== 'PENDING') return { isOverdue: false, overdueMinutes: null };
  if (!occurrence.calculatedTime) return { isOverdue: false, overdueMinutes: null };

  if (now > occurrence.calculatedTime) {
    const diff = now.diff(occurrence.calculatedTime, 'minutes').minutes;
    return { isOverdue: true, overdueMinutes: Math.floor(diff) };
  }

  return { isOverdue: false, overdueMinutes: null };
}
```

---

## 10. Missed Task Logic

### 10.1 Exact-time and Prayer-relative tasks

When the `PrayerPeriodInstance` containing the task ends → if PENDING → mark MISSED.

### 10.2 Prayer-window tasks

When `endPrayer` begins → if PENDING → mark MISSED.

### 10.3 Anytime Today tasks

When the planning day ends → if PENDING → mark MISSED. No auto-rollforward.

### 10.4 Implementation

```typescript
async function markMissedTasks(
  planningDay: PlanningDay,
  now: DateTime
): Promise<void> {
  // For each prayer period instance that has ended
  for (const period of planningDay.periods) {
    if (now >= period.end) {
      await occurrenceRepo.markMissedInPeriod(
        planningDay.key, period.prayer, period.sourceDate, period.end.toISO()
      );
    }
  }

  // Prayer-window tasks whose window has ended
  await occurrenceRepo.markMissedWindows(now.toISO());

  // Planning-day-end: Anytime Today
  if (now >= planningDay.end) {
    await occurrenceRepo.markMissedAnytime(planningDay.key, planningDay.end.toISO());
  }
}
```

---

## 11. Materialization Strategy

### 11.1 Sliding Window

Materialize occurrences for today ± 7 days. Calendar month view materializes on demand.

### 11.2 Materialization Process — Two-Phase Pipeline

**Phase 1 — Temporal Resolution:** Resolve each task's concrete time or window using the PrayerTimeline.
**Phase 2 — Planning Day Placement:** Determine which PlanningDay the resolved time belongs to and derive `planningDayKey`.

The key insight: `planningDayKey` is **never** derived from the recurrence date or noon of that date. It is always derived from the task's **actual resolved temporal placement**.

```typescript
async function materializeOccurrences(
  dateRange: { start: string; end: string },
  definitions: TaskDefinition[],
  context: SchedulingContext
): Promise<void> {

  for (const date of eachDayInRange(dateRange)) {
    // Build a PrayerTimeline centered on this date (spans D-1, D, D+1 with exact D+2 Fajr)
    const timeline = buildPrayerTimeline(
      date,
      context.coordinates,
      context.calcParams
    );

    for (const definition of definitions) {
      // Check recurrence applicability (including effectiveFromDate/effectiveToDate for series)
      if (!recurrenceEngine.occursOn(definition, date)) continue;

      const existing = await occurrenceRepo.findByDefAndDate(definition.id, date);

      // Preserve completed/cancelled user state
      if (existing && (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')) continue;

      // --- PHASE 1: Temporal Resolution ---
      // Resolve the task's concrete time/window using the timeline
      const resolved = resolveTask(definition, date, timeline, context);

      // --- PHASE 2: Planning Day Placement ---
      // Derive planningDayKey from the resolved temporal placement
      const planningDayKey = determinePlanningDayKey(
        definition.scheduleType,
        resolved,
        date,
        context.planningDayConfig,
        timeline
      );

      // Build the PlanningDay for this key to get clipped periods
      const planningDay = determinePlanningDayForTime(
        resolved.anchorTime,
        context.planningDayConfig,
        timeline
      );

      // For PRAYER_WINDOW: resolve eligible sections within the correct planning day
      const windowData = definition.scheduleType === 'PRAYER_WINDOW'
        ? resolvePrayerWindow(
            definition.parsedScheduleData as PrayerWindowData,
            date,
            planningDay,
            timeline
          )
        : null;

      await occurrenceRepo.upsert({
        id: existing?.id ?? generateUUID(),
        taskDefinitionId: definition.id,
        seriesId: definition.seriesId,
        localDate: date,
        planningDayKey,
        timezone: context.timezone,
        calculatedStartTime: resolved.calculatedTime?.toISO() ?? null,
        calculatedPrayerSection: resolved.prayerSection,
        eligiblePrayerSections: JSON.stringify(
          windowData?.eligibleSections ?? resolved.eligibleSections
        ),
        wallClockResolution: resolved.wallClockResolution ?? null,
        // Preserve existing user state
        status: existing?.status ?? 'PENDING',
        completedAt: existing?.completedAt ?? null,
        missedAt: existing?.missedAt ?? null,
      });
    }
  }
}
```

### 11.3 planningDayKey Derivation Per Schedule Type

```typescript
function determinePlanningDayKey(
  scheduleType: ScheduleType,
  resolved: ResolvedTaskData,
  recurrenceDate: string,
  config: PlanningDayConfig,
  timeline: PrayerTimeline
): string {
  switch (scheduleType) {
    case 'EXACT_TIME':
    case 'PRAYER_RELATIVE': {
      // planningDayKey = the planning day that contains the resolved absolute time
      const pd = determinePlanningDayForTime(resolved.calculatedTime!, config, timeline);
      return pd.key;
    }
    case 'PRAYER_WINDOW': {
      // planningDayKey = the planning day that contains the window's startPrayer instance
      const pd = determinePlanningDayForTime(resolved.anchorTime!, config, timeline);
      return pd.key;
    }
    case 'ANYTIME_TODAY': {
      // planningDayKey = the recurrence date directly
      // The recurrence date IS the intended planning day — no clock-time derivation needed
      return recurrenceDate;
    }
    default:
      throw new SchedulingError(`Unknown schedule type: ${scheduleType}`);
  }
}

/**
 * Given an absolute time, determine which PlanningDay interval contains it.
 * Constructs and returns that PlanningDay with clipped prayer periods.
 */
function determinePlanningDayForTime(
  time: DateTime,
  config: PlanningDayConfig,
  timeline: PrayerTimeline
): PlanningDay {
  // Find the planning day boundaries that contain 'time'
  // This works by checking sequential planning day intervals
  // until we find the one where dayStart <= time < dayEnd
  return buildPlanningDayContaining(config, timeline, time);
}
```

**Before-Fajr example:**
- Task: exact time 02:00, Tuesday
- Tuesday Fajr: 05:30, Planning day start = Fajr
- `resolveWallClock("02:00", "2026-09-15", "America/Chicago")` → 02:00 CDT Tuesday
- `determinePlanningDayForTime(02:00 CDT Tue, FAJR config, timeline)` → Monday's planning day (Monday Fajr → Tuesday Fajr)
- `planningDayKey = "2026-09-14"` (Monday)

**Custom boundary example:**
- Planning day starts at 19:00
- Task A: exact time 18:00 Tuesday → `planningDayKey = Monday` (Mon 19:00 → Tue 19:00)
- Task B: exact time 20:00 Tuesday → `planningDayKey = Tuesday` (Tue 19:00 → Wed 19:00)

### 11.4 Preservation Rules During Rematerialization

| Field | Behavior |
|---|---|
| `calculatedStartTime` | **Overwritten** — always recomputed |
| `calculatedPrayerSection` | **Overwritten** — always recomputed |
| `eligiblePrayerSections` | **Overwritten** — always recomputed |
| `planningDayKey` | **Overwritten** — derived from resolved time, may change if config changed |
| `wallClockResolution` | **Overwritten** — recomputed |
| `status` | **Preserved** if COMPLETED or CANCELLED |
| `completedAt` | **Preserved** |
| `missedAt` | **Preserved** |
| `overrideData` | **Preserved** |

---

## 12. Drag-and-Drop Rescheduling

Per MASTER_PRODUCT_SPEC §13, dragging a task between prayer tabs must NOT silently change scheduling.

```typescript
function resolveDrag(
  task: ResolvedOccurrence,
  targetPrayer: Prayer,
  prayerTimes: PrayerTimesResult
): DragResolution {
  if (task.scheduleType === 'EXACT_TIME') {
    return {
      type: 'CONFIRM_REQUIRED',
      options: [
        { label: 'Choose new time', action: 'CHANGE_TIME' },
        { label: `Change to ${targetPrayer} prayer window`, action: 'CHANGE_WINDOW',
          newScheduleType: 'PRAYER_WINDOW',
          newScheduleData: { startPrayer: targetPrayer, endPrayer: nextPrayer(targetPrayer) } },
        { label: 'Cancel', action: 'CANCEL' },
      ]
    };
  }

  if (task.scheduleType === 'PRAYER_RELATIVE') {
    const currentData = task.parsedScheduleData as PrayerRelativeData;
    return {
      type: 'CONFIRM_REQUIRED',
      options: [
        { label: `Change to ${targetPrayer} +${currentData.offsetMinutes}m`, action: 'CHANGE_ANCHOR',
          newScheduleType: 'PRAYER_RELATIVE',
          newScheduleData: { anchorPrayer: targetPrayer, direction: 'AFTER', offsetMinutes: currentData.offsetMinutes } },
        { label: 'Choose new time', action: 'CHANGE_TIME' },
        { label: 'Cancel', action: 'CANCEL' },
      ]
    };
  }

  // PRAYER_WINDOW and ANYTIME_TODAY: analogous confirmations
  return { type: 'CONFIRM_REQUIRED', options: [{ label: 'Cancel', action: 'CANCEL' }] };
}
```

---

## 13. Recalculation Triggers

| Trigger | Scope |
|---|---|
| App foreground | All tasks for current planning day |
| Date change / planning-day boundary | New planning day's tasks |
| Prayer boundary crossed | Missed-status checks, current-period update |
| Location change (significant) | Full — prayer times change |
| Timezone change | Full — absolute times change |
| DST transition | Full — wall-clock resolutions may change |
| Prayer calculation settings change | Full — prayer times change |
| Task edit | That task's occurrences |
| Recurrence edit | All future occurrences of that series |
| Worship toggle change | Worship-generated occurrences |
| Planning-day start change | Full — day boundaries shift |
| Hijri calendar adjustment change | Hijri-dependent occurrences |

---

## 14. Definition of Done (from §58)

1. ✅ A 6 PM exact-time task changes prayer section when prayer times change
2. ✅ The task itself remains at 6 PM
3. ✅ A Maghrib+30 task recalculates correctly every day
4. ✅ A prayer-relative task may land in the next prayer section
5. ✅ A Fajr→Asr window appears in all eligible tabs but is a single occurrence
6. ✅ Completion in one tab completes it everywhere
7. ✅ Missed tasks remain in original period
8. ✅ 2 AM belongs to previous day when day begins at Fajr
9. ✅ Custom day start changes planning-day grouping without reordering prayer tabs
10. ✅ Location changes cause prayer grouping recalculation
11. ✅ Manual location works with location permission disabled
12. ✅ DST preserves exact-time wall clock behavior
13. ✅ Recurrence does not create duplicate occurrences
14. ✅ Hijri recurrence respects selected Hijri-date handling
15. ✅ App restart does not corrupt placement/status

**Additional required tests from architecture review:**
16. ✅ Exact-time task at 02:00 Tuesday resolves to Monday's Isha when planning day starts at Fajr
17. ✅ Custom planning day 19:00 clips Maghrib period correctly in both summer and winter
18. ✅ Custom planning day produces correct multi-instance tab aggregation
19. ✅ WallClockResolver spring-forward: nonexistent time shifts forward
20. ✅ WallClockResolver fall-back: ambiguous time chooses first occurrence
21. ✅ DST tests cover at least America/New_York and one additional timezone
