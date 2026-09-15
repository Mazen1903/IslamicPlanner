# Implementation Status

**Current Milestone:** M2 — Prayer-Time Engine + PrayerTimeline (Completed, pending Opus review)  
**Last Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Project:** Islamic Prayer-Centered Planner  

---

## Milestone Progress

| Milestone | Description | Status | Completed Date | Notes |
|---|---|---|---|---|
| **M0** | Repository and project foundation | **Completed** | 2026-09-14 | Expo SDK 57, TypeScript strict, Jest, ESLint, Prettier, Drizzle, directory structure & placeholders |
| **M1** | Design system and theme tokens | **Completed** | 2026-09-14 | Theme tokens, light/dark themes, ThemeProvider, Button, Card, Toggle, Icon, SafeArea, demo screen, 17 unit tests |
| **M2** | Prayer-time engine + PrayerTimeline | **Completed** | 2026-09-14 | All 71 domain tests pass, 100% exact boundaries, ±1 min published verification, Opus review required |
| **M3** | Planning-day engine + clipping | **Completed** | 2026-09-14 | All 32 domain tests pass, Fajr/Midnight/Custom boundaries, explicit DST resolution, non-mutating clipping, Opus review required |
| **M4** | Task domain model + schema (includes series) | Not Started | — | Prerequisites: M0. Opus review required. Includes seriesId/effectiveFromDate/effectiveToDate (ADR-024) |
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


