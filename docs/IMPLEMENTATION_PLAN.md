# Implementation Plan

**Status:** Source of truth for milestone execution  
**Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Implements:** MASTER_PRODUCT_SPEC §57

---

## Milestone Overview

```text
M0   Repository and project foundation           ✅ Completed
M1   Design system and theme tokens               ✅ Completed
M2   Prayer-time engine + PrayerTimeline          ← Opus review required
M3   Planning-day engine + clipping               ← Opus review required
M4   Task domain model + schema (includes series) ← Opus review required
M5   Scheduling engine + WallClockResolver        ← Opus review required
M6   Local persistence + materialization
M7   Today screen
M8   Hijri Calendar Core / HijriService           ← MOVED from M13 (dependency fix)
M9   Recurrence engine (needs HijriService)       ← Opus review required
M10  Add Task flows
M11  Missed/completed/overdue behavior
M12  Location and travel                          ← Opus review required
M13  Notifications                                ← Opus review required
M14  Calendar month (needs M8 HijriService)
M15  Worship Suggestions engine                   ← Opus review required
M16  Worship UI
M17  Settings
M18  Widgets (dev build required)
M19  Premium entitlement scaffolding              ← Opus review required
M20  Onboarding
M21  Dark mode polish
M22  Accessibility/RTL
M23  QA + edge cases                              ← Opus review required
M24  Release preparation
```

**Dependency corrections from architecture revisions:**
- M8 (Hijri Calendar Core) moved up from M13 — HijriService must exist before HijriRecurrenceEngine (M9), Calendar Month (M14), and Worship date generation (M15)
- M9 (RecurrenceEngine) depends on M4 + M8 — task creation needs recurrence and Hijri
- M4 now includes recurring series model (seriesId, effectiveFromDate/effectiveToDate) per ADR-024
- M18 (Widgets) deferred; widget-specific native deps installed only at M18, not M0

---

## M0: Repository and Project Foundation

**Goal:** Initialize the Expo project with tooling configured, directory structure in place, and core dependencies installed. Widget-specific native dependencies are deferred to M18.

**Prerequisites:** None

**Implementation tasks:**
1. Create Expo project: `npx -y create-expo-app@latest ./ --template blank-typescript`
2. Install core dependencies via `npx expo install` (SDK-matched versions):
   - `adhan` (prayer calculation)
   - `luxon` + `@types/luxon` (date/time)
   - `rrule` (recurrence)
   - `@tabby_ai/hijri-converter` (Hijri conversion)
   - `drizzle-orm` + `expo-sqlite` (database)
   - `zustand` (state management)
   - `expo-router` (navigation)
   - `expo-location` (location)
   - `expo-notifications` (notifications)
   - `expo-font` (custom fonts)
   - `expo-secure-store` (secure storage)
   - `uuid` (ID generation)
3. Do NOT install widget dependencies (`expo-widgets`, `react-native-android-widget`) — deferred to M18
4. Configure TypeScript strict mode
5. Configure Jest with `jest-expo` preset
6. Configure ESLint + Prettier
7. Configure Drizzle for expo-sqlite
8. Create directory structure per TECHNICAL_ARCHITECTURE.md §2
9. Create placeholder files for all domain modules
10. Set up path aliases (`@/` → `src/`)
11. Verify `npx expo start` runs without errors
12. Verify `npx jest` runs with 0 tests (no failures)

**Tests required:**
- Project compiles with `tsc --noEmit`
- Jest runs successfully (0 tests, 0 failures)
- `expo start` launches without error

**Definition of done:**
- All core dependencies installed (SDK-matched)
- Directory structure matches architecture doc
- TypeScript compiles
- Jest configured and runnable
- Expo dev server starts
- No widget-specific native code present

**Review requirement:** None (standard scaffolding)

---

## M1: Design System and Theme Tokens

**Goal:** Implement the complete design token system, theme provider, and core reusable components.

**Prerequisites:** M0

**Files/modules:**
- `src/theme/tokens.ts`, `src/theme/typography.ts`
- `src/theme/lightTheme.ts`, `src/theme/darkTheme.ts`
- `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`
- `src/components/common/Button.tsx`, `Card.tsx`, `Toggle.tsx`, `Icon.tsx`
- `src/components/layout/SafeArea.tsx`

