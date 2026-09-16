# Current Milestone: M12 — Location / Travel / Timezone Behavior

> **Current State:** M11 closed and Sonnet-approved; M12 architecture and planning next  
> **Current Test Suite:** 739 tests passing (39 test suites)  
> **Milestone Status:** M12 — ARCHITECTURE NEXT  
> **Architecture Status:** NOT STARTED (Pending Architecture Phase)  
> **Implementation Status:** NOT STARTED (Do NOT implement M12 yet)  

---

## 1. Milestone Goal

Implement automatic and manual location detection, travel/Qasr status indications, and timezone transition behavior with coordinated prayer timetable recalculation and pending task rematerialization.

M12 bridges device location capabilities (`expo-location`), stored user location preferences, civil timezone resolution, and downstream scheduling recalculations:

```text
Device Location / Manual Selection (expo-location, City Dataset)
    ↓
LocationService & Repository (Permission handling, 10 km significant change detection)
    ↓
User Settings & Coordinates (lat, lng, city, timezone, calculation method)
    ↓
Prayer Recalculation & Cache Invalidation (PrayerEngine, PrayerTimeline)
    ↓
Materialization Synchronization (rematerializePending for active horizon)
    ↓
Today Runtime Update (TodayTemporalInputProvider transitions SETUP_REQUIRED → READY)
```

M12 ensures that when a user travels or changes locations, prayer times update accurately, and pending tasks adapt to the new temporal schedule without corrupting terminal history.

---

## 2. Locked Domain Invariants & Specifications

All behaviors in M12 are bound by `docs/MASTER_PRODUCT_SPEC.md` (§2, §11), `docs/TECHNICAL_ARCHITECTURE.md` (§5), `docs/DATA_MODEL.md`, and `docs/DECISIONS.md` (ADR-003):

### 2.1 Dual Location Mode: Automatic & Manual
- **Automatic Mode:**
  - Uses `expo-location` with foreground permission (`requestForegroundPermissionsAsync`).
  - Gracefully handles permission denial without crashes, falling back to manual selection prompt or default state.
  - Periodic / foreground check for significant location changes.
- **Manual Mode:**
  - User selects a city from a bundled, offline-available city dataset.
  - Overrides device GPS coordinates and timezone.

### 2.2 Significant Movement Detection (10 km Threshold)
- Distance delta calculated via Haversine formula against last calculation coordinates.
- Location changes $< 10\text{ km}$ do not trigger prayer recalculation or cache invalidation, preventing unnecessary jitter.
- Location changes $\ge 10\text{ km}$ trigger cache fingerprint invalidation, timeline recalculation, and pending task rematerialization.

### 2.3 Timezone Transition Invariants
- Timezone changes resolve effective IANA timezone (e.g., via `Intl.DateTimeFormat` or `expo-localization`).
- Scheduled tasks respect established M5 invariants:
  - `EXACT_TIME` tasks preserve wall-clock time (18:00 remains 18:00 in the new local timezone).
  - `PRAYER_RELATIVE` tasks follow the recalculated prayer start instant in the new location.
  - `PRAYER_WINDOW` tasks shift to the recalculated prayer window in the new location.
  - `ANYTIME_TODAY` tasks remain assigned to their planning day.

### 2.4 Terminal History Immutability
- Completed, missed, and cancelled tasks are permanently frozen:
  - `calculatedStartTime`, `windowStart`, `windowEnd`, `status`, and historical timestamps are NEVER modified by location or timezone recalculations.
  - Preserved by M4/M6 repository guards.

### 2.5 Seam Integration with Today View
- `TodayTemporalInputProvider` currently returns `SETUP_REQUIRED` when location or settings are unconfigured.
- M12 provides the persistent backing data and runtime service so that once a location is set, `TodayTemporalInputProvider` returns `READY` with valid `PrayerTimeline` and coordinates.

---

## 3. Execution Triggers & Seams

