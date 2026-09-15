# Scheduling Engine

**Status:** Source of truth for scheduling logic  
**Updated:** 2026-09-14 (Rev 2 — architecture review)  
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

```typescript
function resolvePrayerWindow(
  scheduleData: PrayerWindowData,     // { startPrayer, endPrayer }
  planningDay: PlanningDay
): { windowStart: DateTime; windowEnd: DateTime; eligibleSections: Prayer[] } {

  // 1. Find all planning-day periods that fall within the window
  const eligiblePeriods = planningDay.periods.filter(p => {
    const prayerOrder = PRAYER_ORDER.indexOf(p.prayer);
    const startOrder = PRAYER_ORDER.indexOf(scheduleData.startPrayer);
    const endOrder = PRAYER_ORDER.indexOf(scheduleData.endPrayer);
    return prayerOrder >= startOrder && prayerOrder < endOrder;
  });

  // 2. Get unique prayer labels
  const eligibleSections = [...new Set(eligiblePeriods.map(p => p.prayer))];

  // 3. Window boundaries from prayer times
  const windowStart = eligiblePeriods[0]?.start ?? null;
  const windowEnd = eligiblePeriods[eligiblePeriods.length - 1]?.end ?? null;

  return { windowStart, windowEnd, eligibleSections };
}
```

**Key behaviors:**
- One occurrence row in the database per date (§10.3)
- Appears in ALL eligible prayer tabs simultaneously
- Completing from any tab completes the single occurrence

### 4.4 ANYTIME_TODAY

No time calculation. No prayer section. Appears in collapsible "Anytime Today" in every tab.

---

## 5. PrayerTimeline Construction

```typescript
function buildPrayerTimeline(
  dates: [string, string, string],   // [prevDate, centerDate, nextDate]
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimeline {

  const [prevDate, centerDate, nextDate] = dates;
  const prevTimes = prayerEngine.calculate(prevDate, coordinates, params);
  const currTimes = prayerEngine.calculate(centerDate, coordinates, params);
  const nextTimes = prayerEngine.calculate(nextDate, coordinates, params);

  const periods: PrayerPeriodInstance[] = [];

  // Previous day's prayers (we need at least Isha for before-Fajr resolution)
  appendDayPeriods(periods, prevTimes, prevDate, currTimes.fajr);

  // Center day's prayers
  appendDayPeriods(periods, currTimes, centerDate, nextTimes.fajr);

  // Next day's prayers (needed for planning days that extend past center midnight)
  // For next day's Isha end, we would need day+2's Fajr.
  // For scheduling purposes, approximate next-day Isha end or compute it.
  appendDayPeriodsPartial(periods, nextTimes, nextDate);

  return { periods, findPeriod: (time) => findPeriodInTimeline(periods, time) };
}

function appendDayPeriods(
  periods: PrayerPeriodInstance[],
  times: PrayerTimesResult,
  sourceDate: string,
  nextDayFajr: DateTime
): void {
  const fajrEnd = times.dhuhr;
  const dhuhrEnd = times.asr;
  const asrEnd = times.maghrib;
  const maghribEnd = times.isha;
  const ishaEnd = nextDayFajr;

  periods.push(
    makePeriod('FAJR',    times.fajr,    fajrEnd,    sourceDate),
    makePeriod('DHUHR',   times.dhuhr,   dhuhrEnd,   sourceDate),
    makePeriod('ASR',     times.asr,     asrEnd,     sourceDate),
    makePeriod('MAGHRIB', times.maghrib, maghribEnd, sourceDate),
    makePeriod('ISHA',    times.isha,    ishaEnd,    sourceDate),
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

### 11.2 Materialization Process

```typescript
async function materializeOccurrences(
  dateRange: { start: string; end: string },
  definitions: TaskDefinition[],
  context: SchedulingContext
): Promise<void> {

  for (const date of eachDayInRange(dateRange)) {
    // Build a PrayerTimeline spanning [date-1, date, date+1]
    const timeline = buildPrayerTimeline(
      [subtractDay(date), date, addDay(date)],
      context.coordinates,
      context.calcParams
    );

    const planningDay = buildPlanningDay(context.planningDayConfig, timeline, dateTimeForNoon(date));

    for (const definition of definitions) {
      if (!recurrenceEngine.occursOn(definition, date)) continue;

      const existing = await occurrenceRepo.findByDefAndDate(definition.id, date);

      // Preserve completed/cancelled user state
      if (existing && (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')) continue;

      // Resolve placement using the timeline
      const resolved = resolveTask(definition, date, timeline, planningDay, context);

      await occurrenceRepo.upsert({
        id: existing?.id ?? generateUUID(),
        taskDefinitionId: definition.id,
        localDate: date,
        planningDayKey: planningDay.key,
        timezone: context.timezone,
        calculatedStartTime: resolved.calculatedTime?.toISO() ?? null,
        calculatedPrayerSection: resolved.prayerSection,
        eligiblePrayerSections: JSON.stringify(resolved.eligibleSections),
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

### 11.3 Preservation Rules During Rematerialization

| Field | Behavior |
|---|---|
| `calculatedStartTime` | **Overwritten** — always recomputed |
| `calculatedPrayerSection` | **Overwritten** — always recomputed |
| `eligiblePrayerSections` | **Overwritten** — always recomputed |
| `planningDayKey` | **Overwritten** — may change if config changed |
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
