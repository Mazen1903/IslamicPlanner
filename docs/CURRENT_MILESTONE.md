# Current Milestone: M10 — Add/Edit Task

> **Current State:** M1–M9 CLOSED / OPUS APPROVED (M9 commit: `5b713f2`)  
> **Current Test Baseline:** 645 tests passing (29 test suites: 100 M9 tests, 545 M1–M8 baseline tests)  
> **Milestone Status:** ARCHITECTURE NEXT  
> **Implementation Status:** NOT STARTED  

---

## 1. Milestone Goal

Build the user-facing Add/Edit Task workflow that creates and edits `TaskDefinition` data using the already-approved scheduling and recurrence domain contracts.

M10 is primarily an **application and UI orchestration milestone**. It bridges user interaction with existing domain logic:

```text
User Input (Form State)
    ↓
M10 UI Orchestration & Validation
    ↓
Serialization to Domain Models (ScheduleData, bare RRULE, Options)
    ↓
M4 TaskEngine CRUD / Series Versioning
    ↓
M6 Materialization Trigger (Occurrence Generation)
    ↓
Local SQLite Persistence & Today View Refresh
```

M10 translates user choices into existing domain representations **without redefining scheduling semantics**.

---

## 2. Locked Product UX

### 2.1 Main Add Task Flow Layout
The Add Task screen follows a cohesive, prayer-centered visual flow:
1. **Mosque / Header Area**: Calm visual header with screen context (or prayer preselection banner).
2. **Task Name**: Clean, prominent input field with validation.
3. **Four Scheduling Mode Cards**:
   - Exact Time
   - Relative to Prayer
   - Prayer Window
   - Anytime Today
4. **Repeat (Recurrence)**: Dropdown / selector for recurrence rules.
5. **More Options**: Expandable drawer or accordion for secondary attributes.
6. **Save Button**: Primary action button with loading and disable states.

### 2.2 Four Scheduling Modes
1. **Exact Time**:
   - Date selection (civil intended date).
   - Local wall-clock time (`HH:mm`).
   - Live computed prayer-section preview (e.g., `"6:00 PM — Asr"`).
2. **Relative to Prayer**:
   - Prayer selector (`FAJR`, `DHUHR`, `ASR`, `MAGHRIB`, `ISHA` — `SUNRISE` is NOT user-selectable).
   - Direction toggle (`BEFORE` / `AFTER`).
   - Offset input (minutes as a positive integer).
   - Live computed local-time preview (e.g., `"90 min after Maghrib — 8:14 PM"`).
3. **Prayer Window**:
   - Start prayer selector.
   - End prayer selector.
   - Strict start-inclusive / end-exclusive semantics (e.g., `[Dhuhr, Asr)`).
   - Preselection support: When launched from `"+ Add to Dhuhr"` in the Today screen, automatically preselect Dhuhr $\to$ Asr.
4. **Anytime Today**:
   - Planning-day based allocation.
   - No fixed scheduled clock time.

### 2.3 Repeat Options
Supported user-facing repeat presets:
- **Doesn't repeat** (non-recurring single task)
- **Daily** (every day or every $N$ days)
- **Weekdays** (Monday through Friday)
- **Weekly** (on specific days of week, with optional interval)
- **Monthly** (on day of month, e.g., 15th)
- **Specific days** (explicit weekday selection)
- **Custom** (interval + frequency combinations)

### 2.4 More Options Drawer
Secondary task attributes configured in the expandable section:
- **Reminder**: Notification / reminder preferences.
- **Priority**: `NORMAL` vs. `IMPORTANT`.
- **Duration**: Estimated task duration in minutes.
- **Notes**: Freeform descriptive text.
- **Subtasks**: Ordered list of checklist items with unique template IDs.
- **Attachment**: Attachment references or placeholders.
- **Tags**: Categorization tag array.

### 2.5 Confirmation & Feedback
Upon successful creation:
- Toast / banner confirmation: `"Task Added! May Allah make it easy for you"`
- Task summary and seamless navigation back to Today or active view.

