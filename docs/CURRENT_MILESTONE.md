# Current Milestone: M19 — Premium Entitlement Scaffolding

> **Current State:** M19 ARCHITECTURE FROZEN — PENDING OPUS INDEPENDENT REVIEW
> **Previous Milestone:** M18 CLOSED / SONNET APPROVED
> **Milestone Status:** M19 — ARCHITECTURE FROZEN — PENDING OPUS INDEPENDENT REVIEW
> **Architecture Status:** FROZEN — Authored 2026-09-18 — see docs/M19_ARCHITECTURE.md

---

## M18 Closure Summary

**M18 — Home Screen Widgets** is CLOSED / SONNET APPROVED as of 2026-09-18.

| Commit Role | Hash |
|---|---|
| Architecture freeze | `4128c93` |
| Implementation | `3cd5980` |
| Android WorkManager fix | `bc3b37c` |
| Closure | See closure commit |

**Final verification:** 1230 / 1230 tests, 104 suites, 0 TypeScript errors, 0 ESLint errors/warnings.
Android prebuild PASS. Android assembleDebug PASS (BUILD SUCCESSFUL). 0 new migrations.

**Dependencies added:**
- `expo-widgets ~57.0.20` (iOS WidgetKit integration)
- `@expo/ui ~57.0.19` (SwiftUI native primitives)
- `react-native-android-widget ^0.22.1` (Android AppWidget)

**Tooling correction:**
- `react-test-renderer ^1.3.0` (test-only, aligns with React version)

---

## M18 Delivered Capabilities

### Widget Scope
- Small widget (iOS + Android)
- Medium widget (iOS + Android)
- Large widget: deferred
- Widgets are read-only presentation surfaces

### Shared Widget Architecture
- `WidgetSnapshot` — privacy-safe, serializable data model
- `WidgetSnapshotBuilder` — pure TypeScript, uses canonical planner services
- `WidgetSyncCoordinator` — non-React singleton, best-effort push
- Reuses existing scheduling/planner engine; no second engine introduced

### iOS
- `expo-widgets` + `@expo/ui/swift-ui` exclusively (no React Native View/Text in widget files)
- Small widget: current prayer + next prayer + native WidgetKit countdown timer
- Medium widget: prayer panel + next 3 tasks
- `'widget'` directive enforced on all iOS widget files
- `createWidget()` + `updateTimeline()` for OS-managed refresh
- App Group / config plugin integration via `expo-widgets` plugin

### Android
- `react-native-android-widget` AppWidget framework
- Small widget: current prayer + next prayer (static local time)
- Medium widget: prayer panel + next 3 tasks
- Custom Expo Router entry point (`index.ts`) — `registerWidgetTaskHandler` before `expo-router/entry`
- `widgetTaskHandler` handles `WIDGET_ADDED`, `WIDGET_UPDATE`, `WIDGET_RESIZED`, `WIDGET_CLICK`, `WIDGET_DELETED`
- `requestWidgetUpdate` passes actual `React.createElement(WidgetComponent, snapshot)` — not null
- `updatePeriodMillis: 1800000` on both Android widget entries
- No fake live second-by-second countdown on Android

### Sync Triggers
- Full planner refresh (`PlannerRefreshCoordinator.fullRefresh`)
- Prayer transition (`useToday.ts` prayer boundary)
- Task completion (`useToday.completeTask`)
- All triggers use best-effort `.sync().catch(...)` — never throws to caller

### Privacy
- No Journal data, no Journal decryption
- No task notes, descriptions, or subtasks
- No raw coordinates or GPS requests
- `WidgetSnapshot` schema: prayer times + task titles + planning day key only

### SETUP_REQUIRED
- Calm neutral prompt — no fake Mecca/default location
- Handled in all paths: iOS widget, Android widget, widgetTaskHandler

### WorkManager Dependency Resolution
- `plugins/withAndroidWorkManagerResolution.js` — tracked CNG-compatible Expo config plugin
- Aligns all `androidx.work` artifacts to `2.8.1`
- Resolves `react-native-android-widget` (2.8.1) vs `expo-widgets/glance` (2.7.1) duplicate class conflict
- No generated Android edits committed (CNG policy maintained)
- Documented in `docs/DECISIONS.md` (ADR-026-H)

---

## M18 Commit History

```
4128c93  docs: freeze M18 architecture - widgets implementation contract
3cd5980  feat(widgets): implement M18 home screen widgets
bc3b37c  fix(widgets): align Android WorkManager dependencies
<closure commit>  docs: close M18 after independent review -- APPROVED
```

---

## M19 Prerequisites

| Prerequisite | Status |
|---|---|
| M1 — Design System | ✅ CLOSED |
| M7 — Today Screen | ✅ CLOSED / OPUS APPROVED |
| M17 — Settings | ✅ CLOSED / SONNET APPROVED |
| M18 — Widgets | ✅ CLOSED / SONNET APPROVED |

---

## Roadmap Context

```
M15 — Journal Core & Privacy       ✅ CLOSED / SONNET APPROVED
M16 — Journal Experience / UI      ✅ CLOSED / SONNET APPROVED
M17 — Settings                     ✅ CLOSED / SONNET APPROVED
M18 — Widgets (dev build required) ✅ CLOSED / SONNET APPROVED
M19 — Premium entitlement scaffolding  ← CURRENT (PENDING — ARCHITECTURE NOT YET FROZEN)
M20 — Onboarding
M21 — Dark mode polish
M22 — Accessibility / RTL
M23 — QA + edge cases
M24 — Release preparation
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.

---

## Native / Operational QA Carry-Forward

The following checks require physical devices or simulators and are carried forward as release/final-QA operational items. They do **not** reopen any closed milestone.

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

### M18 (Widgets) — Android Physical Runtime QA
- Install generated debug APK on Android device
- Add Small widget from launcher/widget gallery
- Add Medium widget from launcher/widget gallery
- Resize behavior verification
- Tap / deep-link (islamic-planner://today) behavior
- 30-minute system-driven update cycle
- App-driven task/prayer refresh propagation
- Reboot / launcher persistence (if practical)

### M18 (Widgets) — iOS Native QA
- macOS / EAS native compilation required
- WidgetKit target verification
- Small widget render in widget gallery
- Medium widget render in widget gallery
- Native countdown timer behavior
- App Group data propagation behavior
- Deep link behavior from widget tap

### M18 (Widgets) — Windows Build Toolchain Note
- Windows local Android native build required updating local `ninja.exe` to v1.12.1
  to resolve `MAX_PATH` (260 character) filename length failures.
- This is a host/toolchain operational item — NOT an application runtime dependency.
- `ninja.exe` must NOT be committed to the repository or distributed.
