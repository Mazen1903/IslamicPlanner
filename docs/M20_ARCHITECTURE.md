# M20 — Onboarding Architecture

> **Status:** ARCHITECTURE FROZEN — PENDING INDEPENDENT REVIEW
> **Authored:** 2026-09-18
> **Baseline commit:** 26e403f (M19 CLOSED)
> **Architecture freeze commit:** `54e03c0`
> **Milestone:** M20 — Onboarding
> **Prerequisite milestones:** M1 (Design System), M2 (Prayer Calculation), M12 (Location), M17 (Settings/UserSettingsRepository)

---

## 1. Scope

M20 introduces the first-run onboarding experience for new users. On a fresh install, `user_settings.onboardingCompleted` is absent (null row) or `false`. Until the user completes the onboarding flow, the normal app shell (Today, Calendar, Journal, Settings, +) is never rendered. Once the user finishes onboarding, `onboardingCompleted` is written to `true` and the app shell becomes accessible on all subsequent launches.

**M20 delivers exactly:**

1. A root-level **OnboardingGate** (via `useOnboardingStore` + `app/_layout.tsx` routing guard) that blocks the normal app shell until onboarding is complete.
2. A **four-step linear onboarding screen** (`app/onboarding/index.tsx`) with an internal step state machine:
   - **Step 1 — Welcome**: Value proposition. No settings written.
   - **Step 2 — Location**: GPS auto-detect or city search (MANUAL). Writes on explicit button tap only.
   - **Step 3 — Calculation Method**: Select from the full set of supported calculation methods. Writes on "Continue" tap only.
   - **Step 4 — Ready**: Summary confirmation. "Start Planning" calls `OnboardingCoordinator.complete()` and navigates to Today.
3. An **`OnboardingCoordinator`** service that writes `onboardingCompleted: true` and triggers `PlannerRefreshCoordinator.fullRefresh()`.
4. A **`useOnboardingStore`** Zustand store that synchronizes onboarding status across `_layout.tsx` and the onboarding screen without prop-drilling through Expo Router.

---

## 2. Non-Goals (Strict)

| Non-goal | Reason |
|---|---|
| Worship Suggestions toggle | Deferred post-M24; `worshipSuggestionsEnabled` is never touched in M20 |
| Prayer alerts toggle | `prayerAlertsEnabled` is never touched in M20; post-launch notification permission handled separately |
| Premium features or Entitlement | Onboarding is entirely free; no entitlement query, import, or reference |
| Journal encryption or privacy setup | Journal privacy is a Settings concern (M15/M16); not an onboarding concern |
| Account creation or login | No auth system exists |
| Cloud sync or server calls | Offline-first; all writes are local SQLite |
| New npm runtime dependencies | Zero runtime dependencies added |
| New database migrations | `onboardingCompleted` column already exists in `user_settings` schema (migration 0000) |
| Large widget or new widget types | M18 widgets are not affected |
| Calculation method auto-recommendation by region | Deferred; user makes an explicit choice from a labeled list |
| Haptic feedback design | Implementation-time decision; not architecture-level |
| Skip-to-end shortcut | Linear flow only; skipping individual steps within flow handled per step |
| New Expo Router file routes per onboarding step | Internal step state machine; no sub-routes |

---

## 3. Onboarding Terminology

| Term | Definition |
|---|---|
| **OnboardingStatus** | `'LOADING'` (DB read in flight) or `'PENDING'` (not yet completed) or `'COMPLETE'` (done) |
| **OnboardingGate** | The routing guard logic in `app/_layout.tsx` that redirects to `/onboarding` when status is `PENDING` |
| **OnboardingCoordinator** | The non-React service that writes `onboardingCompleted: true` and triggers a full planner refresh |
| **useOnboardingStore** | The Zustand store that exposes `status`, `initialize()`, and `markComplete()` |
| **Step state machine** | Internal `useState` within `app/onboarding/index.tsx` tracking which of the four steps is active |
| **Write-on-tap** | The constraint that data is only persisted when the user explicitly presses a button; never during render or re-render |
| **No GPS on mount** | `requestForegroundPermissionsAsync()` is NEVER called from a `useEffect`, `componentDidMount`, or any automatic lifecycle phase; only from an explicit button tap handler |

