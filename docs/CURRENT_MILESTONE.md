# Current Milestone: M9 — Recurrence Engine

> **Current State:** IMPLEMENTED / AWAITING INDEPENDENT OPUS REVIEW  
> **Prior Milestones:** M1–M8 CLOSED / OPUS APPROVED (M8 commit: `1a0b18a`)  
> **Current Test Baseline:** 645 tests passing (29 test suites: 100 M9 tests, 545 baseline tests)  
> **Implementation Status:** COMPLETE / OPUS REVIEW NEXT  

---

## 1. Milestone Goal

Build the pure recurrence domain foundation that determines **WHICH civil dates** belong to a recurring task series.

M9 determines recurrence membership and civil seed dates. M9 does **NOT** own final scheduling placement.

For each recurrence-generated civil seed date, the canonical system pipeline remains strictly:

```text
M9 recurrence seed (civil date: YYYY-MM-DD)
    ↓
M6 materialization (MaterializationEngine)
    ↓
M5 scheduling resolution (SchedulingEngine)
    ↓
TaskOccurrence (persisted row)
```

M9 must preserve this separation of concerns without leaking scheduling or persistence logic into recurrence calculations.

---

## 2. Locked Inputs from Closed Milestones

M9 builds on trusted, immutable foundations established in previously approved milestones:

### M4 — Task Domain Model & Series Architecture
- **TaskDefinition & Series Versioning**: Recurring tasks belong to a series identified by `seriesId`.
- **Start Boundary**: Each definition defines a canonical `startDate` (`YYYY-MM-DD`).
- **Recurrence Fields**: Existing schema columns and domain properties:
  - `recurrenceRule`: Text/JSON representation of Gregorian recurrence.
  - `recurrenceEnd`: Optional terminal civil date boundary (`YYYY-MM-DD`).
  - `hijriRecurrence`: JSON structure for Islamic calendar recurrence.
- **Version Validity**: `effectiveFromDate` and `effectiveToDate` govern version applicability during series splits.
- **Occurrence Identity**: The sole logical occurrence identity is `(seriesId, localDate)`.

### M5 — Scheduling Engine & WallClockResolver
- **Separation of Scheduling**: Recurrence evaluates date-level membership; M5 evaluates within-day placement (`EXACT_TIME`, `PRAYER_RELATIVE`, `PRAYER_WINDOW`, `ANYTIME_TODAY`).
- **No Prayer Math in M9**: M9 never calculates prayer times, solar angles, or timeline placements.

### M6 — Local Persistence & Materialization Pipeline
- **Materialization Input**: `MaterializationEngine.materializeOne` receives an explicit request `{ seriesId, seedDate }`.
- **Recurrence Seam**: M6 explicitly does NOT determine recurrence membership. M9 is the authoritative owner deciding which seed dates are provided to M6.

### M8 — Hijri Calendar Core & HijriService
- **Civil Gregorian Dates**: Gregorian civil dates are canonical `YYYY-MM-DD` strings.
- **Canonical Hijri Representation**: `HijriDate` is `{ readonly year: number; readonly month: number; readonly day: number; }` with strictly 1-based month indexing (`1 = Muharram .. 12 = Dhu al-Hijjah`).
- **Bidirectional Conversion**: `HijriService` converts Gregorian civil dates to `HijriDate` (with global and per-month adjustments applied).
- **Effective Reverse Resolution**: `HijriService.resolveGregorianFromEffectiveHijri` resolves an effective `HijriDate` to:
  - `UNIQUE`: Exactly one matching Gregorian civil date.
  - `AMBIGUOUS`: Multiple matching Gregorian civil dates (due to negative adjustments/shifts).
  - `NO_MATCH`: No Gregorian date maps to this effective Hijri date (due to positive jumps/skips).
- **M8 Policy Boundary**: M8 intentionally does not dictate recurrence behavior for `AMBIGUOUS` or `NO_MATCH`. M9 architecture must explicitly define this recurrence policy.

---

## 3. Product Recurrence Requirements

The product specification mandates support for the following user-facing recurrence patterns:

