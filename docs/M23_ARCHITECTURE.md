# M23 — QA + Edge Cases Architecture

**Status:** CLOSED / APPROVED — CHATGPT TECHNICAL LEAD APPROVED 2026-09-19
**Milestone:** M23 — QA + Edge Cases
**Baseline HEAD:** `5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11`
**Baseline origin/main:** `5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11` (synchronized ✓)
**Architecture authored:** 2026-09-19
**Architecture hardened:** 2026-09-19 (post Lead review — 16 hardening items applied)
**Architecture integrated:** 2026-09-19 (Opus specialist review + ChatGPT Lead review integrated by Sonnet)
**Author role:** Software Architect / Technical Reviewer (Sonnet)
**Working tree at freeze:** CLEAN — 0 uncommitted files
**Baseline tests:** 1556 / 1556 — 132 / 132 suites — 0 failures — 0 skipped
**TypeScript:** 0 errors
**ESLint:** 0 errors / 0 warnings
**Dependencies added since M22:** 0
**Migrations added since M22:** 0
**Planned M23 tests:** 97 (across 12 new suites)
**Expected post-M23 total:** 1653 tests / 144 suites

---

## 0. Hardening Changelog (Lead Review Items)

This architecture was hardened after Lead review. The following corrections were applied:

| # | Item | Change |
|---|---|---|
| H-1 | PC-C1 (TaskCard TalkBack fix) | Removed. Pre-authorizing `importantForAccessibility="no-hide-descendants"` on the composite accessible parent contradicts M22 contract. Replaced with native-evidence-first policy. |
| H-2 | RISK-B1 severity model | Reclassified from BLOCKER defect to CRITICAL NATIVE QA GATE. No confirmed defect exists without native evidence. |
| H-3 | JE-07 biometric unavailable | Corrected. Split into JE-07 (lock disabled) and JE-08 (lock enabled + unavailable → remains locked, no bypass). Journal suite grows from 7 to 8 tests. |
| H-4 | PC-C2 (recurrence sync failure) | Removed. Wrapping sync in try/catch and continuing to READY is a semantic change, not a hardening fix. RISK-H2 remains an open HIGH architecture question pending Opus review. |
| H-5 | "Option B is frozen" wording | Removed. No recurrence-sync failure policy is established in M23 architecture. |
| H-6 | Opus review | Changed from NOT REQUIRED to REQUIRED BEFORE IMPLEMENTATION. Five specialist questions prepared. |
| H-7 | Severity model | Separated QA GATE STATUS from CONFIRMED DEFECT SEVERITY. |
| H-8 | Native evidence levels | Replaced contradictory simulator/physical device matrix with two-level evidence model (LEVEL 1 simulator / LEVEL 2 physical). |
| H-9 | Widget carry-forward | Added missing checks CF-W4, CF-W6, CF-W9, CF-W16, CF-W18, CF-W19/CF-A24. Full CF-W1..W19 traceability table. |
| H-10 | Earlier carry-forward | Full CF-E1..E12 traceability table with specific QA IDs. |
| H-11 | Planning-day native QA | Added Fajr, Midnight, Custom boundary lifecycle/native checks beyond DST tests. |
| H-12 | RISK-H7 race test | Added PBR-01 (dedicated async race test at planning-day boundary). |
| H-13 | RISK-H3 notification race | Audited NotificationReconciliationService source. Clarified the precise race window. NE-01 tests a pre-reconcile terminal row, not the mid-reconcile window; NE-07 added to test mid-reconcile state transition race. |
| H-14 | Test classification | Re-evaluated test classes. Recurrence/materialization integration tests reclassified to INTEGRATION where applicable. |
| H-15 | M23/M24 carry-forward policy | Clarified: BLOCKED/NOT EXECUTED != PASS != RESOLVED. M24 carry-forward gates become release blockers. |
| H-16 | Test count | Recomputed exactly. See §8.3. |

### Integration Pass — Opus Specialist Review + ChatGPT Lead Review (2026-09-19)

| # | Item | Change |
|---|---|---|
| I-1 | ADR-031 authored | "RecurringHorizonSync Result Semantics: Propagate Rejection; Continue on Resolved SyncIssues" — added to DECISIONS.md. Distinguishes rejection (fullRefresh throws) from resolved HorizonSyncResult with issues (coordinator continues normally). |
| I-2 | HorizonSync result semantics — precise distinction | Architecture now explicitly states: sync() rejection ≠ HorizonSyncResult with issues.length > 0. The latter is NOT treated as a thrown failure. Corrects ambiguous Opus wording. |
| I-3 | EXECUTE phase atomicity corrected | Architecture no longer describes the overall syncSeries EXECUTE phase as transactional. Corrected to: non-transactional at the overall-series level; per-occurrence operations may be atomic via runInTransaction; partial mutations can occur; state-convergent on retry. |
| I-4 | REC-13 added | Integration test for partial EXECUTE retry convergence. Proves that after a mid-EXECUTE failure, repeated sync converges to the correct desired PENDING set. |
| I-5 | TSE-08 added | Integration test: stale PENDING delete vs. concurrent terminal transition. Proves cleanup operation does NOT delete a concurrently terminal row (requires SQL guard: DELETE WHERE id=? AND status='PENDING'). |
| I-6 | RISK-H8 added | HIGH risk: stale PENDING cleanup can delete a concurrently terminal occurrence. Requires narrow production fix (atomic guarded delete). OPEN. |
| I-7 | useLocation token-settlement defect confirmed | Source-verified: `requestAutoLocation` snapshot fallback paths (lines 124–134 and 151–160) call `startRefresh()` but the outer catch does NOT settle the token. SETUP_REQUIRED case in these paths is also unsettled. `setManualLocation` outer catch (line 234–237) does not settle started token either. CONFIRMED defect. |
| I-8 | RISK-M13 added | MEDIUM risk: useLocation refresh-token settlement defect. Confirmed from source. Requires narrow production fix. |
| I-9 | LE-09 added | UNIT test proving useLocation token settlement on fullRefresh rejection. |
| I-10 | RISK-H3 reopened | Notification terminal-state race is NOT fully resolved. `cancelOccurrenceReminder()` does not itself request a follow-up reconciliation. A stale notification can survive until an unrelated later reconcile event. OPEN/HIGH. |
| I-11 | NE-07 tightened | NE-07 must test the production terminal-transition path that requests a follow-up reconcile — not merely a manually triggered external call. |
| I-12 | PRC-02 outcome locked | Locked to actual rejection case (Option A): inject sync rejection → fullRefresh throws → no READY result → downstream steps not invoked. |
| I-13 | PRC-09 added | UNIT test proving resolved HorizonSyncResult with issues does NOT abort fullRefresh. Normal downstream behavior continues. READY may be returned. |
| I-14 | DST-05, DST-06 reclassified | UNIT → INTEGRATION. Must exercise real materialization + DB UNIQUE constraint to prove no missing/duplicate occurrences. |
| I-15 | REC-05, REC-06, REC-07, REC-10, REC-11, REC-12 reclassified | UNIT → INTEGRATION. Require real DB to prove idempotency, terminal preservation, and CANCELLED blocking. |
| I-16 | PRC-06 classification confirmed | INTEGRATION (already was). Confirmed. |
| I-17 | TSE-07 confirmed INTEGRATION | Already classified correctly. Confirmed. |
| I-18 | PBR-01 location resolved | Belongs in `src/stores/__tests__/useTodayStore.concurrency.test.ts`. Classification changed to UNIT (tests Zustand token mechanism only; no DB needed). |
| I-19 | TransactionLock scope clarified | rootLock serializes runInTransaction calls only. Plain repository operations outside runInTransaction are NOT automatically protected by the root transaction lock. |
| I-20 | Temporal test fixtures locked | `America/Chicago` (DST spring/fall), `UTC` (baseline), `Asia/Riyadh` (non-DST, timezone-change tests). |
| I-21 | Repeated-sync terminology corrected | "state-convergent / logically idempotent" — may issue SQL updates even when derived values are equivalent. Not zero-write idempotent. |
| I-22 | RISK-H1, RISK-H2, RISK-H7 resolved | Per Opus + Lead verification. See §15 updated risk table. |
| I-23 | Test counts updated | 93 + 4 Lead additions (PRC-09, REC-13, TSE-08, LE-09) = 97 planned M23 tests. Post-M23 total: 1556 + 97 = 1653. |
| I-24 | Three production changes expected | Atomic PENDING cleanup guard; useLocation token settlement; terminal-transition notification reconciliation. See §17. |
| I-25 | Notification remediation architecture | Terminal transition must: (1) perform targeted deterministic cancellation; (2) request best-effort full reconciliation. Both are event-driven; no background polling. |

---

## 1. Milestone Objective

M23 systematically proves that the Islamic Planner behaves safely and predictably under:

- Real device conditions (iOS and Android)
- Permission changes at runtime
- App lifecycle transitions
- Date/time boundaries, DST, and timezone changes
- Recurrence boundaries and concurrent reconciliation
- Failed services, empty state, and malformed state
- Reinstall / restart scenarios
- RTL rendering on physical devices
- Accessibility with native screen readers
- Widget lifecycle and stale snapshot behavior
- Notification idempotency and edge scheduling
- Data persistence failure paths
- Rapid repeated user actions (idempotency)

M23 prioritizes **finding hidden defects** over adding new capability.

---

## 2. Non-Goals

| Non-Goal | Reason |
|---|---|
| New user-facing features | Architecture + QA only |
| Product semantic redesign | No |
| Cosmetic or structural refactors | Only if narrow confirmed defect |
| i18n, localization | Deferred |
| Cloud sync, billing, purchase | Not in scope |
| Worship Suggestions | Still deferred |
| M24 start | Only after M23 closes |

---

## 3. Baseline

| Item | Value |
|---|---|
| HEAD | `5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11` |
| origin/main | `5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11` |
| Tests | 1556 / 1556 passing, 0 failed, 0 skipped |
| Suites | 132 / 132 |
| TypeScript errors | 0 |
| ESLint errors/warnings | 0 |
| New dependencies since M22 | 0 |
| New migrations since M22 | 0 |
| Milestones closed | 23 / 25 (M0-M22) |

---

## 4. Inherited Invariants

The following product invariants are immutable in M23. Any change that violates them requires Lead escalation.

1. **Exactly 5 prayer anchors:** Fajr, Dhuhr, Asr, Maghrib, Isha.
2. **No sixth Anytime prayer tab.**
3. **No automatic rollover** of missed tasks. Missed is terminal.
4. **Terminal occurrence states** (COMPLETED, MISSED, CANCELLED) are immutable.
5. **Schedule types:** EXACT_TIME, PRAYER_RELATIVE, PRAYER_WINDOW, ANYTIME_TODAY.
6. **Calendar:** Month-based only.
7. **Planning day defaults to Fajr.** Premium options: MIDNIGHT, CUSTOM.
8. **Location AUTO:** strictly committed `lastAuto`/`lastKnown` location + timezone.
9. **Location MANUAL:** manual city location only.
10. **Normal refresh MUST NOT request location permission.**
11. **No background location tracking. No location history.**
12. **PlannerRefreshCoordinator order (current source):** inputs -> recurrence sync (currently un-wrapped, throws on failure) -> Today refresh -> lifecycle sweep -> optional requery -> notifications -> widget sync.
13. **Plan-before-delete invariant:** replacement plan computed BEFORE destructive pending deletion.
14. **Notifications:** event-driven only, no background polling.
15. **Journal:** local, AES-256-GCM encrypted, prayer-centered, not exposed to widgets/notifications, independent of premium.
16. **No gamification. Core planner remains free.**
17. **No Sunrise anchor. No Qasr feature.**
18. **Worship Suggestions deferred, not deleted.**
19. **Widget:** read-only, no second planner, no authoritative writes.
20. **No fake account/sync/export/reset/premium UX.**
21. **No background polling anywhere.**

**Biometric Lock Invariant (M16 §11.9):**
- When biometric lock is DISABLED: Journal opens without prompt.
- When biometric lock is ENABLED and biometrics become unavailable/not enrolled: Journal REMAINS LOCKED. Show calm user-facing unavailable/not-enrolled message. Do NOT auto-disable the lock. Do NOT bypass the lock. Do NOT use device PIN fallback (`disableDeviceFallback: true`). Recovery requires re-enrollment or an explicit deliberate disable-lock action.

**TaskCard Accessibility Invariant (M22 §9.1 + D-1 Resolution):**
- The `contentContainer` View has `accessible={true}` and `accessibilityLabel={compositeLabel}`.
- `importantForAccessibility="no-hide-descendants"` MAY NOT be placed on the same View that has `accessible={true}` with a composite label. In RN 0.86, `no-hide-descendants` hides the View itself AND all descendants from accessibility, which would suppress the composite element from TalkBack. This was explicitly Lead-rejected in M22 review (D-1 Resolution, commit `346c84f`).
- PrayerHeader correction (commit `7af86fb`) removed `importantForAccessibility="no-hide-descendants"` from the accessible composite wrapper so the View remains traversable by TalkBack with its composite label.
- TaskCard TalkBack verification is deferred to M23 native QA. No production fix is pre-authorized.

---

## 5. Prior Native QA Carry-Forward

### 5.1 From M22 — Accessibility / RTL

