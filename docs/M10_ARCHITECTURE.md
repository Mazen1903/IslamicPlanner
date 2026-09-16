# M10 Architecture: Add/Edit Task

> **Status:** BINDING / FROZEN (Consolidates M10 Rev 1–Rev 6)  
> **Milestone:** M10 — Add/Edit Task  
> **Layer:** Application & Presentation Feature Layer (`src/features/task-form/`, `src/services/`, `app/`)  
> **Prerequisites:** M4 (Task Engine & Data Model), M5 (Scheduling Engine), M6 (Materialization Pipeline), M7 (Today Screen & View Model), M8 (Hijri Service), M9 (Recurrence Engine)

---

## 1. Executive Summary & Design Principles

M10 implements the user-facing Add and Edit Task workflows. It bridges user input with the closed domain engines (M4 TaskEngine, M5 SchedulingEngine, M6 MaterializationEngine, M8 HijriService, M9 RecurrenceEngine).

### Architectural Invariants
1. **Application/Presentation Boundary:** M10 application concerns live in `src/features/task-form/` and `src/services/PlannerRefreshCoordinator.ts`. Closed domain modules (`src/domain/*`) remain untouched except for two approved additive repository methods.
2. **Light Mode Only:** Warm, calm Islamic green/mint/white aesthetic using M1 design tokens. Dark mode expansion is deferred to post-MVP.
3. **No Gamification:** No XP, streaks, badges, trophies, or confetti.
4. **No Generic Inbox / No Auto-Roll:** Every task belongs to a day or prayer window. Incomplete tasks never silently auto-advance.
5. **No Attachment / No Delete in M10:** M10 covers Create and Edit only. Attachment and Delete UI are out of scope.
6. **M9 as Sole Membership Authority:** M10 never reimplements recurrence rules or membership math. All seed generation delegates to `RecurrenceEngine.generateSeedDates` or `occursOn`.

---

## 2. Dual-Date Form State Model

Form state maintains two independent dates:

1. **`civilSeedDate` (`YYYY-MM-DD`):** The civil calendar date representing the user's explicit scheduling anchor.
   - For central `+` tap: Current civil date in the configured timezone.
   - For prayer-tab `+ Add`: The concrete `PrayerPeriodInstance.sourceDate`.
   - Used for `EXACT_TIME`, `PRAYER_RELATIVE`, and `PRAYER_WINDOW`.
2. **`planningDayDate` (`YYYY-MM-DD`):** The operational planning day key from the active Today runtime (`planningDay.key`).
   - Used for `ANYTIME_TODAY`.

### Serialization Invariant
- `EXACT_TIME`, `PRAYER_RELATIVE`, `PRAYER_WINDOW` $\to$ `TaskDefinition.startDate = civilSeedDate`
- `ANYTIME_TODAY` $\to$ `TaskDefinition.startDate = planningDayDate`

Both draft dates are preserved when switching scheduling modes. Inactive mode drafts never leak into `TaskDefinition`.

---

## 3. Scheduling Modes & Serialization

### 3.1 Exact Time
- **Fields:** Date, local wall-clock time (`HH:mm`).
- **Domain Mapping:** `scheduleType = 'EXACT_TIME'`, `scheduleData = { localTime: "HH:mm" }`.
- **Derived Preview:** Computed via `SchedulingEngine` (e.g., `"6:00 PM · Asr"`). Authoritative storage is local time only.

### 3.2 Relative to Prayer
- **Fields:** Prayer anchor (`FAJR`, `DHUHR`, `ASR`, `MAGHRIB`, `ISHA` — `SUNRISE` is excluded), relation (`BEFORE` / `AFTER`), offset in minutes ($\ge 0$).
- **Domain Mapping:** `scheduleType = 'RELATIVE_TO_PRAYER'`, `scheduleData = { prayer, relation, offsetMinutes }`.
- **Derived Preview:** Resolved wall-clock time + prayer section (e.g., `"90 min after Maghrib — 8:14 PM · Isha"`).