- **Doesn't repeat** (non-recurring single tasks)
- **Daily** (every $N$ days)
- **Weekdays** (Monday through Friday, or configurable working week)
- **Weekly** (every $N$ weeks on specified weekdays)
- **Monthly** (every $N$ months on a specific day of the month)
- **Specific days** (explicit days of week/month)
- **Custom** (interval + frequency combinations)

Additionally, the product requires recurrence to support **both Gregorian and Hijri calendar semantics**:
- Tasks that recur according to the Gregorian calendar (e.g., "1st of every month", "every Friday").
- Tasks that recur according to the Islamic Hijri calendar (e.g., "1st of Ramadan", "13th, 14th, 15th of every Hijri month [White Days]", "every Friday in the Islamic calendar").

> [!IMPORTANT]
> Do not invent UI beyond these known requirements. The M9 architecture must inspect existing schema, types, and documentation to establish what is already modeled versus what requires extension.

---

## 4. Core M9 Responsibilities

The M9 architecture must specify and resolve:

1. **Recurrence Rule Domain Model**: Canonical, strongly typed representation of recurrence rules covering all product frequencies, intervals, days, and calendar systems.
2. **Gregorian Recurrence Evaluation**: Pure evaluation algorithms for Gregorian recurrence patterns.
3. **Hijri Recurrence Evaluation**: Pure evaluation algorithms for Hijri recurrence patterns using `HijriService`.
4. **Recurrence Membership Query**: Determining if a series $S$ occurs on a specific civil seed date $D$:
   $$\text{occursOn}(S, D) \to \text{boolean}$$
5. **Bounded Date Generation**: Generating all civil seed dates belonging to series $S$ within a bounded interval:
   $$\text{generateSeedDates}(S, [\text{startDate}, \text{endDate}]) \to \text{ReadonlyArray}<\text{YYYY-MM-DD}>$$
6. **Start and End Boundaries**: Strictly respecting series `startDate` and optional `recurrenceEnd` boundaries.
7. **Series Version Interaction**: Correct interaction with `effectiveFromDate` and `effectiveToDate` across series splits, ensuring seed dates are generated only under the governing version.
8. **Non-Recurring Behavior**: Consistent handling of non-recurring task definitions.
9. **Monthly Gregorian Edge Semantics**: Explicit policy for month-end dates (e.g., 29th, 30th, 31st in shorter months).
10. **Weekday Semantics**: ISO weekday handling (Monday = 1 .. Sunday = 7) and weekday recurrence sets.
11. **Specific-Day & Custom Semantics**: Interval steps ($N > 1$) and day-set combinations.
12. **Hijri Month-Length Behavior**: Handling variable 29-day and 30-day Hijri months (e.g., day 30 recurrence in a 29-day month).
13. **Adjustment-Aware Hijri Recurrence**: Evaluating recurrence membership under active global adjustments and per-month overrides.
14. **M8 Resolution Policy**: Explicit, documented recurrence policy when `HijriService` returns `UNIQUE`, `AMBIGUOUS`, or `NO_MATCH`.
15. **Timezone & DST Independence**: Pure calendar date operations unaffected by local wall-clock shifts, UTC offsets, or daylight saving transitions.
16. **Determinism & Idempotence**: Identical inputs must always produce identical, sorted, deduplicated date sequences.
17. **Error Model**: Strongly typed domain errors for invalid rules, invalid dates, inverted ranges, and unsupported patterns.
18. **Comprehensive Test Strategy**: Verification across edge cases in both calendar systems.

---

## 5. Important Architectural Questions for Opus Review

The following questions must be deliberately evaluated and resolved during the M9 architecture design phase. **They must NOT be answered in this contract.**

### A. Recurrence Representation
- Inspect the existing `TaskDefinition` columns: `recurrenceRule: string | null` and `hijriRecurrence: string | null` (JSON stringified).
- Determine whether the existing representation is sufficient or needs refined domain types.
- Do not blindly introduce `rrule.js` merely because it is common. If an external library or RRULE string standard is proposed, it must be rigorously justified against product requirements, offline determinism, and domain simplicity (especially regarding Hijri calendar incompatibility with standard iCalendar RFC 5545).

