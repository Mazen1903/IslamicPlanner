# M20 — Onboarding Architecture

> **Status:** ARCHITECTURE HARDENED — READY FOR IMPLEMENTATION
> **Authored:** 2026-09-18
> **Architecture freeze commit:** `54e03c0`
> **Header bookkeeping commit:** `2351859`
> **Hardening commit:** see `git log --oneline -1`
> **Baseline commit:** `f787191` (M19 CLOSED — f78719113e3d8ec3272cfb50fdc292ada04d4145)
> **Milestone:** M20 — Onboarding
> **Prerequisite milestones:** M1 (Design System), M2 (Prayer Calculation), M12 (Location), M17 (Settings/UserSettingsRepository)

---

## 1. Scope

M20 introduces the first-run onboarding experience for new users. On a fresh install, `user_settings.onboardingCompleted` is absent (null row) or `false`. Until the user completes the onboarding flow, the normal app shell (Today, Calendar, Journal, Settings, +) is **never rendered**. Once the user finishes onboarding, `onboardingCompleted` is written to `true` and the app shell becomes accessible on all subsequent launches.

**M20 delivers exactly:**

1. A root-level **OnboardingGate** (via `useOnboardingStore` + `app/_layout.tsx` routing guard) that blocks the normal app shell until onboarding is complete — with zero-flash guarantee via controlled rendering.
2. A **four-screen linear onboarding flow** (`app/onboarding/index.tsx`) with an internal step state machine:
   - **Screen 1 — YOUR DAY, CENTERED AROUND SALAH**: Educational only. No writes.
   - **Screen 2 — YOUR SCHEDULE ADAPTS AUTOMATICALLY**: Educational only. No writes. No business side effects.
   - **Screen 3 — SET YOUR PRAYER TIMES**: Functional. Location + Calculation Method setup. Uses canonical existing location APIs.
   - **Screen 4 — MAKE IT YOURS**: Theme preference. Final CTA launches app.
3. An **`OnboardingCoordinator`** service that validates completion prerequisites, persists final preference fields, writes `onboardingCompleted: true`, and triggers `PlannerRefreshCoordinator.fullRefresh()`.
4. A **`useOnboardingStore`** Zustand store that synchronizes onboarding status across `_layout.tsx` and the onboarding screen without prop-drilling through Expo Router.

---

## 2. Non-Goals (Strict)

| Non-goal | Reason |
|---|---|
| Worship Suggestions toggle | Deferred post-M24; `worshipSuggestionsEnabled` is never touched in M20 |
| Prayer Alerts toggle | `prayerAlertsEnabled` is never touched in M20; dormant per M13 architecture |
| Notification permission request | Not an onboarding step; post-launch separate UX |
| Premium features or Entitlement | Onboarding is entirely free; no entitlement query, import, or reference |
| Journal encryption or privacy setup | Journal privacy is a Settings concern (M15/M16); not an onboarding concern |
| Account creation or login | No auth system exists |
| Cloud sync or server calls | Offline-first; all writes are local SQLite |
| New npm runtime dependencies | Zero runtime dependencies added |
| New database migrations | `onboardingCompleted` column already exists in `user_settings` schema (migration 0000) |
| Widget or new widget types | M18 widgets are not affected by onboarding |
| Makkah/0,0/UTC fallback location | Never used as substitute for a real user location |
| Planning-day upsell | Not an onboarding concern |
| New Expo Router file routes per step | Internal step state machine; no sub-routes |
| High-latitude rules in Screen 3 UI | Advanced; Settings only |
| Polar circle resolution in Screen 3 UI | Advanced; Settings only |
| Manual minute adjustments in Screen 3 UI | Advanced; Settings only |
| Reverse geocoding or network country lookup | No network calls; country derived from CityRecord.countryCode (MANUAL) only |

---

## 3. Onboarding Terminology

| Term | Definition |
|---|---|
| **OnboardingStatus** | `'LOADING'` (DB read in flight) or `'PENDING'` (not yet completed) or `'COMPLETE'` (done) or `'ERROR'` (DB infrastructure failure) |
| **OnboardingGate** | The routing guard logic in `app/_layout.tsx` that controls rendering and redirect based on status |
| **OnboardingCoordinator** | The non-React service that validates prerequisites, persists final fields, writes `onboardingCompleted: true`, and triggers a full planner refresh |
| **useOnboardingStore** | The Zustand store that exposes `status`, `initialize()`, `retry()`, and `markComplete()` |
| **Step state machine** | Internal `useState` within `app/onboarding/index.tsx` tracking which of the four screens is active |
| **Write-on-tap** | The constraint that data is only persisted when the user explicitly presses a button; never during render or re-render |
| **No GPS on mount** | `requestForegroundPermissionsAsync()` is NEVER called from a `useEffect`, `componentDidMount`, or any automatic lifecycle phase; only from an explicit button tap handler |
| **Usable location** | A committed AUTO snapshot (latitude + longitude + valid IANA timezone) OR a committed MANUAL city (latitude + longitude + valid IANA timezone). UTC alone, 0,0, or device timezone alone do NOT qualify. |

---

## 4. Source of Truth: `onboardingCompleted`

`user_settings.onboardingCompleted` (BOOLEAN NOT NULL DEFAULT false) is the canonical completion flag.

