# AI Project Constitution: Islamic Daily Planner

> **Status:** PERMANENT ARCHITECTURAL INVARIANTS  
> **Authority:** Supreme over AI agent implementation decisions  
> **Source Documents:** `MASTER_PRODUCT_SPEC.md`, `TECHNICAL_ARCHITECTURE.md`, `DATA_MODEL.md`, `DECISIONS.md` (ADR-001–024), approved milestone specs (M1–M7)

---

## 1. Product Identity & Philosophy

1. **Prayer-Centered Adaptive Daily Planner**: This application is a prayer-anchored spiritual and life planner, **not a generic task manager**. Time is measured relative to the five ordained prayers, reflecting an Islamic rhythm of life where Salah governs the structure of the day.
2. **Zero-Guilt Philosophy**: Spiritual practice and daily duties must never induce shame or stress.
   - **No Streaks or Failure Banners**: Never display broken streaks, red negative indicators, or guilt-inducing metrics.
   - **No Gamification**: No XP, leveling, points, badges, leaderboard mechanics, or virtual trophies.
   - **Silence Over Failure**: A task not completed is quietly categorized as past or missed without alarmist alerts.
3. **Spiritual Dignity & Scholarly Modesty**: The application assists users in their religious and worldly organization without asserting sectarian dogma or claiming unverified religious authority.

---

## 2. Core UI & Navigation Invariants

1. **Exactly Five Prayer Tabs**:
   - The primary daily workspace contains **exactly five fixed prayer tabs**:
     1. `FAJR`
     2. `DHUHR`
     3. `ASR`
     4. `MAGHRIB`
     5. `ISHA`
2. **Tabs Never Reorder**:
   - Under no circumstances do tabs change sequence or shuffle based on the current time or user preference. The order is immutably chronological: Fajr through Isha.
3. **No Sunrise Tab**:
   - Sunrise (*Shuruq*) is an astronomical boundary marking the end of Fajr and a forbidden prayer window (*Karahah*). It is an informational marker on the timeline, **never a task tab**.
4. **No Sixth "Anytime" Tab**:
   - There is no separate top-level "Anytime" tab. Tasks scheduled as `ANYTIME_TODAY` or `PRAYER_WINDOW` are placed inside their designated or active prayer section tabs.
5. **Main Bottom Navigation**:
   - The primary app shell consists strictly of five tabs:
     `Today` | `Calendar` | `+` (Add Task Action) | `Worship` | `Settings`
6. **Visual Palette (MVP)**:
   - Clean, light, warm palette. Dark mode expansion is explicitly deferred post-MVP to maintain design discipline.

---

## 3. Planning Day Semantics

1. **Planning Day vs. Gregorian Date**:
   - A user's operational planning day does not necessarily align with the Gregorian calendar date:
     $$\text{planningDayKey} \neq \text{localDate}$$
   - The planning day groups tasks that belong to the user's single waking/spiritual cycle.
2. **Rollover Modes**:
   - **FAJR (Default / Recommended)**: The planning day begins at the moment of Fajr prayer. Tasks scheduled late at night (e.g. 01:00 AM post-Isha) remain part of the previous day's planning cycle until Fajr arrives.
   - **MIDNIGHT (Premium)**: The planning day rolls strictly at `00:00:00` local civil wall-clock time.
   - **CUSTOM (Premium)**:
     - *Prayer Offset*: Evaluated relative to a prayer event (e.g. Fajr minus 60 minutes).
     - *Fixed Clock*: Evaluated at a fixed local time (e.g. 04:00 AM).
3. **Approved Rollover Semantics**:
   - An occurrence derives its `planningDayKey` from its resolved absolute start instant, **not** from its nominal recurrence date.
   - Cutoff boundary evaluation uses the preceding or current prayer event to prevent circular or jittered day assignments.

---

## 4. Scheduling & Temporal Engine

1. **Four Canonical Schedule Types**:
   - **`EXACT_TIME`**: Anchored to an explicit local clock time (e.g. `14:30`).
     - Preserves local wall-clock intent across Daylight Saving Time (DST) shifts.
     - *Spring-forward (gap)*: Advances forward to the next valid local time.
     - *Fall-back (overlap)*: Resolves to the **first** occurrence.
   - **`RELATIVE_TO_PRAYER`**: Defined as an offset in minutes from a prayer event (e.g. `+15` min after `ASR`).
     - Dynamically recalculates whenever prayer times shift due to date, geographic relocation, or calculation method changes.
   - **`PRAYER_WINDOW`**: Bound between two prayer events (e.g. `DHUHR` to `ASR`).
     - Start is inclusive; end is exclusive: $[\text{startPrayer}, \text{endPrayer})$.
     - Materialized as **one single underlying occurrence** projected across all eligible prayer tabs while pending.
   - **`ANYTIME_TODAY`**: Unscheduled floating task for the planning day.
     - Resides in the current or selected prayer section without a fixed minute constraint.
