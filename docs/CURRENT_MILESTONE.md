# Current Milestone: M22 — Accessibility / RTL

> **Current State:** M22 ARCHITECTURE HARDENED / FROZEN LOCALLY — PENDING LEAD REVIEW
> **Previous Milestone:** M21 CLOSED / SONNET APPROVED
> **Milestone Status:** M22 — CURRENT — ARCHITECTURE HARDENED, IMPLEMENTATION NOT STARTED
> **Architecture Status:** HARDENED AND FROZEN LOCALLY — 82-file audit complete; all 17 Lead corrections applied; ADR-030 authorized

---

## M20 Closure Summary

**M20 — Onboarding** is CLOSED / SONNET APPROVED as of 2026-09-18.

| Commit Role | Hash | Description |
|---|---|---|
| Architecture freeze | `54e03c0` | docs: freeze M20 architecture - onboarding gate + 4-step flow contract |
| Architecture bookkeeping | `2351859` | docs: record M20 architecture freeze commit hash in header |
| Architecture hardening | `fde4f7e` | docs: harden M20 onboarding architecture - resolve all 18 consistency issues |
| Final integration hardening | `966c5d6` | docs: finalize M20 onboarding integration contract |
| Implementation | `0c92614` | feat(onboarding): implement M20 first-run onboarding |
| Closure | See closure commit | docs: close M20 after independent review -- APPROVED |
**Independent Review Verdict:** APPROVED — UNCONDITIONAL
**Targeted Final Verification:** PASSED

**Final Verification:**
- 1374 / 1374 tests passing (118 / 118 suites)
- 0 failures, 0 skipped
- M19 baseline: 1296 tests / 113 suites
- Actual M20 delta: 78 new tests across 5 new test suites
- 0 TypeScript errors (`tsc --noEmit`)
- 0 ESLint errors, 0 ESLint warnings (`eslint src/ app/ --max-warnings=0`)
- Expo config valid (`npx expo config --json`)
- `expo-doctor` 20/21 (only known Expo SDK 57 patch advisory remains)
- 0 new database migrations (0000–0003 untouched)
- 0 new npm runtime/dev dependencies added

---

## M20 Delivered Capabilities

### Four-Screen Flow
1. **Screen 1 — YOUR DAY, CENTERED AROUND SALAH**: Educational intro presenting the five ordained prayers in canonical order (Fajr, Dhuhr, Asr, Maghrib, Isha). Zero DB writes, zero GPS prompts.
2. **Screen 2 — YOUR SCHEDULE ADAPTS AUTOMATICALLY**: Educational illustration demonstrating prayer-anchored adaptive scheduling with a soccer practice example. Zero scheduling engine calls, zero materialization.
3. **Screen 3 — SET YOUR PRAYER TIMES**: Functional location and calculation method setup on a single screen. Uses canonical `useLocation` hook and existing `LocationService`. Location is REQUIRED before proceeding; GPS is OPTIONAL with manual city fallback always available.
4. **Screen 4 — MAKE IT YOURS**: Theme selection (System / Light / Dark), setup summary displaying committed location and calculation method, and final "Start Planning" CTA that executes completion.

### Root Onboarding Gate
- `onboardingCompleted` column in `user_settings` is canonical single source of truth.
- Zero-flash synchronous render-time authorization:
  - Missing row (`null`) -> `PENDING`
  - `false` -> `PENDING`
  - `true` -> `COMPLETE`
  - DB failure -> `ERROR` (renders controlled `BootstrapErrorView` with `retry()`)
- In `LOADING` state, renders controlled `BootstrapLoadingView` (no naked `<Slot />`).
- Protected app routes (`/(tabs)/*`, etc.) never render before authorization is confirmed.
- Completed user visiting `/onboarding` is redirected to Today (`/(tabs)/today`).
- Uninitiated user on any route is redirected to `/onboarding`.