---

## 3. Locked Domain Boundaries

M10 strictly orchestrates existing domain capabilities. M10 does **NOT** redefine:
- **M5 Scheduling Semantics**: Wall-clock resolution, DST gap/overlap behavior, anchor relative math, and prayer window bounds remain owned by M5 `SchedulingEngine`.
- **M6 Materialization Semantics**: Atomic occurrence generation, terminal status protection, and idempotency remain owned by M6 `MaterializationEngine`.
- **M8 Hijri Conversion**: Calendar conversion and adjustment handling remain owned by M8 `HijriService`.
- **M9 Recurrence Semantics**: Recurrence membership, date clamping, interval phase, and ambiguity resolution remain owned by M9 `RecurrenceEngine`.

M10 serializes user choices into those approved domain contracts.

---

## 4. Recurrence Serialization (Locked from M9)

M9 requires explicit selectors and strictly enforces a bare RRULE allowlist. M10 owns serialization; M9 owns evaluation.

### 4.1 Serialization Rules
- Must emit **bare RRULE bodies** (NO `RRULE:` prefix).
- Must NEVER emit unsupported RFC 5545 tokens: `COUNT`, `UNTIL`, `BYSETPOS`, ordinal `BYDAY` (e.g., `1MO`), negative `BYMONTHDAY`.
- Must serialize simple options into explicit tokens:

| User Choice | Serialized RRULE Body |
|---|---|
| Daily | `FREQ=DAILY` |
| Weekly anchored on Tuesday | `FREQ=WEEKLY;BYDAY=TU` |
| Monthly anchored on day 17 | `FREQ=MONTHLY;BYMONTHDAY=17` |
| Weekdays | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| Every 3 days | `FREQ=DAILY;INTERVAL=3` |
| Every 2 weeks on Friday | `FREQ=WEEKLY;INTERVAL=2;BYDAY=FR` |

---

## 5. Scheduling Serialization

M10 serializes UI inputs into existing M4/M5 `scheduleData` domain representations without inventing alternate representations:

- **Exact Time**: Fixed local wall-clock intent `{ localTime: "HH:mm" }`.
- **Relative to Prayer**: Prayer + direction + offset `{ prayer: PrayerName, relation: "BEFORE" | "AFTER", offsetMinutes: number }`. Note: `SUNRISE` is NOT user-selectable.
- **Prayer Window**: `{ startPrayer: PrayerName, endPrayer: PrayerName }`. Non-wrapping in v1; start is inclusive, end is exclusive.
- **Anytime Today**: Null or empty schedule data representation; no scheduled clock time.

---

## 6. Edit Task & Scope Selection

M10 supports editing existing task definitions as well as creating new ones.

### 6.1 Edit Scope for Recurring Tasks
When editing an occurrence of a recurring series, the UI must allow selecting the edit scope per M4 series operations:
1. **This occurrence only**: `TaskEngine.updateOccurrenceOverride` (updates `overrideData` on the specific occurrence; definition remains unchanged).
2. **This and future occurrences**: `TaskEngine.splitSeriesAndFuture` (atomic split at `splitDate`; predecessor closed, successor version created, pending future occurrences purged).
3. **Entire series**: `TaskEngine.updateEntireSeries` (updates active definition in-place; preserves historical completed/missed/cancelled occurrences).

### 6.2 Non-Recurring Edit
Editing a non-recurring task updates the single governing `TaskDefinition` directly.

---

## 7. Date & Planning Day Separation

- The user selects a civil intended date (`YYYY-MM-DD`).
- Planning-day assignment and rollover semantics remain strictly the responsibility of M3 `PlanningDayEngine` and M5 `SchedulingEngine`.
- React components must **never** perform planning-day calculations directly.

---

## 8. Prayer Previews as Derived UI Data

To provide immediate feedback, the UI displays dynamic derived previews:
- For Exact Time: `"6:00 PM — Asr"`
- For Relative to Prayer: `"90 min after Maghrib — 8:14 PM"`

