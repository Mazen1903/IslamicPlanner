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
  - `src/data/schema.ts` (DDL for 8 tables: tasks, occurrences, exceptions, settings, notification_schedule, worship_item_settings, journal_entries, etc.)
  - `src/data/db.ts` (Database connection and transaction manager)
  - `src/data/migrations/` (Versioned migration runner — 0000 through 0003)
- **Relevant Tests:**
  - `src/data/__tests__/db.test.ts`
  - `src/data/__tests__/migrations.test.ts`
- **Milestone Owner:** **M4 / M6 (CLOSED)** — schema extended by M15 (migration 0003)

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
  - `src/domain/notification/types.ts`
  - `src/domain/notification/notificationIdentity.ts`
  - `src/domain/notification/notificationTrigger.ts`
  - `src/domain/notification/notificationEquality.ts`
  - `src/domain/notification/index.ts`
  - `src/services/notification/NotificationSchedulerAdapter.ts`
  - `src/services/notification/NotificationChannelManager.ts`
  - `src/services/notification/NotificationBootstrap.ts`
  - `src/services/notification/NotificationReconciliationService.ts`
  - `src/services/notification/index.ts`
  - `app/(tabs)/settings/notifications.tsx`
- **Relevant Tests:**
  - `src/domain/notification/__tests__/notificationIdentity.test.ts`
  - `src/domain/notification/__tests__/notificationTrigger.test.ts`
  - `src/domain/notification/__tests__/notificationEquality.test.ts`
  - `src/services/notification/__tests__/NotificationSchedulerAdapter.test.ts`
  - `src/services/notification/__tests__/NotificationChannelManager.test.ts`
  - `src/services/notification/__tests__/NotificationBootstrap.test.ts`
  - `src/services/notification/__tests__/NotificationReconciliationService.test.ts`
  - `src/services/notification/__tests__/NotificationConcurrency.test.ts`
  - `src/services/notification/__tests__/NotificationIntegrations.test.ts`
  - `src/hooks/__tests__/useTodayNotifications.test.ts`
  - `app/(tabs)/settings/__tests__/notifications.test.tsx`
- **Milestone Owner:** **M13 (CLOSED / SONNET APPROVED)**

---

### 16. Calendar UI & Month Grid
- **Authoritative Docs:** `docs/MASTER_PRODUCT_SPEC.md` (Section 6), `docs/CURRENT_MILESTONE.md`
- **Source Paths:**
  - `src/domain/calendar/calendarGrid.ts` (Sunday-first 28/35/42-cell grid builder, Hijri mapping, accessibility labels)
  - `src/services/CalendarMonthOrchestrator.ts` (Dual date model, SETUP_REQUIRED safety, historical guard, batch query, upcoming sorting, 5-prayer projection)
  - `src/features/task-form/recurringHorizonSync.ts` (`syncRange` with `[monthStart - 2, monthEnd + 2]` seed range, Source-B non-recurring support)
  - `src/domain/materialization/MaterializationEngine.ts` (Split policy: `createAllowedPlanningDayKeyRange` on CREATE only, canonical PENDING rematerialization)
  - `src/data/repositories/TaskOccurrenceRepository.ts` (`findNonCancelledByPlanningDayKeyRange`)
  - `src/hooks/useCalendar.ts` (Calendar state, filler cell navigation, app foreground refresh)
  - `src/components/calendar/CalendarHeader.tsx` (Month title, Hijri header span, navigation)
  - `src/components/calendar/CalendarDayCell.tsx` (Single neutral task dot, accessible labels, touch targets)
  - `src/components/calendar/CalendarMonthGrid.tsx` (Sunday-first 4/5/6 row grid)
  - `src/components/calendar/DayDetailTaskList.tsx` (Exactly five prayer sections in fixed order, Sunrise excluded, secondary Anytime area, read-only cards)
  - `src/components/calendar/UpcomingSection.tsx` (Chronologically sorted future pending tasks in visible month, capped at 50)
  - `app/(tabs)/calendar.tsx` (Screen integration with SETUP_REQUIRED handling)
- **Relevant Tests:**
  - `src/domain/materialization/MaterializationEngine.test.ts` (CR-01..05)
  - `src/data/repositories/__tests__/TaskOccurrenceRepository.test.ts`
  - `src/features/task-form/__tests__/recurringHorizonSync.test.ts`
  - `src/domain/calendar/__tests__/calendarGrid.test.ts`
  - `src/services/__tests__/CalendarMonthOrchestrator.test.ts`
  - `src/components/calendar/__tests__/CalendarHeader.test.tsx`
  - `src/components/calendar/__tests__/CalendarDayCell.test.tsx`
  - `src/components/calendar/__tests__/CalendarMonthGrid.test.tsx`
  - `src/components/calendar/__tests__/DayDetailTaskList.test.tsx`
  - `src/components/calendar/__tests__/UpcomingSection.test.tsx`
  - `src/hooks/__tests__/useCalendar.test.ts`
  - `app/(tabs)/__tests__/calendar.test.tsx`