2. **Never Auto-Roll Missed Tasks**:
   - Missed or incomplete tasks **never automatically roll forward** to tomorrow. Auto-rolling creates unearned clutter, violates zero-guilt philosophy, and obscures genuine historical records.
3. **No Silent Mutation of Intent**:
   - Recalculation engines (prayer adjustments, DST resolution) derive new start/end timestamps for occurrences, but **never mutate the underlying `TaskDefinition` schedule intent**.

---

## 5. Persistence & Data Integrity

1. **Authoritative Intent vs. Derived Placement**:
   - `TaskDefinition` represents authoritative user intent (`schedule_type`, `schedule_data`).
   - `TaskOccurrence` represents derived, materialized instances bound to specific dates and timestamps.
   - `schedule_type` column is the **sole discriminator**; `schedule_data` JSON must **not** store a redundant `type` property (ADR-020).
2. **Universal Timestamps**:
   - All absolute temporal instants (`start_utc`, `end_utc`, `completed_at`, `created_at`, `updated_at`) are persisted strictly as UTC ISO 8601 strings or epoch integers.
   - Local wall-clock dates are stored as ISO civil dates (`YYYY-MM-DD`).
3. **Occurrence Identity**:
   - The logical identity of an occurrence is the composite tuple:
     $$(\text{seriesId}, \text{localDate})$$
4. **Terminal State Immutability**:
   - Occurrences in terminal states (`COMPLETED`, `CANCELLED`, `SKIPPED`, `MISSED`) are permanently frozen. Rematerialization pipelines must **never overwrite, reposition, or delete terminal rows**.
   - Only `PENDING` occurrences may have their derived temporal fields recomputed.
5. **Series Immutability & Exception Model**:
   - Modifying "this and all future occurrences" creates a new `TaskDefinition` series with an `effective_from_date`, closing the prior series with an `effective_to_date` (ADR-024).
   - Modifying a single occurrence creates an explicit exception row.
6. **Storage Architecture**:
   - SQLite via Expo SQLite is the local source of truth. Offline-first by default.
   - OS-level secure storage for sensitive credentials; no unverified custom encryption layers (ADR-002).

---

## 6. Architecture & Code Boundaries

1. **Strict Decoupling of Domain from UI**:
   - All business logic lives in pure, framework-agnostic TypeScript modules under `src/domain/*`.
   - Domain functions are pure, deterministic, and free of React hooks, component state, or UI imports.
2. **Unidirectional Data Flow**:
   $$\text{UI Components} \longrightarrow \text{Services / Orchestrators} \longrightarrow \text{Domain Engines / Repositories} \longrightarrow \text{SQLite}$$
3. **Thin Presentation Layer**:
   - React components (`src/components/*`, `src/screens/*`) are strictly declarative view templates. They consume view models and emit user intent via callbacks.
   - Zero business calculations inside `useMemo`, `useEffect`, or render loops.
4. **Independent Domain Submodules**:
   - `prayer/`: Astronomical solar calculations and 15-period contiguous timeline.
   - `planning-day/`: Planning-day boundary and rollover resolution.
   - `task/`: Task definition, validation, and series models.
   - `scheduling/`: Wall-clock and relative prayer scheduling resolution.
   - `materialization/`: Generation and synchronization of occurrences.
   - `calendar/`: Hijri calendar conversion and month structures.
   - `recurrence/`: Gregorian and Hijri recurrence rule evaluation.

---

## 7. Religious Safeguards & Islamic Integrity

1. **Calculated vs. Sighted Lunar Calendar**:
   - All Hijri dates generated by the application are algorithmic calculations (Umm al-Qura or arithmetical civil models), **not guaranteed visual moon sightings**.
   - The UI must allow user day adjustments ($\pm 1$ or $\pm 2$ days globally or per-month via ADR-018) to align with local moon-sighting announcements.
2. **Laylat al-Qadr Safeguard**:
   - The exact night of Laylat al-Qadr **must never be asserted dogmatically**.
   - Recommendations and worship suggestions apply across the last ten nights of Ramadan, especially the odd nights, with appropriate scholarly humility.
