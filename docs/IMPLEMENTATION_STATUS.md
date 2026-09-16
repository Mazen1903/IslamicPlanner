# Implementation Status

**Current Milestone:** M7 — Today Screen & Timeline View (IMPLEMENTED — AWAITING INDEPENDENT OPUS REVIEW)  
**Last Updated:** 2026-09-15 (M7 Implemented)  
**Project:** Islamic Prayer-Centered Planner  

---

## Milestone Progress

| Milestone | Description | Status | Completed Date | Notes |
|---|---|---|---|---|
| **M0** | Repository and project foundation | **Completed** | 2026-09-14 | Expo SDK 57, TypeScript strict, Jest, ESLint, Prettier, Drizzle, directory structure & placeholders |
| **M1** | Design system and theme tokens | **Completed** | 2026-09-14 | Theme tokens, light/dark themes, ThemeProvider, Button, Card, Toggle, Icon, SafeArea, demo screen, 17 unit tests |
| **M2** | Prayer-time engine + PrayerTimeline | **Completed** | 2026-09-14 | All 71 domain tests pass, 100% exact boundaries, ±1 min published verification, Opus review required |
| **M3** | Planning-day engine + clipping | **Completed** | 2026-09-14 | All 32 domain tests pass, Fajr/Midnight/Custom boundaries, explicit DST resolution, non-mutating clipping, Opus review required |
| **M4** | Task domain model + schema (includes series) | **Completed & Hardened** | 2026-09-14 | All 128 M4 tests pass (248 total project tests), clean 0000_initial migration, dynamic Drizzle discovery, canonical transactions, serialized concurrency, true civil-date validation, terminal status timestamp invariants, absolute ISO instants, IANA timezone validation |
| **M5** | Scheduling engine + WallClockResolver | **CLOSED / OPUS APPROVED** | 2026-09-14 | All 60 M5 tests pass (308 total project tests), extracted WallClockResolver to domain/temporal, DST gap/overlap resolution, 4 scheduling modes, pure domain logic, M6 contract note, F-4 test hardening verified |
| **M6** | Local persistence + materialization | **CLOSED / OPUS APPROVED** | 2026-09-15 | All 66 M6 tests pass (372 total project tests). Forward migration 0001_lazy_the_order.sql (window_start/window_end), MaterializationEngine pipeline, M6/M9 boundary preserved, atomic guarded update, terminal short-circuit before temporal context. |
| **M7** | Today screen | **IMPLEMENTED — AWAITING INDEPENDENT OPUS REVIEW** | 2026-09-15 | All 76 M7 tests pass (448 total project tests). Prayer-centered adaptive planner, 5 fixed prayer tabs, single 1-second timer owner, request generation safety, TodayRuntimeContext, pure projection, light theme design system. |
| **M8** | Hijri Calendar Core / HijriService | Not Started | — | Prerequisites: M4. MOVED from M13. Opus review required |
| **M9** | Recurrence engine | Not Started | — | Prerequisites: M4, **M8**. Opus review required |
| **M10** | Add Task flows | Not Started | — | Prerequisites: M7, M9 |
| **M11** | Missed/completed/overdue behavior | Not Started | — | Prerequisites: M5, M7 |
| **M12** | Location and travel | Not Started | — | Prerequisites: M2, M6. Opus review required |
| **M13** | Notifications | Not Started | — | Prerequisites: M2, M5, M12. Opus review required |
| **M14** | Calendar month | Not Started | — | Prerequisites: M6, M7, **M8** |
| **M15** | Worship Suggestions engine | Not Started | — | Prerequisites: M9, M8. Opus review required |
| **M16** | Worship UI | Not Started | — | Prerequisites: M7, M15 |
| **M17** | Settings | Not Started | — | Prerequisites: M1, M3, M12, M13, M8 |
| **M18** | Widgets (dev build required) | Not Started | — | Native dependencies installed at M18 only |
| **M19** | Premium entitlement scaffolding | Not Started | — | Opus review required |
| **M20** | Onboarding | Not Started | — | Prerequisites: M1, M12, M2 |
| **M21** | Dark mode polish | Not Started | — | Prerequisites: M1, M7, M14, M16, M17 |
| **M22** | Accessibility/RTL | Not Started | — | Prerequisites: All UI milestones |
| **M23** | QA + edge cases | Not Started | — | Opus review required |
| **M24** | Release preparation | Not Started | — | Final builds and release checklist |

---

## M0 Completion Record

- **Date:** 2026-09-14
- **Scope:** Repository and Project Foundation only
- **Tooling:**
  - Expo SDK 57 (Current Stable)
  - React 19.2.3, React Native 0.86.3, React DOM 19.2.3 (deduplicated, 0 peer conflicts)
  - TypeScript 6.0.3 (Strict mode, `@/*` path aliases to `src/*`)
  - Jest 29.7.0 + `jest-expo` (57.0.5) + `@react-native/jest-preset` (0.86.3) + `ts-node` (0 tests, 0 failures)
  - ESLint 9.39.5 + `eslint-config-expo/flat` (0 errors, 0 warnings)
  - Prettier 3.9.6 (Formatted)
  - Drizzle Kit + Drizzle ORM configured for `expo-sqlite`
  - `.npmrc` (`legacy-peer-deps=true`): Removed; clean peer resolution achieved natively
- **Core Dependencies:**
  - `adhan` (^4.4.6)
  - `luxon` (^3.7.2) + `@types/luxon` (^3.7.5)
  - `rrule` (^2.8.1)
  - `@tabby_ai/hijri-converter` (^1.0.5)
  - `drizzle-orm` (^0.45.2) + `expo-sqlite` (~57.0.3)
  - `zustand` (^5.0.15)
  - `expo-router` (~57.0.21) + peer deps (`expo-constants` ~57.0.18, `expo-linking` ~57.0.10, `react-native-safe-area-context` ~5.7.0)
  - `expo-location` (~57.0.17)
  - `expo-notifications` (~57.0.18)
  - `expo-font` (~57.0.4)
  - `expo-secure-store` (~57.0.4)
  - `uuid` (^14.0.2) + `@types/uuid` (^10.0.0)
  - `react-dom` (19.2.3)