| Condition | Resolved status |
|---|---|
| No `user_settings` row exists (fresh install) | `PENDING` |
| `onboardingCompleted = false` | `PENDING` |
| `onboardingCompleted = true` | `COMPLETE` |
| `get()` throws (DB infrastructure failure) | `ERROR` |

**Critical distinction:** A missing `user_settings` row is the normal fresh-install state (no row != DB error). Only a thrown exception (infrastructure failure) produces `ERROR`. `ERROR` is NOT treated as `PENDING`. The `ERROR` state renders a controlled recovery surface. The user may retry via `retry()`.

**Why ERROR != PENDING:** Silently showing onboarding during a DB failure would allow the user to submit a "completion" against a broken database, leaving `onboardingCompleted` unwritten and the user looping. `ERROR` makes the failure explicit and recoverable.

`OnboardingCoordinator` is the **only** code that may write `onboardingCompleted: true`. It writes directly to `UserSettingsRepository.upsert()` — it does **not** go through `SettingsMutationCoordinator`, which correctly lists `onboardingCompleted` in `FORBIDDEN_PATCH_KEYS`.

---

## 5. Authoritative Four-Screen Flow

### Screen 1 — YOUR DAY, CENTERED AROUND SALAH

**Purpose:** Educational only. No business side effects.

**UI contract:**
- Heading: "Your day, centered around Salah" (or equivalent)
- Educational body: explain that the five daily prayers structure the day
- Display the five prayers in canonical order: Fajr, Dhuhr, Asr, Maghrib, Isha
- Single primary CTA: "Get Started"
- No Back button (first screen)

**Data contract:**
- No settings read beyond what the gate already resolved.
- No settings written under any condition.
- No network calls. No GPS calls. No DB writes. No scheduling calls.

**Navigation:** Tapping "Get Started" advances to Screen 2.

---

### Screen 2 — YOUR SCHEDULE ADAPTS AUTOMATICALLY

**Purpose:** Educational only. No business side effects whatsoever.

**UI contract:**
- Heading: "Your schedule adapts automatically"
- Show the signature conceptual example (static display only):
  - Soccer at 6:00 PM
  - In summer it falls under Asr; in winter under Maghrib
- Explanatory text: "The task remains at 6:00 PM. The app automatically places it in the prayer period where it belongs."
- Single primary CTA: "Next"
- Back button: returns to Screen 1

**Data contract — ABSOLUTE PROHIBITION:**

This screen MUST NEVER:
- Create a TaskDefinition or TaskOccurrence
- Call SchedulingEngine or MaterializationEngine
- Call any recurrence engine
- Write any database row
- Make any network call

This is an **illustration only**. The soccer/6 PM example is static display content. No live task is created, scheduled, or materialized. Tests MUST explicitly verify zero calls to all named engines.

**Navigation:** Tapping "Next" advances to Screen 3.

---

### Screen 3 — SET YOUR PRAYER TIMES

**Purpose:** Functional setup. Location + Calculation Method together on one screen.

**IMPORTANT:** Location and Calculation Method belong on the **same conceptual screen**. There is no fifth screen for calculation method. Do not separate them.

**UI contract:**

*Location section:*
- If a usable location already exists in the database: **display it**. Offer "Keep this location" as the default path. Allow the user to explicitly change it.
- **"Use My Location"** button — triggers explicit GPS auto-detect
- **"Choose City Manually"** — opens city search field (lazy-loaded on first character >= 2)
- No "Skip for now". A usable location is required before the user can advance to Screen 4.
- On GPS denied or GPS failure: do NOT trap the user. Keep "Choose City Manually" always visible. Show an inline error message.
- On GPS success: commit location via `useLocation.requestAutoLocation()`, show committed location, allow user to proceed.
- On manual city selected: commit via `useLocation.setManualLocation(city)`, show committed location, allow user to proceed.

*Calculation Method section (always visible on this screen):*
- Default UI when no explicit user selection has been made:
  ```
  Prayer Calculation
  Recommended: <method label>
  "Recommended for your location. You can change this later in Settings."
  ```
- Provide a **"Change Method"** control (button or link).
- "Change Method" shows the 12 supported methods by label only (from `CALCULATION_METHOD_LABELS`). Do NOT expose high-latitude rule, polar circle resolution, manual minute adjustments, angles, or technical fiqh explanations.
- The recommendation initializes the onboarding draft. If the user manually selects another method, mark it as user-selected. Do NOT automatically overwrite a user-selected method on subsequent renders or reloads.
- No render-time writes. Selection is held in local draft state.
- Single primary CTA: "Continue" — **disabled** until a usable location is committed.
- Back button: returns to Screen 2.

**Calculation method recommendation policy:**

| Location path | Recommendation source |
|---|---|
| MANUAL city selected | `REGION_METHOD_MAP[cityRecord.countryCode]` — if country absent from map, default `MWL` |
| AUTO GPS acquired | `recommendCalculationMethod(coordinates)` — this currently returns `MWL` (see Section 12) |
| Existing location reused | Apply same rule as above based on location mode |

Architecture MUST document honestly: `recommendCalculationMethod()` in the current M12 implementation always returns `'MWL'`. This is not a bug to hide — it is the documented behavior. AUTO location has no reverse-geocoded country; the MWL fallback is the correct documented behavior.

