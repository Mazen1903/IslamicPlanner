# Current Milestone: M18 — Widgets

> **Current State:** M18 CURRENT — PENDING — ARCHITECTURE NOT YET FROZEN
> **Previous Milestone:** M17 CLOSED / SONNET APPROVED
> **Milestone Status:** M18 — PENDING — ARCHITECTURE NOT YET FROZEN
> **Architecture Status:** NOT YET STARTED — Architecture must be authored and frozen before implementation begins

---

## M17 Closure Summary

**M17 — Settings** is CLOSED / SONNET APPROVED as of 2026-09-18.

| Commit Role | Hash |
|---|---|
| Architecture freeze | `00891c2` |
| Architecture hardening | `a2af7a3` |
| Implementation | `76ac716` |
| Closure + ADR-025 | See closure commit |

**Final verification:** 1171 / 1171 tests, 102 suites, 0 TypeScript errors, 0 ESLint errors, 0 new migrations, 0 new dependencies.

---

## Prerequisites for M18

M18 (Widgets) requires a native dev build. Deferred native dependencies will be installed at M18 only (per ADR-009).

| Prerequisite | Status | Notes |
|---|---|---|
| M1 — Design System & Theme Tokens | ✅ CLOSED | Theme tokens, Button, Card, Toggle, Icon, ThemeProvider |
| M7 — Today Screen | ✅ CLOSED / OPUS APPROVED | Prayer-centered adaptive planner |
| M17 — Settings | ✅ CLOSED / SONNET APPROVED | Full settings experience, theme bootstrap, prayer config |

---

## 1. Milestone Goal

M18 delivers widget integration for iOS and Android, surfacing prayer times and task summaries on the home screen. Requires a native development build.

*Architecture specification to be authored during M18 architecture phase. Implementation must NOT begin until architecture is frozen and approved.*

---

## 2. Completed Milestones Baseline

- **M16 — Journal Experience / UI:** CLOSED / SONNET APPROVED (`b4e09c1`, `cb2428a`)
- **M17 — Settings:** CLOSED / SONNET APPROVED (`76ac716`, closure commit)
- **Baseline Tests:** 1171 / 1171 passing across 102 test suites. Clean TypeScript and ESLint.

---

## 3. Worship Deferment Reminder

- Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.
- `src/domain/worship/` empty stubs and dormant schema (`worship_item_settings`, `worshipItemKey`, source `WORSHIP`) are preserved.

---

## 4. Roadmap Context

```
M15 — Journal Core & Privacy       ✅ CLOSED / SONNET APPROVED
M16 — Journal Experience / UI      ✅ CLOSED / SONNET APPROVED
M17 — Settings                     ✅ CLOSED / SONNET APPROVED
M18 — Widgets (dev build required) ← CURRENT (PENDING — ARCHITECTURE NOT YET FROZEN)
M19 — Premium entitlement scaffolding
M20 — Onboarding
M21 — Dark mode polish
M22 — Accessibility / RTL
M23 — QA + edge cases
M24 — Release preparation
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.

---

## 5. Native / Operational QA Carry-Forward

The following checks require physical devices or simulators and are carried forward as release/final-QA operational items. They do not reopen any closed milestone.

### M13 (Notifications)
- Real local notification delivery on device

### M15 (Journal Core)
- Real expo-crypto AES-256-GCM roundtrip on device
- Persisted encrypted Journal reopen/decrypt

### M16 (Journal Experience)
- Real fingerprint / Face ID on device
- Biometric failure/cancel behavior
- Background relock behavior
- Process-restart relock

### M17 (Settings)
- Cold-start theme hydration visual behavior
- Settings Stack back gesture
- Physical biometric enable/disable through Settings
- Prayer preview / stepper interaction on device
- Confirm exactly five permanent bottom destinations
- Settings persistence across process restart