**Implementation tasks:**
1. Define color tokens (light + dark) per UI_SYSTEM.md §2
2. Define spacing, typography, radius, shadow tokens
3. Load custom fonts (Outfit, Inter) via `expo-font`
4. Implement `ThemeProvider` context + `useTheme()` hook
5. Build core components (Button, Card, Toggle, Icon, SafeArea)
6. Create visual demo screen showing all components

**Tests required:**
- ThemeProvider renders without crash
- useTheme returns correct theme based on mode

**Definition of done:**
- All tokens type-safe. ThemeProvider works. No hardcoded colors.

**Review requirement:** None

---

## M2: Prayer-Time Engine + PrayerTimeline

**Goal:** Implement `PrayerEngine` with `adhan` integration, `PrayerTimeline` construction, deterministic cache fingerprint, and comprehensive tests.

**Prerequisites:** M0

**Files/modules:**
- `src/domain/prayer/PrayerEngine.ts`
- `src/domain/prayer/PrayerTimeline.ts`
- `src/domain/prayer/types.ts`
- `src/domain/prayer/calculationMethods.ts`
- `src/domain/prayer/cacheFingerprint.ts`
- `src/domain/prayer/PrayerEngine.test.ts`
- `src/domain/prayer/PrayerTimeline.test.ts`

**Implementation tasks:**
1. Implement `calculate()` using `adhan` per PRAYER_ENGINE.md §4
2. Implement `buildPrayerTimeline()` — 3-day, 15-period contiguous timeline per PRAYER_ENGINE.md §5
3. Implement `PrayerPeriodInstance` model with `fullPeriodStart/End` and `sourceDate`
4. Implement `timeline.findPeriod()` — O(n) scan through periods
5. Implement `getCurrentPrayer()` and `getNextPrayer()` via timeline
6. Implement `calculationConfigFingerprint()` including ALL inputs per PRAYER_ENGINE.md §9
7. Implement high-latitude handling per PRAYER_ENGINE.md §8
8. Write all PrayerEngine tests (PE-01 through PE-12)
9. Write all PrayerTimeline tests (PT-01 through PT-09)
10. Write cache fingerprint tests (CF-01 through CF-08)
11. Validate against published prayer timetables

**Tests required:** PE-01–PE-12, PT-01–PT-09, CF-01–CF-08 (29 tests minimum)

**Definition of done:**
- All 29+ tests pass
- Prayer times match published references ±1 min
- Timeline is contiguous, no gaps
- `findPeriod(02:00 Tuesday)` returns Monday's ISHA
- Cache fingerprint changes when any single param changes
- Pure functions — no side effects, no React

**Review requirement:** ⚠️ Opus review required

---

## M3: Planning-Day Engine + Clipping

**Goal:** Implement `PlanningDayEngine` with Fajr-based, midnight, and custom clock-time boundaries, including period clipping.

**Prerequisites:** M2

**Files/modules:**
- `src/domain/planning-day/PlanningDayEngine.ts`
- `src/domain/planning-day/types.ts`
- `src/domain/planning-day/PlanningDayEngine.test.ts`

**Implementation tasks:**
1. Implement `resolvePlanningDayBoundaries()` — returns dayStart, dayEnd, key
2. Implement Fajr-based boundary (default): before-Fajr → previous day
3. Implement midnight-based boundary
4. Implement custom HH:mm boundary (Premium)
5. Implement `buildPlanningDay()` — clips PrayerTimeline periods to planning day interval
6. Handle clipped `PrayerPeriodInstance` records: set `start`/`end` to clipped values, preserve `fullPeriodStart`/`fullPeriodEnd`
7. Handle multi-instance prayer labels (e.g., two MAGHRIB fragments with custom 19:00 start)
8. Ensure tab order is ALWAYS Fajr→Isha regardless of config
9. Write all tests PD-01 through PD-15

**Tests required:** PD-01–PD-15 (15 tests minimum)