---

## 4. Source of Truth: `onboardingCompleted`

`user_settings.onboardingCompleted` (BOOLEAN NOT NULL DEFAULT false) is the canonical completion flag.

| Condition | Resolved status |
|---|---|
| No `user_settings` row exists (fresh install) | `PENDING` |
| `onboardingCompleted = false` | `PENDING` |
| `onboardingCompleted = true` | `COMPLETE` |
| `get()` throws (DB infrastructure failure) | `PENDING` (fail-open: re-show onboarding rather than crash or block) |

**Critical distinction:** A missing `user_settings` row is the normal fresh-install state. No row != DB error. Only a thrown exception (infrastructure failure) produces a DB error response. Unlike the entitlement fail-closed pattern (ADR-027), the onboarding gate fails **open** (re-shows onboarding) because the consequence of incorrectly blocking the app is worse than the consequence of incorrectly re-showing onboarding.

`OnboardingCoordinator` is the **only** code that may write `onboardingCompleted: true`. It writes directly to `UserSettingsRepository.upsert()` — it does **not** go through `SettingsMutationCoordinator`, which correctly lists `onboardingCompleted` in `FORBIDDEN_PATCH_KEYS`.

---

## 5. Four-Step Onboarding Flow

### Step 1 — Welcome

**UI contract:**
- App name + tagline (e.g., "Your day, organized around prayer")
- Short value proposition sentence (2-3 lines maximum)
- Single primary CTA: "Get Started"

**Data contract:**
- No settings read beyond what the gate already resolved.
- No settings written on this step under any condition.
- No network calls. No GPS calls. No DB writes.

**Navigation:** Tapping "Get Started" advances to Step 2 (Location).

---

### Step 2 — Location

**UI contract:**
- Two mutually exclusive choices:
  - **"Use My Location"** — triggers GPS auto-detect
  - **City search field** — triggers MANUAL city selection
- **"Skip for now"** link — advances to Step 3 without writing any location data.

**Data contract — Auto location:**
- Tapping "Use My Location" calls `LocationService.requestAndSaveAutoLocation()` (which internally calls `requestForegroundPermissionsAsync()` — this is the ONLY permitted place this call can originate from onboarding).
- On success: `UserSettingsRepository.saveAutoLocation()` is called automatically by `LocationService`. Advances to Step 3.
- On permission denied: show inline error message. Do NOT redirect. Allow user to switch to city search or skip.
- On GPS timeout/error: show inline error message. Allow retry or switch to city search.

**Data contract — Manual location:**
- City dataset (`src/domain/location/citySearch.ts` + `cityLoader.ts`) is loaded lazily — only when the user starts typing (minimum 2 characters).
- Do NOT load the city dataset during component mount or Step 1/Welcome rendering.
- On city selected: `UserSettingsRepository.saveManualLocation()` is called. Advances to Step 3.

**Data contract — Skip:**
- No DB write of any kind.
- Advances to Step 3.
- Consequence: Today screen shows `SETUP_REQUIRED` after onboarding. This is documented, expected, and handled gracefully by the existing `TodayOrchestrator` pipeline.

**GPS guard (non-negotiable):**
- `requestForegroundPermissionsAsync()` MUST NOT be called in any `useEffect`, `useMemo`, or computed value.
- It MUST ONLY be called inside the "Use My Location" button's `onPress` handler.
- This constraint is explicitly covered by isolation tests (see Section 15).

---

### Step 3 — Calculation Method

**UI contract:**
- List of all supported calculation methods from `SettingsMutationCoordinator.VALID_CALCULATION_METHODS`:
  `MWL`, `ISNA`, `EGYPT`, `MAKKAH`, `KARACHI`, `TEHRAN`, `SINGAPORE`, `TURKEY`, `DUBAI`, `QATAR`, `KUWAIT`, `MOONSIGHTING`
