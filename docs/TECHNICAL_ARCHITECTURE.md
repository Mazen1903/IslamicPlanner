# Technical Architecture

**Status:** Source of truth for implementation agents  
**Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Companion documents:** DECISIONS.md, DATA_MODEL.md, SCHEDULING_ENGINE.md, PRAYER_ENGINE.md, WORSHIP_ENGINE.md, NOTIFICATIONS.md, UI_SYSTEM.md, TEST_PLAN.md, IMPLEMENTATION_PLAN.md

---

## 1. System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Expo Router · React Native Screens · Zustand UI Stores     │
│  Theme Provider · Widgets (iOS/Android)                      │
├─────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                            │
│  PrayerEngine · PrayerTimeline · PlanningDayEngine           │
│  SchedulingEngine · WallClockResolver · TaskEngine           │
│  RecurrenceEngine · WorshipEngine · HijriService             │
│  NotificationEngine · CalendarEngine · LocationService       │
│  PremiumEntitlementService                                   │
├─────────────────────────────────────────────────────────────┤
│                       DATA LAYER                             │
│  Drizzle ORM · expo-sqlite · Repositories                   │
│  CacheService · MigrationRunner                              │
├─────────────────────────────────────────────────────────────┤
│                   PLATFORM / INFRA LAYER                     │
│  expo-location · expo-notifications · expo-font              │
│  expo-task-manager · expo-widgets · expo-secure-store        │
│  adhan · rrule · luxon · @tabby_ai/hijri-converter          │
└─────────────────────────────────────────────────────────────┘
```

### Layer rules

1. **Presentation** may call Domain, never Data or Platform directly.
2. **Domain** may call Data and Platform. Domain modules may call each other via well-defined interfaces.
3. **Data** may call Platform (for SQLite driver). Data never calls Domain or Presentation.
4. **Platform** is external libraries and OS APIs. No business logic here.

---

## 2. Directory Structure

```text
/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (tabs)/                   # Bottom tab navigator
│   │   ├── today.tsx             # Today screen
│   │   ├── calendar.tsx          # Calendar month screen
│   │   ├── worship.tsx           # Worship suggestions screen
│   │   └── settings/             # Settings stack
│   │       ├── index.tsx
│   │       ├── prayer-location.tsx
│   │       ├── planner.tsx
│   │       ├── notifications.tsx
│   │       ├── appearance.tsx
│   │       ├── calendar-settings.tsx
│   │       ├── account.tsx
│   │       ├── premium.tsx
│   │       └── about.tsx
│   ├── task/
│   │   ├── add.tsx               # Add Task modal/screen
│   │   └── [id].tsx              # Task detail/edit
│   ├── onboarding/
│   │   └── index.tsx
│   └── _layout.tsx               # Root layout
│
├── src/
│   ├── domain/                   # Pure business logic (no React imports)
│   │   ├── prayer/
│   │   │   ├── PrayerEngine.ts
│   │   │   ├── PrayerTimeline.ts
│   │   │   ├── cacheFingerprint.ts
│   │   │   ├── PrayerEngine.test.ts
│   │   │   ├── PrayerTimeline.test.ts
│   │   │   ├── types.ts
│   │   │   └── calculationMethods.ts
│   │   ├── planning-day/
│   │   │   ├── PlanningDayEngine.ts
│   │   │   ├── PlanningDayEngine.test.ts
│   │   │   └── types.ts
│   │   ├── task/
│   │   │   ├── TaskEngine.ts
│   │   │   ├── TaskEngine.test.ts
│   │   │   └── types.ts
│   │   ├── scheduling/
│   │   │   ├── SchedulingEngine.ts
│   │   │   ├── WallClockResolver.ts
│   │   │   ├── SchedulingEngine.test.ts
│   │   │   ├── WallClockResolver.test.ts
│   │   │   ├── placement.ts
│   │   │   └── types.ts
│   │   ├── recurrence/
│   │   │   ├── RecurrenceEngine.ts
│   │   │   ├── RecurrenceEngine.test.ts
│   │   │   ├── HijriRecurrenceEngine.ts
│   │   │   ├── HijriRecurrenceEngine.test.ts
│   │   │   └── types.ts
│   │   ├── worship/
│   │   │   ├── WorshipEngine.ts
│   │   │   ├── WorshipEngine.test.ts
│   │   │   ├── worshipDefinitions.ts
│   │   │   └── types.ts
│   │   ├── notification/
│   │   │   ├── NotificationEngine.ts
│   │   │   ├── NotificationEngine.test.ts
│   │   │   └── types.ts
│   │   ├── calendar/
│   │   │   ├── CalendarEngine.ts
│   │   │   ├── HijriService.ts
│   │   │   └── types.ts
│   │   ├── location/
│   │   │   ├── LocationService.ts
│   │   │   └── types.ts
│   │   └── premium/
│   │       ├── PremiumService.ts
│   │       └── types.ts
│   │
│   ├── data/                     # Persistence layer
│   │   ├── db.ts                 # Database initialization
│   │   ├── schema.ts             # Drizzle schema definitions
│   │   ├── migrations/           # SQL migrations
│   │   ├── repositories/
│   │   │   ├── TaskDefinitionRepository.ts
│   │   │   ├── TaskOccurrenceRepository.ts
│   │   │   ├── PrayerCacheRepository.ts
│   │   │   ├── HijriMonthOverrideRepository.ts
│   │   │   ├── WorshipSettingsRepository.ts
│   │   │   └── UserSettingsRepository.ts
│   │   └── seed/                 # Default data
│   │       └── defaultWorshipItems.ts
│   │
│   ├── stores/                   # Zustand stores (UI state)
│   │   ├── useTodayStore.ts
│   │   ├── useCalendarStore.ts
│   │   ├── useTaskFormStore.ts
│   │   ├── useSettingsStore.ts
│   │   └── useAppStore.ts
│   │
│   ├── hooks/                    # React hooks bridging domain → UI
│   │   ├── usePrayerTimes.ts
│   │   ├── useCurrentPrayer.ts
│   │   ├── usePlanningDay.ts
│   │   ├── useTasksForPrayer.ts
│   │   ├── useCountdown.ts
│   │   └── useLocation.ts
│   │
│   ├── components/               # Reusable UI components
│   │   ├── prayer/
│   │   │   ├── PrayerTabBar.tsx
│   │   │   ├── PrayerHeader.tsx
│   │   │   └── PrayerTransitionBanner.tsx
│   │   ├── task/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── EmptyPrayerState.tsx
│   │   │   ├── AllDoneState.tsx
│   │   │   └── AnytimeTodaySection.tsx
│   │   ├── form/
│   │   │   ├── ScheduleModePicker.tsx
│   │   │   ├── ExactTimePicker.tsx
│   │   │   ├── PrayerRelativePicker.tsx
│   │   │   ├── PrayerWindowPicker.tsx
│   │   │   ├── RecurrencePicker.tsx
│   │   │   └── ReminderPicker.tsx
│   │   ├── calendar/
│   │   │   ├── MonthGrid.tsx
│   │   │   ├── CalendarCell.tsx
│   │   │   └── UpcomingSection.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   └── Icon.tsx
│   │   └── layout/
│   │       ├── BottomNavBar.tsx
│   │       └── SafeArea.tsx
│   │
│   ├── theme/                    # Design system tokens
│   │   ├── tokens.ts             # Colors, spacing, radii, shadows
│   │   ├── typography.ts         # Font families, sizes, weights
│   │   ├── lightTheme.ts
│   │   ├── darkTheme.ts
│   │   ├── ThemeProvider.tsx
│   │   └── useTheme.ts
│   │
│   ├── constants/                # App-wide constants
│   │   ├── prayers.ts            # FAJR, DHUHR, ASR, MAGHRIB, ISHA
│   │   ├── scheduleTypes.ts
│   │   └── defaults.ts
│   │
│   └── utils/                    # Pure utility functions
│       ├── dateUtils.ts
│       ├── formatters.ts
│       └── validators.ts
│
├── widgets/                      # Native widget code
│   ├── ios/                      # SwiftUI widgets via expo-widgets
│   └── android/                  # Android widgets via react-native-android-widget
│
├── docs/                         # Architecture and planning documents
│
├── __tests__/                    # Integration and E2E tests
│   ├── integration/
│   └── e2e/
│
├── app.json                      # Expo config
├── tsconfig.json
├── jest.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 3. Core Technology Stack