| ID | Item | Platform | Status at M22 Close |
|---|---|---|---|
| CF-A1 | PrayerHeader VoiceOver composite announcement | iOS | Deferred |
| CF-A2 | PrayerHeader TalkBack composite announcement | Android | Deferred |
| CF-A3 | TaskCard VoiceOver grouping + checkbox navigation | iOS | Deferred |
| CF-A4 | TaskCard TalkBack grouping / no duplicate announcements | Android | Deferred — D-1 rejected; retained pending native verification |
| CF-A5 | JournalDeleteDialog modal focus VoiceOver | iOS | Deferred |
| CF-A6 | JournalDeleteDialog modal focus TalkBack | Android | Deferred |
| CF-A7 | JournalPrivacySheet modal focus VoiceOver | iOS | Deferred |
| CF-A8 | JournalPrivacySheet modal focus TalkBack | Android | Deferred |
| CF-A9 | CustomRecurrenceModal modal focus VoiceOver | iOS | Deferred |
| CF-A10 | CustomRecurrenceModal modal focus TalkBack | Android | Deferred |
| CF-A11 | EditScopeSheet modal focus VoiceOver | iOS | Deferred |
| CF-A12 | EditScopeSheet modal focus TalkBack | Android | Deferred |
| CF-A13 | PremiumLockedInfo OK button VoiceOver reachable | iOS | Deferred |
| CF-A14 | PremiumLockedInfo OK button TalkBack reachable | Android | Deferred |
| CF-A15 | Hijri calendar override modal VoiceOver | iOS | Deferred |
| CF-A16 | Hijri calendar override modal TalkBack | Android | Deferred |
| CF-A17 | Physical RTL layout all screens | iOS + Android | Deferred |
| CF-A18 | All 8 directional chevrons visual flip in RTL | iOS + Android | Deferred |
| CF-A19 | PrayerTabBar physical RTL order | iOS + Android | Deferred |
| CF-A20 | BottomNavBar physical RTL placement | iOS + Android | Deferred |
| CF-A21 | Calendar physical RTL grid | iOS + Android | Deferred |
| CF-A22 | Large accessibility text calendar behavior | iOS + Android | Deferred |
| CF-A23 | Native date/time picker screen reader interaction | iOS + Android | Deferred |
| CF-A24 | Widget accessibility tree inspection | iOS + Android | Deferred (= CF-W19) |

### 5.2 From M18 — Widgets

| ID | Item | Platform | Status at M18 Close | M23 QA ID(s) |
|---|---|---|---|---|
| CF-W1 | iOS small widget render in widget gallery | iOS | Pending EAS build | IOS-W1 |
| CF-W2 | iOS medium widget render in widget gallery | iOS | Pending EAS build | IOS-W2 |
| CF-W3 | iOS widget timeline / prayer-boundary transitions | iOS | Pending | IOS-W3 |
| CF-W4 | iOS widget countdown timer (native SwiftUI date) | iOS | Pending | IOS-W4 |
| CF-W5 | iOS widget deep-link tap to Today screen | iOS | Pending | IOS-W5 |
| CF-W6 | iOS widget dark-mode appearance | iOS | Pending | IOS-W6 |
| CF-W7 | iOS widget SETUP_REQUIRED render | iOS | Pending | IOS-W7 |
| CF-W8 | iOS widget stale snapshot behavior | iOS | Pending | IOS-W8 |
| CF-W9 | iOS widget device-restart recovery | iOS | Pending | IOS-W9 |
| CF-W10 | Android small widget in launcher gallery | Android | Pending physical device | AND-W1 |
| CF-W11 | Android medium widget in launcher gallery | Android | Pending physical device | AND-W2 |
| CF-W12 | Android widget tap / deep-link | Android | Pending | AND-W3 |
| CF-W13 | Android widget 30-min update cadence | Android | Pending | AND-W4 |
| CF-W14 | Android widget app-driven update propagation | Android | Pending | AND-W5 |
| CF-W15 | Android widget SETUP_REQUIRED render | Android | Pending | AND-W6 |
| CF-W16 | Android widget stale snapshot behavior | Android | Pending | AND-W7 |
| CF-W17 | Android widget device-reboot launcher persistence | Android | Pending | AND-W8 |
| CF-W18 | No Journal content, no coordinates, no notes in snapshot (device confirmation) | iOS + Android | Pending | IOS-W10, AND-W9 |
| CF-W19 | Widget accessibility tree inspection | iOS + Android | Pending | IOS-W11, AND-W10 |

### 5.3 From Earlier Milestones — Full CF-E Traceability

| ID | Item | Milestone | Platform | M23 QA ID(s) |
|---|---|---|---|---|
| CF-E1 | Real local notification delivery on device | M13 | iOS + Android | IOS-N1, AND-N1 |
| CF-E2 | Real expo-crypto AES-256-GCM roundtrip on device | M15 | iOS + Android | IOS-K1, AND-K1 |
| CF-E3 | Journal encrypted entry persists and decrypts across app restart | M15 | iOS + Android | IOS-K1, AND-K1 |
| CF-E4 | Real Face ID / Touch ID unlock on device | M16 | iOS | IOS-B1, IOS-B2 |
| CF-E5 | Real fingerprint unlock on device | M16 | Android | AND-B1, AND-B2 |
| CF-E6 | Biometric failure / cancel behavior on device | M16 | iOS + Android | IOS-B2, AND-B2 |
| CF-E7 | Background relock behavior on device | M16 | iOS + Android | IOS-LC1, AND-LC1 |
| CF-E8 | Process-restart relock behavior on device | M16 | iOS + Android | IOS-LC2, AND-LC2 |
| CF-E9 | Cold-start theme hydration visual behavior | M17 | iOS + Android | IOS-C1, AND-C1 |
| CF-E10 | Physical biometric enable/disable through Settings | M17 | iOS + Android | IOS-B3, AND-B3 |
| CF-E11 | Settings persistence across process restart | M17 | iOS + Android | IOS-LC3, AND-LC3 |
| CF-E12 | Prayer preview / stepper interaction on device | M17 | iOS + Android | IOS-ST1, AND-ST1 |

---

## 6. Two-Tier Native QA Model

### 6.1 Definitions

**QA GATE STATUS** — whether the check has been executed. Three valid states:
- `PASS` — executed and passed. Evidence recorded.
- `FAIL` — executed and a defect was found. Evidence recorded. Defect classified per §26.
- `BLOCKED / NOT EXECUTED` — could not be executed (hardware unavailable). NOT the same as PASS.

**CONFIRMED DEFECT SEVERITY** — applies only after a `FAIL` result is recorded. Uses the classification in §26.

> A BLOCKED / NOT EXECUTED gate is never PASS. It does not imply the software is correct.

### 6.2 Device Evidence Levels

| Level | Definition |
|---|---|
| LEVEL 1 — Simulator / Emulator | iOS Simulator (Xcode) or Android Emulator. Provides functional path coverage for most control-flow checks. Does NOT prove native hardware behavior. |
| LEVEL 2 — Physical Device | Real iOS or Android hardware. Required for biometrics, widget launcher gallery, VoiceOver on iOS, and real notification delivery. |

### 6.3 Evidence Level Requirements by Check Category

| Category | Minimum Level | Notes |
|---|---|---|
| VoiceOver (iOS screen reader) | LEVEL 2 — Physical iOS device | macOS Accessibility Inspector may supplement but is not equivalent to VoiceOver on device |
| TalkBack (Android screen reader) | LEVEL 1 acceptable for functional TalkBack QA; LEVEL 2 preferred for release evidence | Android emulator with TalkBack enabled provides functional coverage |
| Physical RTL layout rendering | LEVEL 1 acceptable (RTL locale on simulator/emulator); LEVEL 2 preferred for release evidence | |
| Widget launcher gallery (iOS) | LEVEL 2 — Physical iOS device or TestFlight build | iOS Simulator does not display WidgetKit extensions |
| Widget launcher gallery (Android) | LEVEL 2 — Physical Android device | Android Emulator widget gallery may work but is not reliable |
| Widget content correctness (no journal/coordinates) | LEVEL 1 accepted for visual inspection; LEVEL 2 preferred | |
| Widget accessibility tree | LEVEL 2 preferred | |
| Biometric (Face ID / Touch ID) | LEVEL 1 for control-flow simulation; LEVEL 2 for actual hardware biometric | iOS Simulator can simulate Face ID; real behavior requires physical device |
| Biometric (Android fingerprint) | LEVEL 2 — Physical Android device | Android Emulator fingerprint simulation is often unreliable |
| Notification delivery | LEVEL 1 accepted for scheduling/control-flow; LEVEL 2 for actual OS delivery | |
| GPS permission flow | LEVEL 1 accepted with simulated coordinates | |
| Large font rendering | LEVEL 1 accepted | |
| Cold-start theme hydration | LEVEL 1 accepted | |
| App lifecycle (background/foreground) | LEVEL 1 accepted | |
| Process kill / restart | LEVEL 1 accepted | |
| AES-256-GCM roundtrip | LEVEL 1 accepted | |
| Date/time picker accessibility | LEVEL 1 accepted | |
| Settings persistence | LEVEL 1 accepted | |
| Prayer stepper interaction | LEVEL 1 accepted | |
| Planning-day boundary crossing | LEVEL 1 accepted with manual clock advance | |

---

## 7. Specialist Reviews — COMPLETE

> **Status: OPUS SPECIALIST REVIEW COMPLETE. CHATGPT TECHNICAL LEAD REVIEW COMPLETE. INTEGRATED BY SONNET. AWAITING CHATGPT TECHNICAL LEAD FINAL GATE.**
>
> Opus completed a narrow specialist architecture review covering Q1–Q5. The ChatGPT Technical Lead independently inspected production source and provided corrections that override portions of the Opus conclusions. Both reviews have been integrated into this document by Sonnet. The architecture is NOT automatically approved for Gemini — it requires the final ChatGPT Technical Lead gate before implementation begins.

### 7.1 PlannerRefreshCoordinator Failure Semantics (Opus Q1 + Lead Decision 1)

**Resolved. ADR-031 authored.**

The architecture must distinguish two distinct cases:

**Case A — `recurringHorizonSync.sync()` rejects / throws:**
- `PlannerRefreshCoordinator.fullRefresh()` rejects (throws).
- No READY result is produced.
- No lifecycle sweep executes.
- No notification reconciliation executes.
- No widget sync executes.
- Each caller handles the rejection within its own try/catch boundary:
  - `useToday` converts rejection into its token-aware store error path.
  - `OnboardingCoordinator` and equivalent mutation coordinators translate rejection into `PERSISTED_REFRESH_FAILED` semantics where applicable.
  - `useLocation` catches the rejection at the hook level, but its Today-store refresh token is **not currently settled on every rejection and applicable SETUP\_REQUIRED path**; that defect is tracked separately as RISK-M13 / PC-2 / LE-09.
  - This section does NOT declare `useLocation`'s token lifecycle correct merely because the exception is caught at the hook boundary.
- **This is the current source behavior at `PlannerRefreshCoordinator.ts:87` (no surrounding try/catch). Zero production change required.**

**Case B — `recurringHorizonSync.sync()` resolves successfully with `HorizonSyncResult` containing `issues.length > 0`:**
- This is NOT treated as a thrown failure.
- `PlannerRefreshCoordinator` continues its normal pipeline.
- READY may be returned with the HorizonSyncResult (including its issues).
- Downstream steps (lifecycle sweep, notifications, widget sync) execute normally.
- **`issues.length > 0` does NOT equal sync rejection.**
- The coordinator MUST NOT silently reinterpret resolved issues as a full-refresh failure without a separate architectural decision.

The distinction preserves the existing separation between exception/rejection semantics and best-effort issue-reporting semantics.

> **REJECTED alternatives:** Option B (typed DEGRADED result — high blast radius, ~10 call sites); Option C (warn + continue with false READY — violates data integrity, stale downstream steps).

### 7.2 EXECUTE Phase Atomicity (Lead Decision 2)

**Resolved.**

`RecurringHorizonSync.syncSeries()` has a two-phase structure:

**PLAN phase (pure read):** Failure before any mutation. If any step fails, returns with zero mutations. The plan-before-delete invariant holds.

**EXECUTE phase (non-transactional at overall-series level):** Individual deletes and materializations are executed per-occurrence. Many execution failures are caught into `SyncIssue[]` rather than thrown. Therefore:
- A resolved sync may represent a **partial mutation**.
- Per-occurrence `materializeOne` calls run inside their own `runInTransaction` (per-occurrence atomic), but the overall series-level EXECUTE is NOT one transaction.
- `TransactionLock` (rootLock) serializes `runInTransaction` calls only. **Plain repository operations outside `runInTransaction` (including standalone `occRepo.delete()` calls) are NOT automatically protected by the root transaction lock.**
- Partial mutations converge on retry: next `fullRefresh` re-runs `sync()` over the same horizon; PLAN detects gaps and EXECUTE fills them. This is **state-convergent / logically idempotent**, NOT zero-write idempotent (a re-sync may issue SQL updates even when the resulting derived values are equivalent).

### 7.3 DST / Timezone Materialization (Opus Q3)

**Resolved.**

- **Recurrence identity:** `(seriesId, localDate)` — civil date, timezone-independent.
- **DB uniqueness:** `UNIQUE(series_id, local_date)` + `UNIQUE(task_definition_id, local_date)` prevent duplicate occurrences.
- **DST spring-forward:** `SPRING_FORWARD_SHIFTED` — deterministic binary search to first valid instant after gap. One occurrence per seed. No missing occurrence.
- **DST fall-back:** `FALL_BACK_FIRST` — earlier absolute offset selected. Deterministic. One occurrence per seed. No duplicate.
- **Timezone change:** PENDING occurrences retain civil recurrence identity. Derived placement (`calculatedStartTime`, `planningDayKey`, `timezone`, `wallClockResolution`, `windowStart`/`windowEnd`) is recalculated on next `sync()`. Terminal occurrences remain historically frozen — terminal short-circuit runs before temporal context access.
- **planningDayKey staleness:** Stale between syncs after a timezone change. Corrected on next fullRefresh. Not a data-integrity issue; no active remediation needed.
- **Repeated sync:** State-convergent / logically idempotent. Same desired seeds → same materializeOne calls.
- **±7 day horizon:** Civil-date-based, timezone-independent. Sufficient for recurrence identity purposes.
- **Primary test fixtures:** `America/Chicago` (DST), `UTC` (baseline), `Asia/Riyadh` (non-DST timezone-change tests).

### 7.4 Concurrent fullRefresh (Opus Q4 + Lead Decision 6)

**Resolved. No PRC-wide serialization added.**

Concurrent `fullRefresh()` calls CAN execute. Existing mechanisms provide correctness:

| Mechanism | What it protects |
|---|---|
| `TransactionLock` rootLock | Serializes `runInTransaction` root DB transactions. Does NOT protect standalone repo operations outside `runInTransaction`. |
| `UNIQUE(series_id, local_date)` constraint + MaterializationEngine race handler | Prevents duplicate occurrence rows even under concurrent materialize attempts. |
| `requestGeneration` in `useTodayStore` | Protects Zustand state assignment only — stale `commitRefresh()` calls are rejected. Does NOT protect notification or widget side effects. |
| Notification drain loop | `reconcile()` calls coalesce; fresh DB read ensures self-correcting behavior. |
| Widget sync | Reads fresh DB state at execution time. Self-correcting. |

**No PRC-level mutex, queue, or single-flight mechanism is warranted.** The demonstrated correctness problems belong to narrower ownership layers (addressed by RISK-H3, RISK-M13, RISK-H8 fixes).

### 7.5 UNIT vs INTEGRATION Classification (Opus Q5 + Lead)

**Resolved.** See §9.3 for final classification. Key changes from initial plan:

| Tests | Classification | Reason |
|---|---|---|
| DST-05, DST-06 | **INTEGRATION** | Must prove no missing/duplicate occurrence via real materialization + DB UNIQUE constraint |
| REC-05, REC-06, REC-07 | **INTEGRATION** | Idempotent re-sync and DST boundary re-sync require real DB |
| REC-10, REC-11, REC-12 | **INTEGRATION** | Terminal preservation / CANCELLED blocking require real materializeOne short-circuit against real DB |
| PRC-06 | **INTEGRATION** | Real DB to prove no duplicates under rapid fullRefresh |
| TSE-07 | **INTEGRATION** | Rapid completeTask concurrency requires real DB |
| TSE-08 | **INTEGRATION** | Proves SQL guard (DELETE WHERE status='PENDING') against real DB |
| REC-13 | **INTEGRATION** | Partial EXECUTE convergence requires real sync + real DB |
| PBR-01 | **UNIT** | Pure Zustand token test; no DB needed |

**Q1 — RecurringHorizonSync failure in fullRefresh**

When `RecurringHorizonSync.sync()` fails (throws) inside `PlannerRefreshCoordinator.fullRefresh()`, what should the canonical behavior be?

Evaluate data-integrity consequences of each candidate:

- **A. Propagate failure / abort:** `fullRefresh` throws. Caller (e.g., `useToday`) receives an error. Today does not re-render stale data after a failed authoritative recurrence sync. No partial READY result.
- **B. Typed degraded result:** `fullRefresh` returns a non-READY result type (e.g., `RECURRENCE_SYNC_FAILED`) that callers may handle. Today may choose to display a degraded state or preserve the previous view.
- **C. Best-effort continue:** Wrap sync in try/catch, warn, continue to steps 3-7, return READY with existing materialized occurrences. Consistent with the notification/widget non-fatal pattern, but recurrence sync is earlier in the pipeline and affects the authoritative occurrence set.

Provide: recommended behavior, specific data-integrity risks for each candidate, what value `horizonSync` should carry in the result if sync failed, whether downstream steps (lifecycle sweep, notification reconcile, widget sync) should execute, and whether false READY should be avoided.

Note: The current source at `PlannerRefreshCoordinator.ts` line 87 has no try/catch. If sync throws, fullRefresh throws. The READY result type requires a `horizonSync: HorizonSyncResult` field. Candidate C requires defining what `horizonSync` carries on failure.

**Q2 — Stale occurrence state after recurrence-sync failure**

If the Opus answer to Q1 permits continuing after a recurrence-sync failure:

- What happens to `horizonSync` in the READY result? Null? Empty? Last-known?
- May the lifecycle sweep (`OccurrenceLifecycleService.sweepExpired`) execute against potentially stale materialized occurrences?
- May `NotificationReconciliationService.reconcile()` run and schedule notifications from a stale occurrence set?
- May `widgetSyncCoordinator.sync()` push a stale snapshot?
- How should stale recurrence state be surfaced to the user?
- How is false READY (appearing operational when the occurrence set is stale) avoided?

**Q3 — DST / timezone change and materialized occurrence staleness**

Across DST transitions and explicit timezone changes (user moves to a new timezone):

- Can existing +/-7-day materialized PENDING occurrences have a `planningDayKey` that is stale under the new timezone?
- Define the invariant for each of: old-zone pending occurrences, new-zone materialization, duplicate prevention (given `UNIQUE(series_id, local_date)` constraint), terminal occurrence preservation, plan-before-delete, and idempotent repeated sync.
- Is `planningDayKey` mismatch (occurrence appears under wrong prayer tab after timezone change) a data-integrity issue or merely a display artifact correctable on next fullRefresh?
- Does M23 require INTEGRATION-level tests (against real repository + materialization layer) for DST recurrence scenarios, or is pure UNIT coverage of the RecurrenceEngine sufficient?

Note: M9 RecurrenceEngine operates on civil dates and is timezone-independent per its design. DST effects on `planningDayKey` derivation occur in MaterializationEngine. The `UNIQUE(series_id, local_date)` DB constraint prevents duplicate rows. The open question is whether `planningDayKey` mismatch requires active remediation or passive re-sync correction.

**Q4 — Concurrent / rapid fullRefresh calls**

For concurrent or rapid sequential `fullRefresh` calls:

- Can recurrence synchronization interleave destructively if two sync calls overlap?
- Can a refresh schedule notifications or push a widget snapshot from state that has been superseded by a newer refresh?
- Are the existing `TransactionLock` (SQLite root transactions), `requestGeneration` guard (`useTodayStore`), notification drain-loop coalescing, and `refreshInFlight` flag sufficient to prevent destructive interleaving at the coordinator level?
- Does `PlannerRefreshCoordinator` itself require serialization or coalescing (e.g., a coordinator-level drain pattern analogous to `NotificationReconciliationService.drain()`)?

Note: `requestGeneration` prevents stale async Zustand commits. `TransactionLock` serializes SQLite writes. `NotificationReconciliationService` has its own drain loop with `rerunRequested` coalescing. The open question is whether these existing guards are sufficient at the PRC level, or whether two concurrent fullRefresh calls can produce conflicting notification/widget states even if each individual call is internally consistent.

**Q5 — INTEGRATION vs UNIT for DST recurrence tests**

For the DST recurrence idempotency scenarios (DST-05, DST-06, REC-05, REC-06, REC-07):

- Do these tests need to execute against the real `TaskOccurrenceRepository` + `MaterializationEngine` in an in-memory SQLite environment to be meaningful?
- Or is pure UNIT coverage of `RecurrenceEngine.generateSeedDates()` + `RecurrenceEngine.occursOn()` across DST boundaries sufficient to prove the invariants?
- If INTEGRATION coverage is required, define the minimal test harness (which real services, which mocks).

---

## 8. Edge-Case Taxonomy

M23 covers 19 edge-case families:

1. Planning-day boundary (Fajr / Midnight / Custom) — exact-second, DST, and lifecycle
2. DST and timezone change
3. Recurrence boundaries and reconciliation
4. Notification idempotency and failure paths (including race conditions)
5. Location permission states and mode transitions
6. Prayer calculation edge cases
7. PlannerRefreshCoordinator failure injection and idempotency
8. Task state transitions (terminal immutability, rapid interaction)
9. Calendar rendering (month boundaries, leap year, 6-week grids)
10. Journal privacy, encryption failure paths, biometric lock states
11. Settings mutation correctness and persistence
12. Theme and dark-mode edge cases
13. Premium entitlement edge cases
14. Onboarding edge cases and gate race prevention
15. Widget lifecycle (stale, SETUP_REQUIRED, reboot, privacy)
16. Accessibility native QA (VoiceOver, TalkBack, modal focus)
17. RTL physical rendering
18. App lifecycle / concurrency / process restart
19. Data integrity and failure injection

---

## 9. Automated Test Plan

### 9.1 Classification Definitions

| Class | Meaning |
|---|---|
| UNIT | Pure domain logic. No DB, no React, no external services. |
| INTEGRATION | Multiple services/repositories interacting. Uses real in-memory SQLite via the project's test DB setup. |
| COMPONENT | React Native Testing Library render. |
| STATIC AUDIT | Static code inspection (grep / AST). Captured as a test that fails if the invariant is violated. |
| NATIVE MANUAL QA | Physical device or simulator — not provable by Jest. Not a test file. |

> **Note on Opus-dependent tests:** Tests in DST Domain 2 (DST-05, DST-06), Recurrence Domain 3 (REC-05..REC-07), and PRC Domain 4 (PRC-01..PRC-08) have their **classification** (UNIT vs INTEGRATION) subject to Opus Q3 and Q5 answers. The test scenarios are frozen; only the implementation layer (pure engine vs. real repository) depends on Opus guidance.

> **Note on PRC-01..PRC-08:** Whether PRC-02 codifies Option A, B, or C depends entirely on Opus Q1 answer. The test is frozen as a scenario but its expected outcome is pending Opus. PRC-02 will lock whichever behavior Opus recommends.

### 9.2 Test Plan by Domain

#### Domain 1: Planning-Day Boundary

**New suite:** `src/domain/planning-day/__tests__/PlanningDayBoundary.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| PDB-01 | Fajr boundary: time at `boundary - 1s` resolves to prior planningDayKey |
| PDB-02 | Fajr boundary: time at exact `boundary` resolves to current planningDayKey |
| PDB-03 | Fajr boundary: time at `boundary + 1s` resolves to current planningDayKey |
| PDB-04 | Midnight boundary: time at `boundary - 1s` resolves to prior planningDayKey |
| PDB-05 | Midnight boundary: time at exact `boundary` resolves to current planningDayKey |
| PDB-06 | Midnight boundary: time at `boundary + 1s` resolves to current planningDayKey |
| PDB-07 | Custom boundary: time at `boundary - 1s` resolves to prior planningDayKey |
| PDB-08 | Custom boundary: time at exact `boundary` resolves to current planningDayKey |
| PDB-09 | Custom boundary: time at `boundary + 1s` resolves to current planningDayKey |
| PDB-10 | planningDayKey format is stable across DST spring-forward (23-hour day) |
| PDB-11 | planningDayKey format is stable across DST fall-back (25-hour day) |

*Count: 11 tests*

#### Domain 2: DST / Timezone

**New suite:** `src/domain/temporal/__tests__/DSTEdgeCases.test.ts`
**Classification:** UNIT (subject to Opus Q5 — may become INTEGRATION for DST-05/06)

| Test ID | Description |
|---|---|
| DST-01 | Spring-forward: EXACT_TIME task at skipped hour shifts to first valid instant (SPRING_FORWARD_SHIFTED) |
| DST-02 | Spring-forward: PRAYER_RELATIVE task offset resolves correctly across DST gap |
| DST-03 | Fall-back: EXACT_TIME task at ambiguous hour resolves to earlier occurrence |
| DST-04 | Fall-back: only ONE occurrence created for a single fall-back local time (not duplicated) |
| DST-05 | Recurrence sync idempotent at DST spring-forward boundary (+/-7 day window): no missing occurrence |
| DST-06 | Recurrence sync idempotent at DST fall-back boundary (+/-7 day window): no duplicate occurrence |
| DST-07 | Civil day is 23 hours on spring-forward: planningDayKey correct |
| DST-08 | Civil day is 25 hours on fall-back: planningDayKey correct |
| DST-09 | Year boundary Dec 31 -> Jan 1 planningDayKey correct |
| DST-10 | Leap year Feb 29 planningDayKey correct |

*Count: 10 tests*

#### Domain 3: Recurrence Boundaries and Re-Sync Idempotency

**New suite:** `src/domain/recurrence/__tests__/RecurrenceEdgeCases.test.ts`
**Classification:** UNIT for REC-01..REC-04, REC-08, REC-09. INTEGRATION for REC-05..REC-07, REC-10..REC-13.

| Test ID | Class | Description |
|---|---|---|
| REC-01 | UNIT | MONTHLY anchor on 31st clamps correctly in 28-day Feb (non-leap) |
| REC-02 | UNIT | MONTHLY anchor on 31st clamps correctly in 29-day leap Feb |
| REC-03 | UNIT | MONTHLY anchor on 31st clamps correctly in 30-day month |
| REC-04 | UNIT | MONTHLY anchor on Feb 29 (non-leap year): clamps to Feb 28, not Feb 28+1 |
| REC-05 | INTEGRATION | Re-sync with same +/-7 window produces no duplicate pending occurrences (state-convergent) |
| REC-06 | INTEGRATION | Re-sync after DST spring-forward: no missing occurrence at DST boundary |
| REC-07 | INTEGRATION | Re-sync after DST fall-back: no duplicate occurrence at DST boundary |
| REC-08 | UNIT | Series split: pending occurrences before split date are NOT deleted |
| REC-09 | UNIT | Series split: pending occurrences on/after split date ARE deleted |
| REC-10 | INTEGRATION | COMPLETED occurrence is preserved through re-sync (status not overwritten; terminal short-circuit verified) |
| REC-11 | INTEGRATION | MISSED occurrence is preserved through re-sync |
| REC-12 | INTEGRATION | CANCELLED (tombstone) occurrence blocks regeneration of that local_date |
| REC-13 | INTEGRATION | Partial EXECUTE retry convergence: (1) create recurring series needing multiple EXECUTE operations; (2) inject genuine failure mid-EXECUTE; (3) allow earlier mutations to succeed; (4) verify sync resolves with SyncIssue (does not pretend entire op was atomic); (5) verify partial state exists after failed item; (6) restore failing dependency; (7) re-run sync; (8) verify final desired PENDING set exactly converges; (9) verify no duplicate recurrence identities; (10) verify coherent counts; (11) verify terminal historical occurrences untouched |

*Count: 13 tests*

#### Domain 4: PlannerRefreshCoordinator Failure Injection

**New suite:** `src/services/__tests__/PlannerRefreshCoordinator.edgeCases.test.ts`
**Classification:** UNIT (PRC-01..PRC-05, PRC-07..PRC-09) / INTEGRATION (PRC-06)

| Test ID | Description | Classification |
|---|---|---|
| PRC-01 | SETUP_REQUIRED on first step: returns SETUP_REQUIRED without running subsequent steps | UNIT |
| PRC-02 | RecurringHorizonSync **rejection** (throws / `Promise.reject`): fullRefresh rejects; TodayOrchestrator NOT invoked; lifecycle sweep NOT invoked; notification reconciliation NOT invoked; widget sync NOT invoked; no READY result | UNIT |
| PRC-03 | TodayOrchestrator.refreshToday failure: propagates up | UNIT |
| PRC-04 | Notification reconcile failure: fullRefresh returns READY (non-fatal) | UNIT |
| PRC-05 | Widget sync failure: fullRefresh returns READY (non-fatal, fire-and-forget) | UNIT |
| PRC-06 | Repeated rapid fullRefresh: second call returns fresh result; no duplicate occurrences in DB | INTEGRATION |
| PRC-07 | Lifecycle sweep mutates 0 rows: reuses refreshToday viewModel (no second DB query) | UNIT |
| PRC-08 | Lifecycle sweep mutates >= 1 row: fires queryAndProject | UNIT |
| PRC-09 | RecurringHorizonSync resolves with `HorizonSyncResult` containing `issues.length > 0`: fullRefresh does NOT abort; normal downstream behavior continues; READY may be returned; returned `horizonSync` retains issue information | UNIT |

**PRC-02 semantics:** Inject `recurringHorizonSync.sync()` → `Promise.reject(new Error('injected'))`. Verify: (1) fullRefresh rejects, (2) TodayOrchestrator.refreshToday was not called, (3) lifecycle sweep was not called, (4) notification reconciliation was not called, (5) widget sync was not called, (6) no READY result produced. This locks Option A behavior.

**PRC-09 semantics:** Inject `recurringHorizonSync.sync()` → resolves with `{ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [{ stage: 'MATERIALIZE', seriesId: 'x', seedDate: '2026-09-20', message: 'partial failure' }] }`. Verify: (1) fullRefresh does not throw, (2) downstream steps execute normally, (3) result.status may be 'READY', (4) result.horizonSync.issues contains the issue.

*Count: 9 tests*

#### Domain 5: Planning-Day Boundary Async Race

**Suite:** `src/stores/__tests__/useTodayStore.concurrency.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| PBR-01 | Token race: `startRefresh()` → token A; `startRefresh()` → token B (A is stale); `commitRefresh(B, freshResult)` → returns true; `commitRefresh(A, staleResult)` → returns false; assert: store.viewModel === freshResult.viewModel; store.status === 'ready'; store not `refreshInFlight` |