- Each row shows the method key and a human-readable label (reuse existing calculation method labels from `src/domain/prayer/calculationMethods.ts`).
- Default pre-selection: `MWL` (Muslim World League), matching the `UserSettingsRepository.upsert()` default.
- Single primary CTA: "Continue"

**Data contract:**
- Selection is held in local component state only — it is NOT written to DB on selection change.
- On "Continue" tap: `UserSettingsRepository.upsert({ calculationMethod: selectedMethod })` is called directly (not through `SettingsMutationCoordinator`, which would trigger a premature `fullRefresh` before the user completes onboarding).
- On write success: advances to Step 4.
- On write failure: show inline error. Allow retry. Do NOT advance.

**Why bypass `SettingsMutationCoordinator`?**
`SettingsMutationCoordinator.applyTemporalSettings()` calls `PlannerRefreshCoordinator.fullRefresh()` after every temporal mutation. During onboarding Step 3, the user has not yet confirmed completion. A premature full refresh at Step 3 (before `onboardingCompleted = true`) would potentially trigger the Today pipeline with an incomplete configuration. The `OnboardingCoordinator.complete()` at Step 4 is the single, authoritative full refresh trigger for all settings committed during onboarding.

---

### Step 4 — Ready

**UI contract:**
- Confirmation screen: "You're all set!" (or similar)
- Summary of what was configured (location name if set, calculation method selected)
- Single primary CTA: "Start Planning"

**Data contract:**
- Tapping "Start Planning" calls `OnboardingCoordinator.complete()`.
- On `{ status: 'SUCCESS' }`: call `useOnboardingStore.getState().markComplete()`, then `router.replace('/(tabs)/today')`.
- On `{ status: 'PERSISTED_REFRESH_FAILED' }`: `onboardingCompleted` is already `true` (persisted). Call `useOnboardingStore.getState().markComplete()`, then `router.replace('/(tabs)/today')`. Log the refresh failure — do NOT block navigation.
- On `{ status: 'FAILED' }`: show inline error. Do NOT call `markComplete()`. Do NOT navigate. Allow retry.

**Navigation after completion:**
The route transition from `/onboarding` to `/(tabs)/today` is safe because `useOnboardingStore.getState().markComplete()` is called **before** `router.replace()`. By the time the gate re-evaluates (on re-render triggered by store update), the status is already `COMPLETE`.

---

## 6. OnboardingGate — Root Routing Strategy

### Gate location: `app/_layout.tsx`

The gate is implemented using Expo Router's `useSegments()` + `useRouter()` pattern, consistent with the established auth/onboarding gate pattern for Expo Router apps.

Logical structure (not implementation pseudocode):

```
// 1. On mount: initialize onboarding store (reads DB once)
useEffect(() => {
  useOnboardingStore.getState().initialize();
}, []);

const onboardingStatus = useOnboardingStore(s => s.status);
const segments = useSegments();
const router = useRouter();

// 2. Gate effect: redirect based on status + current segment
useEffect(() => {
  if (onboardingStatus === 'LOADING') return;         // wait for DB read

  const inOnboarding = segments[0] === 'onboarding';

  if (onboardingStatus === 'PENDING' && !inOnboarding) {
    router.replace('/onboarding');
  } else if (onboardingStatus === 'COMPLETE' && inOnboarding) {
    router.replace('/(tabs)/today');
  }
}, [onboardingStatus, segments, router]);

// 3. Rendering: Slot always rendered — gate is purely navigational, not a conditional render
```

**Critical invariant:** The gate never conditionally suppresses `<Slot />`. It uses `router.replace()` for all redirections. This prevents blank/flash states and is consistent with Expo Router's `<Slot>`-based architecture.

**No-flash guarantee:** The gate's `useEffect` fires synchronously after the first render. The `initialize()` call is fast (single SQLite SELECT). On first launch (no DB row), the transition from `LOADING` to `PENDING` to redirect to `/onboarding` happens before the user perceives the initial route.