### 3.3 Prayer Window
- **Fields:** `startPrayer`, `endPrayer`.
- **Semantics:** Start inclusive, end exclusive ($[\text{startPrayer}, \text{endPrayer})$). Strictly non-wrapping in v1 (valid: `FAJR` $\to$ `DHUHR`, `DHUHR` $\to$ `ASR`, `ASR` $\to$ `MAGHRIB`, `MAGHRIB` $\to$ `ISHA`).
- **Domain Mapping:** `scheduleType = 'PRAYER_WINDOW'`, `scheduleData = { startPrayer, endPrayer }`.

### 3.4 Anytime Today
- **Fields:** No fixed clock time.
- **Domain Mapping:** `scheduleType = 'ANYTIME_TODAY'`, `scheduleData = null`.
- **Anchor:** Bound to `planningDayDate`.

### 3.5 Prayer-Tab Launch Defaults
When opened from a specific prayer tab in Today:
- `+ Add to Fajr` $\to$ `PRAYER_WINDOW` (`FAJR` $\to$ `DHUHR`)
- `+ Add to Dhuhr` $\to$ `PRAYER_WINDOW` (`DHUHR` $\to$ `ASR`)
- `+ Add to Asr` $\to$ `PRAYER_WINDOW` (`ASR` $\to$ `MAGHRIB`)
- `+ Add to Maghrib` $\to$ `PRAYER_WINDOW` (`MAGHRIB` $\to$ `ISHA`)
- `+ Add to Isha` $\to$ `PRAYER_RELATIVE` (`prayer: ISHA`, `relation: AFTER`, `offsetMinutes: 0`) *(Never emits an illegal wrapping window)*

---

## 4. Recurrence Serialization & Hijri Support