**Note:** PBR-01 tests the `requestGeneration` token mechanism in `useTodayStore`. No DB is required. The invariant being tested lives in `useTodayStore.commitRefresh()`, not in `PlannerRefreshCoordinator`. The test simulates the async race without a real coordinator or real DB.

*Count: 1 test*

#### Domain 6: Task State / Terminal Immutability

**New suite:** `src/domain/task/__tests__/TaskStateEdgeCases.test.ts`

| Test ID | Class | Description |
|---|---|---|
| TSE-01 | UNIT | Double-complete attempt: second `completeTask` call is idempotent (no error, no duplicate COMPLETED row) |
| TSE-02 | UNIT | Complete then edit series: COMPLETED occurrence status unchanged |
| TSE-03 | UNIT | Complete then delete series: COMPLETED occurrence preserved in history |
| TSE-04 | UNIT | MISSED occurrence not rolled over on refresh |
| TSE-05 | UNIT | Terminal occurrence in recurrence re-sync: status not overwritten |
| TSE-06 | UNIT | Stale view-model action on terminal occurrence: handled gracefully (no crash) |
| TSE-07 | INTEGRATION | Rapid repeated `completeTask` calls (concurrent): exactly one COMPLETED row; no duplicate timestamps |
| TSE-08 | INTEGRATION | Stale PENDING delete vs. concurrent terminal transition: (1) cleanup identifies occurrence as PENDING; (2) before destructive delete completes, another operation transitions occurrence to terminal; (3) cleanup MUST NOT delete the terminal row; (4) terminal history survives; (5) cleanup result reports row was not deleted because it was no longer PENDING (inspected via affected-row count from guarded DELETE WHERE id=? AND status='PENDING') |

*Count: 8 tests*

#### Domain 7: Notification Idempotency and Race Conditions

**New suite:** `src/services/notification/__tests__/NotificationEdgeCases.test.ts`
**Classification:** UNIT

**Audited race window for RISK-H3:**
`NotificationReconciliationService.executeReconcile()` queries PENDING occurrences at step 3 (`findAllMaterializedPending()`). Notifications are scheduled at steps 10-11 (diff + schedule). The race window is:

- **Window A (pre-query):** Task transitions to terminal BEFORE `findAllMaterializedPending()` runs. Already handled — terminal rows are not returned as PENDING. NE-01 tests this.
- **Window B (post-query):** Task transitions to terminal AFTER `findAllMaterializedPending()` returns but BEFORE notifications are scheduled. A notification would be incorrectly scheduled for a now-terminal occurrence.
- **Window C (during scheduling):** `adapter.scheduleNotification()` completes for a now-terminal occurrence; `cancelOccurrenceReminder()` may have already run (cancel is lost), so the stale notification remains scheduled.

**Current deficiency (RISK-H3):** `cancelOccurrenceReminder()` does NOT itself request a follow-up reconciliation. A stale notification can survive until an unrelated later reconcile event and may fire before then. **This is a real correctness issue, not merely transient.**

**Required remediation (narrow production fix):** After a terminal transition, the production terminal-transition path must:
1. Perform targeted deterministic cancellation (immediate, fast-path).
2. Request a best-effort full notification reconciliation (via `reconcile()`).
If a drain is already active, `rerunRequested = true` ensures a fresh follow-up pass. If no drain is active, a new pass begins. Final notification state derives from fresh DB state. No background polling introduced.

**NE-07 requirement (tightened):** NE-07 must test the PRODUCTION terminal-transition path that requests the follow-up reconciliation — not merely a manually triggered external call. The test must demonstrate that the production path itself causes the drain loop to run a fresh pass, and that the final scheduled-notification state contains no reminder for the terminal occurrence.

| Test ID | Description |
|---|---|
| NE-01 | Terminal task (already COMPLETED before reconcile starts): no notification scheduled after reconcile |
| NE-02 | Permission denied: reconcile returns without scheduling; no throw |
| NE-03 | Permission revoked between two reconcile calls: second call handles gracefully |
| NE-04 | Empty PENDING set: reconcile cancels all existing app-owned notifications |
| NE-05 | Concurrent reconcile calls: drain loop coalesces; no duplicate notifications scheduled |
| NE-06 | Partial scheduling failure: next reconcile re-schedules missing notifications |
| NE-07 | Terminal transition path requests follow-up reconcile: (1) reconcile reads occurrence X as PENDING; (2) X transitions terminal; (3) targeted cancellation runs; (4) stale schedule attempt completes; (5) production terminal path requests reconciliation; (6) drain loop runs fresh pass; (7) final state: no notification for X. Production behavior (not manually triggered external reconcile) must cause the fresh pass. |

*Count: 7 tests*

#### Domain 8: Location Edge Cases

**New suite:** `src/services/__tests__/LocationEdgeCases.test.ts`
**Classification:** UNIT

**useLocation token-settlement defect (RISK-M13 / Lead Decision 4):**

Source inspection confirmed: `requestAutoLocation` at `useLocation.ts` lines 124–134 and 151–160 calls `startRefresh()` but the outer catch (lines 188–191) does NOT call any Today-store settlement (`setError(token, ...)`, `setSetupRequired(token)`, or `commitRefresh(token, ...)`). `refreshInFlight` remains `true` after fullRefresh rejection. Similarly, SETUP_REQUIRED results on the snapshot-fallback branches (lines 126 and 153) do not call `setSetupRequired(token)`. `setManualLocation` outer catch (lines 234–237) also does not settle started tokens.

Required fix (narrow): every `useLocation` path that calls `startRefresh()` must deterministically settle the Today-store token through exactly one of: `commitRefresh(...)`, `setError(token, ...)`, or `setSetupRequired(token)`.

| Test ID | Description |
|---|---|
| LE-01 | AUTO mode with no committed location: returns SETUP_REQUIRED; no GPS call |
| LE-02 | MANUAL mode with null coordinates: returns SETUP_REQUIRED |
| LE-03 | AUTO mode with valid committed location: returns READY using committed; no GPS call |
| LE-04 | Permission revoked after AUTO configured: committed location still usable; no re-request |
| LE-05 | Location services disabled: `refreshAutoLocation` path does not call `requestForegroundPermissionsAsync` |
| LE-06 | Geocoding failure in manual city search: handled gracefully, no crash, typed error |
| LE-07 | AUTO -> MANUAL mode switch: refresh uses manual location only |
| LE-08 | MANUAL -> AUTO mode switch: refresh uses committed auto location only |
| LE-09 | fullRefresh rejection settles Today-store token: (1) trigger a useLocation operation that calls `startRefresh()`; (2) make coordinator.fullRefresh() reject; (3) verify useLocation reports failure appropriately; (4) verify Today store is NOT `refreshInFlight`; (5) verify active refresh token is settled (via `setError` or equivalent); (6) stale-token protection remains intact |

**Static audit (LE-STATIC):** `requestForegroundPermissionsAsync` is not called in any code path except explicit user-action handlers. Codified in `StaticA11yAudit.test.tsx` or a dedicated static audit test.

*Count: 9 tests + 1 static audit*

#### Domain 9: Journal Privacy, Encryption, and Biometric Lock

**New suite:** `src/services/journal/__tests__/JournalEdgeCases.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| JE-01 | SecureStore key retrieval failure during decrypt: `JournalKeyError` thrown; ciphertext row NOT modified |
| JE-02 | Corrupt/malformed ciphertext in repository: decrypt throws typed `JournalEncryptionError`; no crash |
| JE-03 | Rapid save + edit: `StaleWriteError` on revision conflict; no duplicate rows; draft not discarded |
| JE-04 | Journal save payload: no GPS coordinates, no task labels, no notes in save input |
| JE-05 | STATIC AUDIT: no import from `src/services/journal/` or `src/domain/journal/` in: widget services, notification services, planner services, onboarding |
| JE-06 | History navigation to planningDayKey with no entry: `loadEntry` returns null; no crash |
| JE-07 | Lock DISABLED + biometric unavailable: Journal opens normally without prompt (lock disabled is the governing condition) |
| JE-08 | Lock ENABLED + biometric unavailable/not enrolled: Journal remains LOCKED; calm user-facing message shown; lock NOT auto-disabled; lock NOT bypassed; no PIN fallback |

*Count: 8 tests (JE-05 is a static audit test)*

#### Domain 10: Calendar Edge Cases

**New suite:** `src/domain/calendar/__tests__/CalendarEdgeCases.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| CAL-01 | February in non-leap year: 28-day grid; no Feb 29 cell |
| CAL-02 | February in leap year: 29-day grid; Feb 29 cell present |
| CAL-03 | Month requiring 6-row grid (42 cells): grid cell count correct |
| CAL-04 | December -> January navigation: planningDayKey correct for Jan 1 |
| CAL-05 | Hijri loader failure: calendarGrid falls back to base Hijri without crash |
| CAL-06 | Hijri adjustment +/-2 boundary: effective dates correct; no overflow |
| CAL-07 | Zero-task month: grid renders without crash |
| CAL-08 | Filler day tap (day outside current month): handled gracefully; no crash |

*Count: 8 tests*

#### Domain 11: Onboarding Gate / Completion