**Definition of done:**
- All planning-day tests pass
- 2 AM → previous day (Fajr start)
- Custom 19:00 clips correctly in summer and winter
- Multi-instance prayer labels handled
- Tabs always Fajr→Isha

**Review requirement:** ⚠️ Opus review required

---

## M4: Task Domain Model + Schema

**Goal:** Define database schema, TypeScript types, and repository layer with unified schedule data model.

**Prerequisites:** M0

**Files/modules:**
- `src/data/schema.ts` (Drizzle schema)
- `src/data/db.ts` (database initialization)
- `src/data/migrations/0001_initial.sql`
- `src/data/repositories/TaskDefinitionRepository.ts`
- `src/data/repositories/TaskOccurrenceRepository.ts`
- `src/domain/task/types.ts`
- `src/domain/task/scheduleDataParser.ts`
- `src/domain/task/TaskEngine.ts`
- Tests for all of the above

**Implementation tasks:**
1. Define Drizzle schema per DATA_MODEL.md §2 (including `hijri_month_overrides`)
2. Implement `scheduleDataParser`: runtime validation at repository boundary per DATA_MODEL.md §6.2
3. Implement `ScheduleDataMap` type mapping — `scheduleType` is sole discriminator
4. Implement `TaskDefinitionRepository` (CRUD)
5. Implement `TaskOccurrenceRepository` (CRUD + query by planning day + query by prayer section)
6. Implement `TaskEngine` (create, update, delete, complete, miss, cancel)
7. Write schedule data validation tests (SD-01 through SD-06)
8. Write repository CRUD tests
9. Write TaskEngine unit tests

**Tests required:** SD-01–SD-06, repository CRUD, TaskEngine status transitions

**Definition of done:**
- Schema created. `scheduleData` JSON has NO type field. `scheduleType` column is sole discriminator.
- Recurring series fields: `seriesId`, `effectiveFromDate`, `effectiveToDate` on `task_definitions`; `seriesId` on `task_occurrences`. Non-recurring tasks: `seriesId === id`.
- Runtime validation at repository boundary catches malformed JSON.
- All CRUD operations work. Status transitions enforced. UUIDs everywhere.
- Series operations (edit this/this+future/all, delete one/future/all) implemented per DATA_MODEL.md §4A.

**Review requirement:** ⚠️ Opus review required

---

## M5: Scheduling Engine + WallClockResolver

**Goal:** Implement the core scheduling pipeline with PrayerTimeline-based placement and explicit DST policy.

**Prerequisites:** M2, M3, M4

**Files/modules:**
- `src/domain/scheduling/SchedulingEngine.ts`
- `src/domain/scheduling/WallClockResolver.ts`
- `src/domain/scheduling/placement.ts`
- `src/domain/scheduling/types.ts`
- Tests for all of the above

**Implementation tasks:**
1. Implement `WallClockResolver` per SCHEDULING_ENGINE.md §2.4
2. Implement `SchedulingEngine.resolve()` — the full pipeline using PrayerTimeline
3. Implement `resolveExactTime()` using WallClockResolver + `timeline.findPeriod()`
4. Implement `resolvePrayerRelative()` using `timeline.findPeriod()`
5. Implement `resolvePrayerWindow()` using PlanningDay periods
6. Implement `resolveAnytimeToday()`
7. Implement task ordering per SCHEDULING_ENGINE.md §8
8. Implement materialization logic per SCHEDULING_ENGINE.md §11
9. Write WallClockResolver tests (WC-01 through WC-08, covering NYC + London DST)
10. Write all scheduling tests (SE-01 through SE-09, SR-01 through SR-06, SW-01 through SW-07, SA-01 through SA-04)
11. Write all critical path tests (§58 — 21 assertions)

**Tests required:** WC-01–WC-08, SE-01–SE-09, SR-01–SR-06, SW-01–SW-07, SA-01–SA-04, MC-01–MC-07 (45+ tests)

**Definition of done:**
- All 21 critical path tests pass
- WallClockResolver: spring-forward shifts forward, fall-back chooses first, tested in ≥2 timezones
- Before-Fajr placement: 02:00 Tue → Monday Isha
- Custom planning-day: correct clipping + multi-instance tabs

