# Current Milestone: M8 — Hijri Calendar Core

> **Current State:** IMPLEMENTED — AWAITING INDEPENDENT OPUS REVIEW  
> **Prior Milestone:** M7 — Today Screen & Timeline View is **CLOSED / OPUS APPROVED** (`dc46afc`)  
> **Repository Verification:** 545 tests passing across 28 test suites (97 new M8 tests)  
> **Implementation Code Status:** COMPLETED (97 tests passing, 0 typecheck errors, 0 lint warnings)

---

## 1. Architectural Goal

The objective of **M8** is to build a pure, deterministic, framework-agnostic **Hijri Calendar Core** foundation in `src/domain/calendar/`.

This module serves as the authoritative Islamic date calculation engine for future recurrence generation (M9), month calendar presentation (M14), worship suggestions (M15/M16), and settings adjustments (M17). It must be completely decoupled from UI components, React hooks, database operations, and external network requests.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope for M8
- **Canonical `HijriDate` Type**: Explicit data representation `{ year: number, month: number, day: number }`.
- **Bidirectional Civil Conversion**: Pure conversion between civil Gregorian date (`YYYY-MM-DD` string or `{ year, month, day }`) and `HijriDate`.
- **Month Length Resolution**: Determining whether a specific Hijri month in a given year has 29 or 30 days (`daysInMonth`).
- **Date Validation**: Strict validation for both Gregorian inputs and Hijri date structures (year bounds, month bounds, day bounds).
- **Supported Range Boundary Guards**: Defensive validation ensuring conversions operate strictly within the verified astronomical range.
- **Hijri Adjustment Semantics**:
  - *Global Offset*: Applying a day shift ($\pm 1$ or $\pm 2$ days).
  - *Per-Month Overrides*: Applying specific month-level day offsets (as modeled in SQLite table `hijri_month_overrides` per authoritative ADR-005 / ADR-018, where a month override replaces the global adjustment).
  - *Adjustment Invertibility*: Clearly defined inverse conversion behavior when adjustments are active.
- **Typed Domain Errors**: Explicit error hierarchy (e.g. `HijriDateRangeError`, `HijriInvalidDateError`).
- **Third-Party Converter Adapter**: Domain adapter abstraction isolating the underlying converter library from domain logic.
- **Strict Timezone Independence**: Conversions operate solely on civil calendar date math without local timezone leakage or UTC midnight skew.
- **Independent Fixture Verification**: Unit tests validated against authoritative known historical and astronomical fixtures (e.g. Umm al-Qura official dates, Ramadan start dates, Eid dates).

### Out-of-Scope for M8 (Strictly Deferred)
- **Recurrence Generation**: Generating recurring occurrences on Hijri schedules (owned by **M9: RecurrenceEngine**).
- **TaskOccurrence Creation & Persistence**: Generating or modifying database rows (owned by **M6/M9/M10**).
- **Calendar UI**: Grid views, monthly swipe views, dual Gregorian/Hijri UI cells (owned by **M14: Calendar UI**).
- **Worship Rule Decisions**: Calculating White Days, Ashura, Arafah, or Shawwal fast recommendations (owned by **M15: Worship Suggestions**).
- **External Moon-Sighting APIs**: Network calls, moon-sighting news feeds, or dynamic astronomical scraping.
- **Location & GPS**: Geographic location or Qibla services (owned by **M12**).
- **Notification Scheduling**: Alerts for Islamic dates or new months (owned by **M13**).
- **Settings UI**: Preference sliders and override modals (owned by **M17**).
- **React Components / Hooks**: Zero UI or store code in M8.

---

## 3. Key Design Question: Civil vs. Religious Day

### The Problem
In Islamic jurisprudence, a religious day begins at **Maghrib (sunset)** of the preceding Gregorian evening. For example, the night of Friday begins Thursday at Maghrib. However, worldwide civil planning and device clocks operate on a midnight-to-midnight cycle (`00:00:00` to `23:59:59`).

### The Architectural Decision
1. **Base Hijri Converter is Civil-Date Based**:
   - `HijriService` converts a **civil Gregorian calendar date** (`YYYY-MM-DD`) to a corresponding **civil Hijri calendar date** (`YYYY-MM-DD Hijri`).
   - The base converter must **never** take geographic coordinates, solar calculations, or Maghrib times as mandatory parameters. Making base conversion location-dependent would introduce unnecessary coupling, destroy test determinism, and corrupt civil date conversions in the calendar grid.