**Gate on subsequent launches (`onboardingCompleted = true`):** `initialize()` reads `true` from DB — sets status to `COMPLETE` — gate effect fires, `inOnboarding = false`, no redirect needed. Normal app launches directly to `/(tabs)/today` (the default tab route).

---

## 7. `useOnboardingStore` Contract

```typescript
// src/stores/useOnboardingStore.ts

export type OnboardingStatus = 'LOADING' | 'PENDING' | 'COMPLETE';

interface OnboardingStoreState {
  /**
   * Current resolved onboarding status.
   * - LOADING: DB read in flight (initial state on app launch).
   * - PENDING: onboardingCompleted is false or row is absent.
   * - COMPLETE: onboardingCompleted is true.
   */
  status: OnboardingStatus;

  /**
   * Reads user_settings.onboardingCompleted from DB and resolves status.
   * Called once from app/_layout.tsx on mount.
   * On DB read failure: resolves to PENDING (fail-open).
   */
  initialize: () => Promise<void>;

  /**
   * Synchronously marks status as COMPLETE in-memory.
   * Called by the onboarding screen after OnboardingCoordinator.complete() succeeds.
   * MUST be called BEFORE router.replace() to prevent a gate redirect-back race.
   */
  markComplete: () => void;
}
```

**Invariants:**
- `initialize()` is idempotent and safe to call multiple times (subsequent calls are no-ops if status is already `COMPLETE`).
- `markComplete()` is a synchronous Zustand state update — guaranteed to complete before the calling code proceeds.
- No subscription to DB changes — status is a one-time boot read plus in-memory updates.
- The store does NOT import from `EntitlementService`, `JournalService`, `WidgetSyncCoordinator`, or any Premium/Journal domain.

**Imperative store access pattern (consistent with existing project conventions):**

In the onboarding screen, after `OnboardingCoordinator.complete()` succeeds:
```
useOnboardingStore.getState().markComplete();
router.replace('/(tabs)/today');
```

In `app/_layout.tsx` on mount:
```
useOnboardingStore.getState().initialize();
```

This is exactly the pattern used by `useLocation.ts` with `useTodayStore.getState().startRefresh()` / `commitRefresh()`.

---

## 8. `OnboardingCoordinator` Contract

```typescript
// src/services/onboarding/OnboardingCoordinator.ts

export type OnboardingCompleteResult =
  | { status: 'SUCCESS' }
  | { status: 'PERSISTED_REFRESH_FAILED'; error: string }
  | { status: 'FAILED'; error: string };

export class OnboardingCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = userSettingsRepository,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator = defaultPlannerRefreshCoordinator
  ) {}

  /**
   * Marks onboarding as complete and triggers a full planner refresh.
   *
   * Step A — Persistence: writes { onboardingCompleted: true } to user_settings.
   *   On failure: returns FAILED immediately. No refresh triggered.
   *
   * Step B — Refresh: calls PlannerRefreshCoordinator.fullRefresh().
   *   On failure: returns PERSISTED_REFRESH_FAILED.
   *     onboardingCompleted is already true — navigation proceeds.
   *     The Today screen will trigger its own refresh on mount.
   *   On success: returns SUCCESS.
   */
  async complete(): Promise<OnboardingCompleteResult>;
}

export const onboardingCoordinator = new OnboardingCoordinator();
```

**Strict write isolation for `complete()`:**

`OnboardingCoordinator.complete()` calls `userSettingsRepository.upsert()` with exactly:
```
{ onboardingCompleted: true }
```
No other fields. It MUST NOT write:
- `calculationMethod` (written in Step 3 by the screen directly)
- `locationMode`, `manualLatitude`, `manualLongitude`, etc. (written in Step 2 by `LocationService`)
- `isPremium` (reserved for future billing adapter)
- `worshipSuggestionsEnabled` (deferred)
- `prayerAlertsEnabled` (deferred)
- `planningDayStart` (not an onboarding concern)
- `themeMode` (not an onboarding concern)