**New suite:** `src/services/onboarding/__tests__/OnboardingEdgeCases.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| OE-01 | Completion persistence failure (DB error on `onboardingCompleted` write): gate remains PENDING |
| OE-02 | Partial persistence: `calculationMethod` write succeeds but `onboardingCompleted` write fails: gate remains PENDING; settings not corrupted |
| OE-03 | fullRefresh failure after successful `onboardingCompleted: true` write: returns `PERSISTED_REFRESH_FAILED`; does NOT roll back `onboardingCompleted` |
| OE-04 | Missing `user_settings` row (fresh install): resolves to PENDING; not ERROR |
| OE-05 | DB infrastructure failure during gate `initialize()`: resolves to ERROR; not PENDING |

*Count: 5 tests*

#### Domain 12: Settings / Theme / Premium Edge Cases

**New suite:** `src/services/__tests__/SettingsEdgeCases.test.ts`
**Classification:** UNIT

| Test ID | Description |
|---|---|
| SE-01 | Prayer adjustment beyond +/-60 minutes: rejected by `validatePrayerAdjustments` |
| SE-02 | Hijri global adjustment = +/-2 (boundary values): persisted correctly |
| SE-03 | Hijri global adjustment beyond +/-2: rejected |
| SE-04 | Theme DB read failure: falls back to SYSTEM; `themeReady` becomes true |
| SE-05 | Entitlement UNAVAILABLE (query failure): MIDNIGHT planning-day mutation rejected |
| SE-06 | Entitlement FREE (missing row): MIDNIGHT planning-day mutation rejected |
| SE-07 | FAJR planning-day: no entitlement check required (always allowed) |
| SE-08 | Locked premium planning-day value (MIDNIGHT) in DB: temporal engine interprets it correctly; no silent downgrade on read |

*Count: 8 tests*

---

### 9.3 Planned Test Count

| Suite | File Path | Classification | Planned Tests |
|---|---|---|---|
| PlanningDayBoundary | `src/domain/planning-day/__tests__/PlanningDayBoundary.test.ts` | UNIT | 11 |
| DSTEdgeCases | `src/domain/temporal/__tests__/DSTEdgeCases.test.ts` | UNIT (DST-01..04, 07..10) / INTEGRATION (DST-05, DST-06) | 10 |
| RecurrenceEdgeCases | `src/domain/recurrence/__tests__/RecurrenceEdgeCases.test.ts` | UNIT (REC-01..04, 08..09) / INTEGRATION (REC-05..07, 10..13) | 13 |
| PlannerRefreshCoordinator.edgeCases | `src/services/__tests__/PlannerRefreshCoordinator.edgeCases.test.ts` | UNIT (PRC-01..05, 07..09) / INTEGRATION (PRC-06) | 9 |
| PBR-01 (race) | `src/stores/__tests__/useTodayStore.concurrency.test.ts` | UNIT | 1 |
| TaskStateEdgeCases | `src/domain/task/__tests__/TaskStateEdgeCases.test.ts` | UNIT (TSE-01..06) / INTEGRATION (TSE-07, TSE-08) | 8 |
| NotificationEdgeCases | `src/services/notification/__tests__/NotificationEdgeCases.test.ts` | UNIT | 7 |
| LocationEdgeCases | `src/services/__tests__/LocationEdgeCases.test.ts` | UNIT | 9 |
| JournalEdgeCases | `src/services/journal/__tests__/JournalEdgeCases.test.ts` | UNIT/STATIC | 8 |
| CalendarEdgeCases | `src/domain/calendar/__tests__/CalendarEdgeCases.test.ts` | UNIT | 8 |
| OnboardingEdgeCases | `src/services/onboarding/__tests__/OnboardingEdgeCases.test.ts` | UNIT | 5 |
| SettingsEdgeCases | `src/services/__tests__/SettingsEdgeCases.test.ts` | UNIT | 8 |
| **Total** | | | **97 tests** |
| **New suites** | | | **12 suites** |

**Test count reconciliation:** 93 (original freeze) + 1 PRC-09 + 1 REC-13 + 1 TSE-08 + 1 LE-09 = **97 planned M23 tests**.

**Post-M23 estimated total:** 1556 (baseline) + 97 (planned) = **1653 tests** across **144 suites**

Completion criterion: all 97 planned scenarios covered and passing. Every named scenario above has explicit test coverage. No scenario may be silently dropped.

---

## 10. Native QA Model — QA Gate STATUS

### 10.1 Critical Native QA Gates

These are checks that are critical for release correctness. Each has a QA GATE STATUS that must be one of PASS / FAIL / BLOCKED (NOT EXECUTED).

| Gate ID | Area | Required Evidence Level | M23 gate can close if: |
|---|---|---|---|
| GATE-1 | TaskCard TalkBack composite (CF-A4) | LEVEL 1+ | PASS or BLOCKED with Lead-approved M24 carry-forward |
| GATE-2 | PrayerHeader TalkBack composite (CF-A2) | LEVEL 1+ | PASS or BLOCKED with Lead-approved M24 carry-forward |
| GATE-3 | All 6 modals TalkBack `accessibilityViewIsModal` (CF-A6/8/10/12/14/16) | LEVEL 1+ | PASS or BLOCKED |
| GATE-4 | iOS widget gallery Small + Medium render (CF-W1/W2) | LEVEL 2 (physical iOS required) | PASS or BLOCKED with Lead-approved M24 carry-forward (see §18) |
| GATE-5 | iOS widget data delivery when app terminated (RISK-B3 / App Group) | LEVEL 2 | PASS or BLOCKED with Lead-approved M24 carry-forward |
| GATE-6 | All 8 directional chevrons RTL flip | LEVEL 1+ | PASS or BLOCKED |
| GATE-7 | Planning-day boundary Fajr/Midnight/Custom lifecycle | LEVEL 1+ | PASS |

GATE-1 and GATE-2 are gates for **unconfirmed** defects. If native QA returns FAIL, the defect is confirmed and classified per §26. If it returns PASS, the risk is resolved.

### 10.2 TaskCard TalkBack Gate — Positive Defect Resolution Policy

> **GATE-1 applies only when native TalkBack testing is executed. No production fix is pre-authorized.**

If AND-A2 (TaskCard TalkBack) returns FAIL (duplicate announcements confirmed):

1. **Record exact native evidence:** which descendants TalkBack exposes, exact announcement sequence heard, Android API level and device.
2. **STOP for Lead accessibility review.** Do not proceed to a fix without Lead guidance.
3. **Explore fixes that preserve the composite accessible parent.** The composite `contentContainer` has `accessible={true}` and `accessibilityLabel={compositeLabel}`. Any fix must preserve the View's traversability with its composite label.
4. **Possible future fix directions (NOT pre-authorized):** Suppression or grouping on CHILD elements (not the parent); a different structural approach. The precise fix depends on which descendants TalkBack actually exposes — this is empirical information only available after native testing.
5. **Do NOT apply `importantForAccessibility="no-hide-descendants"` to the composite parent.** This was Lead-rejected in M22 (D-1 Resolution) because in RN 0.86, `no-hide-descendants` on a View hides that View itself AND all descendants, which would suppress the entire composite element.
6. **If no narrow fix can be designed without Lead review:** Mark GATE-1 as FAIL / PENDING FIX and escalate before M23 can close.

---

## 11. iOS QA Matrix

| QA ID | CF ID | Feature | Evidence Level | Steps | Expected Result |
|---|---|---|---|---|---|
| IOS-A1 | CF-A1 | VoiceOver — PrayerHeader composite | LEVEL 2 | VoiceOver on; focus PrayerHeader | ONE composite announcement: prayer name + time + countdown. No duplicate child announcements. |
| IOS-A2 | CF-A3 | VoiceOver — TaskCard grouping | LEVEL 2 | VoiceOver on; focus contentContainer | ONE composite: title + important badge + overdue. Checkbox is a SEPARATE adjacent focus item. |
| IOS-A3 | CF-A5 | VoiceOver — JournalDeleteDialog | LEVEL 2 | VoiceOver on; open delete dialog; navigate | Focus trapped within dialog. Cancel and Delete individually focusable. Underlying screen not traversable. |
| IOS-A4 | CF-A7 | VoiceOver — JournalPrivacySheet | LEVEL 2 | VoiceOver on; open sheet | Focus trapped. Done button reachable. |
| IOS-A5 | CF-A9 | VoiceOver — CustomRecurrenceModal | LEVEL 2 | VoiceOver on; tap Custom Repeat | Focus trapped. Done/Apply + Close reachable. |
| IOS-A6 | CF-A11 | VoiceOver — EditScopeSheet | LEVEL 2 | VoiceOver on; edit recurring task | Focus trapped. Cancel + scope options reachable. |
| IOS-A7 | CF-A13 | VoiceOver — PremiumLockedInfo | LEVEL 2 | VoiceOver on; tap locked planning-day | Focus trapped. OK individually reachable (not swallowed by group). |
| IOS-A8 | CF-A15 | VoiceOver — Hijri Calendar override modal | LEVEL 2 | VoiceOver on; open hijri override | Focus trapped. Cancel + Save Override reachable. |
| IOS-R1 | CF-A17 | RTL layout — all screens | LEVEL 1+ | Device/simulator in Arabic locale | Layouts mirror horizontally. No clipped content. Touch targets intact. |
| IOS-R2 | CF-A18 | RTL — 8 directional chevrons | LEVEL 1+ | RTL locale; observe all 8 instances | All 8 horizontal chevrons flip (scaleX: -1). chevron-down does NOT flip. |
| IOS-R3 | CF-A19 | RTL — PrayerTabBar | LEVEL 1+ | RTL locale | Fajr at logical-start (right in RTL). Canonical data order unchanged. |
| IOS-R4 | CF-A20 | RTL — BottomNavBar | LEVEL 1+ | RTL locale | Icons mirror physically. Route indices / callbacks semantically unchanged. |
| IOS-R5 | CF-A21 | RTL — Calendar grid | LEVEL 1+ | RTL locale | Weekday header mirrors. Day cells mirror. onPreviousMonth/onNextMonth semantics unchanged. |
| IOS-T1 | CF-A22 | Large text — CalendarMonthGrid / CalendarDayCell | LEVEL 1+ | iOS Dynamic Type at maximum | No clipping of day numbers or weekday labels. maxFontSizeMultiplier=2 cap visible. |
| IOS-T2 | CF-A22 | Large text — Today screen | LEVEL 1+ | Same | Labels readable; no overflow. |
| IOS-L1 | CF-E11 | Location — AUTO permission denied | LEVEL 1+ | Location permission denied; AUTO mode with committed location | Committed lastAutoLocation used; no permission re-request. Prayer times load. |
| IOS-L2 | — | Location — permission request only on explicit tap | LEVEL 1+ | Permission not granted | Tap "Use My Location" -> permission requested. All other navigation does NOT trigger it. |
| IOS-N1 | CF-E1 | Notification delivery | LEVEL 2 (preferred) | Permission granted; reminder set | Notification appears in system notification center at correct time. |
| IOS-N2 | — | Notification — permission denied | LEVEL 1+ | Permission denied | Full refresh; no notifications scheduled; no crash. |
| IOS-P1 | CF-A23 | Date/time picker VoiceOver | LEVEL 2 | VoiceOver on; open task form picker | VoiceOver reads picker values. User adjusts date/time with swipe. |
| IOS-W1 | CF-W1 | Widget — Small render | LEVEL 2 | Dev/EAS build; widget added to home screen | Small widget shows current prayer + next prayer. No Journal content. |
| IOS-W2 | CF-W2 | Widget — Medium render | LEVEL 2 | Same | Medium widget shows prayer + up to 3 task titles. No notes, no coordinates. |
| IOS-W3 | CF-W3 | Widget — timeline prayer-boundary transitions | LEVEL 2 | Wait for prayer boundary | Widget updates to next prayer without app open. |
| IOS-W4 | CF-W4 | Widget — countdown timer (native SwiftUI date) | LEVEL 2 | Observe widget clock | Timer counts down using native OS clock. No JS polling. |
| IOS-W5 | CF-W5 | Widget — deep-link tap | LEVEL 2 | Tap widget | App opens to Today screen. |
| IOS-W6 | CF-W6 | Widget — dark-mode appearance | LEVEL 2 | Device in dark mode; observe widget | Widget adapts to dark ambient environment. Correct brand colors. |
| IOS-W7 | CF-W7 | Widget — SETUP_REQUIRED | LEVEL 2 | App in setup-required state | "Open Islamic Planner to finish setup." No fake prayer times. |
| IOS-W8 | CF-W8 | Widget — stale after planning-day boundary (overnight) | LEVEL 2 | App not opened overnight | Shows last-known data + "Open app to refresh". No crash. |
| IOS-W9 | CF-W9 | Widget — device-restart recovery | LEVEL 2 | Restart device | Widget reappears. Content may be stale; calm fallback shown. |
| IOS-W10 | CF-W18 | Widget — no Journal/coordinates/notes in content | LEVEL 2 | Observe widget with tasks scheduled | No journal text, no coordinates visible. Task titles only (no notes). |
| IOS-W11 | CF-W19/CF-A24 | Widget — accessibility tree inspection | LEVEL 2 | Accessibility Inspector or VoiceOver | Widget exposes meaningful accessibility labels. Prayer names audible. |
| IOS-C1 | CF-E9 | Cold-start theme hydration | LEVEL 1+ | Set Dark theme; force-quit; relaunch | Dark theme appears without white flash. |
| IOS-B1 | CF-E4 | Biometric — Face ID unlock (lock enabled) | LEVEL 2 | Journal lock enabled; app backgrounded; return to Journal | Face ID prompt. Unlocks on success. |
| IOS-B2 | CF-E6 | Biometric — Face ID cancel (lock enabled) | LEVEL 2 | Same; cancel Face ID | Journal remains locked. Cancel handled gracefully; no crash. |
| IOS-B3 | CF-E10 | Biometric — enable/disable through Settings | LEVEL 2 | Biometric toggle in Settings | Enable requires successful Face ID first. Disable permitted. No auto-disable on unavailable. |
| IOS-K1 | CF-E2/E3 | AES-256-GCM roundtrip across restart | LEVEL 1+ | Journal entry written; force-quit; reopen | Entry decrypts correctly. Same content visible. |
| IOS-LC1 | CF-E7 | App lifecycle — background -> foreground (journal relock) | LEVEL 1+ | Lock enabled; background app 30s; return to journal | Journal relocks. Prompt on re-entry. Today refreshes. |
| IOS-LC2 | CF-E8 | App lifecycle — process kill -> cold launch (lock restored) | LEVEL 1+ | Kill app from app switcher | Journal locked on restart. All persisted planner state restored. No crash. |
| IOS-LC3 | CF-E11 | Settings persistence across process restart | LEVEL 1+ | Configure settings; force-quit; relaunch | All settings values persist correctly. |
| IOS-ST1 | CF-E12 | Prayer preview / stepper interaction | LEVEL 1+ | Open prayer calculation settings; adjust offset stepper | Stepper increments/decrements correctly. Prayer preview updates. |
| IOS-PD1 | — | Planning-day boundary — Fajr — app open at boundary | LEVEL 1+ | Set time to 1s before Fajr; observe Today across boundary | planningDayKey updates at Fajr. Selected prayer switches. No duplicate refresh. |
| IOS-PD2 | — | Planning-day boundary — Midnight — app open at boundary | LEVEL 1+ | Same for Midnight boundary | planningDayKey updates at Midnight. |
| IOS-PD3 | — | Planning-day boundary — Custom — app open at boundary | LEVEL 1+ | Same for Custom boundary | planningDayKey updates at custom time. |
| IOS-PD4 | — | Planning-day boundary — background across Fajr — foreground | LEVEL 1+ | Background app before Fajr; foreground after Fajr | Today refreshes with new planningDayKey. Prayer state correct. No duplicate effects. |

**iOS QA check count: 44 checks**

---

## 12. Android QA Matrix

| QA ID | CF ID | Feature | Evidence Level | Steps | Expected Result |
|---|---|---|---|---|---|
| AND-A1 | CF-A2 | TalkBack — PrayerHeader composite | LEVEL 1+ | TalkBack on; focus PrayerHeader | ONE composite: prayer + time + countdown. No duplicate. |
| AND-A2 | CF-A4 | TalkBack — TaskCard composite (**GATE-1**) | LEVEL 1+ | TalkBack on; focus contentContainer | ONE composite: title + badge + overdue. Checkbox separate. If duplicates confirmed: record evidence; STOP; Lead review. |
| AND-A3 | CF-A6/8/10/12/14/16 | TalkBack — all 6 modals focus trapping | LEVEL 1+ | TalkBack on; open each modal | Focus contained within modal. Underlying screen not traversable. Android back / onRequestClose closes modal. |
| AND-A4 | CF-A14 | TalkBack — PremiumLockedInfo OK button | LEVEL 1+ | TalkBack on; open locked planning-day option | OK individually reachable (not swallowed by group). |
| AND-R1 | CF-A17 | RTL layout — all screens | LEVEL 1+ | Android system language: Arabic | Layouts mirror. No clipping. Text start-aligned. |
| AND-R2 | CF-A18 | RTL — 8 directional chevrons | LEVEL 1+ | RTL locale | All 8 horizontal chevrons flip. chevron-down unchanged. |
| AND-R3 | CF-A19 | RTL — PrayerTabBar | LEVEL 1+ | RTL locale | Fajr at logical-start (right in RTL). Array order unchanged. |
| AND-R4 | CF-A20 | RTL — BottomNavBar | LEVEL 1+ | RTL locale | Physical placement mirrors. Add button centered. Route indices unchanged. |
| AND-R5 | CF-A21 | RTL — Calendar | LEVEL 1+ | RTL locale | Grid mirrors. Previous/next callbacks unchanged. |
| AND-T1 | CF-A22 | Large font — calendar | LEVEL 1+ | Android font size: Largest | No clipping. maxFontSizeMultiplier=2 visible. |
| AND-T2 | CF-A22 | Large font — Today screen | LEVEL 1+ | Same | Labels readable; no overflow. |
| AND-L1 | CF-E11 | Location — AUTO permission denied | LEVEL 1+ | Deny location; AUTO configured with committed location | Prayer times load from committed location. No re-request. |
| AND-L2 | — | Location — permission request explicit only | LEVEL 1+ | Not granted | Tap "Use My Location" -> permission dialog. No other action triggers it. |
| AND-N1 | CF-E1 | Notification delivery | LEVEL 2 (preferred) | Permission granted; reminder set | Notification appears. Action tap opens app. |
| AND-N2 | — | Notification — permission denied | LEVEL 1+ | Deny notification permission | Full refresh; no notifications scheduled; no crash. |
| AND-P1 | CF-A23 | Date/time picker — TalkBack | LEVEL 1+ | TalkBack on; open picker | TalkBack reads fields. Adjustable via keyboard/swipe. |
| AND-W1 | CF-W10 | Widget — Small in launcher gallery | LEVEL 2 | Physical Android; debug APK; widget added | Small widget renders. Prayer + next prayer visible. |
| AND-W2 | CF-W11 | Widget — Medium in launcher gallery | LEVEL 2 | Same | Medium widget. Prayer + up to 3 task titles. No notes. |
| AND-W3 | CF-W12 | Widget — tap / deep-link | LEVEL 2 | Tap widget | App opens to Today. |
| AND-W4 | CF-W13 | Widget — no high-frequency update loop | LEVEL 2 | Monitor device 30+ min | Updates only at 30-min OS minimum + app-push events. No runaway loop. |
| AND-W5 | CF-W14 | Widget — app-driven update propagation | LEVEL 2 | Task created/completed; observe widget | Widget updates to reflect change on next app-triggered sync. |
| AND-W6 | CF-W15 | Widget — SETUP_REQUIRED | LEVEL 2 | App in setup-required state | Setup prompt. No fake data. |
| AND-W7 | CF-W16 | Widget — stale snapshot behavior | LEVEL 2 | App not opened overnight; observe widget | Shows stale data; calm fallback. No crash. |
| AND-W8 | CF-W17 | Widget — device-reboot launcher persistence | LEVEL 2 | Reboot device | Widget reappears. Calm stale fallback until app-push. |
| AND-W9 | CF-W18 | Widget — no Journal/coordinates/notes in content | LEVEL 2 | Observe widget | No journal text, no coordinates. Task titles only. |
| AND-W10 | CF-W19/CF-A24 | Widget — accessibility tree inspection | LEVEL 2 | TalkBack or Accessibility Inspector | Meaningful labels. Prayer names audible. |
| AND-C1 | CF-E9 | Cold-start theme hydration | LEVEL 1+ | Dark theme; force-stop; relaunch | Dark theme without white flash. |
| AND-B1 | CF-E5 | Biometric — fingerprint unlock (lock enabled) | LEVEL 2 | Journal lock enabled; biometric available | Fingerprint prompt. Unlocks on success. |
| AND-B2 | CF-E6 | Biometric — fingerprint cancel (lock enabled) | LEVEL 2 | Same; cancel | Journal remains locked. No crash. |
| AND-B3 | CF-E10 | Biometric — enable/disable through Settings | LEVEL 2 | Toggle in Settings | Enable requires successful fingerprint first. Disable works. |
| AND-K1 | CF-E2/E3 | AES-256-GCM roundtrip across restart | LEVEL 1+ | Journal entry; force-stop; relaunch | Entry decrypts correctly. |
| AND-LC1 | CF-E7 | App lifecycle — background/foreground (journal relock) | LEVEL 1+ | Lock enabled; background 30s; foreground to journal | Journal relocks. Today refreshes. |
| AND-LC2 | CF-E8 | App lifecycle — process kill | LEVEL 1+ | Kill app | Relaunch. Planner state restored. Journal locked. No crash. |
| AND-LC3 | CF-E11 | Settings persistence across process restart | LEVEL 1+ | Configure settings; force-stop; relaunch | All settings persist. |
| AND-ST1 | CF-E12 | Prayer preview / stepper interaction | LEVEL 1+ | Prayer calculation settings; stepper | Stepper increments/decrements. Preview updates. |
| AND-PD1 | — | Planning-day boundary — Fajr — app open at boundary | LEVEL 1+ | Set time to 1s before Fajr; observe Today across boundary | planningDayKey updates. Selected prayer switches. No duplicate refresh. |
| AND-PD2 | — | Planning-day boundary — Midnight — app open at boundary | LEVEL 1+ | Same for Midnight boundary | planningDayKey updates. |
| AND-PD3 | — | Planning-day boundary — Custom — app open at boundary | LEVEL 1+ | Same for Custom boundary | planningDayKey updates. |
| AND-PD4 | — | Planning-day boundary — background across Fajr — foreground | LEVEL 1+ | Background before Fajr; foreground after | Today refreshes with new planningDayKey. No duplicate effects. |

**Android QA check count: 39 checks**

---

## 13. Planning-Day Native QA Plan

Planning-day boundary tests PDB-01..PDB-11 prove the pure domain logic (exact-second resolution and DST stability). The following native checks verify behavior in the running app, which also requires the full coordinator pipeline.

### 13.1 Fajr Boundary

- App open 30s before Fajr; observe Today state: yesterday's planningDayKey active
- Clock crosses Fajr: observe Today state updates to today's planningDayKey
- Selected prayer tab advances from prior day's final prayer to Fajr
- No duplicate refresh effects (no double transition banner)
- IOS-PD1, AND-PD1

### 13.2 Midnight Boundary

- Same scenario at Midnight boundary (Premium setting)
- IOS-PD2, AND-PD2

### 13.3 Custom Boundary

- Same scenario at Custom time boundary (Premium setting)
- IOS-PD3, AND-PD3

### 13.4 Background-Across-Boundary

- App backgrounded before Fajr boundary; foreground after
- Today refreshes with new planningDayKey
- Prayer tab state correct (no carryover of prior day)
- Notifications for new day present; notifications for past day absent
- Widget snapshot reflects new day after refresh
- IOS-PD4, AND-PD4

### 13.5 DST at Planning-Day Boundary

Covered by PDB-10, PDB-11 (automated) + IOS-LC1/IOS-LC2 (lifecycle) + the manual DST timezone checks in §14.

---

## 14. Timezone / DST Plan

### 14.1 Automated Coverage (DST-01..DST-10, PDB-10, PDB-11)

See §9.2 Domains 1 and 2.

### 14.2 Native Manual Timezone Checks

| Item | Method |
|---|---|
| App open at DST spring-forward (2:00->3:00 AM) | Set device to DST-observing timezone; advance clock past DST boundary; observe planningDayKey rollover |
| Background sleep across DST spring-forward; foreground | Sleep device; advance device time past DST; foreground app |
| App open at DST fall-back (1:00 AM occurs twice) | Set device to fall-back timezone; advance clock; observe no duplicate refresh |
| Timezone change while app installed (AUTO mode) | Change device timezone; fullRefresh; observe prayer times reflect new timezone |
| MANUAL location with timezone differing from device | Manual location set; verify prayer times use manual location's timezone, not device timezone |

---

## 15. Risk Inventory

### CRITICAL NATIVE QA GATES (not yet confirmed defects)

These risks are critical to verify. They become confirmed defects only upon a FAIL result from native QA. Until then, they are QA gates.

| ID | Gate | Native QA | Resolution if FAIL |
|---|---|---|---|
| RISK-G1 | TaskCard TalkBack duplicate announcements | AND-A2 (GATE-1) | Lead review required. See §10.2. Fix must preserve composite parent traversability. |
| RISK-G2 | PrayerHeader TalkBack composite | AND-A1 (GATE-2) | Record evidence; if duplication confirmed, assess source-level fix for compositeLabel construction. |
| RISK-G3 | Widget App Group (iOS): data delivery when app terminated | IOS-W3, IOS-W8 (GATE-5) | If FAIL: iOS App Group identifier must be configured as M18 §7.2 specified. Architecture amendment required before any further iOS widget native QA. |

### HIGH Architecture Risks

| ID | Risk | Status | Mitigation / Required Fix | Test Coverage |
|---|---|---|---|---|
| RISK-H1 | DST recurrence duplicates at +/-7-day horizon boundary | **RESOLVED** — civil-date recurrence identity is timezone-independent; UNIQUE(series_id, local_date) prevents duplicates; deterministic DST resolution (SPRING_FORWARD_SHIFTED / FALL_BACK_FIRST) | Integration coverage retained | DST-05, DST-06, REC-05..REC-07 (INTEGRATION) |
| RISK-H2 | RecurringHorizonSync failure semantics in fullRefresh | **RESOLVED** — ADR-031 authored; Option A (propagate rejection) is current behavior; Case B (resolved HorizonSyncResult with issues) does not abort coordinator | PRC-02 (locks rejection case), PRC-09 (locks resolved-issues case) | PRC-02, PRC-09 |
| RISK-H3 | Notification terminal-state race: cancelOccurrenceReminder does not request follow-up reconcile | **OPEN / HIGH** — confirmed defect; targeted cancellation alone is insufficient; stale notification can survive until unrelated later reconcile event | Narrow production fix required: terminal-transition path must request best-effort reconcile after targeted cancel | NE-07 (tightened to test production path) |
| RISK-H4 | TalkBack modal trapping on Android API levels 29-34 | Open | GATE-3 (AND-A3) resolves | — |
| RISK-H5 | Journal SecureStore failure path | Addressed | JE-01 | JE-01 |
| RISK-H6 | Onboarding partial persistence | Addressed | OE-02 | OE-02 |
| RISK-H7 | fullRefresh in-flight while planning-day boundary crossed | **RESOLVED** — requestGeneration token in useTodayStore prevents stale Zustand commits; PBR-01 tests the invariant | PBR-01 (UNIT in useTodayStore) | PBR-01 |
| RISK-H8 | Stale PENDING cleanup can delete a concurrently terminal occurrence | **OPEN / HIGH** — `RecurringHorizonSync.syncSeries()` EXECUTE phase reads PENDING occurrences in PLAN, then calls `occRepo.delete(id)` in EXECUTE without an atomic status guard. A concurrent lifecycle/user action can transition the occurrence to COMPLETED/MISSED/CANCELLED between PLAN read and EXECUTE delete. The un-guarded DELETE then physically removes terminal history, violating terminal-history immutability. | Narrow production fix required: destructive cleanup must use atomic guarded delete (`DELETE WHERE id=? AND status='PENDING'`) and inspect affected-row count. Exact repository API named by Sonnet per current conventions. | TSE-08 (INTEGRATION, proves SQL guard) |

### MEDIUM Risks

| ID | Area | Automated Coverage | Native QA |
|---|---|---|---|
| RISK-M1 | Feb 29 recurrence clamp idempotency | REC-04 | None required |
| RISK-M2 | Month-end 31st re-sync idempotency | REC-01..REC-03, REC-05 | None required |
| RISK-M3 | Timezone change between syncs: stale planningDayKey | DST-05, DST-06 (INTEGRATION) | Manual timezone change test |
| RISK-M4 | Hijri loader failure on calendar render | CAL-05 | None required |
| RISK-M5 | Notification duplicate on rapid refresh | NE-05, drain-loop existing tests | None required |
| RISK-M6 | Widget snapshot stale after location change | Existing WidgetSyncCoordinator tests | AND-W5 |
| RISK-M7 | RTL physical rendering unverified | RTLIcons.test.tsx (I-1..I-12) | IOS-R1..R5, AND-R1..R5 |
| RISK-M8 | Large font calendar clipping | TextScaling.test.tsx (F-1..F-3) | IOS-T1, AND-T1 |
| RISK-M9 | Journal rapid save race | JE-03 | None required |
| RISK-M10 | Entitlement UNAVAILABLE cascading | SE-05, SE-08 | None required |
| RISK-M11 | VoiceOver modal traversal 6 modals | ModalAccessibility.test.tsx | IOS-A3..A8 |
| RISK-M12 | Android location permission revocation | LE-04 | AND-L1 |
| RISK-M13 | useLocation refresh-token settlement defect | **OPEN** — confirmed from source inspection: `requestAutoLocation` snapshot-fallback paths (lines 124–134, 151–160) call `startRefresh()` but outer catch does not settle the token; SETUP_REQUIRED on these branches also unsettled; `setManualLocation` outer catch similarly unsettled. `refreshInFlight` remains `true` after fullRefresh rejection. | Narrow production fix required: every path that calls `startRefresh()` must settle the token. | LE-09 (UNIT) |

### LOW Risks

| ID | Description | Planned Coverage |
|---|---|---|
| RISK-L1 | DST exact-time SPRING_FORWARD_SHIFTED — no UI explanation | OBS: documented; DST-01 confirms behavior |
| RISK-L2 | Prayer window wrapping rejection — no UI feedback test | May add in implementation if easily testable |
| RISK-L3 | SettingsStepper rapid tap idempotency | SE-07 (indirect); may defer to M24 |
| RISK-L4 | Calendar 6-week month grid layout | CAL-03 |
| RISK-L5 | Onboarding redirect race (markComplete/router.replace) | OE-03 (indirect) |
| RISK-L6 | Journal history navigation to deleted entry | JE-06 |
| RISK-L7 | Notification scheduling partial failure recovery | NE-06 |

### OBSERVATIONS

| ID | Item |
|---|---|
| OBS-1 | Task title visible on lock screen (widget) — documented product decision, not defect |
| OBS-2 | iOS widget countdown uses native SwiftUI clock — no JS polling. Correct. |
| OBS-3 | Android `updatePeriodMillis=1800000` minimum — app-push covers prayer transitions. Correct. |
| OBS-4 | `textAlign: 'center'` direction-neutral — no change (M22 OBS-3) |
| OBS-5 | `right: -30` on PrayerHeader decorative ornament — physical/geometric. Correct (M22 OBS-2). |
| OBS-6 | Expo SDK 57 advisory — pre-existing; does not reopen any milestone |
| OBS-7 | `app/demo.tsx` `/demo` route — `__DEV__` gate deferred to M24 per ADR-029. Not a security defect. |

---

## 16. Severity Policy for Confirmed Defects

A **confirmed defect** requires a FAIL result from a native QA gate or a verified source-level invariant violation. Severity applies only to confirmed defects.

| Severity | Meaning | Required Action |
|---|---|---|
| BLOCKER | Prevents release. Correctness invariant violated. | Fix before M23 closure. If fix requires changing frozen product semantics or changing multiple systems: STOP; escalate to Lead. |
| HIGH | Significant user-facing defect or safety risk. | Fix before M23 closure. Narrow fix only. |
| MEDIUM | Notable defect with workaround. | Fix within M23 or document explicitly as M24 carry-forward with Lead approval. |
| LOW | Minor defect; minimal impact. | May defer to M24 with documented justification. |
| OBSERVATION | Confirmed-correct behavior. | Document only. No code change. |

### Narrow Fix Policy

A confirmed defect may be fixed within M23 if:
1. It is a bug against a frozen contract.
2. The fix is the smallest localized production change necessary to correct the confirmed defect, with no unrelated refactor.
3. No product semantic redesign is required.
4. Fix is accompanied by a dedicated regression test.

If fixing requires changing product semantics, changing multiple systems, or adding a migration: **STOP. Escalate to Lead.**

M23 adds **0 new migrations**. Any proposed migration is an immediate escalation.

---

## 17. Planned Production Changes

Three narrow production changes are expected before M23 closure. They address confirmed architectural defects. Each requires a dedicated regression test and Lead review if the fix touches a frozen invariant.

| # | Fix Area | Required Change | Associated Test | Risk |
|---|---|---|---|---|
| PC-1 | Atomic PENDING cleanup guard | `TaskOccurrenceRepository` (or equivalent) must provide a guarded delete operation that atomically checks `status = 'PENDING'` before deleting (e.g., `DELETE WHERE id=? AND status='PENDING'`; return affected-row count). `RecurringHorizonSync` EXECUTE phase must use this guarded delete. Prevents stale cleanup from removing terminal history. Exact API named by Sonnet per current repository conventions. | TSE-08 | RISK-H8 |
| PC-2 | useLocation Today-store refresh-token settlement | Every `useLocation` path that calls `startRefresh()` must deterministically settle the Today-store token through exactly one of: `commitRefresh(...)`, `setError(token, ...)`, or `setSetupRequired(token)`. The SETUP_REQUIRED and fullRefresh-rejection paths in `requestAutoLocation` snapshot-fallback branches and `setManualLocation` catch block are the confirmed unsettled paths. Fix must not double-settle. | LE-09 | RISK-M13 |
| PC-3 | Terminal-transition notification reconciliation | After a terminal transition, the production terminal-transition owner/path must: (1) perform targeted deterministic cancellation (`cancelOccurrenceReminder(occurrenceId)`) for immediate cleanup; (2) request a best-effort full notification reconciliation (`notificationReconciliationService.reconcile()`). No background polling introduced. Fix is narrow and event-driven. | NE-07 (tightened) | RISK-H3 |

**General fix policy:** Any fix must identify a specific confirmed defect against a frozen contract, propose the smallest localized production change necessary to correct that defect (narrow, ownership-correct, no unrelated refactor), and be accompanied by a dedicated regression test. Fixes that change product semantics, affect multiple systems, or require a migration require Lead escalation before proceeding.

Previously removed non-authorizations:
- **PC-C1 removed (M22 hardening):** TaskCard TalkBack is a native QA gate, not a confirmed defect. No fix pre-authorized. If GATE-1 returns FAIL, fix must be designed from native evidence.
- **PC-C2 removed (M23 hardening):** Adding try/catch around `recurringHorizonSync.sync()` and continuing to READY would change failure propagation and READY semantics — now resolved as ADR-031 with zero production change.

---

## 18. M23 / M24 Carry-Forward Policy

### Policy

A native QA gate may carry forward to M24 if and only if:
1. The gate CANNOT be executed due to hardware unavailability (not due to scheduling convenience).
2. Lead explicitly approves the carry-forward before M23 closure.
3. The gate is marked `BLOCKED / NOT EXECUTED` — NOT `PASS` and NOT `RESOLVED`.
4. The gate becomes a **RELEASE BLOCKER** in M24. M24 may not close or release until the gate is either executed with PASS or the capability is explicitly re-architected.

### Currently Eligible for Lead-Approved Carry-Forward

| Gate | Reason |
|---|---|
| GATE-4: iOS widget gallery (CF-W1..W9) | Requires EAS build on macOS or physical iOS device. Windows development constraint. |
| IOS-A1..A8 (VoiceOver checks) | Requires physical iOS device. If no physical device available. |
| IOS-B1, IOS-B2, IOS-B3 (biometric iOS) | Requires physical iOS device. |
| GATE-5: Widget App Group | Depends on GATE-4 first being executed. |

### May NOT Carry Forward

Confirmed BLOCKER defects. If GATE-1, GATE-2, or GATE-3 return FAIL (a defect is confirmed), M23 may not close until that confirmed defect is resolved. The gate itself (the check) can carry forward; the confirmed defect cannot.

---

## 19. Native Manual QA Checklist

Each item records: **PASS / FAIL / BLOCKED**, **evidence** (screenshot, transcript, or behavior description), **tester platform + OS version + device**.

### iOS VoiceOver (LEVEL 2)

- [ ] IOS-A1 (CF-A1): PrayerHeader VoiceOver — one composite announcement
- [ ] IOS-A2 (CF-A3): TaskCard VoiceOver — composite + separate checkbox
- [ ] IOS-A3 (CF-A5): JournalDeleteDialog — focus trapped; Cancel + Delete reachable
- [ ] IOS-A4 (CF-A7): JournalPrivacySheet — focus trapped; Done reachable
- [ ] IOS-A5 (CF-A9): CustomRecurrenceModal — focus trapped; Done + Close reachable
- [ ] IOS-A6 (CF-A11): EditScopeSheet — focus trapped; scope options reachable
- [ ] IOS-A7 (CF-A13): PremiumLockedInfo — OK individually reachable (not swallowed)
- [ ] IOS-A8 (CF-A15): Hijri override modal — focus trapped; Cancel + Save reachable

### Android TalkBack (LEVEL 1+)

- [ ] AND-A1 (CF-A2): PrayerHeader TalkBack — composite; no duplicate
- [ ] AND-A2 (CF-A4): TaskCard TalkBack — composite; checkbox separate **[GATE-1]**
- [ ] AND-A3 (CF-A6/8/10/12/14/16): All 6 modals TalkBack — focus contained; Android back closes modal **[GATE-3]**
- [ ] AND-A4 (CF-A14): PremiumLockedInfo TalkBack — OK individually reachable

### RTL Physical Rendering (LEVEL 1+)

- [ ] IOS-R1 / AND-R1 (CF-A17): All screens RTL — no clipping
- [ ] IOS-R2 / AND-R2 (CF-A18): All 8 directional chevrons flip; chevron-down unchanged
- [ ] IOS-R3 / AND-R3 (CF-A19): PrayerTabBar — Fajr at logical-start in RTL
- [ ] IOS-R4 / AND-R4 (CF-A20): BottomNavBar — mirrors; route indices unchanged
- [ ] IOS-R5 / AND-R5 (CF-A21): Calendar grid — mirrors; prev/next semantics unchanged

### Large Font (LEVEL 1+)

- [ ] IOS-T1 / AND-T1 (CF-A22): Calendar — no clipping at max text size
- [ ] IOS-T2 / AND-T2 (CF-A22): Today screen — readable at max text size

### Planning-Day Boundary (LEVEL 1+)

- [ ] IOS-PD1 / AND-PD1: Fajr boundary — app open at boundary; rollover observed
- [ ] IOS-PD2 / AND-PD2: Midnight boundary — app open at boundary
- [ ] IOS-PD3 / AND-PD3: Custom boundary — app open at boundary
- [ ] IOS-PD4 / AND-PD4: Background across Fajr; foreground — correct new planningDayKey

### Timezone / DST (LEVEL 1+)

- [ ] App open at DST spring-forward: planningDayKey rollover observed
- [ ] Background across DST spring-forward; foreground: prayer times correct
- [ ] Timezone change (AUTO mode): prayer times recalculated
- [ ] MANUAL location with different timezone: prayer times use manual timezone

### Widgets — iOS (LEVEL 2)

- [ ] IOS-W1 (CF-W1): Small widget in gallery
- [ ] IOS-W2 (CF-W2): Medium widget; correct content
- [ ] IOS-W3 (CF-W3): Timeline updates at prayer boundary **[GATE-5 prerequisite]**
- [ ] IOS-W4 (CF-W4): Countdown timer — native OS clock; no JS polling
- [ ] IOS-W5 (CF-W5): Widget tap opens Today
- [ ] IOS-W6 (CF-W6): Dark-mode appearance correct
- [ ] IOS-W7 (CF-W7): SETUP_REQUIRED prompt shown
- [ ] IOS-W8 (CF-W8): Stale after overnight — calm fallback **[GATE-5]**
- [ ] IOS-W9 (CF-W9): Device-restart recovery
- [ ] IOS-W10 (CF-W18): No Journal content / coordinates / notes
- [ ] IOS-W11 (CF-W19/CF-A24): Accessibility tree — meaningful labels

### Widgets — Android (LEVEL 2)

- [ ] AND-W1 (CF-W10): Small widget in launcher gallery
- [ ] AND-W2 (CF-W11): Medium widget; correct content
- [ ] AND-W3 (CF-W12): Widget tap opens Today
- [ ] AND-W4 (CF-W13): No high-frequency update loop (30+ min monitor)
- [ ] AND-W5 (CF-W14): App-driven update propagation
- [ ] AND-W6 (CF-W15): SETUP_REQUIRED prompt
- [ ] AND-W7 (CF-W16): Stale snapshot behavior — calm fallback
- [ ] AND-W8 (CF-W17): Device-reboot persistence
- [ ] AND-W9 (CF-W18): No Journal content / coordinates / notes
- [ ] AND-W10 (CF-W19/CF-A24): Accessibility tree

### Notifications (LEVEL 1+ / LEVEL 2 preferred)

- [ ] IOS-N1 / AND-N1 (CF-E1): Real notification delivered at correct time
- [ ] IOS-N2 / AND-N2: Permission denied — planner loads; no crash

### Biometric / Journal (LEVEL 2 for biometric; LEVEL 1+ for AES)

- [ ] IOS-K1 / AND-K1 (CF-E2/E3): AES-256-GCM roundtrip across force-quit
- [ ] IOS-B1 / AND-B1 (CF-E4/E5): Biometric unlock (lock enabled) — success
- [ ] IOS-B2 / AND-B2 (CF-E6): Biometric cancel (lock enabled) — journal remains locked
- [ ] IOS-B3 / AND-B3 (CF-E10): Enable/disable lock through Settings

### Theme / Settings / Lifecycle (LEVEL 1+)

- [ ] IOS-C1 / AND-C1 (CF-E9): Cold-start dark theme — no flash
- [ ] IOS-L1 / AND-L1: Location permission denied — committed location used
- [ ] IOS-L2 / AND-L2: Permission request only on explicit user action
- [ ] IOS-P1 / AND-P1 (CF-A23): Date/time picker screen reader interaction
- [ ] IOS-ST1 / AND-ST1 (CF-E12): Prayer preview / stepper interaction
- [ ] IOS-LC1 / AND-LC1 (CF-E7): Background -> foreground; journal relocks; Today refreshes
- [ ] IOS-LC2 / AND-LC2 (CF-E8): Process kill -> cold launch; lock restored; planner state restored
- [ ] IOS-LC3 / AND-LC3 (CF-E11): Settings persist across process restart

---

## 20. Failure Injection Strategy

All failure injection uses constructor injection (established pattern). No new test infrastructure required.

| Failure | Injection Method |
|---|---|
| DB read failure | Mock `UserSettingsRepository.findFirst()` to throw |
| DB write failure | Mock `UserSettingsRepository.upsert()` to throw |
| SecureStore failure | Mock `expo-secure-store` (existing `__mocks__` pattern) |
| Notification API failure | Mock `expo-notifications` (existing mock) |
| Location API failure | Mock `expo-location` (existing mock) |
| Widget sync failure | Mock `WidgetSyncCoordinator.sync()` to throw |
| RecurrenceHorizonSync failure | Pass stub that throws to PlannerRefreshCoordinator constructor |
| TodayOrchestrator failure | Pass stub that throws to PlannerRefreshCoordinator constructor |
| Biometric unavailable | Mock `expo-local-authentication` `isEnrolledAsync()` to return false |

---

## 21. Completion Criteria

M23 is complete when ALL of the following are true:

1. **All 97 planned test scenarios covered** and passing. Every named scenario in §9.2 has explicit coverage (including PRC-09, REC-13, TSE-08, LE-09).
2. **Zero regressions:** All 1556 baseline tests continue to pass.
3. **TypeScript:** 0 errors.
4. **ESLint:** 0 errors, 0 warnings.
5. **Specialist reviews integrated:** Opus + ChatGPT Lead review answers incorporated (complete — this document). ADR-031 authored in DECISIONS.md.
6. **Three narrow production fixes implemented:** PC-1 (atomic PENDING cleanup guard), PC-2 (useLocation token settlement), PC-3 (terminal-transition notification reconciliation). Each accompanied by a dedicated regression test.
7. **GATE-1, GATE-2, GATE-3:** Status is PASS, FAIL (with defect resolution), or Lead-approved BLOCKED/NOT EXECUTED.
8. **GATE-4, GATE-5 (iOS widget):** Status is PASS or Lead-approved M24 carry-forward.
9. **All MEDIUM risks:** Either covered by planned tests, native QA, or documented with explicit Lead-approved M24 carry-forward.
10. **No new dependencies** without explicit justification.
11. **No new migrations.**
12. **No confirmed BLOCKER defects outstanding** (confirmed BLOCKER = native QA FAIL against a critical invariant).
13. **Independent review:** Required before closure.
14. **Lead approval:** Required before closure.

---

## 22. Supporting Docs to Update at Closure

- `docs/CURRENT_MILESTONE.md` — advance to M23 closure summary, M24 status
- `docs/IMPLEMENTATION_STATUS.md` — update M23 row
- `docs/ARCHITECTURE_INDEX.md` — add M23 entry
- `docs/DECISIONS.md` — add ADR-031 only if a durable architectural rule emerges from Opus review
- `docs/AI_PROJECT_CONSTITUTION.md` — only if a fundamental invariant changes

---

## 23. Pre-Commit Verification Record

### Pass 1 — Architecture Hardening (2026-09-19)

```
git rev-parse HEAD         -> 5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11  PASS
git rev-parse origin/main  -> 5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11  PASS
git status                 -> clean working tree  PASS (pre-commit)