### Location
- Usable location is strictly required before onboarding can be completed.
- GPS is optional; manual city selection is always available.
- GPS permission is requested ONLY after an explicit user tap on "Use My Location".
- Zero GPS prompts on component mount.
- Active `locationMode` strictly determines usable location:
  - If `AUTO`: valid `lastAutoLatitude`, `lastAutoLongitude`, `lastKnownTimezone` required. Stale MANUAL snapshot cannot authorize completion.
  - If `MANUAL`: valid `manualLatitude`, `manualLongitude`, `manualTimezone`, `manualCityName` required. Stale AUTO snapshot cannot authorize completion.
- Existing valid location snapshot in SQLite can be reused.
- No Makkah/0,0/UTC fake fallback: a genuine location is always required.

### Calculation Method
- Newly selected MANUAL city recommends method via `REGION_METHOD_MAP[countryCode] ?? MWL`.
- AUTO location uses `recommendCalculationMethod()` (honestly falls back to MWL).
- Existing MANUAL location preserves `settings.calculationMethod` (does not overwrite user selection).
- Explicit user method selection is never automatically overridden.
- Advanced prayer calculation controls (high-latitude rules, juristic schools, minute adjustments) remain in Settings.

### Theme
- System / Light / Dark modes exposed on Screen 4.
- Explicit theme tap triggers `ThemeProvider.setThemeMode()`, changing live theme immediately and persisting via `RootLayout`.
- `OnboardingCoordinator` does not persist `themeMode`.

### Completion
- Dedicated `OnboardingCoordinator.complete()` service:
  - Validates active usable location.
  - Validates calculation method.
  - Persists `calculationMethod` to `UserSettingsRepository`.
  - Persists `onboardingCompleted: true` to `UserSettingsRepository`.
  - Triggers `PlannerRefreshCoordinator.fullRefresh()`.
  - Refresh failure after persistence returns `PERSISTED_REFRESH_FAILED` without rolling back completed state.
- `useOnboardingStore.markComplete()` is invoked synchronously before navigation to prevent gate redirect-back races.

### Back Navigation
- Screen 2 -> Screen 1
- Screen 3 -> Screen 2
- Screen 4 -> Screen 3
- Incomplete onboarding cannot escape into the normal app shell via back navigation.

---

## M20 Non-Goals & Subsystem Isolation

M20 strictly does **NOT** implement or expose:
- Premium upsell, pricing, or checkout
- `isPremium` modifications or queries
- Worship Suggestions toggle or logic (`worshipSuggestionsEnabled` untouched)
- Prayer Alerts toggle (`prayerAlertsEnabled` untouched)
- Notification permission onboarding
- Account creation, login, or cloud sync
- Journal encryption or privacy setup
- New widget types or widget-specific onboarding logic
- New temporal engine or materialization logic
- Reverse geocoding or external network calls
- New SQLite schema columns or database migrations
- New npm runtime or dev dependencies

### Subsystem Isolation Invariants
- **Entitlement remains isolated:** Zero entitlement imports or calls in onboarding screens, store, or coordinator.
- **Journal remains isolated:** Zero Journal crypto or repository imports.
- **Widgets remain isolated:** M18 widget snapshots unaffected.
- **Temporal engines remain untouched:** SchedulingEngine, MaterializationEngine, and RecurrenceEngine are never called from onboarding.
- **SettingsMutationCoordinator boundary maintained:** `SettingsMutationCoordinator` still explicitly forbids `onboardingCompleted` mutation; `OnboardingCoordinator` operates as the sole completion authority.

---

## M20 Test Coverage

- **78 new tests** added in M20 across **5 new test suites**:
  - `src/stores/__tests__/useOnboardingStore.test.ts` (13 tests: B-01..B-13)
  - `src/services/onboarding/__tests__/OnboardingCoordinator.test.ts` (11 tests: OC-01..OC-11)
  - `src/domain/onboarding/__tests__/OnboardingIsolation.test.ts` (17 tests: ISO-01..ISO-17)
  - `app/onboarding/__tests__/OnboardingScreen.test.tsx` (36 tests: F-*, L-*, C-*, P-*)
  - Regression suite compatibility confirmed across all previous milestone test suites
- **1374 total tests** across **118 test suites** project-wide (0 failures, 0 skipped).

---

## Roadmap Context