### 4.1 Gregorian Recurrence (RRULE)
M10 owns serialization; M9 owns parsing and evaluation.
- Emits **bare RRULE strings** (no `RRULE:` prefix).
- Strictly no unsupported tokens (`COUNT`, `UNTIL`, `BYSETPOS`, ordinal `BYDAY`).
- `BYDAY` weekdays are always sorted numerically in ISO order (`1=MO` to `7=SU`): `MO,TU,WE,TH,FR,SA,SU`.
- Preset Mappings:
  - Daily: `FREQ=DAILY`
  - Weekdays: `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
  - Weekly (e.g. Tuesday): `FREQ=WEEKLY;BYDAY=TU`
  - Monthly (e.g. 17th): `FREQ=MONTHLY;BYMONTHDAY=17`
  - Specific Days (e.g. Mon, Wed, Fri): `FREQ=WEEKLY;BYDAY=MO,WE,FR`
  - Custom: Interval $N \ge 1$ with Daily, Weekly, or Monthly.

### 4.2 Hijri Recurrence
- Located under `Repeat` $\to$ `Custom` $\to$ `Calendar: Hijri`.
- Supports M9's exact selector model:
  1. Selected Hijri days every Hijri month (`selectedDays`, `everyMonth: true`)
  2. Every day in selected Hijri months (`everyDay: true`, `selectedMonths`)
  3. Selected Hijri days in selected Hijri months (`selectedDays`, `selectedMonths`)
- **Mutual Exclusion:** Gregorian `recurrenceRule` and Hijri `hijriRecurrence` are strictly mutually exclusive.

---

## 5. More Options & Scope Management

### 5.1 More Options
- **Reminder:** Persists `ReminderRule.offsetMinutes`. Preserves existing unknown reminder fields on edit.
- **Priority:** `NORMAL` vs. `IMPORTANT`. Subtle styling, not conveyed by color alone.
- **Duration:** Estimated minutes (metadata only; never alters schedule placement).
- **Notes:** Optional text.
- **Subtasks:** Ordered list of checklist items with unique IDs.
- **Tags:** Tag array.

### 5.2 Recurring Edit Scopes
When opening an occurrence of a recurring series, prompt scope selection before editing:
1. **This occurrence:**
   - Edits only occurrence-level fields: `title`, `notes`, subtask completion.
   - Hides definition-level fields (schedule, date, recurrence, priority, duration, tags, reminder).
   - Persists via `TaskEngine.updateOccurrenceOverride`.
2. **This and future occurrences:**
   - Splits series via `TaskEngine.splitSeriesAndFuture(seriesId, splitDate, changes)`.
   - Predecessor ends at `splitDate - 1`; successor starts at `splitDate`.
   - Future pending rows are purged and successor horizon is synchronized.
3. **All occurrences:**
   - Label: `"All occurrences"`, helper: `"Applies to the current repeating schedule"`.
   - Updates current open repeating version only via `TaskEngine.updateEntireSeries`.
   - Does NOT rewrite historical predecessor versions from prior splits.

---

## 6. Two-Phase Save Contract & Single-Flight Protection

Because `MaterializationEngine.materializeOne` opens its own root SQLite transaction, mutation and occurrence materialization cannot share a single database transaction.

### 6.1 Two-Phase Contract
- **Phase 1: Definition Mutation (Authoritative / Committed)**
  - Calls `TaskEngine.createTask`, `updateEntireSeries`, `splitSeriesAndFuture`, or `updateOccurrenceOverride`.
  - Once committed, save is fundamentally successful.
- **Phase 2: Derived Occurrence Synchronization (Best-effort / Idempotently Retryable)**
  - Reconciles or materializes occurrences for the series.
  - If Phase 2 succeeds $\to$ `SAVED_AND_SYNCED`.
  - If Phase 2 fails $\to$ `SAVED_SYNC_INCOMPLETE`. The task is saved; schedule synchronization will recover on the next full refresh or via Retry Sync.

### 6.2 Single-Flight Presentation Mutex
- Controlled via `useRef` latch in `TaskFormOrchestrator` / presentation layer.
- States: `IDLE` $\to$ `SUBMITTING` $\to$ `COMMITTED` $\to$ `SUCCESS` / `PARTIAL_SUCCESS`.
- Double-tap on Save is rejected synchronously before the first `await`.
- Retry Sync reuses committed definition identity (`definitionId`, `seriesId`, `scope`) and executes Phase 2 ONLY. It never repeats Phase 1.

### 6.3 Sync Results & Stage Tagging
```typescript
type SyncStage = 'DISCOVERY' | 'RECURRENCE' | 'CONTEXT' | 'DELETE' | 'MATERIALIZE';