### B. Monthly Gregorian Edge Policy
- If a task repeats monthly on day 31, how does it behave in February (28 or 29 days) and 30-day months (April, June, September, November)?
- Candidate policies:
  1. *Skip*: The task does not occur in months shorter than the target day.
  2. *Clamp*: The task occurs on the last day of the shorter month (e.g., Feb 28/29).
  3. *Other explicit policy*: (e.g., overflow to the 1st of the next month).
- The architecture must choose and document a single, predictable policy aligned with user expectations.

### C. Hijri Monthly Edge Policy
- If a task repeats monthly on Hijri day 30 (e.g., day 30 of every Hijri month), some Hijri months only have 29 days.
- Candidate policies:
  1. *Skip*: Do not occur in 29-day months.
  2. *Clamp*: Occur on day 29 when the month has 29 days.
  3. *Other explicit policy*.
- The architecture must define this unambiguously.

### D. Hijri Effective-Date Ambiguity Policy
- `HijriService.resolveGregorianFromEffectiveHijri` can return:
  - `UNIQUE`: Exactly one Gregorian date matches.
  - `AMBIGUOUS`: Multiple Gregorian dates map to the same effective Hijri date.
  - `NO_MATCH`: No Gregorian date maps to this effective Hijri date.
- What is M9's exact recurrence policy for each case?
  - For `AMBIGUOUS`: Does M9 yield all candidate dates, only the earliest, or only the latest?
  - For `NO_MATCH`: Does M9 skip the occurrence, fall back to base conversion, or clamp to an adjacent civil date?
- M9 must own this policy explicitly without relying on silent fallback behavior.

### E. Recurrence Calendar Basis
- When a user creates a Hijri recurrence, what is the intended calendar basis?
  - Base Umm al-Qura astronomical calendar?
  - Effective user-adjusted calendar (incorporating global and per-month overrides)?
- How do dynamic user adjustment changes affect already scheduled vs. future recurrence membership?

### F. Series Versioning & Splitting Interaction
- M4 supports three edit scopes: "This occurrence only", "This and future occurrences" (series split), and "Entire series".
- When a series is split at `splitDate`, the predecessor version receives `effectiveToDate = splitDate - 1` and the successor receives `effectiveFromDate = splitDate`.
- How does M9 bounded generation enforce that seed dates are generated strictly within each version's effective window without missing or duplicating dates at the boundary?

### G. Materialization Boundary & Persistence Decoupling
- M9 produces recurrence seed dates / membership decisions.
- M9 must not create database transactions, insert `TaskOccurrence` records, or duplicate M6's responsibilities.
- What is the clean interface between M9 date generation and M6 materialization orchestration?

---

## 6. Out of Scope for M9

The following concerns are strictly **OUT OF SCOPE** for M9:

- **Scheduling Placement**: M9 does not resolve `EXACT_TIME`, `PRAYER_RELATIVE`, `PRAYER_WINDOW`, or `ANYTIME_TODAY` placements (owned by M5).
- **Prayer Engine**: M9 does not calculate prayer times or interact with `PrayerEngine` / `PrayerTimeline` (owned by M2).
- **Planning Day Rollover**: M9 does not compute planning day keys, day boundaries, or clipping (owned by M3).
- **Database Persistence**: M9 does not write to SQLite or update occurrence tables (owned by M4 / M6).
- **Occurrence Status Updates**: M9 does not decide or mutate `PENDING`, `COMPLETED`, `MISSED`, or `CANCELLED` statuses (owned by M4 / M6 / M11).
- **UI Components & Screens**: No screens, forms, or components for Add Task, Today, or Calendar (owned by M7, M10, M14).
- **Notifications**: No local alert or notification scheduling (owned by M13).
- **Worship Guidance**: No calculation of specific Islamic fasting rules or prayer recommendations (owned by M15).
- **Settings UI**: No UI for configuring recurrence presets or calendar preferences (owned by M17).

---

## 7. Performance & Computational Boundaries

Recurrence evaluation must be bounded and computationally safe:

