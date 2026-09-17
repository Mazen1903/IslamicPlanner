# Architecture Lookup Index

> **Purpose:** Directs AI agents and reviewers to authoritative documentation, source code, and test suites for each subsystem without requiring repository-wide document loads.

---

### 1. Prayer Engine & Calculation
- **Authoritative Docs:** `docs/PRAYER_ENGINE.md`, `docs/DECISIONS.md` (ADR-016, ADR-019)
- **Source Paths:**
  - `src/domain/prayer/PrayerEngine.ts` (Astronomical Adhan wrapper)
  - `src/domain/prayer/PrayerTimeline.ts` (3-day, 15-period contiguous timeline model)
  - `src/domain/prayer/calculationMethods.ts` (Calculation authorities, juristic rules)
  - `src/domain/prayer/cacheFingerprint.ts` (14-parameter cache invalidation fingerprint)
  - `src/domain/prayer/types.ts`
- **Relevant Tests:**
  - `src/domain/prayer/PrayerEngine.test.ts`
  - `src/domain/prayer/PrayerTimeline.test.ts`
  - `src/domain/prayer/calculationMethods.test.ts`
  - `src/domain/prayer/cacheFingerprint.test.ts`
- **Milestone Owner:** **M2 (CLOSED)**

---

### 2. Planning Day & Rollover Logic
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 3), `docs/DECISIONS.md` (ADR-022)
- **Source Paths:**
  - `src/domain/planning-day/PlanningDayEngine.ts` (Rollover modes: Fajr, Midnight, Custom)
  - `src/domain/planning-day/types.ts`
- **Relevant Tests:**
  - `src/domain/planning-day/PlanningDayEngine.test.ts`
- **Milestone Owner:** **M3 (CLOSED)**

---

### 3. Task Domain & Series Model
- **Authoritative Docs:** `docs/DATA_MODEL.md`, `docs/DECISIONS.md` (ADR-020, ADR-024)
- **Source Paths:**
  - `src/domain/task/TaskEngine.ts` (Series splitting, subtasks, exceptions)
  - `src/domain/task/scheduleDataParser.ts` (Schedule JSON parser without redundant type tag)
  - `src/domain/task/types.ts`
- **Relevant Tests:**
  - `src/domain/task/__tests__/TaskEngine.series.test.ts`
  - `src/domain/task/__tests__/TaskEngine.subtasks.test.ts`
  - `src/domain/task/__tests__/scheduleDataParser.test.ts`
- **Milestone Owner:** **M4 (CLOSED)**

---

### 4. Scheduling Engine & WallClockResolver
- **Authoritative Docs:** `docs/SCHEDULING_ENGINE.md`, `docs/DECISIONS.md` (ADR-017, ADR-023)
- **Source Paths:**
  - `src/domain/scheduling/SchedulingEngine.ts` (Relative prayer math, prayer window bounds)
  - `src/domain/scheduling/WallClockResolver.ts` (Civil wall-clock to UTC, DST gap/overlap)
  - `src/domain/scheduling/types.ts`
  - `src/domain/temporal/`
- **Relevant Tests:**
  - `src/domain/scheduling/SchedulingEngine.test.ts`
  - `src/domain/scheduling/WallClockResolver.test.ts`
- **Milestone Owner:** **M5 (CLOSED / OPUS APPROVED)**

---

### 5. Materialization & Persistence Pipeline
- **Authoritative Docs:** `docs/TECHNICAL_ARCHITECTURE.md`, `docs/DATA_MODEL.md`
- **Source Paths:**
  - `src/domain/materialization/MaterializationEngine.ts` (Sync window, idempotency, terminal freeze)
  - `src/domain/materialization/types.ts`
  - `src/data/repositories/TaskDefinitionRepository.ts`
  - `src/data/repositories/TaskOccurrenceRepository.ts`
- **Relevant Tests:**
  - `src/domain/materialization/MaterializationEngine.test.ts`
  - `src/data/repositories/__tests__/TaskDefinitionRepository.test.ts`
  - `src/data/repositories/__tests__/TaskOccurrenceRepository.test.ts`
- **Milestone Owner:** **M6 (CLOSED / OPUS APPROVED)**

