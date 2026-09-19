# Current Milestone: M20 — Onboarding

> **Current State:** M20 PENDING — ARCHITECTURE FROZEN
> **Previous Milestone:** M19 CLOSED / SONNET APPROVED
> **Milestone Status:** M20 — ARCHITECTURE FROZEN / PENDING IMPLEMENTATION
> **Architecture Status:** FROZEN — `docs/M20_ARCHITECTURE.md` authored and committed (2026-09-18)

---

## M19 Closure Summary

**M19 — Premium Entitlement Scaffolding** is CLOSED / SONNET APPROVED as of 2026-09-18.

| Commit Role | Hash | Description |
|---|---|---|
| Architecture freeze | `fa3c664` | docs: freeze M19 architecture - premium entitlement scaffolding contract |
| Opus architecture hardening | `29cd586` | docs: harden M19 entitlement architecture after Opus review |
| Implementation | `26e403f` | feat(premium): implement M19 entitlement scaffolding |
| Closure | See closure commit | docs: close M19 after independent review -- APPROVED |

**Final Verification:**
- 1296 / 1296 tests passing (113 / 113 suites)
- 0 TypeScript errors (`tsc --noEmit`)
- 0 ESLint errors, 0 ESLint warnings (`eslint src/ app/ --max-warnings=0`)
- Expo config valid (`npx expo config --json`)
- `expo-doctor` 20/21 (only known Expo SDK 57 patch advisory remains)
- 0 new database migrations (0000–0003 untouched)
- 0 new npm runtime/dev dependencies added

---

## M19 Delivered Capabilities

### Entitlement Model
- Typed `FREE` and `PREMIUM` tiers.
- Active Premium feature registry contains exactly:
  - `PLANNING_DAY_MIDNIGHT`
  - `PLANNING_DAY_CUSTOM`

### Entitlement Source
- `user_settings.isPremium` is the temporary local entitlement snapshot.
- Feature code queries `EntitlementService` (`hasFeature()`, `getSnapshot()`).
- `EntitlementRepository` is the sole data-layer adapter and is strictly read-only.
- Missing row (e.g. fresh install) resolves to `READY / FREE`.
- Real database failure resolves to `UNAVAILABLE`.

### Fail-Closed Security
- Entitlement errors never grant Premium.
- `hasFeature()` strictly returns `false` on `UNAVAILABLE` state.
- Premium coordinator differentiates:
  - `PREMIUM_REQUIRED` (user is FREE)
  - `ENTITLEMENT_UNAVAILABLE` (read failed)

### Planning Day
- `FAJR` remains universally free without entitlement query.
- `MIDNIGHT` requires Premium.
- `CUSTOM:HH:mm` requires Premium (persisted in canonical 24-hour representation).
- No auto-downgrade: existing Premium mode remains operational if entitlement becomes FREE.
- Entitlement controls authorization to CHANGE state, not how stored temporal state is interpreted.

### Mutation Boundary
- `PlanningDayMutationCoordinator` is the sole authorized path for mutating `planningDayStart`.
- `SettingsMutationCoordinator` explicitly rejects `planningDayStart` (removed from `TEMPORAL_ALLOWED_KEYS`).
- `SettingsMutationCoordinator` still strictly forbids `isPremium`.
- Strict pipeline: `validate` → `authorize` → `persist` → `fullRefresh`.
- Persistence success + refresh failure does not roll back persisted state.

### React Boundary
- `useEntitlement` hook (unmount-safe, fail-closed default).
- `usePlanningDayMutation` hook wrapping `PlanningDayMutationCoordinator`.
- No entitlement authorization logic in React presentation screens.
- No entitlement Context or background polling required in M19.

### Premium UI
- `PremiumBadge` and `PremiumLockedInfo` components.
- FREE users see locked Midnight/Custom with badge and info banner.
- Premium users can select Midnight and Custom directly.
- No pricing, checkout, fake upgrade button, or developer Premium toggle in UI.

### Subsystem Isolation
- Zero entitlement logic in temporal engines (`PlanningDayEngine`, `TodayTemporalInputProvider`, `temporalSettingsHelper`, `SchedulingEngine`).
- Zero entitlement logic in home screen widgets (M18 Small and Medium widgets remain free).
- Zero entitlement logic in Journal (encryption and privacy remain untouched).

---

## M19 Non-Goals / Future Billing Seam

M19 did **NOT** implement:
- StoreKit (iOS)
- Google Play Billing (Android)
- RevenueCat, Stripe, or any payment SDK
- Subscriptions, pricing, trials, or restore purchases
- User accounts, login, or cloud verification
- Server-side entitlement validation
- Subscription expiry behavior or automatic downgrade reconciliation

**Future billing seam:** Future billing integrations will replace the entitlement source behind the existing `EntitlementService` boundary without altering feature screens or freezing a one-time-purchase-only API.

---

## M19 Test Coverage

- **66 new tests** added in M19 across 7 test suites.
- **1296 total tests** across **113 test suites** project-wide.
- Coverage includes:
  - Fresh install entitlement resolution (`READY / FREE`)
  - `FREE`, `PREMIUM`, and `UNAVAILABLE` states
  - Fail-closed behavior on database error
  - `FAJR` authorization bypass (free without DB query)
  - `MIDNIGHT` and `CUSTOM` Premium authorization checks
  - Malformed `CUSTOM` format validation (`CUSTOM:25:00`, `CUSTOM:08:5`, etc.)
  - Persistence isolation
  - Refresh failure non-rollback semantics
  - `SettingsMutationCoordinator` bypass prevention (`planningDayStart` and `isPremium` rejected)
  - `useEntitlement` unmount safety and tier propagation
  - `usePlanningDayMutation` hook lifecycle and state transitions
  - `PremiumBadge` and `PremiumLockedInfo` rendering
  - Existing Premium stored-mode operational persistence (no-auto-downgrade)
  - Subsystem isolation guards (`EntitlementIsolation.test.ts`)
  - Full M18 widget and core regression suite

---

## Roadmap Context

```
M18 — Widgets (dev build required)            ✅ CLOSED / SONNET APPROVED
M19 — Premium Entitlement Scaffolding          ✅ CLOSED / SONNET APPROVED
M20 — Onboarding                               ← CURRENT / ARCHITECTURE FROZEN (implementation pending)
M21 — Dark Mode Polish
M22 — Accessibility / RTL
M23 — QA + Edge Cases
M24 — Release Preparation
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.

---

## M20 Overview & Scope

**M20 — Onboarding**
- **Status:** ARCHITECTURE FROZEN — implementation pending independent architecture review
- **Architecture doc:** `docs/M20_ARCHITECTURE.md`
- **ADR:** ADR-028
- **Prerequisites:** M1 (Design System), M2 (Prayer Calculation), M12 (Location), M17 (Settings)
- **Scope:** First-run onboarding flow — four steps: Welcome, Location (GPS/manual/skip), Calculation Method, Ready.
- **New files:** `src/stores/useOnboardingStore.ts`, `src/services/onboarding/OnboardingCoordinator.ts`, `src/services/onboarding/index.ts`, 4 test files.
- **Modified files:** `app/_layout.tsx` (gate), `app/onboarding/index.tsx` (4-step screen).
- **Constraints:** No GPS on mount · No silent mutation · No new deps · No new migrations · Zero entitlement/journal involvement.
- **Estimated new tests:** ~59 (OS-01..OS-10, OC-01..OC-14, SCR-01..SCR-23, OI-01..OI-12).
- **Rule:** DO NOT start implementation until M20 architecture receives independent review and is approved.

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