- **Deferred Dependencies:**
  - `expo-widgets` (iOS) and `react-native-android-widget` (Android) deferred to M18 per ADR-009 / review.
- **Directory Structure:**
  - Complete structure matching `TECHNICAL_ARCHITECTURE.md` §2 with domain, data, stores, hooks, components, theme, constants, and utils placeholder files.
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - TypeScript check (`npm run typecheck`): Passed (0 errors)
  - Linting (`npm run lint`): Passed (0 errors, 0 warnings)
  - Testing (`npm test`): Passed (0 tests, 0 failures)
  - Expo dev server: Verified starting Metro bundler and responding to status queries.

---

## M1 Completion Record

- **Date:** 2026-09-14
- **Scope:** Design System and Theme Tokens ONLY
- **Theme Architecture:**
  - Token definitions in `src/theme/tokens.ts` (colors, spacing, radii, shadows, touch targets, icon sizes)
  - Semantic color mappings in `src/theme/lightTheme.ts` and `src/theme/darkTheme.ts`
  - Modes supported: `LIGHT`, `DARK`, `SYSTEM` (with live dynamic switching and system color scheme observation)
  - Typography scale in `src/theme/typography.ts` with graceful system font fallbacks
  - Context and hooks in `src/theme/ThemeProvider.tsx` and `src/theme/useTheme.ts`
- **Reusable UI Components:**
  - `Button`: Primary, secondary, ghost, destructive variants; sm/md/lg sizes; loading & disabled states; icons; minimum 44dp touch target
  - `Card`: Default, elevated, outlined variants; none/sm/md/lg padding; pressable interaction
  - `Toggle`: Controlled accessible switch with label and description support, WCAG touch target
  - `Icon`: Decoupled project-level icon abstraction mapping semantic icon names to vector icons
  - `SafeArea`: Reusable layout wrapper using `react-native-safe-area-context`
- **Visual Demo:**
  - `app/demo.tsx`: Development screen demonstrating theme switching, palette swatches, typography scale, buttons, cards, toggles, and icon gallery
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (5 test suites, 17 tests passed, 0 failures)
  - Expo dev server: Bundled and running cleanly

---

## M2 Completion Record

- **Date:** 2026-09-14
- **Scope:** Prayer-Time Engine + PrayerTimeline ONLY (no UI, no React, pure domain logic)
- **Domain Modules Implemented:**
  - `src/constants/prayers.ts`: Prayer enum types, canonical order (`FAJR`, `DHUHR`, `ASR`, `MAGHRIB`, `ISHA`), display names.
  - `src/domain/prayer/types.ts`: Domain types (`Coordinates`, `PrayerCalculationParams`, `PrayerTimesResult`, `PrayerPeriodInstance`, `PrayerTimeline`, `PrayerEngineAPI`, supported methods/rules).
  - `src/domain/prayer/calculationMethods.ts`: Mappings for all 12 supported calculation methods, high-latitude rules (`AUTO`, `MIDDLE_OF_NIGHT`, `ONE_SEVENTH`, `ANGLE_BASED`), polar circle resolutions (`AQRAB_YAUM`, `AQRAB_BALAD`, `UNRESOLVED`), regional recommendations.
  - `src/domain/prayer/cacheFingerprint.ts`: Deterministic calculation config fingerprinting (`calculationConfigFingerprint`) incorporating all 14 effective calculation inputs and 2-decimal coordinate rounding.
  - `src/domain/prayer/PrayerEngine.ts`: Core prayer engine wrapping `adhan` with Luxon timezone-aware DateTimes, input validation, high-latitude fallback to MiddleOfTheNight, polar fallback to AqrabYaum, range batching, and `PrayerEngineAPI`.
  - `src/domain/prayer/PrayerTimeline.ts`: Exact 15-period 3-calendar-day (D-1, D, D+1) contiguous timeline, 4-date calculation with D+2 Fajr closure, `appendDayPeriods`, inclusive-start/exclusive-end `findPeriodInTimeline`, `getCurrentPrayer`, `getNextPrayer`, and domain error `PrayerTimelineError`.
- **Unit Tests Added (71 domain tests, 88 total project tests):**
  - `src/domain/prayer/PrayerEngine.test.ts`: PE-01 through PE-12, Mecca/NYC published timetable validation (±1 min), London solstice, Tromsø polar fallback, Asr Shafi vs Hanafi, exact manual adjustments, timeline transitions, DST handling, input validations (18 tests).
  - `src/domain/prayer/PrayerTimeline.test.ts`: PT-01 through PT-09, TX-01 through TX-03, 15 contiguous periods, zero boundary approximations, before-Fajr resolution to previous day Isha, DST handling, out-of-bounds error handling (17 tests).
  - `src/domain/prayer/cacheFingerprint.test.ts`: CF-01 through CF-10, determinism, parameter variation sensitivity, coordinate rounding (10 tests).
  - `src/domain/prayer/calculationMethods.test.ts`: Mapping and preset tests for all 12 calculation methods, 4 high-lat rules, 3 polar circle options (26 tests).
- **Code Coverage (`src/domain/prayer/`):**
  - Statements: 98.38% (target ≥ 90%)
  - Branch: 91.78% (target ≥ 90%)
  - Functions: 100% (target ≥ 90%)
  - Lines: 98.38% (target ≥ 90%)
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (9 test suites, 88 tests passed, 0 failures)

---

## M3 Completion Record

