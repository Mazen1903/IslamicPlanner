# Current Milestone: M14 — Calendar UI Screen

> **Current State:** M14 IMPLEMENTED / AWAITING SONNET REVIEW — 961/961 tests, 68 suites  
> **Current Test Suite:** 961 tests passing (68 test suites)  
> **Milestone Status:** M14 — IMPLEMENTED / AWAITING SONNET REVIEW  
> **Architecture Status:** APPROVED & FROZEN  
> **Implementation Status:** COMPLETED (961/961 tests green)  

---

## 1. Milestone Goal

Implement the Calendar month grid screen, supporting Gregorian month browsing, per-cell Hijri dates, bounded recurrence synchronization, read-only selected-day 5-prayer detail, and upcoming month overview.

Key architectural principles:
- **Gregorian Month Only:** Gregorian calendar is the browsing structure (Sunday-first, natural 28/35/42 cells / 4, 5, or 6 rows). Hijri dates are displayed as secondary per-cell dates and header range.
- **planningDayKey Cell Semantics:** Display query filters occurrences by canonical `planningDayKey` across `[monthStart, monthEnd]`.
- **±2 Seed Range Discovery:** Candidate seed range `[monthStart - 2, monthEnd + 2]` with Source-B discovery by stable `localDate` (covering both recurring and non-recurring rows).
- **CREATE-Only Historical Safety:** `createAllowedPlanningDayKeyRange = [max(monthStart, currentPlanningDayKey), monthEnd]` applies strictly to new occurrence creation, preventing synthetic historical PENDING tasks.
- **Existing PENDING Canonical Rematerialization:** Existing PENDING rows rematerialize canonically without visible-month boundary restriction, allowing tasks that shift across month boundaries to update accurately.
- **Entirely Historical Month Safety:** When `currentPlanningDayKey > monthEnd`, zero sync occurs; persisted history is displayed read-only.
- **Zero Lifecycle Sweep on Browse:** Calendar does not mutate task lifecycle (no expiration sweeps or completion toggles).
- **Zero Calendar Timers / Polling:** No 1-second/1-minute timers, no live prayer switching for past/future days.
- **Five Prayer Selected-Day Detail:** Exactly Fajr, Dhuhr, Asr, Maghrib, Isha in fixed order. Sunrise is never a section. Custom fragments aggregated without duplicate headers.
- **Anytime Secondary Area:** Visually secondary unscheduled area rendered below the five prayer sections.
- **Read-Only Task Cards:** Calendar day detail reuses task card presentation in read-only mode (no completion toggle).
- **Single Task-Presence Indicator:** Single neutral/accent indicator dot (`hasTasks`). No traffic-light colors. Detailed counts exposed via accessible label.
- **Upcoming This Month:** Future PENDING occurrences in visible month (`> currentPlanningDayKey`), chronologically sorted, capped at 50 with overflow note.
- **Dual Date Model:** Strict distinction between `plannerLocalCivilDate` (for civil month/today ring) and `currentPlanningDayKey` (for creation boundary/upcoming cutoff).
- **Filler Cell Navigation:** Adjacent month cells display dates dimmed without task indicators; tapping navigates `visibleMonth` to target month and selects that date.
- **SETUP_REQUIRED Calm State:** Shows grid and Hijri dates, suppresses task dots and prayer times, displays existing calm location setup action.
- **Zero Dependencies / Migrations:** No new npm packages, no SQLite migrations.

---

## 2. Milestone Summary & Status

| Attribute | Specification |
|---|---|
| **Milestone** | **M14 — Calendar UI Screen** |
| **Type** | Calendar Month Grid & Read-Only Day Detail Screen |
| **Current Phase** | **M14 — IMPLEMENTED / AWAITING SONNET REVIEW** |
| **Architecture Status** | **APPROVED & FROZEN** |
| **Implementation Status** | **COMPLETED (961/961 tests green)** |
| **Current Tests** | **961 / 961 passing (68 test suites)** |