**No `SettingsMutationCoordinator` involvement:** `OnboardingCoordinator` MUST NOT import `SettingsMutationCoordinator`.

**No entitlement involvement:** `OnboardingCoordinator` MUST NOT import anything from `src/domain/entitlement/`.

**No Journal involvement:** `OnboardingCoordinator` MUST NOT import anything from `src/services/journal/` or `src/domain/journal/`.

---

## 9. Step State Machine

The onboarding screen uses a single internal `useState` step tracker:

```typescript
type OnboardingStep = 'WELCOME' | 'LOCATION' | 'CALCULATION' | 'READY';
```

| Step | Advances to | On | Data written |
|---|---|---|---|
| `WELCOME` | `LOCATION` | "Get Started" tapped | None |
| `LOCATION` (auto path) | `CALCULATION` | Location successfully saved | `saveAutoLocation()` via `LocationService` |
| `LOCATION` (manual path) | `CALCULATION` | City selected | `saveManualLocation()` via `UserSettingsRepository` |
| `LOCATION` (skip) | `CALCULATION` | "Skip for now" tapped | None |
| `CALCULATION` | `READY` | "Continue" tapped AND write succeeds | `upsert({ calculationMethod })` directly |
| `READY` | (exit — Today) | "Start Planning" tapped AND `complete()` succeeds | `upsert({ onboardingCompleted: true })` |

**No back navigation:** There is no "Back" button between steps. The onboarding screen has no back stack. `app/onboarding/index.tsx` uses a `Stack.Screen` with `headerShown: false` and `gestureEnabled: false`.

**Progress indicator:** An optional visual progress indicator (step dots or a slim progress bar) is implementation-level detail, not architecture-level. It MUST reflect the 4-step count and NOT include any deferred steps.

---

## 10. Location Step — Detailed Contracts

### Auto-location path

The existing `LocationService` is reused without modification. The onboarding screen calls it identically to how `useLocation.ts` calls it.

```
// Called only from "Use My Location" onPress handler
const result = await locationService.requestAndSaveAutoLocation();
```

`LocationService.requestAndSaveAutoLocation()` internally calls `requestForegroundPermissionsAsync()`. This is the ONLY permitted origination of that call within the onboarding flow. It MUST NOT be called from:
- `useEffect`
- `useMemo`
- `useCallback` that fires during mount
- Any computed value or initialization function

### Manual-location path

City dataset loading follows the exact same lazy-load pattern used by the M17 Settings prayer-location screen:

```
// Called only when user input length >= 2
import { cityLoader } from '@/domain/location/cityLoader';
import { searchCities } from '@/domain/location/citySearch';

const results = searchCities(await cityLoader.load(), query);
```

The city dataset MUST NOT be loaded during the WELCOME step or on the component's initial render.

### Skip path

No DB writes. No `LocationService` calls. The step simply advances. The consequence (Today shows `SETUP_REQUIRED`) is known, expected, and handled.

---

## 11. Calculation Method Step — Detailed Contract

The list of valid calculation methods is drawn directly from `SettingsMutationCoordinator`'s `VALID_CALCULATION_METHODS` set to ensure consistency. Human-readable labels are sourced from the existing `calculationMethods.ts` constants.

The write on "Continue" tap:
```
await userSettingsRepository.upsert({ calculationMethod: selectedMethod });
```

This write bypasses `SettingsMutationCoordinator` (no full refresh triggered). The single, consolidated full refresh happens in `OnboardingCoordinator.complete()` at Step 4.

If the user skips location (Step 2) but selects a calculation method (Step 3), the data is correctly persisted. When they eventually set their location via Settings, the prayer engine will use the persisted calculation method automatically.

---

## 12. File Inventory

### New files