| Concern | Technology | Version Target | Decision Reference |
|---|---|---|---|
| Framework | React Native + Expo | Current stable SDK (use `npx expo install`) | ADR-021 |
| Language | TypeScript | 5.x strict | — |
| Navigation | Expo Router | SDK-matched | ADR-010 |
| Prayer calculation | `adhan` | latest | ADR-001 |
| Local database | `expo-sqlite` + `drizzle-orm` | SDK-matched / latest | ADR-002 |
| Date/time | `luxon` + `WallClockResolver` | latest | ADR-003, ADR-017 |
| Recurrence | `rrule` | latest | ADR-004 |
| Hijri calendar | `@tabby_ai/hijri-converter` + `Intl` + per-month overrides | latest | ADR-005, ADR-018 |
| State management | `zustand` | latest | ADR-006 |
| Notifications | `expo-notifications` | SDK-matched | ADR-007 |
| Location | `expo-location` | SDK-matched | ADR-008 |
| Widgets (M18 only) | `expo-widgets` (iOS, dev build) + Android widget | SDK-matched | ADR-009 |
| Testing | Jest + RNTL | latest | ADR-014 |
| Fonts | `expo-font` | SDK-matched | ADR-015 |
| Secure storage | `expo-secure-store` | SDK-matched | — |