- **Milestone Owner:** **M14 (CLOSED / SONNET APPROVED)**

---

### 17. Worship Suggestions & Guidance — DEFERRED
- **Status:** DEFERRED. Journal replaces Worship in permanent bottom navigation. Worship may be re-introduced post-M24.
- **Dormant Schema:** `worship_item_settings` table, `task_definitions.worship_item_key`, source `WORSHIP`, `user_settings.worship_suggestions_enabled` — all remain in schema, untouched.
- **Authoritative Docs:** `docs/WORSHIP_ENGINE.md` (preserved with deferment header)
- **Source Paths:**
  - `src/domain/worship/` (empty stubs — preserved)
- **Milestone Owner:** **Deferred (was M15/M16)**

---

### 18. User Settings & Preferences
- **Authoritative Docs:** `docs/M17_ARCHITECTURE.md` (Frozen architecture specification), `docs/DATA_MODEL.md` (Table `user_settings`), `docs/DECISIONS.md`
- **Source Paths (M17):**
  - `src/data/repositories/UserSettingsRepository.ts` (existing, singleton `user_settings` upsert)
  - `src/hooks/usePrayerSettingsMutation.ts` (new — mutation + optional fullRefresh hook)
  - `src/hooks/useUserSettings.ts` (new — read hook)
  - `src/components/settings/` (new — SettingsRow, SettingsSectionHeader, SettingsToggle, SettingsSelectOption, SettingsStepper, SettingsInfoCard, SettingsScreenHeader)
  - `app/(tabs)/settings/_layout.tsx` (new — Stack navigator)
  - `app/(tabs)/settings/index.tsx` (replace placeholder — Settings Hub)
  - `app/(tabs)/settings/prayer-calculation.tsx` (new)
  - `app/(tabs)/settings/planning-day.tsx` (new)
  - `app/(tabs)/settings/hijri-calendar.tsx` (new)
  - `app/(tabs)/settings/appearance.tsx` (replace placeholder)
  - `app/(tabs)/settings/journal-privacy.tsx` (new)
  - `app/(tabs)/settings/about.tsx` (replace placeholder)
  - `app/(tabs)/settings/prayer-location.tsx` (existing, M12 — no changes)
  - `app/(tabs)/settings/notifications.tsx` (existing, M13 — no changes)
- **Relevant Tests:**
  - `src/services/__tests__/HijriAdjustmentConfigLoader.test.ts` (4 tests: loader, defaults, DB failure, error cause)
  - `src/services/__tests__/SettingsMutationCoordinator.test.ts` (validation, persistence order, refresh, Hijri overrides)
  - `src/features/task-form/__tests__/recurringHorizonSync.hijriConfig.test.ts` (H-01..H-08: dynamic loader, adjustments, protection)
  - `app/(tabs)/settings/__tests__/PrayerCalculation.test.tsx`
  - `app/(tabs)/settings/__tests__/PlanningDay.test.tsx`
  - `app/(tabs)/settings/__tests__/Appearance.test.tsx`
  - `app/(tabs)/settings/__tests__/JournalPrivacy.test.tsx`
  - `app/(tabs)/settings/__tests__/About.test.tsx`
  - `app/(tabs)/settings/__tests__/HijriCalendar.test.tsx`
  - `app/(tabs)/settings/__tests__/SettingsHub.test.tsx`
- **Milestone Owner:** **M17 (CLOSED / SONNET APPROVED)**

---

### 19. Journal Core & Privacy
- **Authoritative Docs:** `docs/M15_ARCHITECTURE.md` (Frozen architecture specification)
- **Source Paths:**
  - `src/domain/journal/types.ts` (JournalPayload, JournalEntry, JournalEntryRow, JournalEntryMetadata, JournalEntrySaveInput)
  - `src/domain/journal/errors.ts` (JournalEncryptionError, StaleWriteError, JournalKeyError)
  - `src/domain/journal/index.ts`
  - `src/data/repositories/JournalRepository.ts` (SQLite CRUD, revision-checked upsert, ciphertext-only boundary)
  - `src/data/schema.ts` — `journalEntries` table (appended at end of file)
  - `src/data/migrations/0003_colorful_gorilla_man.sql` (journal_entries + UNIQUE index)
  - `src/services/journal/JournalCryptoService.ts` (AES-256-GCM via expo-crypto)
  - `src/services/journal/JournalKeyManager.ts` (Key lifecycle via expo-secure-store slot `journal_encryption_key_v1`)
  - `src/services/journal/JournalService.ts` (Orchestrator: getCurrentPlanningDayKey, encrypt-then-persist, decrypt-on-load)
  - `src/services/journal/index.ts`
  - `src/__mocks__/expo-crypto.ts` (Jest mock using Node.js AES-256-GCM)
- **Relevant Tests:**
  - `src/data/repositories/__tests__/JournalRepository.test.ts` (JR-01..JR-13)
  - `src/data/migrations/__tests__/migration0003.test.ts` (JM-01..JM-04)
  - `src/services/journal/__tests__/JournalCryptoService.test.ts` (JC-01..JC-09)
  - `src/services/journal/__tests__/JournalKeyManager.test.ts` (JK-01..JK-07)
  - `src/services/journal/__tests__/JournalService.test.ts` (JS-01..JS-11)