| File | Purpose |
|---|---|
| `docs/M20_ARCHITECTURE.md` | This architecture specification (frozen) |
| `src/stores/useOnboardingStore.ts` | Zustand store: `status`, `initialize()`, `markComplete()` |
| `src/services/onboarding/OnboardingCoordinator.ts` | Writes `onboardingCompleted: true` + triggers `fullRefresh()` |
| `src/services/onboarding/index.ts` | Public barrel export |
| `src/stores/__tests__/useOnboardingStore.test.ts` | Store unit tests (OS-* test IDs) |
| `src/services/onboarding/__tests__/OnboardingCoordinator.test.ts` | Coordinator unit tests (OC-* test IDs) |
| `app/onboarding/__tests__/OnboardingScreen.test.tsx` | Screen integration tests (SCR-* test IDs) |
| `src/domain/onboarding/__tests__/OnboardingIsolation.test.ts` | Isolation guard tests (OI-* test IDs) |

### Modified files

| File | What changes |
|---|---|
| `app/_layout.tsx` | Add `useOnboardingStore` initialization + gate `useEffect` (useSegments + router.replace) |
| `app/onboarding/index.tsx` | Replace placeholder with the four-step onboarding screen |

### Documentation updated

| File | What changes |
|---|---|
| `docs/M20_ARCHITECTURE.md` | NEW — this document |
| `docs/ARCHITECTURE_INDEX.md` | Add section 23: Onboarding |
| `docs/DECISIONS.md` | Add ADR-028 |
| `docs/CURRENT_MILESTONE.md` | Update status to ARCHITECTURE FROZEN |

### Files explicitly NOT modified

| File | Reason |
|---|---|
| `src/data/schema.ts` | `onboardingCompleted` column already exists |
| `src/data/migrations/` | No new migrations required |
| `src/services/SettingsMutationCoordinator.ts` | `FORBIDDEN_PATCH_KEYS` already includes `onboardingCompleted` — no change needed |
| `src/domain/entitlement/` | Zero entitlement involvement |
| `src/services/journal/` | Zero journal involvement |
| `src/services/widget/` | Widgets not affected by onboarding |
| `src/services/PlannerRefreshCoordinator.ts` | No changes; consumed as-is by `OnboardingCoordinator` |

---

## 13. Strict Isolation Rules

The following rules are enforced by the `OnboardingIsolation.test.ts` test suite:

1. `OnboardingCoordinator` MUST NOT import from `src/domain/entitlement/`.
2. `OnboardingCoordinator` MUST NOT import from `src/services/journal/`.
3. `OnboardingCoordinator` MUST NOT import from `src/domain/worship/`.
4. `OnboardingCoordinator` MUST NOT import `SettingsMutationCoordinator`.
5. `OnboardingCoordinator` MUST NOT import `PlanningDayMutationCoordinator`.
6. `useOnboardingStore` MUST NOT import from `src/domain/entitlement/`.
7. `useOnboardingStore` MUST NOT import from `src/services/journal/`.
8. `OnboardingCoordinator.complete()` patch MUST NOT include `isPremium`.
9. `OnboardingCoordinator.complete()` patch MUST NOT include `worshipSuggestionsEnabled`.
10. `OnboardingCoordinator.complete()` patch MUST NOT include `prayerAlertsEnabled`.
11. `OnboardingCoordinator.complete()` patch MUST NOT include `calculationMethod`, `locationMode`, or any location fields.
12. The onboarding screen MUST NOT import from `src/domain/entitlement/`.
13. `PlanningDayEngine.ts`, `TodayTemporalInputProvider.ts`, and `SchedulingEngine.ts` are NOT modified by M20.

---

## 14. Service Reuse Map

| Existing service/module | How M20 reuses it | Changes required |
|---|---|---|
| `UserSettingsRepository` | Step 2 (saveManualLocation), Step 3 (upsert calculationMethod), `OnboardingCoordinator.complete()` (upsert onboardingCompleted) | None |
| `LocationService` | Step 2 auto-location (requestAndSaveAutoLocation) | None |
| `cityLoader` + `citySearch` | Step 2 MANUAL city search (lazy-loaded) | None |
| `PlannerRefreshCoordinator` | `OnboardingCoordinator.complete()` triggers `fullRefresh()` | None |
| Design system tokens (`src/theme/`) | Onboarding UI styling | None |
| Prayer calculation method labels | Step 3 method list labels | None |