- **Date:** 2026-09-14
- **Scope:** Planning-Day Engine + PrayerPeriodInstance Clipping ONLY (pure domain module)
- **Domain Modules Implemented:**
  - `src/domain/planning-day/types.ts`: `PlanningDayConfig` canonical discriminated union (`FAJR`, `MIDNIGHT`, `CUSTOM`), `PlanningDayBoundaries`, `PlanningDay`, `WallClockResolution`, `PlanningDayEngineAPI`, `PLANNER_TAB_ORDER`.
  - `src/domain/planning-day/PlanningDayEngine.ts`: Core planning-day engine:
    - Transition-aware DST wall-clock resolver (`resolveWallClock`) handling spring-forward gap (first valid instant after gap) and fall-back overlap (earlier absolute occurrence).
    - Boundary resolution (`resolvePlanningDayBoundaries`) for all modes and key semantics (`key D = (D-1)@HH:mm -> D@HH:mm` for custom).
    - Period clipping (`clipPeriodsToInterval`) preserving `fullPeriodStart`, `fullPeriodEnd`, `sourceDate`, and `prayer`.
    - Full timeline coverage enforcement (`assertTimelineCoverage`) preventing partial planning days.
    - Reference time normalization to effective planning timezone.
    - Multi-instance prayer label support without deduplication or merging.
    - Pure prayer tab helper (`getPeriodsForPrayer`).
    - Dedicated key builder `buildPlanningDayForKey`, lookup `resolvePlanningDayForTime`, unified `buildPlanningDay`, and `PlanningDayEngine` facade.
  - `src/domain/planning-day/index.ts`: Module exports.
- **Unit Tests Added (32 domain tests, 120 total project tests):**
  - `src/domain/planning-day/PlanningDayEngine.test.ts`:
    - **PD-01 to PD-04**: Fajr-based tests (midday $\rightarrow$ today, 2:00 AM $\rightarrow$ yesterday, 11:00 PM $\rightarrow$ today, exact Fajr boundary 1ms before/at).
    - **PD-05**: Midnight-based tests (12:30 AM $\rightarrow$ today, midnight boundary invariant, Isha clipping across midnight).
    - **PD-06 to PD-07b**: Custom 19:00 boundary tests (Tue 18:59:59.999 $\rightarrow$ Tue key, Tue 19:00 $\rightarrow$ Wed key, Tue 20:00 $\rightarrow$ Wed key).
    - **PD-08**: Tab order invariance (`PLANNER_TAB_ORDER` strictly Fajr$\rightarrow$Isha).
    - **PD-09**: `planningDayKey` format validation (`YYYY-MM-DD`).
    - **PD-10 & PD-10b**: DST spring-forward (02:00 gap shifts to 03:00 EDT) and fall-back (01:30 selects earlier EDT offset) with timestamp assertions.
    - **PD-11 to PD-13**: Seasonal clipping tests with real astronomical fixtures (London summer & winter).
    - **PD-14**: Multi-instance tab with real Mecca fixture (19:00 cuts Maghrib, Mon+Tue sourceDates preserved, no merge/dedup).
    - **PD-15**: Provenance preservation (`fullPeriodStart`/`fullPeriodEnd`/`sourceDate` preserved).
    - **Invariants & Safety**: `start <= time < end`, zero gaps, zero overlaps, timeline immutability, reference normalization across timezones, timeline coverage validation, error handling.
    - **Date Transitions**: Month-end (Jan 31 $\rightarrow$ Feb 1), leap year (Feb 28 $\rightarrow$ Feb 29 $\rightarrow$ Mar 1 in 2028), year-end (Dec 31 $\rightarrow$ Jan 1).
    - **Facade API**: Verified all `PlanningDayEngine` methods.
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (10 test suites, 120 tests passed, 0 failures)

---

## M4 Completion Record

- **Date:** 2026-09-14
- **Scope:** Task Domain Model + SQLite/Drizzle Schema + Repositories + Series Operations ONLY (pure domain & data layer, no SchedulingEngine/materialization)
- **Domain & Data Modules Implemented:**
  - `src/constants/scheduleTypes.ts`: Canonical schedule types (`EXACT_TIME`, `PRAYER_RELATIVE`, `PRAYER_WINDOW`, `ANYTIME_TODAY`).
  - `src/domain/task/types.ts`: Comprehensive domain types (`TaskDefinition`, `TaskOccurrence`, `SubtaskTemplate`, `OccurrenceSubtask`, `OccurrenceOverrideData`, `ScheduleDataMap`, `TaskDefinitionUpdatePatch`, `OccurrencePlacementUpdate`, `DerivedPlacement`).
  - `src/domain/task/errors.ts`: Specialized domain errors (`DataIntegrityError`, `TaskValidationError`).
  - `src/domain/task/scheduleDataParser.ts`: Centralized runtime boundary parser for schedule data (SD-01 through SD-06, strict 24h format, offset bounds, extraneous property tolerance).
  - `src/domain/task/jsonBoundary.ts`: Centralized runtime boundary validation and serialization for all JSON columns (`tags`, `subtasks`, `reminderRule`, `hijriRecurrence`, `eligiblePrayerSections`, `overrideData`).
  - `src/data/schema.ts`: Complete Drizzle schema for all 7 application tables with foreign keys, indexes, unique constraints (`UNIQUE(seriesId, seriesVersion)`, `UNIQUE(taskDefinitionId, localDate)`, `UNIQUE(seriesId, localDate)`), and SQLite CHECK constraints (`schedule_type`, `source`, `priority`, `status`, `series_version >= 1`). Includes `manualTimezone` in `user_settings`.
  - `src/data/migrations/0001_initial.sql`: Deterministic initial migration with all tables, indexes, constraints, and statement breakpoints.
  - `src/data/db.ts`: Database connection manager enforcing `PRAGMA foreign_keys = ON;`, `setDatabase`/`resetDatabase` test hooks, and `runInTransaction` with SQLite `SAVEPOINT` nesting and async rollback support.
  - `src/data/repositories/TaskDefinitionRepository.ts`: Full CRUD, active series query (`findActiveBySeriesId` enforcing `is_active = 1 AND effective_to_date IS NULL`), guarded update (rejecting immutable identity/series version mutation), guarded delete (rejecting hard delete when terminal history exists), and database constraint translation to `DataIntegrityError`.
  - `src/data/repositories/TaskOccurrenceRepository.ts`: Full CRUD, `createBatch` (atomic transaction), query methods (`findByPlanningDayKey`, `findByLocalDate`, `findBySeriesId`), auto-derivation/validation of `seriesId`, guarded status transitions (`PENDING -> COMPLETED/MISSED/CANCELLED`, idempotent terminal updates, timestamp consistency), guarded placement updates (rejecting terminal row mutations), `deletePendingFutureOccurrences` (for splits), `cancelAllPendingOccurrences` (for delete series), and guarded delete.
  - `src/domain/task/TaskEngine.ts`: High-level domain service:
    - `createTask`: Sets canonical `startDate`, non-recurring `seriesId = id`, recurring new series UUID, validates unique subtask IDs.
    - `updateOccurrenceOverride` (RS-01): Overrides written to occurrence `overrideData`, definition untouched.
    - `splitSeriesAndFuture` (RS-02, TX-01): Atomic transaction closing predecessor at `splitDate - 1`, creating successor with `startDate = splitDate`, `effectiveFromDate = splitDate`, `seriesVersion + 1`, and deleting pending future occurrences.
    - `updateEntireSeries` (RS-03): In-place active version update, preserving historical occurrences.
    - `cancelTask` (RS-06): Transitions to `CANCELLED` tombstone row.
    - `deleteEntireSeries` (RS-07): Atomic transaction deactivating all definitions for series and cancelling all remaining pending occurrences (past and future), preserving history.
    - `toggleSubtaskCompletion`: Validates `subtaskId` in definition template, updates occurrence `overrideData.completedSubtaskIds` idempotently with no duplicates, leaving definition template unchanged.
  - `src/utils/uuid.ts`: RFC4122 v4 UUID generator using `globalThis.crypto.randomUUID()` with secure fallback.
