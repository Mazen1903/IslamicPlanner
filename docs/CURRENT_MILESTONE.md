# Current Milestone: M17 — Settings

> **Current State:** M17 CURRENT — ARCHITECTURE FROZEN — IMPLEMENTATION NOT STARTED
> **Previous Milestone:** M16 CLOSED / SONNET APPROVED
> **Milestone Status:** M17 — ARCHITECTURE FROZEN — IMPLEMENTATION NOT STARTED
> **Architecture Status:** FROZEN — `docs/M17_ARCHITECTURE.md`
> **Implementation Status:** NOT STARTED

---

## Prerequisites

All prerequisites for M17 are satisfied:

| Prerequisite | Status | Notes |
|---|---|---|
| M1 — Design System & Theme Tokens | ✅ CLOSED | Theme tokens, Button, Card, Toggle, Icon, ThemeProvider |
| M3 — Planning Day & Rollover Logic | ✅ CLOSED | PlanningDayConfig, rollover boundaries (Fajr, Midnight, Custom) |
| M8 — Hijri Calendar Core | ✅ CLOSED / OPUS APPROVED | Canonical HijriService, Umm al-Qura adapter, adjustments |
| M12 — Location / Travel / Timezone Behavior | ✅ CLOSED / SONNET APPROVED | UserSettingsRepository, AUTO/MANUAL location modes, offline city search |
| M13 — Notifications | ✅ CLOSED / SONNET APPROVED | Task reminders, notification scheduling, channel management |
| M15 — Journal Core & Privacy | ✅ CLOSED / SONNET APPROVED | AES-256-GCM encryption, SecureStore key management |
| M16 — Journal Experience / UI | ✅ CLOSED / SONNET APPROVED | Biometric lock preference, journal experience |

---

## 1. Milestone Goal

Deliver the consolidated user-facing Settings experience:
- App preferences and theme configuration
- Prayer calculation authority, juristic method (Asr), high-latitude rules, and manual prayer adjustments
- Planning day boundary configuration (Fajr / Midnight / Custom time)
- Hijri calendar configuration (global and month adjustments)
- Location mode configuration (AUTO GPS with non-prompting checks vs MANUAL city selection)
- Notification preferences and permissions
- Journal privacy / biometric lock toggle
- Data management (local data export/reset policies)
- About & attribution (GeoNames, Adhan, open-source acknowledgements)

*Note: Detailed architecture specification to be authored during M17 architecture phase. Implementation must NOT begin until architecture is frozen and approved.*

---

## 2. Completed Milestones Baseline

- **M15 — Journal Core & Privacy:** CLOSED / SONNET APPROVED (`71edcdf`, `5f3cb7a`)
- **M16 — Journal Experience / UI:** CLOSED / SONNET APPROVED (`b4e09c1`, `cb2428a`)
- **Baseline Tests:** 1092 / 1092 passing across 89 test suites. Clean TypeScript and ESLint.

---

## 3. Worship Deferment Reminder

- Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.
- `src/domain/worship/` empty stubs and dormant schema (`worship_item_settings`, `worshipItemKey`, source `WORSHIP`) are preserved.

---

## 4. Roadmap Context

```
M15 — Journal Core & Privacy       ✅ CLOSED / SONNET APPROVED
M16 — Journal Experience / UI      ✅ CLOSED / SONNET APPROVED
M17 — Settings                     ← CURRENT (PENDING — ARCHITECTURE NOT YET FROZEN)
M18 — Widgets (dev build required)
M19 — Premium entitlement scaffolding
M20 — Onboarding
M21 — Dark mode polish
M22 — Accessibility / RTL
M23 — QA + edge cases
M24 — Release preparation
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.