**Review requirement:** ⚠️ Opus review required (CRITICAL)

---

## M6: Local Persistence + Materialization

**Goal:** Wire repositories, materialization, and caching into a working data pipeline.

**Prerequisites:** M4, M5

**Files/modules:**
- `src/data/repositories/PrayerCacheRepository.ts`
- `src/data/repositories/UserSettingsRepository.ts`
- `src/data/seed/defaults.ts`

**Implementation tasks:**
1. Implement prayer time caching (keyed by fingerprint per PRAYER_ENGINE.md §9)
2. Implement UserSettings persistence
3. Wire materialization to run on app open
4. Implement sliding-window materialization (today ±7 days)
5. Implement cache invalidation when any fingerprint component changes
6. Seed default user settings on first launch
7. Integration tests: IT-01, IT-03, IT-06, IT-13

**Tests required:** IT-01, IT-03, IT-06, IT-13

**Definition of done:**
- Tasks persist across app restarts
- Prayer times cached by fingerprint, invalidated correctly
- Materialization generates correct occurrences

**Review requirement:** None

---

## M7: Today Screen

**Goal:** Build the primary Today screen with prayer tabs, task lists, and real-time updates.

**Prerequisites:** M1, M5, M6

**Files/modules:**
- `app/(tabs)/today.tsx`, `app/(tabs)/_layout.tsx`
- `src/components/prayer/PrayerTabBar.tsx` (handles multi-instance prayer label aggregation)
- `src/components/prayer/PrayerHeader.tsx`, `PrayerTransitionBanner.tsx`
- `src/components/task/TaskCard.tsx`, `TaskList.tsx`, `EmptyPrayerState.tsx`, `AllDoneState.tsx`, `AnytimeTodaySection.tsx`
- `src/components/layout/BottomNavBar.tsx`
- `src/hooks/usePrayerTimes.ts`, `useCurrentPrayer.ts`, `useTasksForPrayer.ts`, `useCountdown.ts`
- `src/stores/useTodayStore.ts`

**Implementation tasks:**
1. Bottom tab navigator (Today, Calendar, +, Worship, Settings)
2. PrayerTabBar: 5 tabs always Fajr→Isha. Each tab aggregates all PrayerPeriodInstances with its label.
3. Auto-select current prayer tab
4. PrayerHeader, TaskCard, TaskList, empty/done states, Anytime section
5. Task completion handler
6. Countdown hook
7. Wire hooks to stores + repositories
8. Component tests CT-01 through CT-10, CT-16

**Tests required:** CT-01–CT-10, CT-16

**Definition of done:** Today screen renders correctly with prayer tabs aggregating period instances.

**Review requirement:** None (but visual review recommended)

---

## M8: Hijri Calendar Core / HijriService

**Goal:** Foundational Hijri calendar service with per-month overrides and Islamic events. Moved UP from M13 to satisfy dependency requirements of RecurrenceEngine (M9), Calendar Month (M14), and Worship (M15).

**Prerequisites:** M4

**Files/modules:**
- `src/domain/calendar/HijriService.ts`
- `src/domain/calendar/IslamicEventsService.ts`
- `src/domain/calendar/types.ts`
- `src/data/repositories/HijriMonthOverrideRepository.ts`

**Implementation tasks:**
1. Implement `HijriService` using `@tabby_ai/hijri-converter`
2. Implement `getEffectiveDate(gregorianDate)` — applies base method + global adj + per-month override
3. Implement Hijri adjustment (global -2 to +2)
4. Implement per-month override CRUD (keyed by hijriYear + hijriMonth)
5. Override replaces global adjustment for that specific month
6. Historical overrides preserved indefinitely
7. Define Islamic events catalog — uses effective calendar, not hard-coded Gregorian dates
8. Implement `getIslamicEvents(gregorianDateRange)` — queries effective calendar
9. Write integration test IT-12

**Tests required:** Hijri conversion accuracy, per-month override, effective date resolution, IT-12