- **Unit Tests Added (80 M4 tests across 6 test suites, 200 total project tests):**
  - `src/domain/task/__tests__/scheduleDataParser.test.ts` (28 tests): SD-01 through SD-06, 24h formats, prayer enums, positive offsets, non-overlapping windows, extraneous properties, corruption handling.
  - `src/data/__tests__/db.test.ts` (9 tests): Table creation, foreign key enforcement, CHECK constraints (`priority`, `schedule_type`, `status`), UNIQUE constraints, cascade deletion.
  - `src/data/repositories/__tests__/TaskDefinitionRepository.test.ts` (13 tests): CRUD, 4 schedule types round-trip, immutable field protection (IM-01), active version lookup (SV-01), guarded delete (HD-01, HD-01b), JSON corruption error handling.
  - `src/data/repositories/__tests__/TaskOccurrenceRepository.test.ts` (18 tests): CRUD, seriesId derivation/validation (OC-01), guarded status transitions (PENDING to COMPLETED/MISSED/CANCELLED, terminal reject, timestamp invariants), terminal placement freezing, guarded delete (HD-02), delete/cancel pending, JSON corruption error handling.
  - `src/domain/task/__tests__/TaskEngine.series.test.ts` (7 tests): RS-01 single-occurrence override, RS-02 & SV-01 series split, RS-03 entire series edit, RS-04 uniqueness enforcement, RS-06 single occurrence cancellation tombstone, RS-07 delete entire series with past/future pending cancellation and history preservation, TX-01 transactional rollback on mid-operation failure.
  - `src/domain/task/__tests__/TaskEngine.subtasks.test.ts` (5 tests): Subtask template preservation, duplicate ID rejection in template, occurrence isolation (Occurrence 1 completion does not affect Occurrence 2 or template), invalid subtask ID rejection, idempotent toggle without duplicate IDs.
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (16 test suites, 200 tests passed, 0 failures)

---

## M4 Hardening Completion Record

- **Date:** 2026-09-14
- **Scope:** Targeted M4 persistence, concurrency, and validation hardening prior to M5.
- **Hardening Fixes Implemented:**
  1. **Clean Drizzle Migration State & Dynamic Discovery:**
     - Removed stale / conflicting migration artifacts (`0000_curvy_exiles.sql`, `0001_initial.sql`, outdated snapshot/journal).
     - Cleanly regenerated initial migration using `drizzle-kit generate --name initial`:
       - SQL: `src/data/migrations/0000_initial.sql`
       - Journal entry: `meta/_journal.json` with tag `0000_initial` (idx: 0, version: 6)
       - Helper: `src/data/migrations/migrations.js` importing `0000_initial.sql`
     - Created `src/data/migrator.ts` (`loadMigrationConfig`, `migrateDatabase`): dynamically discovers migrations from `meta/_journal.json` and runs Drizzle's official `migrate()` runner.
     - Updated `src/data/__tests__/testDbHelper.ts` to use `loadMigrationConfig()`.
     - Added `src/data/__tests__/migrations.test.ts`: verifies discovery on fresh empty DB, table/constraint creation, and Drizzle idempotency on re-run.
  2. **Canonical Transaction Path for `createBatch`:**
     - Removed ad-hoc `client.transaction` fallback in `TaskOccurrenceRepository.createBatch()`.
     - When `tx` is supplied: executes directly inside `tx` without attempting independent nested `BEGIN`.
     - When no `tx` is supplied: uses canonical `runInTransaction()`.
     - Added test in `db.test.ts` proving `createBatch` inside an existing transaction does not issue a nested `BEGIN`.
  3. **Removed Global `transactionDepth` Concurrency Hazard:**
     - Removed process-global depth counter in `src/data/db.ts`.
     - Implemented sequential `TransactionLock` queue for root transactions on the SQLite connection.
     - Nested transactions require explicit `tx` and allocate context-scoped `SAVEPOINT` identifiers (`sp_${context.id}_${count}`).
     - Added concurrency regression test in `db.test.ts`: Tx B started while Tx A is paused does NOT become a SAVEPOINT and serializes as an independent root transaction after Tx A commits.
     - Retained full root and savepoint rollback test coverage.
  4. **True Civil-Date Validation:**
     - Created `src/utils/dateValidation.ts` (`isValidCivilDate`, `assertValidCivilDate`, `subtractCivilDay`).
     - Distinguishes formatting from Gregorian calendar validity (leap years, month days, century rules).
     - Applied to: `startDate`, `localDate`, `planningDayKey`, `effectiveFromDate`, `effectiveToDate`, `recurrenceEnd`, `splitDate`, `fromDate`.
     - Enforces `effectiveFromDate <= effectiveToDate` on definitions and version closing.
     - Series split validates `splitDate` within active version's range and uses timezone-independent UTC arithmetic for `splitDate - 1`.
  5. **Terminal Status Timestamp Invariants on Create:**
     - Enforced in `TaskOccurrenceRepository.create` and `createBatch`:
       - `PENDING`: `completedAt == null && missedAt == null`
       - `COMPLETED`: `completedAt != null && missedAt == null`
       - `MISSED`: `missedAt != null && completedAt == null`
       - `CANCELLED`: `completedAt == null && missedAt == null`
     - Added unit tests for direct-create and atomic batch rollback on violation.
  6. **Absolute Timestamp Validation:**
     - Created `isValidIsoInstant`, `assertValidIsoInstant`, `canonicalizeIsoInstant` in `src/utils/dateValidation.ts`.
     - Requires `Z` or explicit UTC offset (rejects bare local timestamps like `2026-09-15T18:00:00`).
     - Standardizes audit timestamps and `calculatedStartTime` to UTC ISO strings.
  7. **IANA Timezone Validation:**
     - Created `isValidIanaTimezone`, `assertValidIanaTimezone` in `src/utils/dateValidation.ts`.
     - Validates `TaskOccurrence.timezone` in `create` and `createBatch`, rejecting invalid strings (`Texas`, `GMT-ish`).
