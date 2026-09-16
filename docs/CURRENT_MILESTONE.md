# Current Milestone: M11 — Missed / Completed / Overdue Behavior

> **Current State:** M10 closed and Sonnet-approved; M11 architecture and planning next  
> **Current Test Suite:** 710 tests passing (37 test suites: 65 M10 tests, 645 baseline tests)  
> **Milestone Status:** M11 — ARCHITECTURE NEXT  
> **Architecture Status:** NOT STARTED (Pending Architecture Phase)  
> **Implementation Status:** NOT STARTED (Do NOT implement M11 yet)  

---

## 1. Milestone Goal

Implement the task lifecycle state machine, lifecycle transitions, terminal state invariants, and calm visual presentation states for **Missed**, **Completed**, and **Overdue** tasks.

M11 bridges background time progression, prayer period boundaries, and user interactions with persistent task occurrence state:

```text
Time / Prayer Boundary Progression (Timer, Foreground, Prayer Period End)
    ↓
M11 Lifecycle Detection (Overdue derivation, Period expiration check)
    ↓
TaskOccurrenceRepository Status Transitions (PENDING → COMPLETED | MISSED | CANCELLED)
    ↓
Terminal State Invariants (Frozen historical placement & identity)
    ↓
Today View Model & Visual States (Subtle overdue indicator, completed styling, in-place missed tasks)
```

M11 strictly adheres to the core Islamic planner principle: **No auto-rollforward** — tasks remain anchored to the prayer period and planning day for which they were intended.

---

## 2. Locked Domain Invariants & Specifications

All behaviors in M11 are bound by `docs/MASTER_PRODUCT_SPEC.md` (§12), `docs/DATA_MODEL.md` (§527–529), and `docs/TEST_PLAN.md` (§3.11):

### 2.1 Overdue is Runtime-Derived (MC-01, MC-02)
- An occurrence is overdue when:
  $$\text{now} > \text{calculatedStartTime} \quad \text{AND} \quad \text{status} = \text{'PENDING'}$$
- **Dynamic Derivation Only:** `isOverdue` is calculated on the fly during view projection.
- **NEVER Stored in Database:** The SQLite column `task_occurrences.status` strictly allows `'PENDING'`, `'COMPLETED'`, `'MISSED'`, `'CANCELLED'`. It NEVER stores `'OVERDUE'`.

### 2.2 Completion Transitions (MC-03)
- When marked complete by the user:
  - `status` transitions from `PENDING` $\to$ `COMPLETED`.
  - `completedAt` is recorded as an ISO 8601 UTC timestamp.
  - Subtasks may be checked/updated.
  - Once completed, the occurrence becomes a frozen historical record.

### 2.3 Missed on Period End (MC-04)
- When a task's valid prayer period or scheduled window ends while the task is still `PENDING`:
  - `status` transitions from `PENDING` $\to$ `MISSED`.
  - `missedAt` is recorded as an ISO 8601 UTC timestamp.
  - Evaluation occurs at prayer period boundaries, upon app foregrounding, and during periodic ticks.

### 2.4 Missed Tasks Stay in Place (MC-05)
- A missed task remains permanently associated with its original prayer section and planning day date.
- It is displayed within its original section in the UI (or in historical views) and is never silently removed.

### 2.5 Absolute Prohibition on Auto-Rollforward (MC-06)
- **Zero Silent Rollover:** Missed tasks do **NOT** automatically roll forward into the next prayer period or subsequent days.
- In an Islamic prayer-centered lifestyle, prayer times are distinct spiritual intervals; a task assigned to Dhuhr that is missed belongs historically to Dhuhr.
- If the user wants to perform the task later, they may manually reschedule or duplicate it.

### 2.6 Cancellation Transitions (MC-07)
- When a task occurrence is cancelled:
  - `status` transitions from `PENDING` $\to$ `CANCELLED`.
  - Stored as a tombstone record for auditability and recurring sync preservation.

### 2.7 Terminal State Immutability
- Occurrences in `COMPLETED`, `MISSED`, or `CANCELLED` status are **permanently frozen**:
  - `calculatedStartTime`, `calculatedPrayerSection`, `eligiblePrayerSections`, `wallClockResolution`, `planningDayKey`, `localDate`, `timezone`, `seriesId`, and `taskDefinitionId` are NEVER modified by rematerialization, horizon sync, or background sweeps.
  - Guaranteed by existing M4 repository guards and M6 materialization freeze logic.

---

## 3. Visual Direction & Calm Aesthetics

- **Subtle Overdue Display:**
  - If scheduled time has passed but the prayer period is still active: display subtle, calm overdue text (e.g., `"30 min overdue"`).
  - **No Punitive Visuals:** Avoid glaring red text, aggressive exclamation marks, or guilt-inducing warnings. Maintain the calm, mosque-inspired aesthetic.