Zero new npm runtime dependencies. Zero new native modules.

---

## 15. Test Plan

### `src/stores/__tests__/useOnboardingStore.test.ts` — OS-* group (~10 tests)

| ID | Description |
|---|---|
| OS-01 | Initial status is `LOADING` |
| OS-02 | `initialize()` sets `COMPLETE` when `onboardingCompleted === true` |
| OS-03 | `initialize()` sets `PENDING` when `onboardingCompleted === false` |
| OS-04 | `initialize()` sets `PENDING` when DB row is absent (null) |
| OS-05 | `initialize()` sets `PENDING` (fail-open) when `get()` throws |
| OS-06 | `markComplete()` synchronously sets status to `COMPLETE` |
| OS-07 | `markComplete()` is idempotent (calling twice stays `COMPLETE`) |
| OS-08 | `initialize()` is idempotent after status is `COMPLETE` |
| OS-09 | Store does not import from entitlement or journal domains |
| OS-10 | Accepts injected `UserSettingsRepository` for isolation in tests |

### `src/services/onboarding/__tests__/OnboardingCoordinator.test.ts` — OC-* group (~14 tests)

| ID | Description |
|---|---|
| OC-01 | `complete()` writes exactly `{ onboardingCompleted: true }` via `upsert()` |
| OC-02 | `complete()` calls `plannerRefreshCoordinator.fullRefresh()` after successful persist |
| OC-03 | `complete()` returns `{ status: 'SUCCESS' }` on happy path |
| OC-04 | `complete()` returns `{ status: 'FAILED' }` when `upsert()` throws |
| OC-05 | On `upsert()` failure, `fullRefresh()` is NOT called |
| OC-06 | `complete()` returns `{ status: 'PERSISTED_REFRESH_FAILED' }` when `upsert()` succeeds but `fullRefresh()` throws |
| OC-07 | `complete()` does NOT write `calculationMethod` |
| OC-08 | `complete()` does NOT write `worshipSuggestionsEnabled` |
| OC-09 | `complete()` does NOT write `prayerAlertsEnabled` |
| OC-10 | `complete()` does NOT write `isPremium` |
| OC-11 | `complete()` does NOT write any location fields |
| OC-12 | Constructor accepts DI for `UserSettingsRepository` and `PlannerRefreshCoordinator` |
| OC-13 | `complete()` does NOT import or call `SettingsMutationCoordinator` |
| OC-14 | Exported singleton `onboardingCoordinator` is an instance of `OnboardingCoordinator` |

### `app/onboarding/__tests__/OnboardingScreen.test.tsx` — SCR-* group (~23 tests)

| ID | Description |
|---|---|
| SCR-01 | Renders WELCOME step on initial mount |
| SCR-02 | "Get Started" button advances to LOCATION step |
| SCR-03 | LOCATION step renders "Use My Location" button |
| SCR-04 | `requestForegroundPermissionsAsync` is NOT called during component mount |
| SCR-05 | `requestForegroundPermissionsAsync` is NOT called during render or re-render |
| SCR-06 | `requestForegroundPermissionsAsync` IS called when "Use My Location" is explicitly tapped |
| SCR-07 | City dataset is NOT loaded during WELCOME step |
| SCR-08 | City dataset is NOT loaded during LOCATION step initial render |
| SCR-09 | City dataset IS loaded lazily when user types >= 2 characters in city search |
| SCR-10 | Selecting a city calls `saveManualLocation` and advances to CALCULATION |
| SCR-11 | "Skip for now" in LOCATION step advances to CALCULATION without any DB write |
| SCR-12 | CALCULATION step renders calculation method list with MWL pre-selected |
| SCR-13 | Selecting a different method updates local state (no DB write on selection) |
| SCR-14 | "Continue" on CALCULATION step writes `calculationMethod` via `upsert()` |
| SCR-15 | READY step renders "Start Planning" button |
| SCR-16 | "Start Planning" calls `OnboardingCoordinator.complete()` |
| SCR-17 | On `SUCCESS`, calls `useOnboardingStore.getState().markComplete()` |
| SCR-18 | On `SUCCESS`, calls `router.replace('/(tabs)/today')` after `markComplete()` |
| SCR-19 | On `PERSISTED_REFRESH_FAILED`, still calls `markComplete()` and navigates |
| SCR-20 | On `FAILED`, does NOT call `markComplete()` and does NOT navigate |
| SCR-21 | No silent mutation occurs on any step render or re-render |
| SCR-22 | Screen does NOT import from `src/domain/entitlement/` |
| SCR-23 | Screen does NOT import from `src/services/journal/` |