Initial M23 architecture commit: NONE existed before this pass.
Commit: docs(m23): freeze QA and edge-case architecture  [100c151]

Docs changed:
  docs/M23_ARCHITECTURE.md — NEW (this document)
  docs/CURRENT_MILESTONE.md — status update
  docs/IMPLEMENTATION_STATUS.md — M23 row update
  docs/ARCHITECTURE_INDEX.md — M23 entry

ADR-031: Deferred — no durable decision established in hardening pass.
New dependencies: 0
New migrations: 0
```

### Pass 2 — Specialist Review Integration (2026-09-19)

```
git rev-parse HEAD         -> 100c151275b827bb67ad97f2f3d629f813e984a1  PASS
git rev-parse origin/main  -> 5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11  PASS (unchanged — NOT PUSHED)
git status                 -> clean working tree  PASS (pre-commit)

Source files inspected (production — for Lead claim verification):
  src/hooks/useLocation.ts                                    — Lead Decision 4 CONFIRMED
  src/services/PlannerRefreshCoordinator.ts                   — Lead Decision 1 CONFIRMED (no try/catch at :87)
  src/features/task-form/recurringHorizonSync.ts              — Lead Decision 2 CONFIRMED (non-transactional EXECUTE)
  src/domain/materialization/MaterializationEngine.ts         — terminal short-circuit verified
  src/data/schema.ts                                          — UNIQUE constraints verified
  src/services/notification/NotificationReconciliationService.ts — RISK-H3 deficiency confirmed
  src/data/db.ts                                              — TransactionLock scope confirmed
  src/stores/useTodayStore.ts                                 — requestGeneration token verified

