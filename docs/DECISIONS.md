# Architecture Decision Log

**Status:** Living document  
**Updated:** 2026-09-18 (Rev 4 — M17 ADR-025 added)  
**Purpose:** Record every major architectural decision, the alternatives considered, and the rationale.

---

## ADR-001: Prayer Calculation Library → `adhan` (adhan-js)

**Decision:** Use the `adhan` npm package (pure JavaScript/TypeScript) for prayer time calculation.

**Why:**
- Industry-standard astronomical calculation library used by major Islamic apps
- Pure JS — runs identically on iOS, Android, and in unit tests without native bridges
- Supports all major calculation methods: MWL, ISNA, Egypt, Makkah, Karachi, Tehran, Singapore, Turkey, Dubai, Qatar, Kuwait, MoonsightingCommittee
- Built-in Madhab support (Shafi and Hanafi Asr)
- High-latitude rules: MiddleOfTheNight, OneSeventh, AngleBased
- Polar circle resolution: AqrabYaum, AqrabBalad
- Accepts manual per-prayer minute adjustments
- `HighLatitudeRule.recommended(coordinates)` helper
- Fully offline — no network calls required
- Well-tested, well-documented, stable API

**Alternatives considered:**
| Alternative | Reason rejected |
|---|---|
| `react-native-adhan` (TurboModule) | Requires native build; harder to unit-test; less portable; native bridges add complexity for a computation that is fast in JS |
| External APIs (AlAdhan, UmmahAPI) | Breaks offline-first requirement; adds latency; network dependency |
| `islamic-utils` | Less mature; narrower community; prayer time accuracy less proven at scale |

**Risks:**
- Library maintenance may slow; it is well-established but has a single primary maintainer
- Must validate high-latitude edge cases ourselves against known correct values

---

## ADR-002: Local Database → Drizzle ORM + `expo-sqlite`

**Decision:** Use `expo-sqlite` as the storage driver with `drizzle-orm` as the type-safe query layer.

**Why:**
- `expo-sqlite` is bundled with the Expo SDK — zero native setup, stable, WAL-mode support
- Drizzle provides full TypeScript inference for all queries, schema declarations, and migrations
- Schema-as-code enables version-controlled, reviewable migrations
- Drizzle generates raw SQL under the hood — no hidden ORM magic, inspectable queries
- Drizzle Studio available for debugging during development
- Lightweight — no heavy runtime; tree-shakable
- Both are actively maintained with large communities (2026)

**Security note:** The SQLite database is protected by OS-level storage mechanisms (iOS Data Protection, Android app sandbox) but is **not** application-level encrypted. It does not use SQLCipher or any runtime encryption layer. This is accurate for v1. If application-level encryption is required in the future, SQLCipher can be integrated as an `expo-sqlite` driver replacement.

**Alternatives considered:**
| Alternative | Reason rejected |
|---|---|
| Raw `expo-sqlite` only | Loses type safety; manual SQL strings are error-prone for complex scheduling queries |
| WatermelonDB | Over-engineered for our data volume; steep learning curve; opinionated sync protocol we don't need yet; less Expo-native |
| Realm (deprecated RN) | Being sunset in favor of Atlas Device SDK; unclear Expo compatibility path |
| MMKV / AsyncStorage | Key-value stores; not suitable for relational task/occurrence queries |

**Risks:**
- Drizzle's Expo SQLite adapter is newer than its Node/Bun adapters — monitor for edge cases
- Must handle SQLite's lack of native date/time types ourselves (store as ISO strings or epoch)
- Cloud sync will need a custom sync engine on top; Drizzle does not provide one

---

## ADR-003: Date/Time Library → Luxon + WallClockResolver

**Decision:** Use `luxon` for all date/time operations. Wrap wall-clock resolution in an explicit `WallClockResolver` layer.

**Why (Luxon):**
- First-class IANA timezone support via `DateTime.fromObject({ zone: 'America/Chicago' })`
- Immutable `DateTime` objects prevent mutation bugs
- Built-in DST handling: `.isInDST`, `.offset`, `.toLocal()`, `.toUTC()`
- `Interval` and `Duration` types map naturally to prayer periods and task windows
- Excellent `diff()`, `plus()`, `minus()` for offset calculations
- ISO 8601, formatting, parsing — all built in
- ~23 KB — acceptable for a mobile app with heavy date logic
- Ergonomic API reduces timezone bugs compared to functional alternatives