**Data contract:**
- `useLocation.requestAutoLocation()` — called ONLY from "Use My Location" `onPress` handler.
- `useLocation.setManualLocation(city)` — called ONLY from city-selected handler.
- City dataset: loaded lazily via `loadCityDataset()` then searched via `searchCities(query)`. NOT loaded on mount or during Screens 1-2.
- Calculation method draft: held in local component state. NOT written to DB here.
- If `useLocation` triggers a `fullRefresh` during onboarding: this is **acceptable**. The canonical mutation path must not be broken merely to avoid one extra refresh. Correctness and one canonical mutation path take priority.

**GPS guard (non-negotiable):**
- `requestForegroundPermissionsAsync()` MUST NOT be called in any `useEffect`, `useMemo`, or computed value.
- It MUST ONLY be called inside the "Use My Location" button's `onPress` handler (transitively via `requestAutoLocation()`).
- If GPS is denied or fails and no committed location exists: show error, keep "Choose City Manually" visible. Do NOT advance.

**Existing location reuse:**
- On Screen 3 mount: read committed location from repository (read-only, not a mutation).
- If a valid AUTO or MANUAL location already exists: display it. Do not prompt GPS automatically. Do not overwrite it on render.
- Allow user to keep existing location or explicitly change it.
- Opening onboarding MUST NOT destroy or reset existing location state.

---

### Screen 4 — MAKE IT YOURS

**Purpose:** Minimal real preferences. Final confirmation before launching the app.

**UI contract:**
- Heading: "Make it yours"
- Theme selection: **SYSTEM** / **LIGHT** / **DARK** (using existing `ThemeProvider` modes from M1)
- Setup summary: brief display of what was configured (location name/mode, calculation method label)
- Single primary CTA: "Start Planning"
- Back button: returns to Screen 3

**DO NOT include on this screen:**
- Worship Suggestions toggle
- Prayer Alerts toggle (dormant per M13 architecture)
- Premium features or upsell
- Planning-day upsell
- Journal privacy
- Notification permission request

**Theme persistence decision:**

Theme selection on Screen 4 is held as local draft state. It is **NOT written to DB on tap**. It is passed to `OnboardingCoordinator.complete()` and persisted as part of the coordinator's final persistence step. This avoids render-time writes and keeps the coordinator as the single completion boundary.

**Data contract:**
- No DB writes during render or on theme selection tap.
- On "Start Planning" tap: call `OnboardingCoordinator.complete({ calculationMethod, themeMode })`.
- Handle all result statuses per Section 9.

---

## 6. Location Requirement

### Location is REQUIRED. GPS is OPTIONAL.

The user MUST complete onboarding with one of:

**A. Valid committed AUTO snapshot:**
- `lastAutoLatitude` — non-null number
- `lastAutoLongitude` — non-null number
- `lastKnownTimezone` — valid IANA timezone string

**B. Valid committed MANUAL city:**
- `manualLatitude` — non-null number
- `manualLongitude` — non-null number
- `manualTimezone` — valid IANA timezone string

**What does NOT qualify as a usable location:**
- UTC timezone alone
- Device timezone alone without coordinates
- Makkah (or any hardcoded city) as a silent fallback
- Coordinates (0, 0)
- SETUP_REQUIRED state (no location written at all)

**GPS denial / failure flow:**
1. GPS denied or fails.
2. If a valid committed AUTO snapshot exists: use it (user can keep it).
3. If no valid committed location exists: show inline error. "Choose City Manually" remains prominently visible. Do NOT advance to Screen 4.

`OnboardingCoordinator.complete()` MUST validate that a usable location exists before writing `onboardingCompleted = true`. If no usable location exists, return `LOCATION_REQUIRED` and do NOT write `onboardingCompleted`.

---

## 7. OnboardingGate — Root Routing Strategy (No-Flash Contract)

### Gate location: `app/_layout.tsx`

The gate prevents any protected route from rendering even for one frame while onboarding is incomplete.

**Rendering rules by status:**

| Status | Route | Render |
|---|---|---|
| `LOADING` | any | Controlled bootstrap surface — do NOT render `<Slot />` |
| `ERROR` | any | Controlled error/retry surface — do NOT render `<Slot />` |
| `PENDING` | `/onboarding` | Render `<Slot />` |
| `PENDING` | any other route | Initiate `replace('/onboarding')` — render controlled loading surface until route matches |
| `COMPLETE` | normal app route | Render `<Slot />` |
| `COMPLETE` | `/onboarding` | Initiate `replace('/(tabs)/today')` — render controlled loading surface until route matches |

**Critical invariant:** While `LOADING` or `ERROR`, `<Slot />` is NOT rendered. While in an in-flight redirect, `<Slot />` is NOT rendered for the protected target route.

**Why this matters:** `useEffect` executes after render/commit. A redirect in `useEffect` with `<Slot />` always rendered allows the target route to appear for one frame before the redirect fires. This architecture MUST NOT claim that approach prevents flashing — it does not.

**Logical structure (not implementation pseudocode):**

```typescript
const [status, setStatus] = useState<OnboardingStatus>('LOADING');
const segments = useSegments();
const router = useRouter();
const isRedirecting = useRef(false);

useEffect(() => {
  useOnboardingStore.getState().initialize();
}, []);

const storeStatus = useOnboardingStore(s => s.status);
useEffect(() => { setStatus(storeStatus); }, [storeStatus]);

useEffect(() => {
  if (status === 'LOADING' || status === 'ERROR') return;
  const inOnboarding = segments[0] === 'onboarding';
  if (status === 'PENDING' && !inOnboarding) {
    isRedirecting.current = true;
    router.replace('/onboarding');
  } else if (status === 'COMPLETE' && inOnboarding) {
    isRedirecting.current = true;
    router.replace('/(tabs)/today');
  } else {
    isRedirecting.current = false;
  }
}, [status, segments, router]);

if (status === 'LOADING') return <BootstrapLoadingView />;
if (status === 'ERROR') return <BootstrapErrorView onRetry={() => useOnboardingStore.getState().retry()} />;
if (isRedirecting.current) return <BootstrapLoadingView />;
return <Slot />;
```