3. **Scholarly Modesty & Verification**:
   - Worship suggestions (e.g. Sunnah fasts, Duha, Tahajjud, Rawatib) require documented Islamic verification.
   - Clear visual and conceptual distinction between **Obligatory (Fard)** and **Voluntary (Sunnah/Nafl)** actions.
4. **Prayer Calculation Transparency**:
   - Calculation parameters (Authority/Method, Asr School, High Latitude Rule) must always be transparent, configurable, and clearly presented in settings.

---

## 8. Milestone Ownership & Roadmap

| Milestone | Subsystem / Area | Status | Authority / Scope |
| :--- | :--- | :--- | :--- |
| **M0** | Project Setup & Scaffold | **CLOSED** | Dependencies, tooling, TypeScript, testing config |
| **M1** | Theme & Design System | **CLOSED** | Palette, typography, spacing, atomic UI primitives |
| **M2** | Prayer Engine & Timeline | **CLOSED** | Adhan engine, 3-day 15-period `PrayerTimeline`, cache |
| **M3** | Planning-Day Engine | **CLOSED** | Rollover modes (Fajr, Midnight, Custom), `planningDayKey` |
| **M4** | Task Model & Schema | **CLOSED** | SQLite migrations, `TaskDefinition`, `TaskOccurrence` |
| **M5** | Scheduling Engine | **CLOSED** | `WallClockResolver`, DST semantics, relative prayer math |
| **M6** | Materialization Pipeline | **CLOSED** | Occurrence persistence, idempotency, terminal freeze |
| **M7** | Today Screen & View Model | **CLOSED** | 5-tab UI, `TodayOrchestrator`, timeline projection |
| **M8** | Hijri Calendar Core | **CLOSED** | Canonical `HijriDate`, civil conversion, Umm al-Qura |
| **M9** | Recurrence Engine | **CLOSED** | Gregorian RRULE + Hijri lunar recurrence generation |
| **M10** | Add / Edit Task UX | **CLOSED** | Creation modals, scheduling pickers, validation |
| **M11** | Overdue & Missed Worker | **CLOSED** | Background lifecycle transitions, terminal states |
| **M12** | Location & Travel Detection | **CLOSED** | Manual coordinates, GPS fallback, travel Qasr flags |
| **M13** | Notification Engine | **NEXT** | Local notifications, prayer alerts, task reminders |
| **M14** | Calendar UI Screen | *PENDING* | Monthly grid, dual Gregorian/Hijri date display |
| **M15** | Worship Suggestions Engine | *PENDING* | Rules engine for voluntary worship recommendations |
| **M16** | Worship Suggestions UI | *PENDING* | Cards, one-tap add-to-today integration |
| **M17** | Settings & Preferences UI | *PENDING* | Method picker, juristic switch, Hijri adjustment |

### Closed Milestone Trust Contract
- Public interfaces and contracts established in **M1–M7 are CLOSED, VERIFIED, and TRUSTED**.
- AI agents working on M8+ must treat M1–M7 behavior as authoritative baseline facts. Do not refactor, redesign, or reopen closed milestone contracts unless a user instruction explicitly directs changes to them.

---

## 9. The Permanent "DO NOT" Rules

The following negative constraints are absolute and non-negotiable across all future milestones:

1. **DO NOT write recurrence logic outside M9**: No ad-hoc recurrence loops or repeat logic in M7, M8, or M10.
2. **DO NOT implement auto-roll**: Incomplete tasks must never automatically advance to the next planning day.
3. **DO NOT create a Sunrise tab**: Sunrise is an astronomical milestone, never a task container.
4. **DO NOT create a sixth "Anytime" tab**: All tasks belong within the five fixed prayer tabs.
5. **DO NOT reorder prayer tabs**: Tabs are always ordered: Fajr, Dhuhr, Asr, Maghrib, Isha.
6. **DO NOT build a generic "Inbox"**: Tasks must always have a defined relationship to a day or prayer window.
7. **DO NOT build standard Day/Week time-grid views**: The app's views are strictly the 5-tab Today timeline and the Month Calendar.
8. **DO NOT introduce gamification**: No points, streaks, badges, medals, progress bars that shame, or XP.
9. **DO NOT make GPS mandatory**: The app must fully function with manually selected cities or coordinates.
10. **DO NOT silently mutate exact-time intent**: DST or prayer adjustments never overwrite user schedule parameters.
11. **DO NOT duplicate PrayerWindow rows**: One task occurrence is materialized; projection across tabs is purely virtual at the view layer.
12. **DO NOT expand dark mode during MVP**: Keep styling focused strictly on the approved warm light design tokens.
13. **DO NOT place business or domain logic in React components**: Components remain pure views.