```
M18 — Widgets (dev build required)            ✅ CLOSED / SONNET APPROVED
M19 — Premium Entitlement Scaffolding          ✅ CLOSED / SONNET APPROVED
M20 — Onboarding                               ✅ CLOSED / SONNET APPROVED
M21 — Dark Mode Polish                         ✅ CLOSED / SONNET APPROVED
M22 — Accessibility / RTL                      --> CURRENT — ARCHITECTURE HARDENED / FROZEN / PENDING LEAD REVIEW
M23 — QA + Edge Cases                          --> NOT STARTED
M24 — Release Preparation                      --> NOT STARTED
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.

---

## M21 Closure Summary

**M21 — Dark Mode Polish** is CLOSED / SONNET APPROVED as of 2026-09-19.

| Commit Role | Hash | Description |
|---|---|---|
| Architecture freeze | `d27e176` | docs(m21): freeze M21 architecture - dark mode polish |
| Implementation | `3c7bfc5` | feat(m21): implement dark mode polish - semantic token compliance |
| Premature bookkeeping | `c49e17c` | docs(m21): record M21 closure (premature; superseded) |
| Review corrective implementation | `326f0cc` | fix(m21): complete dark mode polish review requirements |
| Final closure | *(closure commit)* | docs(m21): close M21 after independent review -- APPROVED |

**Independent Review Verdict:** APPROVED — UNCONDITIONAL (Sonnet)
**Scope:** 16 production files, full semantic token compliance, WCAG AA contrast, themeReady hydration gate, ThemedStatusBar
- **Prerequisites:** M1 (Design System), M7 (Today), M14 (Calendar), M16 (Journal), M17 (Settings), M20 (Onboarding).

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

---

## M22 Architecture Summary

**M22 — Accessibility / RTL** architecture is HARDENED AND FROZEN LOCALLY.

| Commit Role | Hash | Description |
|---|---|---|
| Architecture freeze | `20c68e2` | docs(m22): freeze M22 architecture - accessibility and RTL |
| Architecture hardening | *(hardening commit)* | docs(m22): harden accessibility and RTL architecture |

**Architecture Status:** HARDENED / FROZEN LOCALLY — PENDING LEAD REVIEW

### Scope

| Item | Count |
|---|---|
| Production files audited | 82 |
| Production files with planned changes | 43 |
| Accessibility issues (A-1..A-23) | 23 |
| RTL issues (RTL-1..RTL-6) | 6 |
| Total findings | 29 |
| HIGH severity | 6 |
| MEDIUM severity | 14 |
| LOW severity | 8 |
| OBSERVATION (no change) | 2 |

### Key Decisions Frozen

- **RTL scope:** Layout readiness only — no `I18nManager.forceRTL`, no locale system
- **Prayer tab RTL:** Natural flex mirroring (Fajr at logical start, reads chronologically in both LTR and RTL)
- **BottomNavBar RTL:** Natural flex mirroring; canonical route indices unchanged
- **Calendar RTL:** Natural flex mirroring; callback semantics (onPreviousMonth/onNextMonth) unchanged
- **Modal isolation:** All 6 Modals require `accessibilityViewIsModal={true}` + `accessibilityRole="header"` on title
- **Radio state:** `accessibilityRole="radio"` requires `accessibilityState={{ checked }}` (not `selected`)
- **`maxFontSizeMultiplier={2}`:** Calendar weekday labels + day cell numbers only (justified)
- **Icon `decorative` prop:** New prop on `Icon.tsx`; all labeled-Pressable icon callsites pass `decorative`
- **ADR-030:** Authorized — Accessibility Semantics and RTL Layout Contract

### Unresolved Blocking Items

**0 unresolved blocking architecture items.**

### Test Estimates

| Metric | Value |
|---|---|
| Test baseline | 1404 / 121 suites |
| Estimated new tests | 138 |
| Expected total | ~1542 |
| Minimum acceptable | ≥ 1504 |

### Native QA Carry-Forward

VoiceOver/TalkBack focus order verification, modal focus trapping on device, RTL visual layout on device, large text calendar layout — all carried to M23.

### Prerequisites for Implementation

- Lead review approval of this document
- No code changes before Lead approval
- 0 new dependencies, 0 migrations