- **Unit Tests Added (48 new tests, 248 total project tests):**
  - `src/utils/__tests__/dateValidation.test.ts` (16 tests)
  - `src/data/__tests__/migrations.test.ts` (2 tests)
  - `src/data/__tests__/db.test.ts` (4 new transaction concurrency & rollback tests)
  - `src/data/repositories/__tests__/TaskOccurrenceRepository.test.ts` (13 new hardening tests)
  - `src/data/repositories/__tests__/TaskDefinitionRepository.test.ts` (8 new hardening tests)
  - `src/domain/task/__tests__/TaskEngine.series.test.ts` (5 new split date hardening tests)
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (18 test suites, 248 tests passed, 0 failures)

---

## M5 Completion Record

- **Date:** 2026-09-14
- **Scope:** M5 — Scheduling Engine & Temporal Architecture
- **Architecture & Directory Structure:**
  - `src/domain/temporal/`:
    - `types.ts`: `WallClockResolutionKind`, `WallClockResolution`.
    - `errors.ts`: `TemporalResolutionError`, `TemporalErrorCode` (`INVALID_TIME_FORMAT`, `INVALID_DATE_FORMAT`, `INVALID_TIMEZONE`, `UNRESOLVABLE_DATETIME`). Strictly isolated from higher layers (`planning-day`, `scheduling`).
    - `WallClockResolver.ts`: Extracted transition-aware DST wall-clock resolver (`resolveWallClock`).
    - `timezoneUtils.ts`: Extracted IANA timezone helper (`getEffectiveTimezone`, `isValidTimezone`).
    - `index.ts`: Module exports.
  - `src/domain/planning-day/`:
    - `PlanningDayEngine.ts`: Delegates wall-clock and timezone resolution to `temporal/`, mapping `TemporalResolutionError` -> `PlanningDayError` to preserve M3 externally observable behavior.
    - `types.ts`: Re-exports `WallClockResolution` and `WallClockResolutionKind` from `temporal/`.
  - `src/domain/scheduling/`:
    - `types.ts`: `SchedulingContext`, `ResolvedPlacement`, `SchedulingEngineAPI`, `SchedulingErrorCode`, `SchedulingResolutionError`.
    - `SchedulingEngine.ts`: Pure domain placement resolver (`resolvePlacement`) and recalculation wrapper (`recalculateOccurrencePlacement`).
    - `WallClockResolver.test.ts`: 9 tests (WC-01 through WC-08 + error handling).
    - `SchedulingEngine.test.ts`: 51 tests (ET, PR, PW, AT, SK, HS, ID, ER, TZ suites).
    - `index.ts`: Module exports.
- **Implemented Scheduling Modes & Behaviors:**
  1. **EXACT_TIME:**
     - Resolves `occurrenceSeedDate + localTime` in the effective IANA timezone.
     - Handles DST spring-forward gaps (`SPRING_FORWARD_SHIFTED` to first valid instant after gap) and fall-back duplicates (`FALL_BACK_FIRST` to earlier occurrence).
     - Derives `planningDayKey` via M3 `PlanningDayEngine.resolvePlanningDayForTime`.
     - Reclassifies into actual prayer period; preserves local clock (18:00 remains 18:00 across travel).
     - Invariant: `localDate === occurrenceSeedDate`.
  2. **PRAYER_RELATIVE:**
     - Resolves concrete anchor by `(anchorPrayer, occurrenceSeedDate)`.
     - Anchor timestamp is exact prayer start instant; applies signed offset as elapsed absolute minutes.
     - Reclassifies into actual containing prayer period (does not assume anchor prayer).
     - Derives `planningDayKey` from resolved instant via M3.
     - Invariant: `localDate === occurrenceSeedDate` even if resolved time crosses planning-day or civil-date boundaries.
  3. **PRAYER_WINDOW:**
     - Resolves concrete start and end instances for seed date.
     - Sets `eligiblePrayerSections` (start inclusive, end exclusive); rejects equal prayers and wrapping windows in v1.
     - Derives `planningDayKey` from window START via M3; preserves full unclipped `windowStart` and `windowEnd`.
     - `calculatedStartTime` and `calculatedPrayerSection` remain null.
  4. **ANYTIME_TODAY:**
     - Sets `planningDayKey = occurrenceSeedDate`.
     - All specific temporal placement fields (`calculatedStartTime`, `calculatedPrayerSection`, `eligiblePrayerSections`, `wallClockResolution`, `windowStart`, `windowEnd`) remain null.
  5. **Recalculation Wrapper (`recalculateOccurrencePlacement`):**
     - Enforces identity guards: rejects mismatched `taskDefinitionId` or `seriesId` with `OCCURRENCE_DEFINITION_MISMATCH`.
     - Enforces terminal status guards: rejects `COMPLETED`, `MISSED`, `CANCELLED` with `TERMINAL_OCCURRENCE`.
     - For `PENDING`, delegates to `resolvePlacement` strictly using `occurrence.localDate`.
  6. **Defensive Error Handling:**
     - Added `INVALID_SCHEDULE_DATA` for malformed schedule data (e.g. invalid HH:mm).
     - Added `INVALID_TEMPORAL_CONTEXT` for corrupt/invalid timeline timezone.
     - Preserves underlying causes as `cause` where applicable.