**Deep-link protection:** All named app routes (Today, Calendar, Task, Settings, Journal, Add) MUST be protected. A PENDING user who deep-links to any normal-app route sees only the controlled loading surface until the redirect to `/onboarding` completes.

**COMPLETE + /onboarding:** A completed user who navigates to `/onboarding` (e.g. via a stale link) is immediately redirected to Today. They MUST NOT see onboarding content.

**ERROR -> retry:** `retry()` re-runs status initialization. On success, transitions to `PENDING` or `COMPLETE`. On continued failure, remains `ERROR`.

---

## 8. `useOnboardingStore` Contract

```typescript
// src/stores/useOnboardingStore.ts

export type OnboardingStatus = 'LOADING' | 'PENDING' | 'COMPLETE' | 'ERROR';

interface OnboardingStoreState {
  /**
   * Current resolved onboarding status.
   * - LOADING: DB read in flight (initial state on app launch).
   * - PENDING: onboardingCompleted is false or row is absent.
   * - COMPLETE: onboardingCompleted is true.
   * - ERROR: DB infrastructure failure during initialization.
   */
  status: OnboardingStatus;

  /**
   * Reads user_settings.onboardingCompleted from DB and resolves status.
   * Called once from app/_layout.tsx on mount.
   * No row -> PENDING. Row false -> PENDING. Row true -> COMPLETE.
   * DB throw -> ERROR.
   */
  initialize: () => Promise<void>;

  /**
   * Re-runs initialization. Called from the ERROR recovery surface.
   * Resets status to LOADING then repeats initialize() logic.
   */
  retry: () => Promise<void>;

  /**
   * Synchronously marks status as COMPLETE in-memory.
   * Called by the onboarding screen after OnboardingCoordinator.complete() succeeds.
   * MUST be called BEFORE router.replace() to prevent a gate redirect-back race.
   */
  markComplete: () => void;
}
```

**Invariants:**
- `initialize()` is safe to call multiple times (no-op if status is already `COMPLETE`).
- `markComplete()` is a synchronous Zustand state update.
- No subscription to DB changes — status is a one-time boot read plus in-memory updates.
- Store MUST NOT import from EntitlementService, JournalService, WidgetSyncCoordinator, or any Premium/Journal domain.
- Store MUST NOT request GPS, persist user preferences, own completion business validation.

**Imperative store access pattern:**

```typescript
// app/_layout.tsx on mount
useOnboardingStore.getState().initialize();

// After OnboardingCoordinator.complete() succeeds
useOnboardingStore.getState().markComplete();
router.replace('/(tabs)/today');
```

---

## 9. `OnboardingCoordinator` Contract

```typescript
// src/services/onboarding/OnboardingCoordinator.ts

export type OnboardingCompleteResult =
  | { status: 'SUCCESS' }
  | { status: 'PERSISTED_REFRESH_FAILED'; error: string }
  | { status: 'LOCATION_REQUIRED' }
  | { status: 'SETUP_INCOMPLETE'; reason: string }
  | { status: 'FAILED'; error: string };

export interface OnboardingCompleteInput {
  calculationMethod: CalculationMethodKey;
  themeMode: ThemeMode;
}

export class OnboardingCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository = userSettingsRepository,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator = defaultPlannerRefreshCoordinator
  ) {}

  /**
   * Validates prerequisites, persists final onboarding fields, marks onboarding complete,
   * and triggers a full planner refresh.
   *
   * Execution order (MUST be respected):
   * Step 1 - Read: read current committed user_settings (not React state)
   * Step 2 - Validate location: confirm usable committed location exists
   *   If no usable location: return LOCATION_REQUIRED. Do NOT write onboardingCompleted.
   * Step 3 - Validate inputs: validate calculationMethod and themeMode
   *   If invalid: return SETUP_INCOMPLETE. Do NOT write onboardingCompleted.
   * Step 4 - Persist final fields: upsert { calculationMethod, themeMode }
   *   If fails: return FAILED. Do NOT write onboardingCompleted.
   * Step 5 - Persist onboardingCompleted: upsert { onboardingCompleted: true }
   *   If fails: return FAILED. onboardingCompleted not written.
   * Step 6 - Refresh: call PlannerRefreshCoordinator.fullRefresh()
   *   If throws: return PERSISTED_REFRESH_FAILED. Do NOT rollback onboardingCompleted.
   *   If returns SETUP_REQUIRED: return PERSISTED_REFRESH_FAILED (NOT SUCCESS).
   *   If succeeds: return SUCCESS.
   */
  async complete(input: OnboardingCompleteInput): Promise<OnboardingCompleteResult>;
}

export const onboardingCoordinator = new OnboardingCoordinator();
```