2. **Composition for Religious Days**:
   - When the application needs to determine the *active religious night/day* for Today or Worship features, it will compose two independent domain modules:
     $$\text{ReligiousDate} = \text{PrayerTimeline (M2)} + \text{HijriService (M8)}$$
   - If current time $\ge \text{Maghrib}$, the religious day is evaluated as the next day's Hijri date.
   - This keeps the Hijri converter pure, fast, and globally consistent while allowing higher-level orchestrators (`TodayOrchestrator`) to apply religious day logic where appropriate.

---

## 4. Planned Dependency & Architectural Verification Requirements

### Target Dependency: `@tabby_ai/hijri-converter`
Per authoritative ADR-005 (`docs/DECISIONS.md`), `@tabby_ai/hijri-converter` is the planned conversion library. However, M8 architecture has **not** yet been finalized or approved.

During M8 architecture planning, the implementation must **not assume** library behavior and **MUST explicitly verify**:
1. **Installed Package & Version**: Confirm installed version in `package.json` / `node_modules`.
2. **Actual Exported API**: Inspect exact function names, argument shapes, and return types.
3. **Gregorian $\rightarrow$ Hijri Support**: Verify input/output formats and precision.
4. **Hijri $\rightarrow$ Gregorian Support**: Verify inverse conversion support and bidirectional fidelity.
5. **Calendar Basis**: Determine whether the underlying algorithm is Umm al-Qura administrative, arithmetical civil, or observational tabular.
6. **Supported Date Range**: Determine and test minimum and maximum supported Gregorian and Hijri dates.
7. **Month Indexing**: Determine whether months are 0-based (`0..11`) or 1-based (`1..12`) at the library boundary.
8. **Failure & Out-of-Range Behavior**: Determine how the library behaves when passed invalid dates (throws error, returns `NaN`, returns `undefined`, or silently overflows).

### Adapter Boundary Requirement
To protect domain logic against third-party API quirks, version bumps, or future library replacements:
- All third-party converter calls must be encapsulated behind a clean domain adapter interface.
- Domain engines (`HijriService`) must interact only with this interface and domain types (`HijriDate`).

---

## 5. Adjustment Semantics & ADR-018 / ADR-005 Alignment

### Authoritative Reference
Per **ADR-005**, **ADR-018** (`docs/DECISIONS.md`), and **DATA_MODEL.md §2.4**, the application uses a multi-layer adjustment model:

1. **Global Adjustment**:
   - Stored in `user_settings.hijri_adjustment_days` (default `0`, range $-2$ to $+2$).
   - Applied as the default offset across all months.
2. **Per-Month Overrides**:
   - Stored in `hijri_month_overrides` table keyed by `(hijri_year, hijri_month)`.
   - **Crucial Rule**: An override **replaces** the global adjustment for that specific Hijri month (it does not stack or add to it).
   - Historical overrides are preserved permanently to protect historical records.
3. **Resolution Order**:
   - Convert Gregorian date to base Hijri date.
   - Check `hijri_month_overrides` for the resulting `(hijriYear, hijriMonth)`.
   - If an override exists, apply the override's `adjustmentDays`.
   - If no override exists, apply `hijri_adjustment_days`.
   - Return effective `HijriDate`.
4. **Invertibility**:
   - Inverse conversion (`effectiveHijri -> Gregorian`) must define deterministic behavior when adjustments or overrides shift month boundaries.

---

## 6. M8 Quality & Review Checklist

Before M8 can be submitted for Opus review, the implementation must satisfy all points below:

- [x] **Package Verification Completed**: Installed package, actual API, calendar basis, range, indexing, and failure behavior verified via inspection and tests.
- [x] **Defensive Range Enforcement**: Out-of-range or invalid dates reject gracefully with typed domain errors.
- [x] **1-Based Indexing in Domain**: Domain `HijriDate` months are strictly 1-based (`1..12`).
- [x] **Timezone Free**: No conversions rely on system timezone or local `new Date()` methods; all date arithmetic is pure calendar math.
- [x] **Multi-Layer Adjustment Implemented**: Global adjustment and ADR-018 per-month overrides correctly handled.
- [x] **Independent Correctness Fixtures**: Unit tests verify conversion against known independent historical and astronomical Islamic dates.
- [x] **Bidirectional Round-Trip Tested**: Validated round-trip consistency across supported ranges.
- [x] **Domain Isolation Preserved**: Pure domain code in `src/domain/calendar/`; zero recurrence logic, zero database writes, zero UI components.