**Definition of done:**
- `getEffectiveDate()` correctly applies the multi-layer adjustment model
- Per-month override replaces (not adds to) global adjustment
- Islamic events mapped to correct Gregorian dates via effective calendar
- Historical overrides preserved

**Review requirement:** ⚠️ Opus review required

---

## M9: Recurrence Engine

**Goal:** Implement Gregorian and Hijri recurrence. Depends on M8 (HijriService) for Hijri calendar operations.

**Prerequisites:** M4, **M8** (HijriService)

**Files/modules:**
- `src/domain/recurrence/RecurrenceEngine.ts`
- `src/domain/recurrence/HijriRecurrenceEngine.ts`
- `src/domain/recurrence/types.ts`
- Tests

**Implementation tasks:**
1. Implement `RecurrenceEngine` wrapping `rrule`
2. Implement `occursOn(definition, date)` and `generateOccurrences(definition, dateRange)`
3. `occursOn()` must check `effectiveFromDate`/`effectiveToDate` bounds per ADR-024
4. Implement `HijriRecurrenceEngine` using `@tabby_ai/hijri-converter` + `HijriService` (from M8)
5. All Hijri recurrence uses the effective calendar (base + global adj + per-month override)
6. Write tests RE-01–RE-08, HR-01–HR-09, RS-01–RS-05

**Tests required:** RE-01–RE-08, HR-01–HR-09, RS-01–RS-05

**Definition of done:**
- Gregorian recurrence correct. Hijri recurrence uses effective calendar.
- `occursOn()` respects `effectiveFromDate`/`effectiveToDate` for series splits.
- Per-month override replaces global for that month. No duplicate occurrences.

**Review requirement:** ⚠️ Opus review required

---

## M10: Add Task Flows

**Goal:** Build the task creation UI supporting all 4 schedule modes and recurrence.

**Prerequisites:** M7, M9

**Files/modules:**
- `app/task/add.tsx`, `app/task/[id].tsx`
- `src/components/form/ScheduleModePicker.tsx`, `ExactTimePicker.tsx`, `PrayerRelativePicker.tsx`, `PrayerWindowPicker.tsx`, `RecurrencePicker.tsx`, `ReminderPicker.tsx`
- `src/stores/useTaskFormStore.ts`

**Implementation tasks:**
1. Add Task screen layout
2. Schedule mode picker (4 modes)
3. Time/prayer pickers for each mode
4. RecurrencePicker (uses RecurrenceEngine from M9)
5. More Options (reminder, priority, duration, notes, subtasks, tags)
6. Save flow → TaskEngine.createTask()
7. Task detail/edit screen
8. "Add to [Prayer]" shortcut
9. Series edit UI (this / this-and-future / all) per DATA_MODEL.md §4A

**Tests required:** CT-11–CT-14

**Definition of done:** All 4 schedule modes + recurrence functional. Series edit/delete dialogs work.

**Review requirement:** None

---

## M11: Missed/Completed/Overdue Behavior

**Goal:** Task lifecycle state machine and visual states.

**Prerequisites:** M5, M7

**Implementation tasks:**
1. Missed detection on PrayerPeriodInstance end
2. Missed detection on app foreground
3. Periodic check (60s interval)
4. Overdue display, completed visual state
5. Tests MC-01–MC-07

**Tests required:** MC-01–MC-07

**Definition of done:** Overdue derived, missed at correct boundaries, no auto-rollforward.

---

## M12: Location and Travel

**Goal:** Automatic and manual location with prayer recalculation.

**Prerequisites:** M2, M6

**Implementation tasks:**
1. `LocationService` (auto/manual)
2. `expo-location` foreground permission
3. Significant-change detection (10 km)
4. Manual location selector (bundled city dataset)
5. Wire location change → prayer recalculation + rematerialization
6. Handle permission denial gracefully

**Tests required:** IT-02

**Definition of done:** Auto + manual location work. Location change triggers full recalculation.

**Review requirement:** ⚠️ Opus review required

---

## M13: Notifications

**Goal:** Local notification scheduling and rescheduling.

**Prerequisites:** M2, M5, M12

**Implementation tasks per NOTIFICATIONS.md.**

**Review requirement:** ⚠️ Opus review required

---