**Why WallClockResolver:**
Luxon's `DateTime.fromObject()` has unspecified behavior for ambiguous/nonexistent local times. We cannot rely on library internals for deterministic scheduling. The `WallClockResolver` applies an **explicit, documented policy** at the scheduling boundary:

| Scenario | Policy |
|---|---|
| Normal local time | Resolve as-is |
| Nonexistent spring-forward time (e.g., 2:30 AM → gap) | Shift forward to first valid instant after gap; record `SPRING_FORWARD_SHIFTED` |
| Duplicated fall-back time (e.g., 1:30 AM → occurs twice) | Choose earlier (pre-DST) occurrence deterministically; record `FALL_BACK_FIRST` |

See SCHEDULING_ENGINE.md §2.4 for implementation.

**Alternatives considered:**
| Alternative | Reason rejected |
|---|---|
| `date-fns` + `@date-fns/tz` | Functional API is more verbose for our heavily timezone-aware, interval-heavy domain; timezone handling requires extra packages; no built-in Interval/Duration types |
| `@js-temporal/polyfill` | Polyfill is large (~40 KB+); runtime performance cost; Temporal is excellent but not yet native in React Native's Hermes engine |
| `dayjs` | Timezone plugin is less battle-tested; mutable by default; plugin system adds fragility |
| `moment` / `moment-timezone` | Deprecated; large bundle; mutable |

**Risks:**
- Luxon relies on `Intl.DateTimeFormat` — Hermes has historically had `Intl` gaps; verify with current Expo SDK
- If `Intl` polyfills are needed on Hermes, bundle size increases

---

## ADR-004: Recurrence Library → `rrule` (rrule.js)

**Decision:** Use the `rrule` npm package for Gregorian recurrence rule computation.

**Why:**
- RFC 5545 (iCalendar) compliant — industry standard
- Generates occurrences lazily via `.between(start, end)` — avoids materializing thousands of dates
- Supports: DAILY, WEEKLY, MONTHLY, YEARLY, BYDAY, BYMONTHDAY, INTERVAL, UNTIL, COUNT
- Serializable RRULE strings for storage and potential future iCalendar export
- Well-tested, widely used, TypeScript types included
- Pure JavaScript — works in all environments

**Custom extension for Hijri:**
`rrule` does not support Hijri calendars natively. We will build a `HijriRecurrenceEngine` that:
1. Accepts Hijri recurrence rules (e.g., "13th of every Hijri month")
2. Uses `@tabby_ai/hijri-converter` + `HijriService` to convert Hijri target dates to Gregorian, applying the effective calendar (base method + global adjustment + per-month overrides)
3. Returns Gregorian dates for the scheduling pipeline
4. Handles Hijri month length variations (29 vs 30 days)

**Risks:**
- `rrule` uses JS `Date` internally — must carefully bridge with Luxon at the boundary
- Timezone handling in rrule can be tricky — we treat RRULE dates as "local date anchors" and resolve timezone via Luxon
- Hijri extension is custom code — needs thorough testing

---

## ADR-005: Hijri Calendar → `@tabby_ai/hijri-converter` + Per-Month Overrides

**Decision:** Use `@tabby_ai/hijri-converter` for programmatic Gregorian↔Hijri conversion with a multi-layer adjustment model.

**Why:**
- `@tabby_ai/hijri-converter`: TypeScript-first, zero-dependency, accurate Umm al-Qura-based conversion, bidirectional
- `Intl.DateTimeFormat` with `islamic-umalqura` for locale-aware display formatting (zero bundle cost)
- Clean separation: converter for business logic, Intl for presentation

**Hijri adjustment model (revised):**