- **Completed Visual State:**
  - Clear visual affordance (checked checkbox, muted text, subtle strike-through).
  - Tactile, satisfying tap interaction without arcade-like gamification or confetti.
- **Missed Visual State:**
  - Calm, neutral missed badge or text indicator indicating the task was not completed during its window.

---

## 4. Execution Triggers & Seams

M11 architecture must formalize three distinct execution triggers:
1. **Prayer Period Boundary Crossing:** When active prayer changes (e.g., Dhuhr $\to$ Asr), all pending tasks belonging to the ended period transition to `MISSED`.
2. **App Foreground Event:** When app returns to foreground, check for any prayer periods or windows that elapsed while the app was suspended/closed, and transition any overdue pending tasks to `MISSED`.
3. **Periodic Check (60s tick):** Periodic sweep while app is in active use to update derived `isOverdue` presentation states and handle boundary transitions.

---

## 5. Locked Domain Boundaries

M11 must strictly respect established subsystem ownership:
- **M4 Task Domain & Repositories:** Use existing `TaskOccurrenceRepository` transition methods (`updateStatus`, guarded updates). Do not bypass repository invariants.
- **M5 Scheduling & WallClockResolver:** Boundaries of prayer periods and windows are determined by M5 and `PrayerTimeline`.
- **M6 Materialization:** M6 already protects terminal rows; M11 transitions `PENDING` rows to terminal statuses.
- **M7 Today Orchestrator:** Coordinate lifecycle transitions with `TodayOrchestrator` refresh cycles to prevent race conditions or UI tearing.
- **M10 Add/Edit:** M10 horizon sync already skips terminal rows; M11 transitions do not conflict with M10.

---

## 6. Out of Scope for M11

The following items are strictly **OUT OF SCOPE** for M11:
- Location GPS and travel refresh engine (M12).
- Notification triggering or background push delivery (M13).
- Calendar month grid visualization (M14).
- Worship Suggestions engine (M15 / M16).
- User Settings UI (M17).
- Automatic task rollforward (strictly prohibited).
- Modifying M10 Add/Edit form components or serializers.

---

## 7. Key Architectural Questions for Planning Phase

The M11 architecture phase must evaluate and resolve:
1. **Worker Architecture:** Should the lifecycle checker be a dedicated service (`TaskLifecycleService` / `OverdueWorker`) coordinated by `TodayOrchestrator` or a standalone coordinator?
2. **Foreground AppState Listener:** How should React Native `AppState` changes be hooked cleanly without leaking listeners or duplicating subscriptions?
3. **Batch Transition Queries:** Does `TaskOccurrenceRepository` need an additive batch query (e.g., `markExpiredPendingAsMissed(boundaryTime, tx)`) to execute transitions atomically?
4. **Derived vs. Stored Evaluation:** Exact rules for determining when an `EXACT_TIME`, `PRAYER_RELATIVE`, `PRAYER_WINDOW`, or `ANYTIME_TODAY` task's window has closed.
5. **View Model Projection Updates:** Ensuring `TodayViewModelProjection` exposes `isOverdue` and elapsed overdue minutes without unnecessary re-renders.
6. **Test Strategy:** How to test time advancement, period expiration, foreground events, and mock clock transitions deterministically.

---

## 8. Test Strategy & Acceptance Expectations

The proposed M11 test suite must cover:
- **MC-01:** Runtime derivation of `isOverdue` (`now > calculatedStartTime && status === 'PENDING'`).
- **MC-02:** Confirmation that `OVERDUE` is never written to SQLite `task_occurrences.status`.
- **MC-03:** Completion transitions (`PENDING` $\to$ `COMPLETED`, `completedAt` timestamp set).
- **MC-04:** Period expiration missed transitions (`PENDING` $\to$ `MISSED`, `missedAt` timestamp set on period end).
- **MC-05:** Missed occurrences retain original `calculatedPrayerSection`, `localDate`, and `planningDayKey`.
- **MC-06:** Zero auto-rollforward across periods or planning days.
- **MC-07:** Cancellation transitions (`PENDING` $\to$ `CANCELLED`, `cancelledAt` timestamp set).
- **Foreground & Sweep Tests:** Expiration catching up after simulated app suspension.
- **Regression Invariant:** **All 710 existing tests (M1–M10) must remain 100% green.**

---

## 9. Milestone Summary & Status

| Attribute | Specification |
|---|---|
| **Milestone** | **M11 — Missed / Completed / Overdue Behavior** |
| **Type** | Lifecycle State Machine & UI Visual States |
| **Current Phase** | **ARCHITECTURE NEXT** |
| **Implementation** | **NOT STARTED (Do NOT implement yet)** |
| **Baseline Tests** | **710 / 710 passing (37 test suites)** |