---

### 6. Today Screen & View Model Projection
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 5), `docs/TECHNICAL_ARCHITECTURE.md` (Section 6)
- **Source Paths:**
  - `src/services/today/TodayOrchestrator.ts` (Single coordinator for Today runtime)
  - `src/services/today/TodayViewModelProjection.ts` (Tab filtering, sorting, PrayerWindow projection)
  - `src/services/today/TodayTemporalInputProvider.ts` (Seam for time, prayer timeline, settings)
  - `src/stores/useTodayStore.ts` (Zustand store: selected prayer tab, refresh triggers)
  - `src/components/today/` (PrayerTabBar, TaskList, TaskItem, DaySummaryHeader)
  - `src/screens/TodayScreen.tsx`
- **Relevant Tests:**
  - `src/__tests__/services/TodayOrchestrator.test.ts`
  - `src/__tests__/services/TodayTemporalInputProvider.test.ts`
  - `src/__tests__/services/TodayViewModelProjection.test.ts`
  - `src/__tests__/data/findTodayCandidates.test.ts`
  - `src/__tests__/components/TodayAccessibility.test.tsx`
- **Milestone Owner:** **M7 (CLOSED / OPUS APPROVED)**

---

### 7. Hijri Calendar Core
- **Authoritative Docs:** `docs/DECISIONS.md` (ADR-005, ADR-018), `docs/IMPLEMENTATION_STATUS.md`
- **Source Paths:**
  - `src/domain/calendar/HijriService.ts` (Core service: civil conversion, adjustments, reverse resolution)
  - `src/domain/calendar/HijriCalendarAdapter.ts` (Umm al-Qura adapter isolating `@tabby_ai/hijri-converter`)
  - `src/domain/calendar/types.ts` (Canonical HijriDate, adjustment types, resolution results)
  - `src/domain/calendar/errors.ts` (Domain error hierarchy: HijriConversionError, HijriValidationError, etc.)
  - `src/domain/calendar/constants.ts` (Constants, month names, supported range)
- **Relevant Tests:**
  - `src/domain/calendar/__tests__/HijriService.test.ts` (89 tests: Tier A/B fixtures, reverse resolution, adjustments)
  - `src/domain/calendar/__tests__/HijriCalendarAdapter.test.ts` (8 tests: isolation, range, month lengths)
- **Milestone Owner:** **M8 (CLOSED / OPUS APPROVED)**

---

### 8. Recurrence Engine
- **Authoritative Docs:** `docs/CURRENT_MILESTONE.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 4), `docs/TECHNICAL_ARCHITECTURE.md` (Section 4), `docs/DATA_MODEL.md` (TaskDefinition recurrence fields)
- **Source Paths:**
  - `src/domain/recurrence/RecurrenceEngine.ts` (Core engine: occursOn, generateSeedDates, classifyRecurrence)
  - `src/domain/recurrence/rruleAdapter.ts` (Strict bare RRULE parser, token validator, allowlist enforcement)
  - `src/domain/recurrence/gregorianRecurrence.ts` (DAILY, WEEKLY, and MONTHLY clamp algorithms)
  - `src/domain/recurrence/hijriRecurrence.ts` (Canonical Hijri membership, 29/30 day clamp, ambiguity handling)
  - `src/domain/recurrence/dateUtils.ts` (Pure civil date arithmetic: isoWeekday, civilDaysBetween, addCivilDays)
  - `src/domain/recurrence/types.ts` (Domain types: RecurrenceContext, CivilDateRange, GregorianRecurrenceRule)
  - `src/domain/recurrence/errors.ts` (RecurrenceError and RecurrenceErrorCode hierarchy)
  - `src/domain/recurrence/index.ts` (Public module exports)
- **Relevant Tests:**
  - `src/domain/recurrence/__tests__/RecurrenceEngine.test.ts` (100 tests covering invariants, Gregorian, weekly phase, parser, Hijri, range errors, version splits, timezone independence)
- **Milestone Owner:** **M9 (CLOSED / OPUS APPROVED)**

---

### 9. Add/Edit Task
- **Authoritative Docs:** `docs/M10_ARCHITECTURE.md`, `docs/CURRENT_MILESTONE.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 4), `docs/TECHNICAL_ARCHITECTURE.md` (Section 6)
- **Relevant Closed-Milestone Sources:**
  - `src/domain/task/` (M4: TaskEngine, types, scheduleDataParser)
  - `src/domain/scheduling/` (M5: SchedulingEngine, WallClockResolver)
  - `src/domain/materialization/` (M6: MaterializationEngine)
  - `src/domain/recurrence/` (M9: RecurrenceEngine, rruleAdapter)
  - `src/theme/`, `src/components/common/` (M1: Light design system tokens and components)