**Location validation (Step 2):**
- AUTO: `lastAutoLatitude !== null && lastAutoLongitude !== null && isValidTimezone(lastKnownTimezone)`
- MANUAL: `manualLatitude !== null && manualLongitude !== null && isValidTimezone(manualTimezone)`
- If neither: return `{ status: 'LOCATION_REQUIRED' }`. Do NOT write `onboardingCompleted`.

**Calculation method source (Step 3):**
Valid methods are the keys of `CALCULATION_METHOD_LABELS` from `src/domain/prayer/calculationMethods.ts`. Do NOT use `SettingsMutationCoordinator.VALID_CALCULATION_METHODS` (private implementation detail — audit its export status before relying on it). Use `Object.keys(CALCULATION_METHOD_LABELS)` or the `CalculationMethodKey` type.

**Theme validation (Step 3):**
Valid theme modes: `SYSTEM | LIGHT | DARK` from the existing `ThemeMode` type in `src/theme/`.

**Refresh failure semantics:**
- `fullRefresh()` throws: return `PERSISTED_REFRESH_FAILED`. Do NOT rollback. Navigation proceeds. Today will retry on mount.
- `fullRefresh()` returns `SETUP_REQUIRED` (not throws): return `PERSISTED_REFRESH_FAILED`. Do NOT return `SUCCESS`.

**What `complete()` MUST NOT write (beyond calculationMethod, themeMode, onboardingCompleted):**
- Any location field: `locationMode`, `manualLatitude`, `manualLongitude`, `manualTimezone`, `lastAutoLatitude`, `lastAutoLongitude`, `lastKnownTimezone` (location written by `useLocation`)
- `isPremium` (reserved for future billing)
- `worshipSuggestionsEnabled` (deferred)
- `prayerAlertsEnabled` (deferred)
- `planningDayStart` (not an onboarding concern)

**Isolation:**
- MUST NOT import `SettingsMutationCoordinator`
- MUST NOT import `PlanningDayMutationCoordinator`
- MUST NOT import from `src/domain/entitlement/`
- MUST NOT import from `src/services/journal/`
- MUST NOT import from `src/domain/worship/`

---

## 10. Step State Machine

The onboarding screen uses a single internal `useState` step tracker:

```typescript
type OnboardingStep = 'SALAH_INTRO' | 'SCHEDULE_EXAMPLE' | 'PRAYER_SETUP' | 'MAKE_IT_YOURS';
```

| Step | Screen | Advances to | On | Data written |
|---|---|---|---|---|
| `SALAH_INTRO` | Screen 1 | `SCHEDULE_EXAMPLE` | "Get Started" tapped | None |
| `SCHEDULE_EXAMPLE` | Screen 2 | `PRAYER_SETUP` | "Next" tapped | None |
| `PRAYER_SETUP` | Screen 3 | `MAKE_IT_YOURS` | "Continue" tapped AND usable location committed | Location via useLocation only |
| `MAKE_IT_YOURS` | Screen 4 | exit — Today | "Start Planning" tapped AND complete() succeeds | { calculationMethod, themeMode, onboardingCompleted: true } via coordinator |

**Back navigation:**
- Screen 1: No in-app Back button.
- Screens 2-4: Back button visible; returns to previous onboarding screen.
- Back NEVER exits into the normal app while onboarding is incomplete.
- iOS swipe gesture / Android hardware back from Screen 1: may exit or background the app per platform behavior. It MUST NOT reveal Today or any other protected route.
- Single-screen internal state machine remains acceptable; no sub-routes required.

**Progress indicator:** Optional visual indicator (step dots or slim progress bar). Must reflect 4-step count. Must not include deferred steps.

---

## 11. Location APIs — Canonical Reuse

### Auto-location path

**CORRECT API:** `useLocation.requestAutoLocation()` — the canonical hook exported from `src/hooks/useLocation.ts`.

**DO NOT use:** `LocationService.requestAndSaveAutoLocation()` — this method does NOT exist in the current M12 implementation. Do not create it.

The onboarding screen uses the `useLocation` hook (with optional DI for test isolation), called identically to how it works in Settings (M17).

```typescript
// Called ONLY from "Use My Location" onPress handler
const { requestAutoLocation, setManualLocation } = useLocation({ userSettingsRepo, coordinator });
const success = await requestAutoLocation();
```

`requestAutoLocation()` internally calls `locationService.requestForegroundPermission()` — this is the ONLY permitted origination of that call within onboarding.

If `requestAutoLocation()` triggers a `fullRefresh()` during onboarding, **this is acceptable**. The canonical mutation path must not be broken to avoid an extra refresh. Correctness and one canonical mutation path take priority.

### Manual-location path

**CORRECT API:** `useLocation.setManualLocation(city: CityRecord)` — the canonical hook method.

**City dataset APIs (correct):**

```typescript
import { loadCityDataset } from '@/domain/location/cityLoader';
import { searchCities } from '@/domain/location/citySearch';

// Lazy load ONLY when user types >= 2 characters
const dataset = await loadCityDataset();
const results = searchCities(query, 20, dataset);
```

**DO NOT use:** `cityLoader.load()` — this method does not exist. The correct function is `loadCityDataset()`.

The city dataset MUST NOT be loaded during Screens 1-2 or on Screen 3 initial render.

### GPS guard (non-negotiable)

`requestForegroundPermissionsAsync()` MUST NOT be called in any:
- `useEffect`
- `useMemo`
- `useCallback` that fires during mount
- Any computed value or initialization function