---

## 4. Domain Module Dependency Graph

```text
                    ┌──────────────┐
                    │ LocationSvc  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ PrayerEngine │
                    └──────┬───────┘
                           │
                 ┌─────────▼──────────┐
                 │ PlanningDayEngine  │
                 └─────────┬──────────┘
                           │
              ┌────────────▼─────────────┐
              │    SchedulingEngine      │
              │  (orchestrates all)       │
              └──┬──────┬──────┬────┬────┘
                 │      │      │    │
    ┌────────────▼┐ ┌───▼────┐ │  ┌─▼──────────┐
    │ TaskEngine  │ │Recur.  │ │  │ WorshipEng │
    └─────────────┘ │Engine  │ │  └────────────┘
                    └────────┘ │
                          ┌────▼──────────┐
                          │ Notification  │
                          │    Engine     │
                          └───────────────┘
```

**Key contracts:**
- `PrayerEngine` takes `(date, coordinates, calculationParams)` → returns `PrayerTimesResult`
- `PrayerEngine.buildPrayerTimeline(centerDate, coords, params)` → returns `PrayerTimeline` (3-day, 15-period contiguous sequence)
- `PlanningDayEngine.buildPlanningDay(config, timeline, now)` → returns `PlanningDay` with clipped `PrayerPeriodInstance` records
- `WallClockResolver.resolve(localTime, date, timezone)` → returns `WallClockResolution` (handles spring-forward/fall-back)
- `SchedulingEngine` takes `(taskDefinition, date, timeline, planningDay, context)` → returns `ResolvedOccurrence`

---

## 5. Data Flow: Today Screen Load

```text
1. App foregrounds
2. LocationService → resolve current location (auto or manual)
3. PrayerEngine.buildPrayerTimeline(today, location, calcParams)
   → PrayerTimeline (spans yesterday/today/tomorrow — 15 contiguous periods)
4. PlanningDayEngine.buildPlanningDay(config, timeline, now)
   → PlanningDay (clipped PrayerPeriodInstances within day boundaries)
5. TaskOccurrenceRepository.getForPlanningDay(planningDayKey) → occurrences[]
6. If occurrences stale or missing:
   a. RecurrenceEngine.generateOccurrences(definitions, dateRange) → raw occurrences
   b. For EXACT_TIME tasks: WallClockResolver.resolve(localTime, date, tz) → absolute time
   c. SchedulingEngine.resolveAll(rawOccurrences, timeline, planningDay) → resolved[]
   d. Persist to DB (upsert, preserve user state)
7. Group resolved occurrences by prayer section (via PrayerPeriodInstance.prayer)
8. Determine current prayer via timeline.findPeriod(now)
9. Update Zustand store → UI re-renders with correct tab selected
```

---

## 6. Offline-First Strategy

- **Prayer times:** Computed locally via `adhan` — never needs network
- **Tasks and occurrences:** Stored in local SQLite — fully offline
- **Location:** Falls back to last-known or manual location
- **Hijri dates:** Computed locally via `@tabby_ai/hijri-converter` — never needs network
- **Notifications:** Scheduled locally via `expo-notifications` — no server
- **Widgets:** Read from local shared storage — no server

The app functions fully without any network connection. Network is only needed for:
- Future cloud sync
- Future location geocoding (city search)
- Future analytics

---

## 7. Timezone and DST Architecture

### Wall-clock semantics

All exact-time tasks are stored as **local wall-clock strings** (e.g., `"18:00"`), not UTC. This is intentional:
- A user who sets "Soccer at 6:00 PM" means 6:00 PM in whatever timezone they are in
- After DST spring-forward, 6:00 PM is still 6:00 PM on the wall clock
- This matches the product spec §8.6

### WallClockResolver (ADR-017)

Converting a wall-clock string to an absolute `DateTime` in a given timezone uses the `WallClockResolver` with an explicit, deterministic policy:

| Scenario | Policy | Rationale |
|---|---|---|
| Normal local time | Resolve as-is | Standard case |
| Nonexistent spring-forward time (e.g., 2:30 AM) | Shift forward to first valid instant after the gap; record `SPRING_FORWARD_SHIFTED` | User sees adjusted time; resolution is logged |
| Duplicated fall-back time (e.g., 1:30 AM occurs twice) | Choose the earlier (pre-DST) occurrence deterministically; record `FALL_BACK_FIRST`; one occurrence only | Deterministic; avoids duplicate task |

