# Implementation Status

**Current Milestone:** M4 — Task Domain + SQLite Schema (Completed & Hardened)  
**Last Updated:** 2026-09-14 (Rev 3 — architecture revision 3 + M4 hardening)  
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
| **M5** | Scheduling engine + WallClockResolver | Not Started | — | Prerequisites: M2, M3, M4. Opus review required |
| **M6** | Local persistence + materialization | Not Started | — | Prerequisites: M4, M5 |
| **M7** | Today screen | Not Started | — | Prerequisites: M1, M2, M3, M5, M6 |
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