It MUST ONLY be called inside the "Use My Location" button's `onPress` handler (transitively via `requestAutoLocation()`).

---

## 12. Calculation Method Recommendation

### Policy

| Trigger | Recommendation |
|---|---|
| User selects a MANUAL city | `REGION_METHOD_MAP[cityRecord.countryCode] ?? 'MWL'` |
| User taps "Use My Location" (AUTO success) | `recommendCalculationMethod(coordinates)` |
| User reuses existing MANUAL location | `REGION_METHOD_MAP[existingCity.countryCode] ?? 'MWL'` (if countryCode available) |
| User reuses existing AUTO location | `recommendCalculationMethod({ latitude, longitude })` |
| Country not in `REGION_METHOD_MAP` | `'MWL'` (Muslim World League, default) |

**Honest AUTO documentation:**

`recommendCalculationMethod(coordinates)` from `src/domain/prayer/calculationMethods.ts` **currently always returns `'MWL'`**, regardless of coordinates. There is no coordinate-based country resolution, no reverse geocoding, no external API, no country-boundary lookup. Architecture MUST NOT claim AUTO has country intelligence it does not have.

### Sources used

- `CALCULATION_METHOD_LABELS` — from `src/domain/prayer/calculationMethods.ts` (authoritative label source and method list)
- `REGION_METHOD_MAP` — from `src/domain/prayer/calculationMethods.ts` (country ISO code -> method)
- `recommendCalculationMethod()` — from `src/domain/prayer/calculationMethods.ts` (AUTO fallback; currently always MWL)
- `CityRecord.countryCode` — from city dataset (ISO code for MANUAL path)

Do NOT use `SettingsMutationCoordinator.VALID_CALCULATION_METHODS`.

### UX: "Change Method" control

Default display (no user selection made yet):
```
Prayer Calculation

Recommended: Muslim World League
"Recommended for your location. You can change this later in Settings."
```

"Change Method" expansion: shows the 12 methods by label only — no technical parameters, no high-latitude rule, no polar circle resolution, no fiqh explanation.

The recommendation initializes the draft state. A manual user selection is flagged as `userSelected: true` in local state. A userSelected method MUST NOT be overwritten by a re-render, a re-read of location, or any automatic trigger.

---

## 13. React Boundary — No Direct Repository Writes

The onboarding screen MUST NOT call `userSettingsRepository.upsert()` directly for any business preference field.

**React may hold (local state only):**
- Selected/recommended calculation method draft
- `userSelected: boolean` flag
- Selected theme mode draft
- Current step
- Location display state (read from hook)
- Error display state

**React emits intent. A service/coordinator performs validation and persistence.**

**Correct flow for final persistence:**
```typescript
// Screen 4 "Start Planning" tap
const result = await onboardingCoordinator.complete({
  calculationMethod: draftMethod,
  themeMode: draftTheme,
});
```

**Wrong (MUST NOT do):**
```typescript
// Do NOT write directly from React
await userSettingsRepository.upsert({ calculationMethod: selectedMethod });
await userSettingsRepository.upsert({ themeMode: selectedTheme });
```

Location writes via `useLocation.requestAutoLocation()` and `useLocation.setManualLocation()` are acceptable exceptions — they go through the existing canonical mutation path, not ad-hoc direct repository writes.

---

## 14. File Inventory

### New files

| File | Purpose |
|---|---|
| `docs/M20_ARCHITECTURE.md` | This architecture specification (hardened) |
| `src/stores/useOnboardingStore.ts` | Zustand store: status, initialize(), retry(), markComplete() |
| `src/services/onboarding/OnboardingCoordinator.ts` | Validates + persists final fields + onboardingCompleted: true + triggers fullRefresh() |
| `src/services/onboarding/index.ts` | Public barrel export |
| `src/stores/__tests__/useOnboardingStore.test.ts` | Store unit tests (B-* group) |
| `src/services/onboarding/__tests__/OnboardingCoordinator.test.ts` | Coordinator unit tests (OC-* group) |
| `app/onboarding/__tests__/OnboardingScreen.test.tsx` | Screen integration tests (F-*, L-*, C-*, P-* groups) |
| `src/domain/onboarding/__tests__/OnboardingIsolation.test.ts` | Isolation guard tests (ISO-* group) |

### Modified files

| File | What changes |
|---|---|
| `app/_layout.tsx` | Controlled gate rendering: LOADING/ERROR surfaces, no naked Slot during gate transitions |
| `app/onboarding/index.tsx` | Four-screen onboarding flow |

### Files explicitly NOT modified

| File | Reason |
|---|---|
| `src/data/schema.ts` | onboardingCompleted column already exists |
| `src/data/migrations/` | No new migrations required |
| `src/services/SettingsMutationCoordinator.ts` | FORBIDDEN_PATCH_KEYS already includes onboardingCompleted |
| `src/services/LocationService.ts` | Not modified; requestAndSaveAutoLocation() is NOT added |
| `src/domain/prayer/calculationMethods.ts` | Not modified; recommendCalculationMethod() honestly returns MWL |
| `src/domain/entitlement/` | Zero entitlement involvement |
| `src/services/journal/` | Zero journal involvement |
| `src/services/widget/` | Widgets not affected by onboarding |
| `src/services/PlannerRefreshCoordinator.ts` | No changes; consumed as-is |

---