- **M6 Downstream Contract Note:**
  - `ResolvedPlacement.windowStart` and `ResolvedPlacement.windowEnd` are intentional downstream domain outputs.
  - M6 must explicitly decide how concrete PrayerWindow boundaries are persisted or otherwise preserved for:
    - Expiration evaluation
    - Missed-state evaluation
    - Notification scheduling
    - Historical placement behavior
  - They must NOT be silently discarded at the M5/M6 boundary.
- **Unit Tests Added (60 new tests, 308 total project tests):**
  - `src/domain/scheduling/WallClockResolver.test.ts` (9 tests: WC-01 to WC-08 + error handling)
  - `src/domain/scheduling/SchedulingEngine.test.ts` (51 tests: ET-01 to ET-08, PR-01 to PR-06, PW-01 to PW-09, AT-01 to AT-04, SK-01 to SK-04, HS-01 to HS-07, ID-01 to ID-02, ER-01 to ER-08, TZ-01, facade test)
- **Verification:**
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npm test`: Passed (20 test suites, 308 tests passed, 0 failures)
- **Independent Opus Review & Hardening:**
  - **M5 independent Opus review:** Conditionally approved
  - **Finding F-1 (resolvePlacement API naming):** Accepted as-is.
  - **Finding F-2 (SchedulingResolutionError export):** Accepted as-is.
  - **Finding F-3 (Error class location):** Accepted as-is.
  - **Finding F-4 (Exception tests false-positive vulnerability):** Resolved — six exception tests (`HS-02`, `HS-03`, `HS-05`, `HS-06`, `ER-04`, `ER-06`) in `src/domain/scheduling/SchedulingEngine.test.ts` hardened with explicit `expect(() => fn()).toThrow(SchedulingResolutionError)` assertions before try/catch inspection.
  - **Finding F-5 (TimelineWithPeriods structural interface):** Accepted as-is.
  - **Status:** M5 is CLOSED / OPUS APPROVED.

---

## M6 Completion Record

- **Date:** 2026-09-15
- **Status:** **M6 IMPLEMENTED — AWAITING INDEPENDENT OPUS REVIEW**
- **Core Purpose:** Bridge governing task definitions and M5 scheduling engine with SQLite database persistence, managing occurrence materialization, guarded updates, terminal history preservation, and migration safety.
- **Migration & Schema:**
  - **Migration Name:** `0001_lazy_the_order.sql` (generated via `npx drizzle-kit generate`; `0000_initial.sql` kept untouched).
  - **Schema Modifications:** Added nullable columns `window_start TEXT` and `window_end TEXT` to `task_occurrences` table in `src/data/schema.ts`.
  - **Journal & Runtime Loader:** Updated `src/data/migrations/meta/_journal.json` and registered `0001_lazy_the_order.sql` in `src/data/migrations/migrations.js` (hash and SQL loaded synchronously).
  - **Migration Test Suite (`src/data/__tests__/migrations.test.ts`):** 4 tests covering fresh DB migration, upgrade from M4 with existing occurrences, migration idempotency, and journal/snapshot/loader consistency.
- **PrayerWindow Persistence & Invariants:**
  - `DerivedPlacement`, `TaskOccurrence`, and `NewTaskOccurrenceInput` extended with `windowStart: string | null` and `windowEnd: string | null`.
  - Stored as canonical UTC ISO strings: `canonicalizeIsoInstant(dateTime.toUTC().toISO())`.
  - Repository-level validation enforces:
    - For `PRAYER_WINDOW`: `windowStart !== null`, `windowEnd !== null`, both are valid UTC ISO instants, and `windowStart < windowEnd`.
    - For all other schedule types: `windowStart === null` and `windowEnd === null`.
  - Legacy rows read `null`/`null` without read-time corruption errors.
  - Terminal rows freeze both window values upon completion/miss/cancellation.
- **M6 / M9 Boundary & Recurrence Ownership:**
  - M6 handles: explicit `(seriesId, seedDate)` -> governing `TaskDefinition` version -> M5 placement -> `TaskOccurrence` persistence/guarded update.
  - M6 strictly does NOT evaluate RRULE syntax, frequencies, BYDAY, intervals, count, or Hijri recurrence membership (all owned by M9).
  - M6 inspects only `startDate`, `effectiveFromDate`, `effectiveToDate`, `isActive`, and `recurrenceRule`/`hijriRecurrence` presence (only to distinguish recurring vs non-recurring definitions).
- **Logical Identity & Version Selection:**
  - Sole logical occurrence identity is `seriesId + localDate`. Database backstop is `UNIQUE(series_id, local_date)`.
  - Occurrence lookup uses `findBySeriesAndDate(seriesId, seedDate)` (never `taskDefinitionId + seedDate`).
  - Version Selection (`TaskDefinitionRepository.findVersionForSeedDate`):
    - Recurring candidate: `isActive === true`, `effectiveFromDate <= seedDate`, `startDate <= seedDate`, and `(effectiveToDate === null || seedDate <= effectiveToDate)`.
    - Non-recurring candidate: `isActive === true`, `recurrenceRule === null`, `hijriRecurrence === null`, and `seedDate === startDate`.
    - If 0 matches: returns `null` (mapped to `NO_GOVERNING_VERSION`).
    - If 1 match: returns governing definition.
    - If >1 match: throws typed `DefinitionVersionConflictError` (mapped to `DEFINITION_VERSION_CONFLICT`).
  - Stale PENDING version conflict: If a PENDING occurrence has `existing.taskDefinitionId !== governing.id`, throws typed `OCCURRENCE_VERSION_CONFLICT`.
- **Terminal Short-Circuit:**
  - Terminal occurrences short-circuit immediately after logical lookup within `materializeOne`:
    - `COMPLETED` -> returns `SKIPPED_COMPLETED`
    - `MISSED` -> returns `SKIPPED_MISSED`
    - `CANCELLED` -> returns `SKIPPED_CANCELLED` (acts as regeneration-blocking tombstone)
  - Short-circuit occurs BEFORE governing definition lookup, `getEffectiveTimezone()`, M5 scheduling, or timeline access.
  - History and tombstones remain detectable even if temporal context is corrupted or unavailable.
- **MaterializationEngine API:**
  - `materializeOne(request, context)`: Sole mutation pipeline. Validates input, starts canonical transaction, enforces terminal short-circuit, selects governing version, derives placement, maps canonical UTC, creates or atomically updates occurrence. Returns `MaterializationResult` with non-null `occurrenceId: string` and typed `action`. Throws typed `MaterializationError` on failure.
  - `materializeBatch(requests, context)`: Deduplicates requests by `seriesId + seedDate` (preserving first-seen order), processes each item in an isolated transaction, aggregates results and per-item errors into `MaterializationSummary`.
  - `materializeNonRecurring(dateRange, context)`: Queries active non-recurring definitions in range via `findActiveNonRecurringByStartDateRange`, constructs requests `{ seriesId, seedDate: startDate }`, routes through `materializeBatch`.
  - `rematerializePending(dateRange, context)`: Queries PENDING occurrences in range via `findPendingByLocalDateRange`, constructs requests `{ seriesId, seedDate: localDate }`, routes through `materializeBatch`/`materializeOne`.
- **Atomic Guarded Update & Concurrency:**
  - Occurrence placement update uses atomic SQL: `WHERE id = ? AND status = 'PENDING'`, returning typed `PlacementUpdateResult` (`UPDATED`, `NOT_PENDING`, `NOT_FOUND`).
  - Terminal race handling: If `NOT_PENDING`, re-reads occurrence and returns corresponding `SKIPPED_*` action. If not found or zero changes on still-pending, throws `DATA_INTEGRITY`.
  - Serialization guaranteed via M4 `runInTransaction()` / `TransactionLock`. Secondary backstop: SQLite `UNIQUE(series_id, local_date)`.
- **Failure Safety & Error Wrapping:**
  - All operations rollback cleanly on error. If M5 scheduling fails, new occurrence leaves 0 rows; existing PENDING occurrence placement remains completely untouched.
  - No raw SQLite errors leak; all errors mapped to typed `MaterializationError` codes (`INVALID_REQUEST`, `INVALID_SEED_DATE`, `NO_GOVERNING_VERSION`, `DEFINITION_VERSION_CONFLICT`, `OCCURRENCE_VERSION_CONFLICT`, `SCHEDULING_RESOLUTION_FAILED`, `DATA_INTEGRITY`, `PERSISTENCE_FAILED`).
- **Deferred Scope (Preserved for Future Milestones):**
  - M7: Today Screen UI
  - M8: Hijri Calendar Core / HijriService
  - M9: Recurrence rule evaluation & seed generation (RRULE & Hijri recurrence)
  - M11: Missed/completed/overdue worker
  - M12: Location & travel service
  - M13: Notifications
  - M17: PrayerCacheRepository & UserSettingsRepository
- **Test Inventory (66 new M6 tests, 372 total project tests):**
  - `src/data/__tests__/migrations.test.ts` (4 tests: MG-01..MG-04)
  - `src/data/repositories/__tests__/TaskDefinitionRepository.test.ts` (9 new tests: version selection, ranges, conflicts)
  - `src/data/repositories/__tests__/TaskOccurrenceRepository.test.ts` (8 new tests: window validation, UTC, PlacementUpdateResult, queries)
  - `src/domain/materialization/MaterializationEngine.test.ts` (45 tests: IDM, SV, TS, NR, RC, PW-M, MT, CTX, FL, BT, RM, TX)
- **Verification:**
  - `npm test`: Passed (21 test suites, 372 tests passed, 0 failures, 308 M2–M5 tests green)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npx expo-doctor`: Passed (21/21 checks passed, 0 issues)
  - `npx expo install --check`: Passed (Dependencies are up to date)