**Boundary Rule**:
- Previews must be computed via existing approved domain engines (`PrayerTimeline`, Luxon, `WallClockResolver`).
- Preview values are **strictly derived UI presentation data**. They are NOT authoritative schedule storage and must not be saved into the database schema.

---

## 9. Form Validation & Error Translation

M10 architecture must define comprehensive user-facing validation and map domain errors into clear UI feedback:

### 9.1 Validation Rules
- **Task Title**: Must not be empty or whitespace-only.
- **Date**: Must be a valid civil date (`YYYY-MM-DD`).
- **Exact Time**: Must be a valid 24-hour time format (`HH:mm`, `00:00`–`23:59`).
- **Prayer Offset**: Must be a valid non-negative integer within reasonable bounds.
- **Prayer Window**: `startPrayer` and `endPrayer` must not be identical; must not wrap around midnight in v1.
- **Recurrence**: Valid interval ($N \ge 1$), valid day selections, supported combinations only.
- **Context Availability**: Graceful handling when prayer calculation or location context is not yet configured.

### 9.2 Error Translation
Translate low-level domain exceptions (`TaskValidationError`, `TemporalResolutionError`, `RecurrenceError`, `DataIntegrityError`) into clear, localized, actionable inline form error messages.

---

## 10. Form State Management

The architecture must define:
- **Add vs. Edit Mode**: Form initialization from empty defaults vs. existing `TaskDefinition` + `TaskOccurrence`.
- **Scheduling-Mode Switching**: Clean handling of mode-specific fields when switching cards (preserving draft inputs where helpful, discarding incompatible state on submit).
- **Validation Timing**: On-blur field validation and on-submit comprehensive validation.
- **Loading & Submitting States**: Disabling duplicate submits (`isSubmitting`), handling network/disk delays.
- **Unsaved Changes**: Guarding accidental back navigation when form is dirty.
- **State Scope**: Prefer clean, localized React component/hook state; do not pollute global stores unnecessarily.

---

## 11. Materialization After Save

Saving a task requires triggering occurrence materialization so the Today view and schedules reflect changes immediately:
- **Non-recurring create**: Materialize the single occurrence on `startDate`.
- **Recurring create**: Materialize occurrences across the active planning window (e.g., today through forecast window).
- **Edit this occurrence**: Re-materialize or update the specific occurrence placement.
- **Edit this and future**: Re-materialize from `splitDate` forward.
- **Edit entire series**: Re-materialize pending occurrences across the active window.

**Orchestration Rule**: React UI components must NOT run direct M6 loops. A dedicated lightweight application service/orchestrator must coordinate TaskEngine mutation and MaterializationEngine synchronization.

---

## 12. Visual Direction & Aesthetics

- **Theme**: Light theme ONLY for MVP (using approved M1 design tokens).
- **Palette**:
  - Deep Islamic Green (primary brand, mosque headers, primary buttons)
  - Pale Mint (accents, active card highlights, badges)
  - Soft White & Off-White / Light Gray (card backgrounds, surfaces)
- **Component Styling**:
  - Rounded cards with subtle, calm drop shadows.
  - Generous padding and minimum 44dp touch targets.
  - Spiritual, peaceful aesthetic (calm mosque visual language).
  - Modern typography: display heading paired with clean sans-serif body.
  - No sterile enterprise form styling; no unnecessary noisy arrows.

---

## 13. Out of Scope for M10

The following items are strictly **OUT OF SCOPE** for M10:
- Redesigning the Today screen (M7 is closed).
- Calendar month screen implementation (M14).
- Notification scheduling and delivery engine (M13).
- Worship Suggestions engine and UI (M15 / M16).
- Settings screen and preferences UI (M17).
- Location GPS and travel refresh engine (M12).
- Cloud synchronization or remote backends.
- Dark mode expansion (remains M21).
- Prayer tracking and gamification.
- Inbox or generic backlog features.
- Modifying M9 recurrence engine semantics.

---

## 14. Key Architectural Questions for Opus Design