### `src/domain/onboarding/__tests__/OnboardingIsolation.test.ts` — OI-* group (~12 tests)

| ID | Description |
|---|---|
| OI-01 | `OnboardingCoordinator` source contains no import from `src/domain/entitlement/` |
| OI-02 | `OnboardingCoordinator` source contains no import from `src/services/journal/` |
| OI-03 | `OnboardingCoordinator` source contains no import from `src/domain/worship/` |
| OI-04 | `OnboardingCoordinator` source contains no import of `SettingsMutationCoordinator` |
| OI-05 | `OnboardingCoordinator` source contains no import of `PlanningDayMutationCoordinator` |
| OI-06 | `useOnboardingStore` source contains no import from `src/domain/entitlement/` |
| OI-07 | `useOnboardingStore` source contains no import from `src/services/journal/` |
| OI-08 | `OnboardingCoordinator.complete()` upsert arg has no `isPremium` key |
| OI-09 | `OnboardingCoordinator.complete()` upsert arg has no `worshipSuggestionsEnabled` key |
| OI-10 | `OnboardingCoordinator.complete()` upsert arg has no `prayerAlertsEnabled` key |
| OI-11 | `OnboardingCoordinator.complete()` upsert arg has no `calculationMethod` key |
| OI-12 | `OnboardingCoordinator.complete()` upsert arg has no location field keys |

**Estimated total new tests: ~59** (10 OS + 14 OC + 23 SCR + 12 OI)

---

## 16. Verification Criteria

### Architecture freeze criteria (this commit)

1. `docs/M20_ARCHITECTURE.md` committed, no open TODOs remain.
2. `docs/ARCHITECTURE_INDEX.md` section 23 (Onboarding) added and consistent with this document.
3. `docs/DECISIONS.md` ADR-028 appended.
4. `docs/CURRENT_MILESTONE.md` status updated to `ARCHITECTURE FROZEN`.
5. All four non-goals confirmed: no new deps, no new migrations, no entitlement, no journal.

### Implementation closure criteria (not this commit)

6. `npx tsc --noEmit` exits with 0 errors.
7. `eslint src/ app/ --max-warnings=0` exits with 0 errors/warnings.
8. All ~59 new tests pass (`jest --testPathPattern=OnboardingStore|OnboardingCoordinator|OnboardingScreen|OnboardingIsolation`).
9. Full regression suite passes (all existing tests continue to pass).
10. No new `user_settings` migrations.
11. No new npm runtime dependencies (`package.json` `dependencies` unchanged).
12. `expo-doctor` advisory count unchanged from M19 baseline.

---

## 17. Open Questions

None. All architectural decisions are resolved in this document.

The following are implementation-level decisions (not blocking architecture freeze):

- Visual design of the progress indicator (dots vs. progress bar vs. none)
- Exact wording of step titles and CTAs
- Whether to show a loading spinner during Step 2 GPS detection
- Exact error message copy for permission denial, GPS timeout, DB write failure
- Whether Step 4 "Ready" shows the configured city name or just the location mode label

These are resolved by the implementer and do not require architecture re-review.