## 15. Strict Isolation Rules

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
11. `OnboardingCoordinator.complete()` patch MUST NOT include `locationMode` or any location field.
12. The onboarding screen MUST NOT import from `src/domain/entitlement/`.
13. `PlanningDayEngine.ts`, `TodayTemporalInputProvider.ts`, and `SchedulingEngine.ts` are NOT modified by M20.
14. `SchedulingEngine` MUST NOT be called from any onboarding screen or coordinator.
15. `MaterializationEngine` MUST NOT be called from any onboarding screen or coordinator.
16. No new migration files may be created by M20.
17. `package.json` `dependencies` MUST be unchanged from M19 baseline.

---

## 16. Service Reuse Map

| Existing service/module | How M20 reuses it | Changes required |
|---|---|---|
| `useLocation` hook | Screen 3: `requestAutoLocation()` + `setManualLocation()` | None |
| `loadCityDataset()` | Screen 3 MANUAL city search (lazy-loaded) | None |
| `searchCities()` | Screen 3 city query | None |
| `CALCULATION_METHOD_LABELS` | Screen 3 method labels and recommendation display | None |
| `REGION_METHOD_MAP` | Screen 3 MANUAL city -> method recommendation | None |
| `recommendCalculationMethod()` | Screen 3 AUTO -> method recommendation | None |
| `CalculationMethodKey` type | OnboardingCoordinator input validation | None |
| `ThemeMode` type + `ThemeProvider` | Screen 4 theme selection | None |
| `UserSettingsRepository` | OnboardingCoordinator: reads settings + persists final fields | None |
| `PlannerRefreshCoordinator` | OnboardingCoordinator: triggers fullRefresh() | None |
| Design system tokens (`src/theme/`) | Onboarding UI styling | None |

Zero new npm runtime dependencies. Zero new native modules.

---

## 17. Test Matrix

### Routing / Bootstrap (B-* group)

| ID | Description |
|---|---|
| B-01 | No user_settings row -> status PENDING |
| B-02 | onboardingCompleted = false -> status PENDING |
| B-03 | onboardingCompleted = true -> status COMPLETE |
| B-04 | DB get() throws -> status ERROR |
| B-05 | LOADING -> Slot NOT rendered |
| B-06 | ERROR -> Slot NOT rendered; error/retry surface shown |
| B-07 | PENDING + deep link to Today -> redirect to /onboarding; Today NOT rendered |
| B-08 | PENDING + deep link to task route -> redirect to /onboarding; task route NOT rendered |
| B-09 | PENDING + deep link to Settings -> redirect to /onboarding; Settings NOT rendered |
| B-10 | COMPLETE + route /onboarding -> redirect to Today; onboarding NOT rendered |
| B-11 | ERROR retry -> re-runs initialization; transitions to PENDING or COMPLETE |
| B-12 | No redirect loop (PENDING + /onboarding stays at /onboarding) |

### Flow (F-* group)

| ID | Description |
|---|---|
| F-01 | Screen 1 shows five prayers in correct order: Fajr, Dhuhr, Asr, Maghrib, Isha |
| F-02 | Screen 1 makes no DB writes, no GPS calls, no network calls |
| F-03 | Screen 2 shows adaptive schedule example (Soccer 6PM / Summer Asr / Winter Maghrib) |
| F-04 | Screen 2 does NOT call TaskDefinitionRepository or create a TaskDefinition |
| F-05 | Screen 2 does NOT call SchedulingEngine or MaterializationEngine |
| F-06 | Screen 3 shows location section and calculation method section together on one screen |
| F-07 | Screen 4 shows theme picker (SYSTEM/LIGHT/DARK), setup summary, "Start Planning" CTA |
| F-08 | Back from Screen 2 -> Screen 1 (stays in onboarding, no protected routes exposed) |
| F-08b | Back from Screen 3 -> Screen 2 |
| F-08c | Back from Screen 4 -> Screen 3 |

### Location (L-* group)

| ID | Description |
|---|---|
| L-01 | GPS permission NOT prompted on any screen mount |
| L-02 | Tapping "Use My Location" explicitly prompts for GPS permission |
| L-03 | Valid AUTO location accepted; Screen 3 "Continue" becomes enabled |
| L-04 | GPS permission denied -> inline error shown; "Choose City Manually" remains visible |
| L-05 | GPS failure -> inline error shown; "Choose City Manually" remains visible |
| L-06 | Valid MANUAL city selected and committed; Screen 3 "Continue" becomes enabled |
| L-07 | Existing committed AUTO snapshot recognized on Screen 3 mount; "Keep this location" offered without re-prompting GPS |
| L-08 | Existing committed MANUAL location recognized on Screen 3 mount; "Keep this location" offered |
| L-09 | No valid committed location -> OnboardingCoordinator.complete() returns LOCATION_REQUIRED |
| L-10 | No hardcoded fallback location (Makkah / 0,0 / UTC) is committed or used as valid location |
| L-11 | Completion requires valid IANA timezone in committed location |

### Calculation Method (C-* group)

| ID | Description |
|---|---|
| C-01 | MANUAL city with known countryCode -> REGION_METHOD_MAP[code] recommended |
| C-02 | MANUAL city with unknown countryCode -> MWL recommended |
| C-03 | AUTO location -> recommendCalculationMethod(coordinates) called |
| C-04 | recommendCalculationMethod() currently always returns MWL; documented and accepted |
| C-05 | Default Screen 3 shows recommendation label without advanced settings |
| C-06 | "Change Method" exposes 12 basic method labels only (no high-lat rule, no polar, no angles) |
| C-07 | User-selected method is NOT overwritten on subsequent render or location change |
| C-08 | No render-time writes to DB (method stays in draft state until complete()) |
| C-09 | Onboarding screen does NOT call userSettingsRepository.upsert() directly for any preference field |