- **Milestone Owner:** **M15 (CLOSED / SONNET APPROVED)**
- **Native AES Verification:** Pending physical-device development build (does not reopen M15)

---

### 20. Journal Experience / UI
- **Authoritative Docs:** `docs/M16_ARCHITECTURE.md` (Frozen architecture specification)
- **Source Paths:**
  - `app/(tabs)/journal.tsx` (replaces worship tab)
  - `src/components/journal/` (JournalEditor, JournalHeader, ReflectionSection, JournalHistory, JournalHistoryRow, JournalLockedState, JournalPrivacySheet, JournalSaveStatus, JournalDeleteDialog)
  - `src/hooks/useJournal.ts`
  - `src/services/journal/JournalAutosaveController.ts`
  - `src/services/journal/JournalLockController.ts`
  - `src/services/journal/JournalLockPreference.ts`
  - `src/services/journal/LocalAuthenticationAdapter.ts`
- **Relevant Tests:**
  - `app/(tabs)/__tests__/journal.test.tsx`
  - `src/components/journal/__tests__/JournalEditor.test.tsx`
  - `src/components/journal/__tests__/JournalHeader.test.tsx`
  - `src/components/journal/__tests__/JournalHistory.test.tsx`
  - `src/components/journal/__tests__/JournalHistoryRow.test.tsx`
  - `src/components/journal/__tests__/JournalLockedState.test.tsx`
  - `src/components/journal/__tests__/JournalPrivacySheet.test.tsx`
  - `src/components/journal/__tests__/JournalSaveStatus.test.tsx`
  - `src/components/journal/__tests__/JournalDeleteDialog.test.tsx`
  - `src/components/journal/__tests__/ReflectionSection.test.tsx`
  - `src/hooks/__tests__/useJournal.test.ts`
  - `src/services/journal/__tests__/JournalAutosaveController.test.ts` (ASC-01..ASC-17)
  - `src/services/journal/__tests__/JournalLockController.test.ts` (LC-01..LC-18)
  - `src/services/journal/__tests__/JournalLockPreference.test.ts`
  - `src/services/journal/__tests__/LocalAuthenticationAdapter.test.ts`
- **Milestone Owner:** **M16 (CLOSED / SONNET APPROVED)**
- **Native Biometric Verification:** Pending physical-device development build (does not reopen M16)

---

### 21. Home Screen Widgets
- **Authoritative Docs:** `docs/M18_ARCHITECTURE.md` (Frozen — CLOSED)
- **Source Paths:**
  - `src/services/widget/types.ts` (`WidgetSnapshot`, `WidgetTaskEntry`, `WidgetPrayerEntry`)
  - `src/services/widget/WidgetSnapshotBuilder.ts` (pure TypeScript, testable without native)
  - `src/services/widget/WidgetSyncCoordinator.ts` (non-React singleton, best-effort iOS + Android push)
  - `src/services/widget/index.ts`
  - `widgets/tokens.ts` (literal design tokens — no `@/theme` in widget bundle)
  - `widgets/ios/SmallWidget.tsx` (`'widget'` directive, `@expo/ui/swift-ui` only)
  - `widgets/ios/MediumWidget.tsx` (`'widget'` directive, `@expo/ui/swift-ui` only)
  - `widgets/android/SmallWidgetComponent.tsx` (React Native layout)
  - `widgets/android/MediumWidgetComponent.tsx` (React Native layout)
  - `widgets/android/widgetTaskHandler.ts` (headless Android AppWidget lifecycle handler)
  - `index.ts` (custom app entry — `registerWidgetTaskHandler` before `expo-router/entry`)
  - `plugins/withAndroidWorkManagerResolution.js` (CNG-compatible WorkManager alignment plugin)
  - `src/__mocks__/expo-widgets.ts`
  - `src/__mocks__/react-native-android-widget.ts`
  - `app.json` (expo-widgets + react-native-android-widget plugin config)
- **Relevant Tests:**
  - `src/services/widget/__tests__/WidgetSnapshotBuilder.test.ts`
  - `src/services/widget/__tests__/WidgetSyncCoordinator.test.ts` (SY, IOS, AND, CFG, PV groups)
  - `src/hooks/__tests__/useTodayNotifications.test.ts` (widget sync wiring)
- **Milestone Owner:** **M18 (CLOSED / SONNET APPROVED)**
- **iOS Native QA:** Pending macOS/EAS (does not reopen M18)
- **Android Physical-Runtime QA:** Pending physical device (does not reopen M18)

---

### 22. Premium Entitlement Scaffolding
- **Authoritative Docs:** TBD (architecture not yet frozen)
- **Source Paths:** TBD
- **Relevant Tests:** TBD
- **Milestone Owner:** **M19 (PENDING — ARCHITECTURE NOT YET FROZEN)**