The M10 architecture phase must resolve the following questions. **They must NOT be answered in this milestone contract:**

1. **Screen & Component Hierarchy**: What is the component structure for `AddTaskScreen`, scheduling subforms, repeat picker, and more options?
2. **Add vs. Edit Reuse**: Should Add and Edit share a single unified form component or use specialized wrappers over shared subforms?
3. **Form State Model**: Will form state use standard React state, a dedicated custom hook (`useTaskForm`), or a form library?
4. **Scheduling Mode Subforms**: How are mode-specific fields structured, validated, and swapped dynamically?
5. **Preview Calculation Orchestration**: How and when are prayer previews calculated as user modifies time/prayer/offset?
6. **Save Orchestration Service**: What application service coordinates `TaskEngine` persistence and `MaterializationEngine` synchronization?
7. **RRULE Serialization Helpers**: Where do the bare RRULE serializers live, and how are they unit tested against M9?
8. **Edit-Scope Selection Flow**: What is the exact UI flow for prompting recurrence edit scopes (action sheet, modal, dialog)?
9. **Materialization Trigger Pipeline**: Exactly which materialization methods are invoked for each create/edit scenario?
10. **Error Translation Architecture**: How are domain errors cleanly mapped into field-level and form-level UI error messages?
11. **Navigation Behavior**: What is the exact navigation flow after save (pop back to Today, navigate to specific tab)?
12. **Confirmation Feedback**: Toast vs. banner confirmation presentation and auto-dismiss behavior.
13. **More Options Mapping**: How are subtasks, duration, priority, notes, and tags serialized into `TaskDefinition` columns?
14. **Test Strategy**: How will unit, hook, integration, and UI component tests be partitioned?
15. **Application Services**: Does M10 require a new service (e.g., `TaskOrchestrator` / `TaskService`) to keep screens clean?
16. **Schema / API Needs**: Are any minor schema or API adjustments needed, or are M4/M5/M6/M9 APIs 100% sufficient as-is?

---

## 15. Test Strategy & Acceptance Expectations

The proposed M10 test suite must cover at least:

### 15.1 Scheduling Mode Workflows
- Add non-recurring Exact Time task with date and time.
- Add Relative-to-Prayer task with prayer, direction, and offset.
- Add Prayer Window task with start and end prayers.
- Add Anytime Today task with planning-day allocation.
- Dynamic switching between scheduling modes without data corruption.

### 15.2 Recurrence Serialization
- Daily recurrence serialization to `FREQ=DAILY`.
- Weekly recurrence with `BYDAY` (e.g., `BYDAY=TU`).
- Monthly recurrence with `BYMONTHDAY` (e.g., `BYMONTHDAY=17`).
- Weekday recurrence serialization (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`).
- Custom interval serialization (`INTERVAL=2`, `INTERVAL=3`).
- Rejection / prevention of unsupported recurrence formats.

### 15.3 Form Validation & Errors
- Validation of empty title, missing dates, malformed times.
- Validation of negative or invalid offsets.
- Validation of identical or wrapping prayer windows.
- Domain error translation to user-friendly UI errors.
- Prevention of duplicate saves during in-flight submission.

### 15.4 Edit & Series Scope Handling
- Editing an existing non-recurring task.
- Editing a recurring task with "This occurrence only" scope.
- Editing a recurring task with "This and future" scope (series split).
- Editing a recurring task with "Entire series" scope.

### 15.5 Save Orchestration & Previews
- Live prayer preview calculation accuracy.
- Materialization trigger verification after save.
- Clean navigation and confirmation feedback.

### 15.6 Regression Invariant
- **All 645 existing tests (M1–M9) must remain 100% green.**

---

## 16. Milestone Summary & Status

| Attribute | Specification |
|---|---|
| **Milestone** | **M10 — Add/Edit Task** |
| **Type** | Application & UI Orchestration |
| **Current Phase** | **ARCHITECTURE NEXT** |
| **Implementation** | **NOT STARTED** |
| **Baseline Tests** | **645 / 645 passing** |