---

## M7 Completion Record

- **Date:** 2026-09-15
- **Status:** **M7 IMPLEMENTED — AWAITING INDEPENDENT OPUS REVIEW**
- **Core Purpose & Invariants:**
  - Prayer-centered adaptive planner Today view with exactly 5 fixed prayer tabs: `FAJR`, `DHUHR`, `ASR`, `MAGHRIB`, `ISHA`.
  - Tabs are never reordered. No Sunrise tab. No 6th Anytime tab.
  - Consumes persisted `TaskOccurrence` rows as placement source of truth (does not render directly from `TaskDefinition` recipes).
  - Strictly preserves M6/M9 boundaries: M7 does NOT evaluate RRULE or Hijri recurrence, does not synthesize missing recurrences, and does not auto-roll tasks.
  - Task completion is terminal (`TaskEngine.completeTask()`), no undo in M7.
- **Repository Additions:**
  - `TaskOccurrenceRepository.findTodayCandidates(activePlanningDayKey, nowUtc, tx?)`:
    - Rule A: `planning_day_key == activePlanningDayKey`
    - Rule B: `status == 'PENDING' AND window_start IS NOT NULL AND window_end IS NOT NULL AND planning_day_key != activePlanningDayKey AND window_start <= nowUtc AND nowUtc < window_end` (half-open, canonical UTC).
  - `TaskDefinitionRepository.findByIds(ids, tx?)`:
    - Single deduplicated batch SQL query (`IN (...)`).
    - Exact ID lookup with NO `isActive` filter so historical terminal occurrences remain fully renderable even if definitions are deactivated.
- **Temporal Input Provider & Setup-Required Safety:**
  - `TodayTemporalInputProvider` contract: returns `READY(inputs)` or `SETUP_REQUIRED`.
  - `M7BootstrapInputProvider`: Inspects `user_settings` table. Strictly returns `SETUP_REQUIRED` if location/parameters are missing. Never silently defaults to Mecca or Riyadh timezone.
  - `StaticTodayTemporalInputProvider`: Explicit test fixtures.
  - Setup safety: In `SETUP_REQUIRED` state, Today clears runtime and viewModel, displays `SetupRequiredState` ("Set your prayer location to begin"), and invalidates prior async requests to prevent stale data resurrection.