interface SyncIssue {
  stage: SyncStage;
  seriesId?: string;
  seedDate?: string;
  code?: string;
  message: string;
}
```
Stages are assigned explicitly at the operation call site, not inferred from exception classes.

---

## 7. Horizon Synchronization & Durable Recovery

### 7.1 Canonical Horizon
$$\text{Horizon} = [\text{todayCivil} - 7\text{ days}, \text{todayCivil} + 7\text{ days}]$$

### 7.2 Two-Source Candidate Discovery
`RecurringHorizonSync` discovers candidate series through:
- **Source A:** Active recurring definitions intersecting the horizon (`findActiveRecurringIntersectingRange`).
- **Source B:** Existing `PENDING` occurrences in the horizon (`findPendingByLocalDateRange`).
- **Candidates:** $\text{Source A} \cup \text{Source B}$.

**Critical Rule (No Source-B Skip):** Every candidate series proceeds through PLAN reconciliation regardless of current recurrence kind. This guarantees cleanup of orphaned PENDING rows after a recurring $\to$ non-recurring transition where Phase 2 had failed.

### 7.3 Complete Version Set & Plan-Before-Delete
For each candidate series:
1. Load all active versions via `TaskDefinitionRepository.findBySeriesId`.
2. Generate desired seeds for every active version intersecting the horizon using M9 `RecurrenceEngine.generateSeedDates`.
3. Deduplicate desired seeds.
4. Query existing PENDING occurrences in the horizon via `TaskOccurrenceRepository.findPendingBySeriesAndDateRange`.
5. Compute `toCreate`, `toRetain`, and `toDelete`.
6. **Plan-Before-Delete Invariant:** If ANY step in PLAN fails, record a `SyncIssue`, perform ZERO deletes, ZERO creates, and proceed to the next series.
7. Only after PLAN succeeds does EXECUTE run: delete obsolete PENDING, materialize retained/new seeds.

### 7.4 Non-Recurring Date Move
When a non-recurring task moves from `oldStartDate` to `newStartDate`:
- If `oldStartDate === newStartDate`: materialize new definition at seed.
- If changed: query old occurrence. If PENDING, delete it. If terminal (COMPLETED, MISSED, CANCELLED), leave it untouched. Materialize new seed.

### 7.5 Date-Scoped Scheduling Contexts
Never share one `PrayerTimeline` across different dates. Each seed date builds its own `PrayerTimeline` and `SchedulingContext`.

---

## 8. Application Coordination & M7 Store API Preservation

### 8.1 PlannerRefreshCoordinator
A pure application service that coordinates:
1. Fetch live temporal inputs (`TodayTemporalInputProvider.getInputs()`).
2. If `SETUP_REQUIRED`, return `SETUP_REQUIRED`.
3. Calculate $\pm 7$-day horizon around civil today.
4. Run `RecurringHorizonSync.sync()`.
5. Run `TodayOrchestrator.refreshToday()`.
6. Return composite result.

### 8.2 M7 Store API Preservation
- No changes to `useTodayStore` method signatures or behavior.
- `startRefresh()` is called before async work to acquire a `requestGeneration` token.
- Stale refresh results are rejected if `token !== requestGeneration`.
- `setSetupRequired(token?)` internally increments `requestGeneration`.
- Post-save uses `useToday().refresh()` accessor, keeping presentation decoupled from store internals.

---

## 9. UX & Accessibility

1. **Create Success:** Locked state displaying `"Task Added! May Allah make it easy for you."`, task summary, and `"Done"` button.
2. **Partial Success:** Accurate, honest copy:
   - Location ready: `"Task saved. Schedule will update on next refresh."` with `"Retry Sync"` button.
   - Setup required: `"Task saved. Its schedule will appear once you configure your location in Settings."`
3. **Edit Success:** Brief confirmation `"Task Updated"` and navigation back.
4. **Unsaved Changes Guard:** Alert prompt before discarding a dirty form. No prompt when clean or after commit.
5. **Accessibility:** WCAG 44dp touch targets, semantic accessibility roles and labels, error messages associated with inputs, priority conveyed with text and icon.

---

## 10. Repository Additions (No Migration)

### `TaskOccurrenceRepository`
```typescript
findPendingBySeriesAndDateRange(
  seriesId: string,
  startDate: string,
  endDate: string,
  tx?: Transaction
): Promise<TaskOccurrence[]>
```
Returns occurrences where `seriesId = ? AND status = 'PENDING' AND localDate >= ? AND localDate <= ?`.

### `TaskDefinitionRepository`
```typescript
findActiveRecurringIntersectingRange(
  rangeStart: string,
  rangeEnd: string,
  tx?: Transaction
): Promise<TaskDefinition[]>
```
Canonical query:
```sql
isActive = true
AND (recurrenceRule IS NOT NULL OR hijriRecurrence IS NOT NULL)
AND startDate <= rangeEnd
AND (effectiveToDate IS NULL OR effectiveToDate >= rangeStart)
AND (recurrenceEnd IS NULL OR recurrenceEnd >= rangeStart)
AND (effectiveFromDate IS NULL OR effectiveFromDate <= rangeEnd)
```