A single permanent `hijriAdjustmentDays` value is insufficient because:
- Moon sighting may vary month to month
- Users may need to correct Ramadan/Shawwal/Dhul-Hijjah start dates independently
- Historical overrides must be preserved (don't retroactively change past months)

**Design:**
1. **Base method** (`hijriBaseMethod`): `UMM_AL_QURA` (default) or `CALCULATED`
2. **Global adjustment** (`hijriGlobalAdjustment`): -2 to +2 days, applied to all months by default
3. **Per-month override** (`hijri_month_overrides` table): keyed by Hijri year + month, stores an `adjustmentDays` that **replaces** the global adjustment for that specific month
4. Historical overrides are preserved indefinitely
5. Worship generation, Hijri recurrence, and UI all use the effective calendar via `HijriService.getEffectiveDate()`

**Effective date resolution:**
```text
1. Convert Gregorian → base Hijri (via converter library)
2. Check hijri_month_overrides for (hijriYear, hijriMonth)
3. If override exists → apply override's adjustmentDays
4. If no override → apply hijriGlobalAdjustment
5. Return effective Hijri date
```

**Risks:**
- `@tabby_ai/hijri-converter` is a relatively small library — validate conversion accuracy against known references
- Per-month override UX must be intuitive — present as "Adjust this month's start date" not as raw number offsets
- Umm al-Qura is administrative (Saudi); the per-month override system handles regional variation

---

## ADR-006: State Management → Zustand

**Decision:** Use `zustand` for client-side reactive state management.

**Why:**
- Minimal API surface — `create()` produces a hook; no providers, no context wrappers
- Selector-based subscription prevents unnecessary re-renders
- Middleware: `persist` (for hydrating from AsyncStorage), `devtools`, `immer`
- ~1.1 KB — lightest option
- Works outside React (useful for domain services that need to read/write state)
- Most popular lightweight state manager in React Native ecosystem (2026)

**Architecture pattern:**
- Zustand stores hold **UI/presentation state** and **cached derived data**
- Zustand does NOT hold authoritative task/occurrence data — that lives in SQLite via Drizzle
- Domain services write to DB, then invalidate/refresh relevant Zustand slices
- This prevents Zustand from becoming a parallel source of truth

**Alternatives considered:**
| Alternative | Reason rejected |
|---|---|
| Jotai | Atomic model is more complex for our centralized domain state; team familiarity leans Zustand |
| Redux Toolkit | More boilerplate; heavier; overkill for our use case |
| React Context only | Re-render performance issues at scale; no built-in persistence |
| TanStack Query | Excellent for server state; less appropriate as primary local-first state manager; will use alongside Zustand if cloud sync is added |

---

## ADR-007: Notification System → `expo-notifications`

**Decision:** Use `expo-notifications` for all local notification scheduling.

**Why:**
- First-party Expo library — maintained alongside the SDK
- Supports local scheduling with exact times
- Android: `AlarmManager` with `SCHEDULE_EXACT_ALARM` permission
- iOS: native `UNUserNotificationCenter`
- Survives device reboot (Android `RECEIVE_BOOT_COMPLETED`)
- Notification channels for Android (prayer alerts, task reminders, worship — separate channels)
- Expo config plugin handles native permissions

**Supplementary:** `expo-task-manager` for background rescheduling logic if prayer times change while app is backgrounded.

**Risks:**
- Chinese OEM ROMs (Xiaomi, Oppo, Vivo) may block boot-complete receivers — document for users
- Android exact alarm permission may require user action on Android 14+
- Must reschedule all notifications when prayer times, location, or timezone change — requires a `NotificationScheduler` service

---

## ADR-008: Location Service → `expo-location`

**Decision:** Use `expo-location` for both foreground and optional significant-change location updates.

**Why:**
- First-party Expo library
- Supports foreground and background location
- Geofencing capability available if needed
- Graceful permission handling API
- Config plugin manages native permissions

**Architecture:**
- Automatic location mode: request foreground permission; use significant-change monitoring (not continuous GPS)
- Manual location mode: user picks city from a bundled dataset; no GPS permission needed
- Location changes trigger prayer time recalculation only when lat/lng delta exceeds threshold (~10 km)

**Risks:**
- Background location requires `Always` permission — may reduce user opt-in rate
- For v1, foreground + app-resume location check may be sufficient; defer background to later

---

## ADR-009: Widget Architecture → Platform-Specific with Development Build

**Decision:** Use platform-specific widget libraries with shared data via App Groups (iOS) and SharedPreferences (Android).

**Architecture:**
- Domain services serialize a `WidgetData` JSON payload on each recalculation
- iOS: `expo-widgets` reads from App Group shared container. **Requires a development build** (custom native code; cannot run in Expo Go)
- Android: uses a separate native widget implementation (not `expo-widgets`). Reads from SharedPreferences
- Widget data is a snapshot: current prayer, next prayer, countdown, next N tasks

**Important:** Widget-specific native dependencies are installed in the widget milestone (M18), not in M0. iOS widgets require running `npx expo prebuild` to generate native projects.

**Risks:**
- Two codebases for widget UI (SwiftUI + Android RemoteViews)
- Widget refresh frequency limited by OS — may show stale data briefly

---

## ADR-010: Navigation → Expo Router (file-based)

**Decision:** Use `expo-router` for navigation.

**Why:**
- File-system-based routing — convention over configuration
- Deep linking support built in (needed for widget → app navigation)
- Tab navigation for bottom bar
- Stack navigation for modals, settings drill-down
- First-party Expo support
- URL-based routing prepares for potential web version

---

## ADR-011: Occurrence Materialization Strategy → Hybrid (Sliding Window)

**Decision:** Use a hybrid approach: materialize occurrences for a rolling window, compute on-demand outside it.

**Details:**
- On relevant triggers (app open, midnight, prayer boundary, edit), materialize occurrences for today ± 7 days
- Calendar month view materializes the viewed month on demand
- Past occurrences are persisted permanently (they hold completion/missed state)
- Future occurrences beyond the window are computed lazily and not persisted until they enter the window
- Materialized occurrences include: `calculatedStartTime`, `calculatedPrayerSection`, `status`
- Rematerialization overwrites derived fields but preserves user state (completion, overrides)

**Why hybrid:**
- Pure lazy: cannot efficiently query "show me all tasks for Dhuhr today" without computing every task's placement
- Pure eager: materializing years of daily recurrences wastes storage and creates sync complexity
- Sliding window: predictable performance; 14-day window for ~100 recurring tasks = ~1,400 rows max

---

## ADR-012: Stored vs Derived vs Cached Data

**Decision:** Follow the MASTER_PRODUCT_SPEC §42 rule strictly.

| Data | Treatment |
|---|---|
| Task title, schedule type, schedule data, recurrence rule | **Stored** (authoritative) |
| Prayer section for exact-time tasks | **Derived** (on materialization) |
| Calculated clock time for prayer-relative tasks | **Derived** (on materialization) |
| Eligible prayer tabs for prayer-window tasks | **Derived** (on materialization) |
| Overdue status | **Derived** (current time vs schedule, never persisted) |
| Prayer times for a date+location+config | **Cached** (keyed by deterministic fingerprint; recomputed on any config change) |
| Completion status, missed status | **Stored** (user state) |
| Planning day key | **Derived** (from date + planning day start + Fajr time) |
| Wall-clock resolution type | **Derived** (on materialization; recorded for debugging/display) |

---

## ADR-013: Cloud Sync Compatibility (Future-Proofing)

**Decision:** Design IDs and schema for eventual sync without implementing sync in v1.

**Approach:**
- All entity IDs are UUIDs (not auto-increment) — globally unique across devices
- `createdAt`, `updatedAt` timestamps on all entities (ISO 8601 UTC)
- `seriesVersion` on TaskDefinition for edit-this-and-future semantics
- `overrideData` on TaskOccurrence for single-occurrence edits
- No server dependency in v1 — pure local SQLite
- When sync is added: CRDT-friendly design or last-writer-wins with conflict detection

---

## ADR-014: Testing Framework → Jest + Testing Library

**Decision:** Use Jest for unit/integration tests. React Native Testing Library for component tests.

**Why:**
- Jest is the Expo default; zero config
- Domain logic (engines, services) tested as pure TypeScript — no React rendering needed
- RNTL for component interaction tests
- Detox or Maestro considered for E2E but deferred to post-MVP

---

## ADR-015: Design System Implementation → React Native StyleSheet + Theme Tokens

**Decision:** Use React Native's built-in `StyleSheet` with a custom theme token system.

**Why:**
- No external CSS-in-JS library needed
- Theme tokens defined as TypeScript objects (colors, spacing, typography, shadows)
- `useTheme()` hook provides current theme (light/dark)
- All components consume tokens — never hardcode colors/sizes
- Prepares for Premium theme customization

---

## ADR-016: PrayerTimeline Multi-Day Model

**Decision:** Design scheduling around a multi-day `PrayerTimeline` rather than single-day prayer periods.

**Problem:** A single day's prayer periods (Fajr→Dhuhr, Dhuhr→Asr, ..., Isha→next-Fajr) cannot resolve before-Fajr tasks. A task at 02:00 on Tuesday falls before Tuesday's Fajr; the system needs to know that Monday's Isha extends from Monday ~20:00 to Tuesday ~05:30 to place this task correctly.

**Solution:**
- `PrayerTimeline` contains `PrayerPeriodInstance` records spanning 3 consecutive calendar days (15 periods)
- Each `PrayerPeriodInstance` has: `prayer`, `start`, `end`, `fullPeriodStart`, `fullPeriodEnd`, `sourceDate`
- `timeline.findPeriod(time)` returns the period containing any given absolute time
- The `PlanningDayEngine` clips timeline periods to the planning-day boundary, producing a `PlanningDay` with clipped instances
- Custom planning-day boundaries (e.g., 19:00) may clip through prayer periods, creating fragments — this is modeled correctly with `fullPeriodStart`/`fullPeriodEnd` preserving the original boundaries

**Why not just "check previous day" ad-hoc:**
- A unified timeline eliminates special-casing throughout the codebase
- The `findPeriod()` function works for any time without callers needing to know about day boundaries
- Custom planning-day clipping becomes a simple interval-intersection operation on the timeline

See SCHEDULING_ENGINE.md §2, §5, §6 for implementation.

---

## ADR-017: WallClockResolver DST Policy

**Decision:** Introduce an explicit `WallClockResolver` with deterministic policies for DST edge cases.

**Problem:** Luxon's `DateTime.fromObject()` does not guarantee deterministic behavior for nonexistent (spring-forward) or ambiguous (fall-back) local times. Scheduling requires deterministic resolution.

**Policy:**
| Scenario | Resolution |
|---|---|
| Normal | Resolve as-is |
| Spring-forward gap (time does not exist) | Shift forward to first valid instant after the gap; record `SPRING_FORWARD_SHIFTED` |
| Fall-back overlap (time occurs twice) | Choose the earlier (pre-DST) occurrence; record `FALL_BACK_FIRST`; schedule one occurrence only |

**Resolution is recorded** in `wallClockResolution` on the occurrence row for debugging and potential user-facing display (e.g., "This task was adjusted due to daylight saving time change").

See SCHEDULING_ENGINE.md §2.4 for implementation.

---

## ADR-018: Hijri Per-Month Override Model

**Decision:** Replace the single `hijriAdjustmentDays` integer with a multi-layer Hijri calendar model.

**Problem:** A single global adjustment cannot account for month-by-month moon-sighting variation. Adjusting for Ramadan should not retroactively change the previous month's dates.

**Solution:**
1. `hijriBaseMethod`: converter algorithm (`UMM_AL_QURA` or `CALCULATED`)
2. `hijriGlobalAdjustment`: -2 to +2, default for all months
3. `hijri_month_overrides` table: per-(year, month) override that **replaces** the global adjustment
4. `HijriService.getEffectiveDate(gregorianDate)` applies the correct adjustment
5. Historical overrides preserved indefinitely — never auto-deleted

See ADR-005 and DATA_MODEL.md §2.4 for details.

---

## ADR-019: Prayer Cache Fingerprint

**Decision:** Use a deterministic `calculationConfigFingerprint` as the cache key for prayer times.

**Problem:** The original cache key omitted inputs that affect calculated prayer times (high-latitude rule, polar-circle resolution, individual prayer adjustments). Changing these settings could silently return stale cached data.

**Solution:**
The fingerprint includes **every** input to the `adhan` calculation:
- Date
- Latitude (rounded to 2 decimal places)
- Longitude (rounded to 2 decimal places)
- Timezone
- Calculation method
- Asr/madhab method
- High-latitude rule
- Polar-circle resolution
- All 6 manual prayer adjustments (fajr, sunrise, dhuhr, asr, maghrib, isha)

Components are joined with a delimiter to form a deterministic string. The fingerprint is the primary key of the `prayer_cache` table.

**Guarantee:** Changing any single calculation parameter produces a different fingerprint, which is a cache miss. Stale data is never returned.

See PRAYER_ENGINE.md §9 for implementation.

---

## ADR-020: Schedule Data Canonical Representation

**Decision:** The `scheduleType` column is the sole discriminator; `scheduleData` JSON stores only the type-specific payload with no `type` field.

**Problem:** The original design had:
- A `scheduleType` column on `task_definitions`
- A `ScheduleData` discriminated union in TypeScript with a `type` field
- `scheduleData` JSON examples that sometimes included `type`, sometimes didn't

This created a risk of two independent type values disagreeing.

**Solution:**
- `scheduleType` column is the one and only schedule type value
- `scheduleData` JSON contains **only** the type-specific payload: `{ "localTime": "18:00" }` not `{ "type": "EXACT_TIME", "localTime": "18:00" }`
- TypeScript uses a `ScheduleDataMap` type mapping instead of a discriminated union: `type ScheduleDataFor<T extends ScheduleType> = ScheduleDataMap[T]`
- Runtime validation at the repository boundary asserts that the JSON shape matches the `scheduleType` column
- Disagreement is structurally impossible because only one type value exists

See DATA_MODEL.md §3 and §6.1 for implementation.

---

## ADR-021: Expo SDK Target

**Decision:** Target the current stable Expo SDK at the time of implementation. Use `npx expo install` for all Expo-ecosystem packages to ensure SDK-matched versions.

**Why:**
- Documenting a specific future SDK version (e.g., "SDK 52+") risks the plan becoming stale
- `npx expo install <package>` automatically resolves the correct version for the installed SDK
- Widget-specific native dependencies (`expo-widgets`, `react-native-android-widget`) are installed in M18 (widgets milestone), not M0, to avoid unnecessary native build requirements in early milestones
- iOS widgets require a development build (`npx expo prebuild`); this is documented in M18

---

## ADR-022: planningDayKey Derivation From Resolved Time

**Decision:** `planningDayKey` is always derived from the task's actual resolved temporal placement. It is never derived from the recurrence calendar date, noon of the recurrence date, or any other arbitrary time.

**Problem:** The original materialization pseudocode built a `PlanningDay` from `dateTimeForNoon(date)` and then used `planningDay.key` for all tasks on that date. This is incorrect when a task's resolved time falls outside that planning day's boundaries.

**Examples:**
| Schedule | Recurrence date | Resolved time | Planning day start | Correct planningDayKey |
|---|---|---|---|---|
| EXACT_TIME 02:00 | Tuesday | Tue 02:00 | Fajr (Tue 05:30) | **Monday** (02:00 < Fajr) |
| EXACT_TIME 18:00 | Tuesday | Tue 18:00 | Custom 19:00 | **Monday** (18:00 < 19:00) |
| EXACT_TIME 20:00 | Tuesday | Tue 20:00 | Custom 19:00 | **Tuesday** (20:00 ≥ 19:00) |
| ANYTIME_TODAY | Tuesday | — | Any | **Tuesday** (by definition) |

**Per schedule type:**
- **EXACT_TIME / PRAYER_RELATIVE:** `planningDayKey` = the planning day containing the resolved absolute time
- **PRAYER_WINDOW:** `planningDayKey` = the planning day containing the window's concrete `startPrayer` instance
- **ANYTIME_TODAY:** `planningDayKey` = the recurrence date directly (no clock-time derivation)

See SCHEDULING_ENGINE.md §11.3 for implementation.

---

## ADR-023: PrayerWindow Instance Anchoring via sourceDate

**Decision:** PrayerWindow resolution anchors `startPrayer`/`endPrayer` to the concrete `PrayerPeriodInstance` whose `sourceDate` matches the occurrence's recurrence date. Windows never span across unrelated prayer instances.

**Problem:** Custom planning-day boundaries can create duplicate prayer labels within one planning day. For example, with a 19:00 planning-day start:
- MAGHRIB (Mon 19:00 → Mon 20:00, sourceDate=Monday)
- MAGHRIB (Tue 18:30 → Tue 19:00, sourceDate=Tuesday)

A `MAGHRIB→ISHA` window resolved by prayer label alone would find the first MAGHRIB (Mon 19:00) and the last ISHA, potentially spanning ~24 hours across unrelated prayer days.

**Solution:** The `startPrayer` instance is selected by matching both `prayer` label AND `sourceDate` to the occurrence's recurrence date. The `endPrayer` boundary is derived from the same astronomical day's periods. This guarantees the window represents a single, coherent prayer-time span from the intended date.

See SCHEDULING_ENGINE.md §4.3 for implementation.

---

## ADR-024: Recurring Series Split Model

**Decision:** Use `seriesId` + `effectiveFromDate`/`effectiveToDate` for recurring series versioning. Series deletion deactivates (soft-deletes) definitions while retaining historical occurrences.

**Problem:** The original `seriesVersion` integer on `TaskDefinition` could not represent split series with non-overlapping date ranges. "This and future" edits need to close the current version at a date boundary and create a new version starting at the split date.

**Solution:**
- `seriesId` (UUID): Stable logical series identity shared across all versions. Non-recurring tasks: `seriesId === id`.
- `seriesVersion` (integer): Monotonically increasing within a series. Bumped on each "this and future" split.
- `effectiveFromDate` (ISO date): First date this definition version applies to (inclusive).
- `effectiveToDate` (ISO date | null): Last date this definition version applies to (inclusive). `null` = until `recurrenceEnd` or forever.

**Series operations:**
- **Edit this occurrence:** Write to `overrideData` on the occurrence. No definition change.
- **Edit this and future:** Close predecessor at `splitDate - 1`, create new definition with same `seriesId`.
- **Edit entire series:** Update definition in-place. Rematerialize non-completed/non-cancelled occurrences.
- **Delete one occurrence:** Set status to CANCELLED (exception record).
- **Delete future:** Set `recurrenceEnd` = today, cancel future occurrences.
- **Delete entire series:** Set `isActive = false` on all versions. Cancel pending. **Retain** completed/missed history.

**Sync compatibility:** UUIDs, monotonic versions, non-overlapping date ranges, and soft-delete support eventual CRDT-friendly cloud sync.

See DATA_MODEL.md §4A for full schema and operation details.

---

## ADR-025: Manual Prayer Adjustment Application Bound

**Status:** Accepted — M17

**Context:**

The `PrayerAdjustments` domain shape (`fajr`, `sunrise`, `dhuhr`, `asr`, `maghrib`, `isha`) stores integers representing per-prayer minute offsets. The Adhan calculation library accepts these offsets without imposing any application-specific range restriction. M17 introduces user-facing stepper controls for these adjustments in the Prayer Calculation settings screen.

Without an explicit application bound, the Settings UI would have no principled upper or lower limit, making it possible for users to accidentally enter extreme values (e.g., ±300 minutes) that would produce nonsensical schedules without any clear feedback.

**Decision:**

The M17 Settings UI and the `SettingsMutationCoordinator.validatePrayerAdjustments()` function accept integer manual prayer adjustments in the inclusive range:

```
-60 through +60 minutes
```

This bound applies independently to each of the six prayer keys: `fajr`, `sunrise`, `dhuhr`, `asr`, `maghrib`, `isha`.

This bound is:
- An **application/product guardrail** for the Settings entry surface
- **NOT** a limitation imposed by the Adhan library
- **NOT** a religious ruling
- **NOT** a claim that values beyond ±60 are technically impossible to store or calculate

Sunrise remains informational only and is not a planner prayer slot. Its adjustment key is retained for completeness but has no planner scheduling impact.

The persisted `PrayerAdjustments` domain shape is unchanged. If a future product decision widens or narrows this bound, an explicit architecture amendment is required — not a silent change to validation.

**Rationale:**

- Prevents accidental extreme schedule corruption from normal Settings interaction
- Provides a finite, comprehensible stepper range (±60 minutes = ±1 hour)
- Retains sufficient correction range for ordinary calibration scenarios (local adhan vs. calculated time typically differs by seconds to a few minutes; ±60 minutes covers every known practical case)
- Keeps UI validation deterministic and testable
- Preserves the ability to store larger values at the domain layer if a future use case requires it, without re-migrating existing data

**Alternatives considered:**

| Alternative | Reason not chosen |
|---|---|
| No application bound (unbounded integer) | Produces incoherent schedules; poor UX |
| ±30 minutes | Too restrictive for users in geographic edge cases who require larger corrections |
| ±120 minutes | Wider than any known practical calibration need; makes UI steppers awkward |
| Domain-layer enforcement in `PrayerAdjustments` type | Would require migration or runtime coercion for legacy stored values; application bound does not need to be a domain invariant |