- **No Unbounded Iteration**: Never iterate day-by-day from an ancient series creation date to infinity.
- **Bounded Range Generation**: Generation must accept explicit `[rangeStart, rangeEnd]` boundaries.
- **Efficient Membership Checks**: Point-in-time membership queries (`occursOn(series, date)`) must evaluate in $O(1)$ or $O(\text{rule complexity})$ time without enumerating all preceding occurrences.
- **Offline Determinism**: Recurrence evaluation must be pure, CPU-only, and free of external I/O or network dependencies.

---

## 8. Time Model & Calendar Independence

- **Civil Date Primacy**: Recurrence operates strictly on **civil calendar dates** (`YYYY-MM-DD`).
- **Timezone & DST Independence**: Whether a civil date belongs to a recurrence series must not depend on local device time, UTC offsets, or daylight saving transitions. A task set for "every Monday" falls on Monday regardless of the user's timezone.
- **Local Time Separation**: Concrete wall-clock times and prayer anchors are bound during M5 scheduling, not during M9 recurrence generation.

---

## 9. Test Strategy & Edge Case Matrix

The M9 architecture must define a comprehensive test suite covering at least:

1. **Non-recurring tasks**: Exactly one seed date on `startDate`.
2. **Daily recurrence**: Step intervals ($N=1, 2, 3$).
3. **Weekday recurrence**: Monday–Friday membership; weekend exclusion.
4. **Weekly recurrence**: Single weekday, multiple weekdays, intervals ($N > 1$).
5. **Monthly recurrence (Gregorian)**:
   - Mid-month dates (e.g., 15th).
   - Month-end dates (29th, 30th, 31st).
   - Leap year handling (Feb 29 on leap years, policy on non-leap years).
6. **Hijri recurrence**:
   - Fixed Hijri days (e.g., 1st, 15th, 30th).
   - 29-day vs. 30-day Hijri months.
   - Hijri year rollover (12/29 or 12/30 $\to$ 1/1).
   - Specific Hijri months (e.g., annual recurrence on 1 Ramadan or 10 Dhu al-Hijjah).
   - Active global adjustments ($\pm 1, \pm 2$).
   - Active per-month overrides.
   - Handling of `UNIQUE`, `AMBIGUOUS`, and `NO_MATCH` reverse resolution outcomes.
7. **Boundaries**:
   - Start boundary enforcement (`date < startDate` never matches).
   - End boundary enforcement (`date > recurrenceEnd` never matches).
   - Series version boundaries (`effectiveFromDate` and `effectiveToDate`).
8. **Range Generation**:
   - Range completely before series start.
   - Range overlapping start.
   - Range completely within recurrence window.
   - Range overlapping end.
   - Range completely after series end.
   - Single-day range.
   - Empty range (`rangeStart > rangeEnd` rejection).
9. **Invariants**:
   - Zero duplicate seed dates in generated sequences.
   - Strictly ascending chronological order.
   - Timezone-independent evaluation.
   - Rejection of invalid recurrence rules with typed errors.
10. **Baseline Preservation**:
    - All 545 existing M1–M8 tests must remain 100% green.

---

## 10. Milestone Boundaries Summary

| Subsystem | Milestone Owner | Core Responsibility |
|---|---|---|
| **Recurrence Engine** | **M9 (CURRENT)** | Recurrence rules, calendar math, civil seed dates, series membership |
| **Persistence & Materialization** | **M6 (CLOSED)** | Occurrence rows, version assignment, atomic guarded updates, idempotency |
| **Scheduling Engine** | **M5 (CLOSED)** | Intra-day placement (Exact, Relative, Window, Anytime), DST wall-clock |
| **Hijri Calendar Core** | **M8 (CLOSED)** | Umm al-Qura conversion, canonical HijriDate, month lengths, adjustments |
| **Task Domain & Series** | **M4 (CLOSED)** | Definition schema, series splitting, subtasks, validation |

---

## 11. Milestone Status

- **Milestone:** M9 — Recurrence Engine
- **Phase:** ARCHITECTURE NEXT
- **Implementation Status:** NOT STARTED