M12 architecture must formalize:
1. **App Foreground Trigger:** Check device location / system timezone on app foreground; evaluate distance delta against cached calculation coordinates.
2. **Manual Location Selection Trigger:** Immediate recalculation and persistence when user picks a city or changes calculation method.
3. **Permission Change Trigger:** Handling transitions from denied to granted (or vice-versa).
4. **Rematerialization Pipeline:** Calling `MaterializationEngine.rematerializePending` across the active planning-day horizon upon significant location/timezone change.

---

## 4. Locked Domain Boundaries

M12 must strictly respect established subsystem ownership:
- **M2 Prayer Engine:** Pure astronomical calculations and `PrayerTimeline` builder remain unmodified.
- **M5 Scheduling Engine:** Pure placement resolvers and `WallClockResolver` remain untouched.
- **M6 Materialization Engine:** Consumes existing `rematerializePending(dateRange, context)` without modifying M6 persistence internals.
- **M7 Today Orchestrator:** Updates temporal context and refreshes projection; does not manage raw GPS hardware.
- **M10 Add/Edit Task:** Uses active location/temporal provider for preview calculations; forms remain unmodified.
- **M11 Lifecycle Service:** Preserves atomic status updates and missed-state evaluation under the new active temporal context.

---

## 5. Out of Scope for M12

The following items are strictly **OUT OF SCOPE** for M12:
- Notification scheduling and push delivery (M13).
- Calendar month grid visualization (M14).
- Worship Suggestions engine (M15 / M16).
- Full Settings UI (M17 — M12 implements the location domain/service layer and bundled city data, not the full settings screens).
- Native Home Screen Widgets (M18).
- Background location tracking (foreground-only per product spec).
- Modifying closed M1–M11 application contracts.

---

## 6. Key Architectural Questions for Planning Phase

The M12 architecture phase must evaluate and resolve:
1. **LocationService Architecture:** Pure domain/service boundaries vs. React Native / Expo hardware abstraction.
2. **City Dataset Storage & Lookup:** Format and indexing of bundled city data (JSON, SQLite, binary) for fast offline search.
3. **Repository Persistence:** Exact schema and queries for persisting active location and user preferences in `user_settings` / SQLite.
4. **Recalculation & Refresh Flow:** Coordinated sequence between location update $\to$ cache invalidation $\to$ `rematerializePending` $\to$ `TodayOrchestrator.refreshToday`.
5. **Travel / Qasr Indication:** Criteria and data model for flagging travel distance (e.g., journey > 80 km / 48 miles) for Qasr prayer presentation.
6. **Testing & Mocking Strategy:** Deterministic unit and integration test fixtures for GPS permissions, distance thresholds, timezone shifts, and offline fallback.

---

## 7. Test Strategy & Acceptance Expectations

The proposed M12 test suite must cover:
- **Automatic Location:** Permission granted, permission denied fallback, coordinate acquisition.
- **Manual Location:** City dataset lookup, custom coordinates, manual override persistence.
- **Significant Movement Threshold:** Distance $< 10\text{ km}$ (no recalculation) vs $\ge 10\text{ km}$ (triggers recalculation).
- **Timezone Transitions:** Cross-timezone shifts, pending occurrence rematerialization, terminal immutability.
- **Integration with Today:** `TodayTemporalInputProvider` transitions cleanly from `SETUP_REQUIRED` to `READY`.
- **Regression Invariant:** **All 739 existing tests (M1–M11) across 39 test suites must remain 100% green.**

---

## 8. Milestone Summary & Status

| Attribute | Specification |
|---|---|
| **Milestone** | **M12 — Location / Travel / Timezone Behavior** |
| **Type** | Location & Travel Domain Service / Recalculation Orchestration |
| **Current Phase** | **M12 — ARCHITECTURE NEXT** |
| **Architecture Status** | **NOT STARTED (Pending Architecture Phase)** |
| **Implementation Status** | **NOT STARTED (Do NOT implement yet)** |
| **Baseline Tests** | **739 / 739 passing (39 test suites)** |