### Preferences (P-* group)

| ID | Description |
|---|---|
| P-01 | Screen 4 offers SYSTEM / LIGHT / DARK theme options |
| P-02 | Existing ThemeProvider / theme path reused (no new theme type) |
| P-03 | No Worship Suggestions toggle on Screen 4 |
| P-04 | No Prayer Alerts toggle on Screen 4 |
| P-05 | No Premium feature or upsell on Screen 4 |
| P-06 | No notification permission request in onboarding |

### Completion (OC-* group)

| ID | Description |
|---|---|
| OC-01 | No usable location -> complete() returns LOCATION_REQUIRED |
| OC-02 | LOCATION_REQUIRED -> onboardingCompleted NOT written |
| OC-03 | Valid setup -> complete() persists { calculationMethod, themeMode, onboardingCompleted: true } |
| OC-04 | onboardingCompleted = true written ONLY when "Start Planning" tapped and coordinator succeeds |
| OC-05 | Write failure -> no navigation |
| OC-06 | Write failure -> no fullRefresh() call |
| OC-07 | Successful persist -> exactly one fullRefresh() call |
| OC-08 | fullRefresh() throws -> PERSISTED_REFRESH_FAILED returned; onboardingCompleted NOT rolled back |
| OC-09 | fullRefresh() returns SETUP_REQUIRED -> PERSISTED_REFRESH_FAILED returned (NOT SUCCESS) |
| OC-10 | Success -> markComplete() called BEFORE router.replace() |
| OC-11 | SettingsMutationCoordinator cannot write onboardingCompleted (FORBIDDEN_PATCH_KEYS) |

### Isolation (ISO-* group)

| ID | Description |
|---|---|
| ISO-01 | OnboardingCoordinator source contains no import from src/domain/entitlement/ |
| ISO-02 | OnboardingCoordinator source contains no import from src/services/journal/ |
| ISO-03 | OnboardingCoordinator source contains no import from src/domain/worship/ |
| ISO-04 | OnboardingCoordinator source contains no import of SettingsMutationCoordinator |
| ISO-05 | OnboardingCoordinator source contains no import of PlanningDayMutationCoordinator |
| ISO-06 | useOnboardingStore source contains no import from src/domain/entitlement/ |
| ISO-07 | useOnboardingStore source contains no import from src/services/journal/ |
| ISO-08 | OnboardingCoordinator.complete() upsert does not include isPremium |
| ISO-09 | OnboardingCoordinator.complete() upsert does not include worshipSuggestionsEnabled |
| ISO-10 | OnboardingCoordinator.complete() upsert does not include prayerAlertsEnabled |
| ISO-11 | OnboardingCoordinator.complete() upsert does not include any location field |
| ISO-12 | Onboarding screen does not import from src/domain/entitlement/ |
| ISO-13 | No new migration files created |
| ISO-14 | package.json dependencies unchanged from M19 baseline |
| ISO-15 | SchedulingEngine not called from onboarding |
| ISO-16 | MaterializationEngine not called from onboarding |

**Estimated total new tests: ~85** (12 B + 10 F + 11 L + 9 C + 6 P + 11 OC + 16 ISO + buffer)

---

## 18. Verification Criteria

### Architecture hardening criteria (this commit)

1. docs/M20_ARCHITECTURE.md committed with all 18 issues resolved.
2. docs/ARCHITECTURE_INDEX.md section 23 (Onboarding) consistent with this document.
3. docs/DECISIONS.md ADR-028 appended.
4. docs/CURRENT_MILESTONE.md status updated to ARCHITECTURE HARDENED.
5. docs/IMPLEMENTATION_STATUS.md M20 row updated.
6. docs/AI_PROJECT_CONSTITUTION.md roadmap table has M18 row restored.
7. All non-goals confirmed: no new deps, no new migrations, no entitlement, no journal, no worship.
8. Baseline commit in header is f787191 (f78719113e3d8ec3272cfb50fdc292ada04d4145).

### Implementation closure criteria (not this commit)

9. npx tsc --noEmit exits with 0 errors.
10. eslint src/ app/ --max-warnings=0 exits with 0 errors/warnings.
11. All ~85 new tests pass.
12. Full regression suite passes (all existing 1296 tests continue to pass).
13. No new user_settings migrations.
14. No new npm runtime dependencies (package.json dependencies unchanged).
15. expo-doctor advisory count unchanged from M19 baseline.

---

## 19. Open Questions

None. All architectural decisions are resolved in this document.

The following are implementation-level decisions (not blocking implementation):

- Visual design of the progress indicator (dots vs. progress bar vs. none)
- Exact wording of step titles and CTAs
- Whether to show a loading spinner during Screen 3 GPS detection
- Exact error message copy for permission denial, GPS timeout, DB write failure
- Whether Screen 4 shows the configured city name or just location mode label
- Exact layout and spacing of Screen 3 combined location + method section

These are resolved by the implementer and do not require architecture re-review.

---

*Hardening performed against: Issues 1-18 from the independent consistency review.*
*Hardening commit: see `git log --oneline -1`*