## M14: Calendar Month

**Goal:** Month calendar with Gregorian/Hijri dates, task indicators, and Islamic events.

**Prerequisites:** M6, M7, **M8** (HijriService + Islamic events)

**Implementation tasks:**
1. MonthGrid layout with month navigation
2. Render Gregorian dates
3. Render Hijri dates using `HijriService.getEffectiveDate()` (from M8)
4. Show Islamic event indicators using `IslamicEventsService` (from M8)
5. Task count indicators per day
6. Date selection → load prayer-tab view for that date
7. Build Upcoming section

**Tests required:** CT-15

**Definition of done:** Calendar renders with Hijri dates from the effective calendar.

**Review requirement:** None

---

## M15–M24: Remaining Milestones

| Milestone | Goal | Prerequisites | Review |
|---|---|---|---|
| M15 | Worship Suggestions engine (uses HijriService effective calendar) | M9, M8 | ⚠️ Opus |
| M16 | Worship UI | M7, M15 | No |
| M17 | Settings (depends on PlanningDayEngine, HijriService, NotificationEngine) | M1, M3, M12, M13, M8 | No |
| M18 | Widgets — install `expo-widgets` (iOS, requires dev build) + Android widget lib. iOS requires `npx expo prebuild`. | M2, M5, M6 | No |
| M19 | Premium entitlement scaffolding | M4 | ⚠️ Opus |
| M20 | Onboarding | M1, M12, M2 | No |
| M21 | Dark mode polish | M1, all screens | No |
| M22 | Accessibility/RTL | All screens | No |
| M23 | QA + edge cases (all §58 tests + DST + travel + high-lat) | All | ⚠️ Opus |
| M24 | Release preparation (app icons, splash, store listing) | All | No |

---

## BLOCKING_PRODUCT_QUESTIONS

No blocking contradictions found in the MASTER_PRODUCT_SPEC.

**Minor clarifications resolved during architecture review:**
1. **Overnight prayer-window semantics** (§10.5): Not supported in v1. UI constrains to same-day prayers.
2. **Routines scope** (§30.3): Architecture allows routines; full routine/template UX deferred to post-MVP.
3. **Worship Duha window start**: Sunrise + 15 min as effective start, aligning with Islamic practice.
4. **Custom planning-day clipping**: Periods may be clipped and a prayer label may appear more than once in a planning day. UI tabs aggregate all instances of a label.
5. **Hijri moon-sighting variation**: Handled by per-month override model (ADR-018), not just a global integer.
6. **DST ambiguous/nonexistent times**: Handled by explicit WallClockResolver policy (ADR-017).

---

## Architecture Summary

The **Islamic Prayer-Centered Planner** uses:

- **`adhan`** for offline prayer time calculation
- **`PrayerTimeline`** (4-date calculation, 15 contiguous periods, exact boundaries — no approximation) for placement resolution across day boundaries
- **`WallClockResolver`** for deterministic DST handling
- **`PlanningDayEngine`** with period clipping for custom day boundaries
- **`planningDayKey` derivation** from the task's resolved temporal placement, never from the recurrence date (ADR-022)
- **PrayerWindow instance anchoring** via `sourceDate` matching to prevent duplicate-label spanning (ADR-023)
- **`luxon`** for timezone-aware date/time
- **`rrule`** + custom `HijriRecurrenceEngine` for recurrence (Hijri uses effective calendar with per-month overrides; HijriService implemented in M8 before RecurrenceEngine in M9)
- **Recurring series model**: `seriesId` + `effectiveFromDate`/`effectiveToDate` for split-series support; soft-delete preserves history (ADR-024)
- **`drizzle-orm`** + `expo-sqlite` for local persistence (OS-protected, not app-encrypted)
- **`zustand`** for UI state
- **Unified schedule data model**: `scheduleType` column is sole discriminator; `scheduleData` JSON has no redundant type field
- **Cache fingerprint**: deterministic key including all calculation inputs; stale data impossible
- **Layered architecture**: Presentation → Domain → Data → Platform with strict separation

The next milestone ready for implementation is **M2: Prayer-Time Engine + PrayerTimeline**.