- **Implementation Source Paths:**
  - `src/features/task-form/` (types, formReducer, formValidation, taskDraftMapper, rruleSerializer, previewService, errorTranslator, syncService, recurringHorizonSync, TaskFormOrchestrator)
  - `src/services/PlannerRefreshCoordinator.ts`
  - `src/components/task-form/` (Form screen, schedule mode cards, pickers, success screens, scope sheet)
  - `app/(tabs)/add.tsx` (Add tab route)
  - `app/task/add.tsx` (Deep-linkable add route)
  - `app/task/[id].tsx` (Edit task route)
- **Relevant Tests:**
  - `src/features/task-form/__tests__/`
  - `src/services/__tests__/PlannerRefreshCoordinator.test.ts`
  - `src/components/task-form/__tests__/`
- **Milestone Owner:** **M10 (CLOSED / SONNET APPROVED)**

---

### 10. Missed / Completed / Overdue Behavior & Task Lifecycle
- **Authoritative Docs:** `docs/CURRENT_MILESTONE.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 12), `docs/DATA_MODEL.md` (Section 527–529)
- **Source Paths:**
  - `src/services/OccurrenceLifecycleService.ts` (Expired task detection, atomic transitions, date-scoped timeline caching)
  - `src/services/TodayViewModelProjection.ts` (TaskCardViewModel `dueAt`/`expiresAt`, pure `deriveOverdueState` selector)
  - `src/services/PlannerRefreshCoordinator.ts` (Full refresh coordination: inputs -> sync -> refreshToday -> sweepExpired -> conditional queryAndProject)
  - `src/components/task/TaskCard.tsx` (Calm overdue indicator, completed styling, missed badge)
  - `src/hooks/useToday.ts` (Prayer transition lifecycle sweep without horizon generation)
  - `src/hooks/usePrayerTimer.ts` (Updates store `nowMs` on 1s tick, single timer owner)
  - `src/stores/useTodayStore.ts` (Reactive `nowMs` for overdue UI derivation)
  - `src/data/repositories/TaskOccurrenceRepository.ts` (`findAllMaterializedPending`, atomic `updateStatus` with `WHERE status = 'PENDING'`)
- **Relevant Tests:**
  - `src/services/__tests__/OccurrenceLifecycleService.test.ts` (20 tests: state machine, atomic races, boundaries, caching, catch-up)
  - `src/components/task/__tests__/TaskCardVisualStates.test.tsx` (7 UI tests: calm overdue, live tick, expiry, missed, completed)
  - `src/services/__tests__/PlannerRefreshCoordinator.test.ts` (Full refresh order, conditional reprojection)
  - `src/__tests__/services/TodayViewModelProjection.test.ts`
- **Milestone Owner:** **M11 (CLOSED / SONNET APPROVED)**

---

### 11. Database Schema & Migrations
- **Authoritative Docs:** `docs/DATA_MODEL.md`, `docs/DECISIONS.md` (ADR-001, ADR-002, ADR-018, ADR-020)
- **Source Paths:**
  - `src/data/schema.ts` (DDL for 7 tables: tasks, occurrences, exceptions, settings, etc.)
  - `src/data/db.ts` (Database connection and transaction manager)
  - `src/data/migrations/` (Versioned migration runner)
- **Relevant Tests:**
  - `src/data/__tests__/db.test.ts`
  - `src/data/__tests__/migrations.test.ts`
- **Milestone Owner:** **M4 / M6 (CLOSED)**

---

### 12. Design System & Theme Foundation
- **Authoritative Docs:** `docs/UI_SYSTEM.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 9)
- **Source Paths:**
  - `src/theme/` (Colors, typography, spacing, shadows, border radii)
  - `src/components/common/` (`Button.tsx`, `Card.tsx`, `Icon.tsx`, `Toggle.tsx`)