We do **not** rely on Luxon's unspecified behavior for ambiguous/nonexistent times. The `WallClockResolver` applies the policy explicitly at the scheduling boundary. See SCHEDULING_ENGINE.md §2.4.

### Timezone resolution

For each occurrence:
1. Determine the effective IANA timezone from location (auto or manual)
2. For EXACT_TIME: pass local time through `WallClockResolver.resolve(localTime, date, timezone)`
3. For PRAYER_RELATIVE: compute offset from prayer time (already an absolute `DateTime`)
4. Use `PrayerTimeline.findPeriod(absoluteTime)` to derive prayer section

### DST tested scenarios (see TEST_PLAN.md)

| Scenario | Test coverage |
|---|---|
| Spring forward (NYC + London) | WC-02, WC-04 |
| Fall back (NYC + London) | WC-03, WC-05 |
| Exact-time task near DST boundary | SE-08, SE-09 |
| Prayer-relative task near DST | Prayer time shifts; offset applied to shifted time |
| Before-Fajr during DST transition | Resolved via PrayerTimeline |

### Travel

When user travels to new timezone:
- Exact-time tasks retain wall-clock value in new timezone
- Prayer times recalculate for new location/timezone
- Prayer sections may change
- User is not notified unless a significant schedule change occurs

---

## 8. ID Strategy

All primary entities use UUIDs v4:
- `TaskDefinition.id` — UUID
- `TaskOccurrence.id` — UUID
- Composite key: `(taskDefinitionId, localDate)` for natural uniqueness of daily occurrences

UUIDs ensure:
- No collision across devices (future sync)
- No auto-increment dependency on SQLite
- Globally unique for eventual cloud sync

---

## 9. Premium Entitlement Architecture

```typescript
interface PremiumService {
  isPremium(): boolean;
  isFeatureEnabled(feature: PremiumFeature): boolean;
  checkEntitlement(feature: PremiumFeature): EntitlementResult;
}

enum PremiumFeature {
  CUSTOM_PLANNING_DAY_START = 'CUSTOM_PLANNING_DAY_START',
  PRAYER_COMPLETION_TRACKING = 'PRAYER_COMPLETION_TRACKING',
  ADVANCED_REMINDERS = 'ADVANCED_REMINDERS',
  ADVANCED_THEMES = 'ADVANCED_THEMES',
  ADVANCED_WIDGETS = 'ADVANCED_WIDGETS',
  ADVANCED_ROUTINES = 'ADVANCED_ROUTINES',
  CLOUD_SYNC = 'CLOUD_SYNC',
}
```

- All Premium checks go through `PremiumService`
- Free features never call `PremiumService`
- Premium status stored locally; validated against store receipt
- Actual IAP integration deferred to M19

---

## 10. Shared Ecosystem Modules

The following modules are designed to be extractable into shared packages for a broader Islamic app ecosystem:

| Module | Shared potential |
|---|---|
| `PrayerEngine` | Yes — pure function, no app-specific dependencies |
| `HijriService` | Yes — pure Gregorian↔Hijri conversion |
| `LocationService` (types + interfaces) | Yes — location/timezone resolution |
| Theme tokens | Yes — consistent brand across ecosystem |
| Calculation method presets | Yes — region → method mapping |

These modules should avoid importing app-specific types. Use dependency injection via interfaces.

---

## 11. Error Boundaries and Recovery

- Each screen wrapped in React error boundary
- Domain engine errors are caught and surfaced as user-friendly empty states (§46)
- Database errors trigger graceful fallback (show cached data, disable writes)
- Location errors fall back to manual location prompt
- Prayer calculation errors show "Unable to calculate prayer times" with settings link
- Notification permission denial shows informative prompt, does not block app

---

## 12. Performance Budget

| Metric | Target |
|---|---|
| Today screen cold start | < 500ms to interactive |
| Prayer time calculation | < 10ms per day |
| Occurrence materialization (100 tasks, 14 days) | < 200ms |
| Tab switch | < 50ms |
| Task creation (save) | < 100ms |
| Database query (today's tasks) | < 50ms |

Strategies:
- Pre-compute prayer times for ±7 days on app open
- Cache materialized occurrences in SQLite
- Lazy-load settings, calendar, worship screens
- Avoid blocking main thread with heavy computation

---

## 13. Security

- Tokens/credentials stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android)
- SQLite database is protected by **OS-level storage mechanisms** (iOS Data Protection, Android app sandbox). It is **not** application-level encrypted (no SQLCipher or runtime encryption). If application-level encryption is required in the future, SQLCipher can be integrated as an `expo-sqlite` driver replacement.
- No task content transmitted to any server in v1
- Location data used only for prayer calculation; never shared externally
- Analytics events (if added) must not include task titles or religious completion data