Docs changed:
  docs/M23_ARCHITECTURE.md — integration pass (this document) — §7, §9.2, §9.3, §15, §17, §21, §23, §24 updated
  docs/DECISIONS.md        — ADR-031 authored
  docs/CURRENT_MILESTONE.md — status update
  docs/ARCHITECTURE_INDEX.md — M23 entry updated

ADR-031: AUTHORED in DECISIONS.md.
New dependencies: 0
New migrations: 0
Commit: docs(m23): integrate Lead review of Opus findings
```

---

## 24. Amendment History

| Date | Author | Change |
|---|---|---|
| 2026-09-19 | Sonnet (Architect) | Initial freeze + hardening (combined: no flawed draft committed) — 16 Lead-review corrections applied |
| 2026-09-19 | Sonnet (Architect) | Integration pass — Opus specialist review + ChatGPT Technical Lead review integrated. ADR-031 authored. RISK-H1/H2/H7 resolved; RISK-H3 reopened (HIGH); RISK-H8 added (HIGH); RISK-M13 added (MEDIUM). PRC-09, REC-13, TSE-08, LE-09 added. Test count 93 → 97. Three production changes expected. Status: AWAITING CHATGPT LEAD FINAL GATE. |
| 2026-09-19 | Sonnet (Architect/QA Recorder) | Closure pass — ChatGPT Technical Lead approved M23. Final gate status, risk disposition, M24 carry-forwards, and release blockers recorded. Status: CLOSED / APPROVED. |

---

## 25. M23 Closure Record

**Technical Lead Closure Date:** 2026-09-19
**Closure Decision:** M23 = APPROVED FOR CLOSURE
**Closure Commit:** `docs(m23): close M23 after final QA -- APPROVED`

### Final Implementation Commit

```
d73d8e634e708d4b20c05f0d82a4a77fc54d3477
fix(m23): implement QA edge-case hardening
```

Production hardening accepted:
- **PC-1** — Atomic PENDING-only occurrence deletion (TSE-08)
- **PC-2** — useLocation Today-store refresh-token settlement (LE-09)
- **PC-3** — Terminal task completion targeted notification cancellation + best-effort full reconcile (NE-07)

### Final Automated Validation (Accepted)

| Metric | Baseline | M23 Delta | Final |
|---|---|---|---|
| Test suites | 132 | +12 | **144** |
| Tests | 1556 | +97 | **1653** |
| Passed | 1556 | +97 | **1653** |
| Failed | 0 | 0 | **0** |
| TypeScript errors | 0 | 0 | **0** |
| ESLint errors | 0 | 0 | **0** |
| ESLint warnings | 0 | 0 | **0** |
| New dependencies | 0 | 0 | **0** |
| New migrations | 0 | 0 | **0** |

### 97-Scenario Architecture-Domain Matrix (Accepted)

| Domain | Count |
|---|---|
| PDB (Planning Day Boundary) | 11 |
| DST (Daylight Saving Time) | 10 |
| REC (Recurrence) | 13 |
| PRC (Planner Refresh Coordinator) | 9 |
| PBR (Planning Boundary Race) | 1 |
| TSE (Transaction/State Edge) | 8 |
| NE (Notification Edge) | 7 |
| LE (Location Edge) | 9 |
| JE (Journal Edge) | 8 |
| CAL (Calendar) | 8 |
| OE (Occurrence Edge) | 5 |
| SE (Settings Edge) | 8 |
| **TOTAL** | **97** |

All architecture IDs reconciled to concrete Jest tests.

### Critical Test Acceptance (Lead)

| Test | Semantic |
|---|---|
| PRC-02 | ADR-031 rejection semantics — inject sync rejection → fullRefresh throws → no READY, no downstream |
| PRC-09 | Resolved SyncIssues continue semantics — HorizonSyncResult with issues does NOT abort coordinator |
| PBR-01 | Stale Today token suppression |
| REC-13 | Partial EXECUTE failure + retry convergence |
| TSE-08 | Atomic PENDING deletion preserves terminal history |
| LE-09 | useLocation refresh token settlement |
| NE-07 | Terminal completion production path requests follow-up reconciliation |

### PC-1 Fallback Resolution

No M23 fix required. `RecurringHorizonSync` contains a redundant runtime fallback `delete(...)` but `TaskOccurrenceRepository.delete()` unconditionally delegates to `deleteIfPending(...)`. Both paths ultimately execute `WHERE id = ? AND status = 'PENDING'`. The fallback does NOT restore RISK-H8. Optional cleanup may occur in M24; not an M23 defect.

### ADR-031 Confirmation

ADR-031 remains intact:
- **Case A** — actual `recurringHorizonSync` Promise rejection → `PlannerRefreshCoordinator` rejects → downstream Today/lifecycle/notification/widget work does NOT execute.
- **Case B** — resolved `HorizonSyncResult` with `SyncIssues` → coordinator continues → READY may return with issue diagnostics.

No coordinator-wide mutex was added.

### Final Native Gate Status

| Gate | Area | Result | Evidence |
|---|---|---|---|
| GATE-1 | TaskCard TalkBack composite | ✅ PASS | Native Android API 36 emulator. TalkBack focus verified: checkbox separately from TaskCard composite content. Task completion activated through accessibility focus. |
| GATE-2 | PrayerHeader TalkBack composite | ✅ PASS | Native Android API 36 emulator. Single composite PrayerHeader TalkBack focus observed. TTS activity observed. |
| GATE-3 | All 6 modal accessibilityViewIsModal | ⛔ BLOCKED / NOT FULLY EXECUTED | CF-A10 PASS natively (focus containment, background unreachable, Back dismissal confirmed). CF-A6/A8/A12/A14/A16 blocked after Expo Dev Client / Metro transport failure. All six production modals specify accessibilityViewIsModal={true}. ModalAccessibility tests PASS. TEST INFRASTRUCTURE BLOCKER — NOT A CONFIRMED PRODUCT DEFECT. |
| GATE-4 | iOS widget gallery Small + Medium | ⛔ BLOCKED / NOT EXECUTED | Required iOS/macOS/physical-iOS environment unavailable. Carry to M24. |
| GATE-5 | iOS widget App Group data delivery | ⛔ BLOCKED / NOT EXECUTED | Required iOS native environment unavailable. Carry to M24. |
| GATE-6 | All 8 directional chevrons RTL flip | ⛔ BLOCKED / NOT FULLY EXECUTED | RTLIcons.test.tsx 12/12 PASS. All eight directional icons satisfy directional contract. System ar-SA confirmed on emulator. Native visual verification blocked: Expo Dev Client Metro multipart ProtocolException (`Expected leading [0-9a-fA-F] character but was 0xd`). TEST INFRASTRUCTURE BLOCKER — NOT A CONFIRMED PRODUCT DEFECT. |
| GATE-7 | Planning-day boundary Fajr/Midnight/Custom | ✅ PASS | AND-PD1 FAJR PASS, AND-PD2 MIDNIGHT PASS, AND-PD3 CUSTOM:19:00 PASS, AND-PD4 background→foreground PASS. |

### M23 Risk Disposition

| Risk | Disposition |
|---|---|
| RISK-H1 | RESOLVED |
| RISK-H2 | RESOLVED |
| RISK-H3 | RESOLVED by PC-3 / NE-07 |
| RISK-H7 | RESOLVED |
| RISK-H8 | RESOLVED by PC-1 / TSE-08 |
| RISK-M13 | RESOLVED by PC-2 / LE-09 |

Native BLOCKED states are evidence gaps, not confirmed defects.

### M24 Verification Carry-Forwards

The following native verification items are unresolved and carry to M24 as **verification blockers before release**:

1. **GATE-3 remaining modal native checks:** CF-A6 (JournalDeleteDialog), CF-A8 (JournalPrivacySheet), CF-A12 (EditScopeSheet), CF-A14 (PremiumLockedInfo), CF-A16 (Hijri Calendar override)
2. **GATE-4** — iOS widget gallery Small + Medium
3. **GATE-5** — iOS App Group / terminated-app widget delivery
4. **GATE-6** — Native app RTL visual verification

Do not describe these as confirmed application defects.

### M24 Release Blockers Discovered During M23 QA

#### RB-M24-BOOTSTRAP — CRITICAL / RELEASE BLOCKER

`migrateDatabase()` exists but is NOT invoked from normal application runtime before repository reads. On fresh install / `pm clear`: SQLite file is created but required tables are absent; first `user_settings` query fails; `BootstrapErrorView` is rendered; fresh installation is unusable without manually injecting schema.

**M24 requirement:** Ensure migrations execute during canonical application bootstrap before the first DB-dependent read.

#### RB-M24-ROOT — CRITICAL / RELEASE BLOCKER

`app/index.tsx` is absent. Normal root/default application launch reaches Expo Router `+not-found` instead of the application bootstrap/onboarding flow. Native QA required deep-linking directly to `/onboarding` as a workaround.

**M24 requirement:** Provide a valid root route compatible with the existing `RootGate` / onboarding/tabs bootstrap contract.

---

### Closure Pass Verification

```
git status --short:        (no output) — CLEAN
git rev-parse HEAD:        d73d8e634e708d4b20c05f0d82a4a77fc54d3477  (implementation commit)
git rev-parse origin/main: 5b1d913c2b4ed6b6a3ea5ff5ee059df937c6be11
ahead = 5 / behind = 0  (after closure commit)
working tree: CLEAN

Docs changed (closure pass):
  docs/M23_ARCHITECTURE.md — §25 closure record appended; status updated to CLOSED/APPROVED
  docs/DECISIONS.md        — M23 closure note appended
  docs/IMPLEMENTATION_STATUS.md — M23 row updated to CLOSED
  docs/CURRENT_MILESTONE.md — M23 status section updated to CLOSED

No source / test / dependency changes.
New dependencies: 0
New migrations: 0
Commit: docs(m23): close M23 after final QA -- APPROVED
```

---

*M23 CLOSED / APPROVED — CHATGPT TECHNICAL LEAD APPROVED 2026-09-19.*