- **Relevant Tests:**
  - `src/theme/__tests__/Theme.test.tsx`
  - `src/components/common/__tests__/Button.test.tsx`
  - `src/components/common/__tests__/Card.test.tsx`
  - `src/components/common/__tests__/Icon.test.tsx`
  - `src/components/common/__tests__/Toggle.test.tsx`
- **Milestone Owner:** **M1 (CLOSED)**

---

### 13. Navigation & App Shell
- **Authoritative Docs:** `docs/TECHNICAL_ARCHITECTURE.md` (Section 7), `docs/MASTER_PRODUCT_SPEC.md` (Section 2)
- **Source Paths:**
  - `src/navigation/` (Root navigator, bottom tab bar: Today, Calendar, +, Worship, Settings)
  - `App.tsx`
- **Milestone Owner:** **M0 / M1 (CLOSED)**

---

### 14. Location & Travel Detection
- **Authoritative Docs:** `docs/TECHNICAL_ARCHITECTURE.md` (Section 5), `docs/DECISIONS.md` (ADR-003), `docs/GEONAMES_ATTRIBUTION.md`
- **Source Paths:**
  - `src/domain/location/types.ts`
  - `src/domain/location/haversine.ts` (10 km threshold evaluation)
  - `src/domain/location/environmentComparator.ts`
  - `src/domain/location/cityLoader.ts` (Lazy dynamic loader)
  - `src/domain/location/citySearch.ts` (Exact > prefix > substring ranking)
  - `src/data/repositories/UserSettingsRepository.ts` (AUTO/MANUAL coordinate isolation)
  - `src/services/LocationService.ts`
  - `src/services/LocationRefreshCoordinator.ts` (Non-prompting GPS check & jitter filtering)
  - `src/hooks/useLocation.ts`
- **Relevant Tests:**
  - `src/domain/location/__tests__/haversine.test.ts`
  - `src/domain/location/__tests__/environmentComparator.test.ts`
  - `src/domain/location/__tests__/citySearch.test.ts`
  - `src/data/repositories/__tests__/UserSettingsRepository.test.ts`
  - `src/services/__tests__/LocationService.test.ts`
  - `src/services/__tests__/LocationRefreshCoordinator.test.ts`
  - `src/hooks/__tests__/useLocation.test.ts`
  - `src/__tests__/services/LocationTravelIntegration.test.ts`
- **Milestone Owner:** **M12 (CLOSED / SONNET APPROVED)**

---

### 15. Notifications & Reminders
- **Authoritative Docs:** `docs/NOTIFICATIONS.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 8)
- **Source Paths:**
  - `src/domain/notification/`
- **Relevant Tests:** (To be created in M13)
- **Milestone Owner:** **M13 (PENDING)**

---

### 16. Calendar UI & Month Grid
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 6)
- **Source Paths:**
  - `src/domain/calendar/CalendarEngine.ts`
  - `src/screens/CalendarScreen.tsx`
  - `src/components/calendar/`
- **Relevant Tests:** (To be created in M14)
- **Milestone Owner:** **M14 (PENDING)**

---

### 17. Worship Suggestions & Guidance
- **Authoritative Docs:** `docs/WORSHIP_ENGINE.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 7)
- **Source Paths:**
  - `src/domain/worship/`
  - `src/components/worship/`
  - `src/screens/WorshipScreen.tsx`
- **Relevant Tests:** (To be created in M15/M16)
- **Milestone Owner:** **M15 (Engine) / M16 (UI) (PENDING)**

---

### 18. User Settings & Preferences
- **Authoritative Docs:** `docs/DATA_MODEL.md` (Table `user_settings`), `docs/DECISIONS.md`
- **Source Paths:**
  - `src/data/repositories/UserSettingsRepository.ts`
  - `src/screens/SettingsScreen.tsx`
- **Relevant Tests:** (To be created in M17)
- **Milestone Owner:** **M17 (PENDING)**
