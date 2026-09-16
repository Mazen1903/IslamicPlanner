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
- **Authoritative Docs:** `docs/CURRENT_MILESTONE.md`, `docs/DECISIONS.md` (ADR-018)
- **Source Paths:**
  - `src/domain/calendar/HijriService.ts`
  - `src/domain/calendar/TabbyHijriAdapter.ts` (Adapter for `@tabby_ai/hijri-converter`)
  - `src/domain/calendar/types.ts`
- **Relevant Tests:**
  - `src/domain/calendar/__tests__/` (To be created in M8)
- **Milestone Owner:** **M8 (CURRENT / ARCHITECTURE)**

---

### 8. Recurrence Engine
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 4), `docs/TECHNICAL_ARCHITECTURE.md` (Section 4)
- **Source Paths:**
  - `src/domain/recurrence/`
- **Relevant Tests:**
  - `src/domain/recurrence/__tests__/` (To be created in M9)
- **Milestone Owner:** **M9 (PENDING)**

---

### 9. Database Schema & Migrations
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

### 10. Design System & Theme Foundation
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

### 11. Navigation & App Shell
- **Authoritative Docs:** `docs/TECHNICAL_ARCHITECTURE.md` (Section 7), `docs/MASTER_PRODUCT_SPEC.md` (Section 2)
- **Source Paths:**
  - `src/navigation/` (Root navigator, bottom tab bar: Today, Calendar, +, Worship, Settings)
  - `App.tsx`
- **Milestone Owner:** **M0 / M1 (CLOSED)**

---

### 12. Location & Travel Detection
- **Authoritative Docs:** `docs/TECHNICAL_ARCHITECTURE.md` (Section 5), `docs/DECISIONS.md` (ADR-003)
- **Source Paths:**
  - `src/domain/location/`
  - `src/data/repositories/LocationRepository.ts`
- **Relevant Tests:** (To be created in M12)
- **Milestone Owner:** **M12 (PENDING)**

---

### 13. Notifications & Reminders
- **Authoritative Docs:** `docs/NOTIFICATIONS.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 8)
- **Source Paths:**
  - `src/domain/notification/`
- **Relevant Tests:** (To be created in M13)
- **Milestone Owner:** **M13 (PENDING)**

---

### 14. Calendar UI & Month Grid
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 6)
- **Source Paths:**
  - `src/domain/calendar/CalendarEngine.ts`
  - `src/screens/CalendarScreen.tsx`
  - `src/components/calendar/`
- **Relevant Tests:** (To be created in M14)
- **Milestone Owner:** **M14 (PENDING)**

---

### 15. Worship Suggestions & Guidance
- **Authoritative Docs:** `docs/WORSHIP_ENGINE.md`, `docs/MASTER_PRODUCT_SPEC.md` (Section 7)
- **Source Paths:**
  - `src/domain/worship/`
  - `src/components/worship/`
  - `src/screens/WorshipScreen.tsx`
- **Relevant Tests:** (To be created in M15/M16)
- **Milestone Owner:** **M15 (Engine) / M16 (UI) (PENDING)**

---

### 16. User Settings & Preferences
- **Authoritative Docs:** `docs/DATA_MODEL.md` (Table `user_settings`), `docs/DECISIONS.md`
- **Source Paths:**
  - `src/data/repositories/UserSettingsRepository.ts`
  - `src/screens/SettingsScreen.tsx`
- **Relevant Tests:** (To be created in M17)
- **Milestone Owner:** **M17 (PENDING)**