- **TodayRuntimeContext & Store Architecture:**
  - `TodayRuntimeContext`: Explicit container owning `timeline: PrayerTimeline`, `planningDay: PlanningDay`, `planningDayConfig: PlanningDayConfig`, `refreshedAt: string`.
  - Store (`useTodayStore`): Owns `status`, `runtime`, `viewModel`, `selectedPrayer`, `prayerTransition`, `requestGeneration`, and `refreshInFlight`.
  - `selectedPrayer` ownership: Belongs ONLY to `useTodayStore`. Initial load and foreground sync to `currentPrayer`. Mid-session prayer transitions, planning-day rollovers, and task mutations preserve `selectedPrayer`.
  - Async request-generation protection: Incremental token tracking (`startRefresh()`, `startReproject()`) suppresses stale async commits (`ASYNC-01`).
  - Single-flight rollover: `refreshInFlight` flag prevents duplicate full refreshes on 1-second ticks (`ASYNC-02`).
  - Stale invalidation: `SETUP_REQUIRED` suppresses prior pending READY results (`ASYNC-03`).
- **Single 1-Second Timer Architecture:**
  - Exactly ONE 1-second interval installed in `usePrayerTimer`.
  - Timer duties: updates countdown using `viewModel.nextPrayer`, checks planning-day end boundary and timeline period transitions cheaply using cached in-memory runtime (no SQLite queries, no `PlanningDayEngine` calls per tick).
  - `useCountdown.ts`: Pure formatter `formatCountdown` and derived hook (zero intervals, `TIMER-01`).
- **Projection Engine (`TodayViewModelProjection.ts`):**
  - Pure deterministic projection functions without DB dependencies.
  - Seed range: `deriveTimelineSeedRange(timeline)` extracts `[min(sourceDate), max(sourceDate)]` from `timeline.periods` (spanning D-1, D, D+1).
  - PENDING `PRAYER_WINDOW` projection: Uses concrete persisted `[windowStart, windowEnd)` intersected with active `PlanningDay` fragments (`max(fragment.start, windowStart) < min(fragment.end, windowEnd)`). End prayer is strictly exclusive (`[Dhuhr, Isha)` projects to Dhuhr, Asr, Maghrib; never Isha).
  - Terminal `PRAYER_WINDOW` projection: Uses frozen `occurrence.eligiblePrayerSections` (never recomputed).
  - Presentation `sortInstant`: For `EXACT_TIME` / `PRAYER_RELATIVE`, uses `calculatedStartTime`. For `PRAYER_WINDOW` tab projections, uses the start of the concrete window × fragment intersection for that specific tab (`SORT-01`).
  - Sorting:
    - Scheduled PENDING: `sortInstant` ASC -> `priority` (IMPORTANT before NORMAL) -> `createdAt` ASC -> `id` ASC.
    - MISSED: Segregated into `missedTasks` section with explicit badge, rendered above completed.
    - COMPLETED: Segregated into collapsible `completedTasks` (`Completed (N)`).
    - ANYTIME_TODAY: Evaluated by `definition.scheduleType === 'ANYTIME_TODAY'`, projected into bottom section of all 5 tabs, sorted by `priority` (IMPORTANT before NORMAL) then `createdAt`.
  - Empty states: Context-sensitive messages distinguishing current prayer ("Nothing scheduled until Asr.") vs other tabs ("Nothing scheduled for Fajr."). Any MISSED occurrence prevents "All done" state.
- **UI & Navigation:**
  - Built strictly with M1 LIGHT theme tokens (no hardcoded component colors).
  - Prominent Islamic header with deep green surface, prayer timings, and dynamic countdown.
  - Navigation: Single Expo Router Tabs owner (`app/(tabs)/_layout.tsx`) using `BottomNavBar` with 5 destinations (Today, Calendar, +, Worship, Settings) and elevated central `+` button. Calendar/Worship/Settings/Add remain placeholders.
- **Accessibility:**
  - Prayer tabs: `role="tab"`, selected accessibility state follows `selectedPrayer`.
  - Task completion: `role="checkbox"`, `checked` accessibility state, accessible task title labels.
  - Prayer transition: Polite live region banner announcement.
  - Touch targets: Minimum 44dp token enforced across tabs and checkboxes.
  - Explicit badges: "Missed" and "Completed" visual + text states (not color alone).
- **Test Inventory (76 new M7 tests, 448 total project tests):**
  - `src/__tests__/data/findTodayCandidates.test.ts` (6 tests: CD-01..CD-05, HI-01)
  - `src/__tests__/services/TodayTemporalInputProvider.test.ts` (4 tests: TI-01..TI-04)
  - `src/__tests__/services/TodayViewModelProjection.test.ts` (36 tests: WP-01..WP-07, PF-01..PF-04, PT-01, PT-03..PT-05, ER-01..ER-03, AT-01..AT-04, ST-01..ST-05, SO-01..SO-04, SORT-01, ES-01..ES-05)
  - `src/__tests__/services/TodayOrchestrator.test.ts` (25 tests: SD-01..SD-04, PD-01..PD-04, LP-01..LP-05, PT-02, UI-01..UI-03, CT-01, CT-02, TIMER-01, MB-01, MB-02, ASYNC-01..ASYNC-03)
  - `src/__tests__/components/TodayAccessibility.test.tsx` (5 tests: AX-01..AX-05)
- **Verification:**
  - `npm test`: Passed (26 test suites, 448 tests passed, 0 failures, 372 M1–M6 tests green)
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors, 0 warnings)
  - `npx expo-doctor`: Verified (no unexpected packages or native mismatches)
  - `npx expo install --check`: Verified
- **Deferred Scope (Preserved for Future Milestones):**
  - M8: Hijri Calendar Core / HijriService
  - M9: Recurrence engine (RRULE & Hijri recurrence)
  - M10: Add Task flows
  - M11: Overdue/missed worker & auto-roll
  - M12: Location & GPS services
  - M13: Notification scheduling
  - M14: Calendar month view
  - M16: Worship UI
  - M17: Settings UI & custom calculation preferences



