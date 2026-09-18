# M17 — Settings Architecture

> **Status:** CLOSED — SONNET APPROVED
> **Authored:** 2026-09-18
> **Hardened:** 2026-09-18 (ISSUE 1–4 amendments)
> **Milestone:** M17 — Settings & Preferences UI
> **Baseline commit:** 09c68cd (M16 closed / Sonnet approved)
> **Architecture freeze commit:** 00891c2
> **Hardening amendment commit:** a2af7a3
> **Implementation commit:** 76ac716
> **Closure commit:** (see closure record below)

---

## 0. Document Purpose

This document freezes the technical architecture for M17. Implementation agents **must not** begin coding until this document is committed locally with the hardening commit. No production code may deviate from this specification without a formal revision.

### 0.1 Amendment History

| Date | Amendment | Reason |
|---|---|---|
| 2026-09-18 | Initial freeze | `00891c2` |
| 2026-09-18 | ISSUE 1: Hijri recurrence adjustment correction | `hijriAdjustment: { globalAdjustment: 0 }` is hardcoded in `recurringHorizonSync.ts`; Hijri-recurring tasks ignore user's stored adjustment |
| 2026-09-18 | ISSUE 2: Planning-day Premium rule | MIDNIGHT/CUSTOM are Premium-gated; M17 must not expose them as selectable without M19 entitlement |
| 2026-09-18 | ISSUE 3: SettingsMutationCoordinator | Domain orchestration must not live in React hooks |
| 2026-09-18 | ISSUE 4: Source-of-truth doc reconciliation | MASTER_PRODUCT_SPEC.md still references stale Worship navigation |

---

## 1. Goal Summary

Deliver a fully functional, accessible Settings experience that:

1. Surfaces all existing user-facing preferences stored in `user_settings`.
2. Coordinates preference mutations through a **non-React `SettingsMutationCoordinator`** that delegates to existing canonical services — never bypassing them.
3. Wires theme persistence into the existing `ThemeProvider` (already live in root `_layout.tsx`).
4. Adds a **Stack navigator layout** to `app/(tabs)/settings/` so sub-screens navigate with a proper back-button stack without leaking routes into the Bottom Nav.
5. Implements a unified Settings Hub (`index.tsx`) that lists all settings groups as navigable rows.
6. Builds each sub-screen to completion — **no placeholders at M17 close**.
7. **Corrects the hardcoded `hijriAdjustment: { globalAdjustment: 0 }`** in `RecurringHorizonSync` so that Hijri-recurring tasks use the user's actual stored adjustment configuration.

---

## 2. Scope Boundary

### 2.1 In Scope — M17

| Group | Sub-screen route | Description |
|---|---|---|
| **Prayer Calculation** | `prayer-calculation.tsx` *(new)* | Method, Asr school, High-latitude rule, Polar circle resolution, per-prayer minute adjustments |
| **Location** | `prayer-location.tsx` *(existing, keep)* | AUTO/MANUAL mode, city search — already fully implemented |
| **Planning Day** | `planning-day.tsx` *(new)* | Day-start boundary: Fajr only (MIDNIGHT/CUSTOM are Premium — M19) |
| **Hijri Calendar** | `hijri-calendar.tsx` *(new)* | Global ±2 day adjustment, per-month override list |
| **Appearance** | `appearance.tsx` *(replace placeholder)* | Light / Dark / System theme selector |
| **Notifications** | `notifications.tsx` *(existing, keep)* | Permission grant, reconcile trigger — already fully implemented |
| **Journal Privacy** | `journal-privacy.tsx` *(new)* | Biometric lock toggle (reads/writes `JournalLockController`) |
| **About** | `about.tsx` *(replace placeholder)* | App version, open-source credits (GeoNames, Adhan, Expo), legal |
| **Settings Hub** | `index.tsx` *(replace placeholder)* | Root list: all groups as tappable rows |
| **Stack layout** | `_layout.tsx` *(new)* | Expo Router Stack navigator for settings sub-screens |

### 2.2 Production Code Correction — In Scope

| File | Issue | Correction |
|---|---|---|
| `src/features/task-form/recurringHorizonSync.ts` | `hijriAdjustment: { globalAdjustment: 0 }` hardcoded (lines 128, 375) | Load from `loadUserHijriAdjustmentConfig()` instead of hardcoded zero |

### 2.3 Explicitly Out of Scope — M17

| Item | Reason |
|---|---|
| Premium entitlement scaffolding | Deferred to M19 |
| Account / cloud sync | Not designed |
| Data export / destructive reset | Not architecturally vetted — defer |
| Worship Suggestions toggle | Worship deferred; `worshipSuggestionsEnabled` column preserved dormant |
| Prayer alert toggles | Deferred; notification engine has no per-prayer alert UI |
| Custom planning day *prayer-offset* mode | `CUSTOM:prayer+offset` format exists in schema; UI deferred post-MVP |
| Planning day MIDNIGHT and CUSTOM modes | Premium-gated (M19); M17 shows FAJR as sole selectable option |

> **Note on Premium fields**: `isPremium`, `onboardingCompleted` are schema columns that Settings must **never set or read** in M17. Premium entitlement is owned entirely by M19.

---

## 3. Navigation Architecture

### 3.1 Problem

Currently `app/(tabs)/settings/` has no `_layout.tsx`. Expo Router defaults to a **Tab screen** for `settings`, which means any sub-screen (`prayer-location.tsx`, etc.) is rendered as a sibling tab — breaking back navigation and leaking routes into bottom-nav stack frames.

### 3.2 Solution: Stack layout inside settings tab

Create `app/(tabs)/settings/_layout.tsx` as a **Stack navigator**:

```tsx
// app/(tabs)/settings/_layout.tsx
import { Stack } from 'expo-router';
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
```

This makes `settings/index.tsx` the hub screen, and all sub-screens (`prayer-calculation`, `planning-day`, etc.) push onto the Stack with a native back gesture, without any bottom-bar pollution.

> **Important**: `headerShown: false` is required because each sub-screen renders its own accessible header using the design system (matching `prayer-location.tsx` and `notifications.tsx` pattern).

### 3.3 Final Route Tree

```
app/(tabs)/settings/
├── _layout.tsx          ← NEW: Stack navigator (headerShown: false)
├── index.tsx            ← REPLACE placeholder: Settings Hub
├── prayer-location.tsx  ← KEEP: fully implemented (M12)
├── notifications.tsx    ← KEEP: fully implemented (M13)
├── prayer-calculation.tsx ← NEW
├── planning-day.tsx     ← NEW
├── hijri-calendar.tsx   ← NEW
├── appearance.tsx       ← REPLACE placeholder
├── journal-privacy.tsx  ← NEW
└── about.tsx            ← REPLACE placeholder
```

### 3.4 Placeholder Route Removal

The following dead placeholder routes are removed in M17:

| Route | Reason for removal | Future path |
|---|---|---|
| `account.tsx` | No account system exists; no M17 scope | M19+ if cloud sync designed |
| `calendar-settings.tsx` | Calendar is view-only; no calendar-specific settings defined | Reintroduce if calendar settings scope appears |
| `planner.tsx` | Planning day is covered by `planning-day.tsx`; same functional scope, clearer name | Superseded by `planning-day.tsx` |
| `premium.tsx` | Premium scaffolding deferred to M19 | M19 creates its own Premium route |

**Verification before removal:** No existing routes, tests, or navigation logic reference these placeholder files. Each is an identical 318-byte placeholder with zero functionality. No test file exists for any of them.

---

## 4. Settings Hub (index.tsx)

The hub renders a vertical scrollable list of settings groups organized into sections. Each row navigates to the corresponding sub-screen.

### 4.1 UI Structure

```
[ Settings ]              ← screen title
─────────────────────────
PRAYER
  Prayer Calculation  >   ← → /prayer-calculation
  Prayer Location     >   ← → /prayer-location

PLANNER
  Planning Day        >   ← → /planning-day
  Hijri Calendar      >   ← → /hijri-calendar

SYSTEM
  Appearance          >   ← → /appearance
  Notifications       >   ← → /notifications
  Journal Privacy     >   ← → /journal-privacy

ABOUT
  About               >   ← → /about
─────────────────────────
```

### 4.2 Implementation Constraints

- Uses `useTheme()` design tokens exclusively.
- No business logic — pure navigation.
- Groups rendered as `SectionList` or equivalent.
- Each row: left icon + label + right chevron.
- Touch target ≥ `touchTargets.min` (44px) per design system.
- `testID` props on each row for test coverage.

---

## 5. Mutation Architecture

### 5.1 Principle: Thin Control Surface

Settings screens are **thin UI shells** over a **non-React `SettingsMutationCoordinator`** that delegates to canonical services. React hooks handle only view state (loading/error/result); all orchestration logic lives in the coordinator.

```
Settings UI (React)
    │
    ▼
useSettingsMutation hook (thin: calls coordinator, exposes loading/error)
    │
    ▼
SettingsMutationCoordinator (non-React, testable)
    │  ├── validate input
    │  ├── persist: userSettingsRepository.upsert(patch)
    │  ├── classify mutation category
    │  └── invoke downstream:
    │        ├── TEMPORAL_FULL_REFRESH → plannerRefreshCoordinator.fullRefresh()
    │        ├── HIJRI_RECURRENCE_REFRESH → plannerRefreshCoordinator.fullRefresh()
    │        ├── PRESENTATION_ONLY → (no refresh)
    │        ├── LOCATION_EXISTING_FLOW → (not owned; useLocation owns this)
    │        ├── NOTIFICATION_EXISTING_FLOW → (not owned; notifications screen owns this)
    │        └── JOURNAL_PRIVACY_EXISTING_FLOW → (not owned; JournalLockController owns this)
    ▼
plannerRefreshCoordinator.fullRefresh()
    │
    ▼
[RecurringHorizonSync (now with effective Hijri config),
 TodayOrchestrator,
 OccurrenceLifecycleService,
 NotificationReconciliationService]
```

### 5.2 Mutation Categories

| Category | Trigger | DB Write | Downstream |
|---|---|---|---|
| `TEMPORAL_FULL_REFRESH` | `calculationMethod`, `asrMethod`, `highLatitudeRule`, `polarCircleResolution`, `prayerAdjustments`, `planningDayStart` | `userSettings.upsert` | `plannerRefreshCoordinator.fullRefresh()` |
| `HIJRI_RECURRENCE_REFRESH` | `hijriGlobalAdjustment`, `hijriMonthOverrides` row changes | `userSettings.upsert` and/or override table write | `plannerRefreshCoordinator.fullRefresh()` |
| `PRESENTATION_ONLY` | `themeMode`, `hijriBaseMethod` | `userSettings.upsert` | No refresh pipeline. Theme: `ThemeProvider.setThemeMode()`. HijriBaseMethod: live read by `HijriService`. |
| `LOCATION_EXISTING_FLOW` | Location mode / coordinates | Not owned by `SettingsMutationCoordinator` | Owned by `useLocation` hook (M12) |
| `NOTIFICATION_EXISTING_FLOW` | Notification permission | Not owned by `SettingsMutationCoordinator` | Owned by `notifications.tsx` screen (M13) |
| `JOURNAL_PRIVACY_EXISTING_FLOW` | Biometric lock toggle | Not owned by `SettingsMutationCoordinator` | Owned by `JournalLockController` (M16) |

### 5.3 Mutation Side-Effect Matrix (Corrected)

| Setting Changed | DB Write | Mutation Category | Side Effect |
|---|---|---|---|
| `calculationMethod` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Prayer times change → all PENDING occurrences shift |
| `asrMethod` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Same as above |
| `highLatitudeRule` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Same as above |
| `polarCircleResolution` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Same as above |
| `prayerAdjustments` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Per-prayer minute offsets shift task placement |
| `planningDayStart` | `userSettings.upsert` | `TEMPORAL_FULL_REFRESH` | Planning day boundaries shift; occurrences re-project |
| `hijriGlobalAdjustment` | `userSettings.upsert` | `HIJRI_RECURRENCE_REFRESH` | **Hijri-recurring task seed dates shift; PENDING Hijri occurrences reconciled** |
| `hijriMonthOverrides` | Override table write | `HIJRI_RECURRENCE_REFRESH` | **Same: specific Hijri month seed dates shift** |
| `hijriBaseMethod` | `userSettings.upsert` | `PRESENTATION_ONLY` | `HijriService` reads live; no PENDING recurrence shift (base method affects raw conversion, not adjustment config) |
| `themeMode` | `userSettings.upsert` | `PRESENTATION_ONLY` | Visual-only; `ThemeProvider.setThemeMode()` |
| `locationMode` / coordinates | Already handled by `useLocation` hook | `LOCATION_EXISTING_FLOW` | `useLocation` owns the full mutation + refresh cycle |

> **Terminal State Safety**: `fullRefresh()` → `PlannerRefreshCoordinator` → `RecurringHorizonSync` only reconciles `PENDING` occurrences. `OccurrenceLifecycleService.sweepExpired()` only transitions `PENDING` → `MISSED`. Terminal states (`COMPLETED`, `MISSED`, `CANCELLED`) are permanently immutable and will not be deleted, reinterpreted, or re-projected by any settings change.

---

## 6. ISSUE 1 CORRECTION — Hijri Recurrence Adjustment

### 6.1 Problem

`RecurringHorizonSync` (in both `sync()` and `syncRange()`) constructs the `RecurrenceContext` with a hardcoded zero adjustment:

```ts
// Lines 128, 375 of recurringHorizonSync.ts — CURRENT (INCORRECT)
recurrenceCtx = {
  hijriService: this.hijri,
  hijriAdjustment: { globalAdjustment: 0 },
};
```

This means all Hijri-recurring tasks are evaluated as if the user has zero global adjustment and zero month overrides, regardless of what the user has actually configured. When the user changes `hijriGlobalAdjustment` from 0 to +1, no recurrence seed dates shift.

### 6.2 Solution: Use Canonical Loader

A canonical loader already exists: `loadUserHijriAdjustmentConfig()` in `src/services/journal/journalDateUtils.ts`. This function:
- Reads `userSettings.hijriGlobalAdjustment` from the DB
- Reads all `hijriMonthOverrides` rows
- Returns a `HijriAdjustmentConfig` object

**M17 production code correction:**

1. **Extract** `loadUserHijriAdjustmentConfig` from `src/services/journal/journalDateUtils.ts` into a standalone canonical module `src/services/HijriAdjustmentConfigLoader.ts`. This avoids a circular dependency where `recurringHorizonSync` would import from a journal-specific module.

2. **Modify `RecurringHorizonSync`**:
   - Accept `HijriAdjustmentConfig` as a parameter to `sync()` and `syncRange()`, or load it internally.
   - **Chosen approach**: Load internally at the start of `sync()` and `syncRange()` using the canonical loader. This keeps the API surface stable and ensures every sync invocation uses fresh DB state.

3. **Replace hardcoded lines 128, 375** with:
   ```ts
   const hijriConfig = await loadUserHijriAdjustmentConfig();
   recurrenceCtx = {
     hijriService: this.hijri,
     hijriAdjustment: hijriConfig,
   };
   ```

4. **Result**: `RecurringHorizonSync` now uses the user's actual stored global adjustment and month overrides when evaluating Hijri recurrence membership and generating seed dates.

### 6.3 File Ownership

| File | Action |
|---|---|
| `src/services/HijriAdjustmentConfigLoader.ts` | **NEW** — Extracted canonical `loadUserHijriAdjustmentConfig()` function |
| `src/services/journal/journalDateUtils.ts` | **MODIFY** — Import from `HijriAdjustmentConfigLoader` instead of inline implementation; re-export for backward compatibility |
| `src/features/task-form/recurringHorizonSync.ts` | **MODIFY** — Lines 126–129 and 371–376: replace hardcoded `{ globalAdjustment: 0 }` with `await loadUserHijriAdjustmentConfig()` |

### 6.4 Downstream Effect

When `hijriGlobalAdjustment` or a `hijriMonthOverrides` row changes and `SettingsMutationCoordinator` invokes `plannerRefreshCoordinator.fullRefresh()`:

1. `PlannerRefreshCoordinator.fullRefresh()` calls `RecurringHorizonSync.sync(horizon, inputs)`.
2. `RecurringHorizonSync.sync()` now loads the **updated** Hijri config from DB (it was just persisted by the coordinator).
3. `RecurrenceEngine.generateSeedDates()` evaluates Hijri-recurring tasks with the new adjustment, potentially generating different seed dates.
4. PENDING occurrences that are no longer desired seeds are deleted; new desired seeds are materialized.
5. Terminal occurrences (COMPLETED/MISSED/CANCELLED) are untouched — `materializeOne` short-circuits them.
6. Gregorian recurrence is unaffected (no `RecurrenceContext` is passed for Gregorian tasks).

### 6.5 Calendar and Journal Consistency

- `CalendarMonthOrchestrator.loadMonth()` receives `hijriAdjustment` as a parameter from `useCalendar` → loads via the same canonical loader.
- `useJournal` loads via the same canonical loader (via `journalDateUtils.ts` which re-exports from `HijriAdjustmentConfigLoader`).
- All three consumers (recurrence sync, calendar display, journal display) read from the same DB source via the same canonical function. No duplication.

---

## 7. ISSUE 2 CORRECTION — Planning Day Premium Rule

### 7.1 Product Rule

From `MASTER_PRODUCT_SPEC.md` §34:

| Mode | Tier |
|---|---|
| `FAJR` | Free / default |
| `MIDNIGHT` | Premium (M19) |
| `CUSTOM` | Premium (M19) |

### 7.2 M17 Approach: Option A (Smallest Implementation)

M17 exposes **only FAJR** as the active/selectable planning day mode.

MIDNIGHT and CUSTOM are **documented as deferred until M19** in the planning-day sub-screen's info card. They are NOT listed as disabled options in M17. There is no fake entitlement logic, no passive capability seam, and no paywall UI.

The planning-day screen in M17 is effectively an informational/display screen showing:
1. Current mode: **Fajr** (default, read from DB).
2. Info card: "Your planning day begins at Fajr prayer. Additional planning day modes (Midnight, Custom) will be available in a future update."
3. No mode selector needed (only one option is available).

### 7.3 Constraints

- `isPremium` is **never read or written** by M17 code.
- No fake paywall, paywall link, or "upgrade" button.
- If a user somehow has `planningDayStart = 'MIDNIGHT'` in their DB (e.g. from direct DB manipulation), M17 displays it correctly but does not allow changing it to anything other than FAJR.
- The DB column `planningDayStart` remains capable of storing `MIDNIGHT` and `CUSTOM:HH:MM` values for when M19 enables them.

---

## 8. ISSUE 3 CORRECTION — SettingsMutationCoordinator

### 8.1 Problem

The original architecture proposed `usePrayerSettingsMutation` as a React hook containing domain orchestration (repository upsert, fullRefresh invocation, Zustand store manipulation). This violates the principle that domain logic must be testable without React.

### 8.2 Solution: Non-React SettingsMutationCoordinator

**File:** `src/services/SettingsMutationCoordinator.ts`

```ts
export type MutationCategory =
  | 'TEMPORAL_FULL_REFRESH'
  | 'HIJRI_RECURRENCE_REFRESH'
  | 'PRESENTATION_ONLY';

export type SettingsMutationResult =
  | { status: 'SUCCESS'; category: MutationCategory; refreshed: boolean }
  | { status: 'FAILED'; error: string };

export class SettingsMutationCoordinator {
  constructor(
    private readonly userSettingsRepo: UserSettingsRepository,
    private readonly plannerRefreshCoordinator: PlannerRefreshCoordinator
  ) {}

  /**
   * Persists a settings patch and runs the appropriate downstream pipeline.
   *
   * 1. Validates mutation input (category must be provided).
   * 2. Persists via userSettingsRepository.upsert(patch).
   * 3. If category is TEMPORAL_FULL_REFRESH or HIJRI_RECURRENCE_REFRESH:
   *    Invokes plannerRefreshCoordinator.fullRefresh() exactly once.
   * 4. Returns typed success/failure.
   *
   * INVARIANT: If persistence fails, no downstream refresh is invoked.
   * INVARIANT: If refresh fails, the error is surfaced but the settings
   *            change is already committed (consistent with existing behavior
   *            in useLocation and task-form save flows).
   */
  async applySettingsChange(
    patch: UserSettingsPatch,
    category: MutationCategory
  ): Promise<SettingsMutationResult>;
}
```

### 8.3 Hook / Controller Boundary

The React hook (`useSettingsMutation`) becomes a thin wrapper:

**File:** `src/hooks/useSettingsMutation.ts`

```ts
export function useSettingsMutation() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (
    patch: UserSettingsPatch,
    category: MutationCategory
  ) => {
    setIsSaving(true);
    setError(null);
    const result = await settingsMutationCoordinator.applySettingsChange(patch, category);
    if (result.status === 'FAILED') {
      setError(result.error);
    }
    setIsSaving(false);
    return result;
  }, []);

  return { isSaving, error, save };
}
```

The hook has **zero domain logic**. It:
1. Manages React loading/error state.
2. Delegates to `SettingsMutationCoordinator`.
3. Returns result to the screen.

### 8.4 `useUserSettings` (read hook — unchanged)

**File:** `src/hooks/useUserSettings.ts`

Simple read hook for loading the `user_settings` row on mount.

```ts
interface UseUserSettingsResult {
  settings: UserSettingsRow | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}
export function useUserSettings(): UseUserSettingsResult;
```

Used by Prayer Calculation, Planning Day, Hijri Calendar, and Appearance screens to read current values.

---

## 9. Sub-Screen Specifications

### 9.1 Prayer Calculation (`prayer-calculation.tsx`)

**Reads from:** `useUserSettings()`
**Writes via:** `useSettingsMutation()` → `SettingsMutationCoordinator.applySettingsChange(patch, 'TEMPORAL_FULL_REFRESH')`

**UI sections:**

1. **Calculation Method** — single-select list of all 12 methods from `CALCULATION_METHOD_LABELS` (in `calculationMethods.ts`). Shows `label` and `description` per item.
2. **Asr School** — two-option toggle: `SHAFI` (Standard) / `HANAFI` (Hanafi). Shows brief description of each.
3. **High Latitude Rule** — four-option single-select: `AUTO` (Recommended) / `MIDDLE_OF_NIGHT` / `ONE_SEVENTH` / `ANGLE_BASED`. `AUTO` is the default and recommended.
4. **Polar Circle Resolution** — three-option single-select: `AQRAB_YAUM` (Nearest Day) / `AQRAB_BALAD` (Nearest Place) / `UNRESOLVED`. Only relevant for extreme latitudes; shown as an advanced option.
5. **Prayer Time Adjustments** — six stepper controls (±60 min, step 1 min): Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha. Parsed from/serialized to `prayerAdjustments` JSON.

**Persistence**: All five groups are saved as a single `upsert` call when the user taps "Save" or navigates away (auto-save with debounce acceptable). `TEMPORAL_FULL_REFRESH` for all changes.

**Transparency requirement (Constitution §7.4)**: A persistent info card explains the active method label and authority.

---

### 9.2 Prayer Location (`prayer-location.tsx`)

**Already complete.** Implemented in M12. Uses `useLocation` hook.

No changes in M17.

---

### 9.3 Planning Day (`planning-day.tsx`)

**Reads from:** `useUserSettings()` — `planningDayStart`

**M17 behavior (per §7 Premium correction):**

- Displays the current planning day mode (always `FAJR` for free users).
- Info card explains: "Your planning day begins at Fajr prayer. Additional planning day modes (Midnight, Custom) will be available in a future update."
- If `planningDayStart` is already `MIDNIGHT` or `CUSTOM:*` (edge case: direct DB manipulation), display the current value but only allow switching back to `FAJR` via `SettingsMutationCoordinator.applySettingsChange({ planningDayStart: 'FAJR' }, 'TEMPORAL_FULL_REFRESH')`.
- No Premium entitlement check. No paywall UI. No disabled options list.

---

### 9.4 Hijri Calendar (`hijri-calendar.tsx`)

**Reads from:** `useUserSettings()` + `HijriMonthOverrideRepository` (to be implemented from stub)
**Writes via:** `useSettingsMutation()` → `SettingsMutationCoordinator.applySettingsChange(patch, ...)`

**UI sections:**

1. **Base Method** — single-select: `UMM_AL_QURA` (Official Saudi Arabia) / `CALCULATED` (Arithmetic). Brief description of each.
   - **Category:** `PRESENTATION_ONLY` — `HijriService` reads `hijriBaseMethod` live. No recurrence impact.
2. **Global Day Adjustment** — stepper ±2 days (range: -2 to +2, step 1). "Adjust all Hijri dates ±1–2 days to match local moon-sighting announcements."
   - **Category:** `HIJRI_RECURRENCE_REFRESH` — changes Hijri-recurring task seed dates.
3. **Month-by-Month Overrides** — list of months with individual ±2 day adjustments. Reads/writes `hijriMonthOverrides` table.
   - **Category:** `HIJRI_RECURRENCE_REFRESH` — changes specific month seed dates.
4. **Info card**: "Hijri dates are calculated algorithmically. Use adjustments to align with your local moon-sighting authority. Changes to adjustments will recompute any Hijri-based recurring tasks."

**Implementation detail**: `HijriMonthOverrideRepository` must be implemented from its current empty stub (`export {};`). It needs `findAll()`, `upsert(year, month, adjustmentDays)`, and `delete(year, month)` methods.

---

### 9.5 Appearance (`appearance.tsx`)

**Reads from:** `ThemeContext.themeMode` (via `useTheme()`)
**Writes via:** `ThemeContext.setThemeMode()` → propagates through `onModeChange` → persists to DB

**UI:**

1. **Theme Mode** — three-option single-select with visual previews:
   - `LIGHT` — "Always light"
   - `DARK` — "Always dark"
   - `SYSTEM` — "Follow system setting" (default)
2. Each option shows a small color swatch preview of the theme palette.

**No coordinator call required.** Theme is purely visual and routed through `ThemeProvider.onModeChange`.

> **Note**: `DO NOT expand dark mode during MVP` (Constitution §9.12) means `DARK` mode is selectable but visual polish is deferred to M21. M17 only wires the toggle; the `darkTheme` tokens already exist.

### 9.6 Theme Wiring

`ThemeProvider` (at `app/_layout.tsx` root) currently accepts `initialMode` but does not load the persisted `themeMode` from the database on mount.

**M17 must add a thin wiring layer in `app/_layout.tsx`**:

```tsx
function RootLayoutWithTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('SYSTEM');

  useEffect(() => {
    userSettingsRepository.get().then(settings => {
      if (settings?.themeMode) {
        setThemeMode(settings.themeMode as ThemeMode);
      }
    });
  }, []);

  const handleModeChange = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    await userSettingsRepository.upsert({ themeMode: mode });
  }, []);

  return (
    <ThemeProvider mode={themeMode} onModeChange={handleModeChange}>
      <Slot />
    </ThemeProvider>
  );
}
```

> **Constraint**: Must use `ThemeProvider`'s existing controlled-mode API. Must NOT use `AsyncStorage` directly or implement a second theme state store.

---

### 9.7 Notifications (`notifications.tsx`)

**Already complete.** Implemented in M13. No changes in M17.

---

### 9.8 Journal Privacy (`journal-privacy.tsx`)

**Reads from:** `JournalLockController.getLockPreference()` (M16)
**Writes via:** `JournalLockController.setLockPreference(enabled: boolean)` (M16)

**UI:**

1. **Biometric Lock** — toggle switch.
   - Label: "Require biometric authentication to view journal entries."
   - When enabling: attempt biometric authentication first; only save `true` if auth succeeds.
   - When disabling: save `false` immediately.
2. **Status row**: Shows current lock state.
3. **Info card**: "Your journal is encrypted with AES-256-GCM. Biometric lock adds an access control layer."

**Not routed through `SettingsMutationCoordinator`** — `JournalLockController` already owns the biometric contract. No `fullRefresh` needed.

---

### 9.9 About (`about.tsx`)

**Static screen.** No DB reads required at runtime.

**UI sections:**

1. **App Info**: App name, version (from `expo-constants`), build number.
2. **Open-Source Credits**:
   - **GeoNames** (CC BY 4.0) — offline city database
   - **Adhan** (MIT) — prayer time calculation
   - **Expo** (MIT) — platform framework
   - **Drizzle ORM** (Apache 2.0) — database ORM
   - **Luxon** (MIT) — datetime handling
   - **expo-crypto** (MIT) — AES-256-GCM encryption
   - **expo-local-authentication** (MIT) — biometric authentication
3. **Legal**: Privacy policy link (placeholder link acceptable for M17). No cloud data collection statement.
4. **Contact** / feedback link (placeholder acceptable for M17).

---

## 10. Component Reuse

M17 will require shared UI patterns across multiple sub-screens. Define these **within the settings feature** to avoid polluting `src/components/common/`:

| Component | Purpose | Location |
|---|---|---|
| `SettingsRow` | Tappable row with icon, label, chevron | `src/components/settings/SettingsRow.tsx` |
| `SettingsSectionHeader` | Section label (e.g. "PRAYER") | `src/components/settings/SettingsSectionHeader.tsx` |
| `SettingsToggle` | Labeled toggle switch row | `src/components/settings/SettingsToggle.tsx` |
| `SettingsSelectOption` | Single-select option row (checkmark) | `src/components/settings/SettingsSelectOption.tsx` |
| `SettingsStepper` | Integer stepper with +/- buttons | `src/components/settings/SettingsStepper.tsx` |
| `SettingsInfoCard` | Informational card with icon + text | `src/components/settings/SettingsInfoCard.tsx` |
| `SettingsScreenHeader` | Screen title + back button (matches existing pattern in prayer-location.tsx) | `src/components/settings/SettingsScreenHeader.tsx` |

All components must use `useTheme()` design tokens exclusively. No hardcoded colors or spacing.

---

## 11. New Files Summary

### 11.1 New Service

| File | Purpose |
|---|---|
| `src/services/SettingsMutationCoordinator.ts` | Non-React orchestrator: validate → persist → classify → invoke downstream |
| `src/services/HijriAdjustmentConfigLoader.ts` | Canonical `loadUserHijriAdjustmentConfig()` extracted from journalDateUtils |

### 11.2 Modified Production Files

| File | Change |
|---|---|
| `src/features/task-form/recurringHorizonSync.ts` | Replace hardcoded `{ globalAdjustment: 0 }` with `await loadUserHijriAdjustmentConfig()` |
| `src/services/journal/journalDateUtils.ts` | Re-export `loadUserHijriAdjustmentConfig` from `HijriAdjustmentConfigLoader` |
| `src/data/repositories/HijriMonthOverrideRepository.ts` | Implement from empty stub |
| `app/_layout.tsx` | Theme persistence wiring |

### 11.3 New Hooks

| File | Purpose |
|---|---|
| `src/hooks/useSettingsMutation.ts` | Thin React wrapper over `SettingsMutationCoordinator` |
| `src/hooks/useUserSettings.ts` | Read-only hook for `user_settings` row |

### 11.4 New Routes

| File | Purpose |
|---|---|
| `app/(tabs)/settings/_layout.tsx` | Stack navigator |
| `app/(tabs)/settings/prayer-calculation.tsx` | Prayer calculation settings |
| `app/(tabs)/settings/planning-day.tsx` | Planning day display (FAJR only) |
| `app/(tabs)/settings/hijri-calendar.tsx` | Hijri adjustment settings |
| `app/(tabs)/settings/journal-privacy.tsx` | Biometric lock toggle |

### 11.5 Replaced Routes

| File | Purpose |
|---|---|
| `app/(tabs)/settings/index.tsx` | Settings Hub |
| `app/(tabs)/settings/appearance.tsx` | Theme selector |
| `app/(tabs)/settings/about.tsx` | About / credits |

### 11.6 Removed Routes

| File |
|---|
| `app/(tabs)/settings/account.tsx` |
| `app/(tabs)/settings/calendar-settings.tsx` |
| `app/(tabs)/settings/planner.tsx` |
| `app/(tabs)/settings/premium.tsx` |

---

## 12. File Classification (Final)

| File | Classification | M17 Action |
|---|---|---|
| `app/(tabs)/settings/_layout.tsx` | **MISSING** | CREATE |
| `app/(tabs)/settings/index.tsx` | Active (placeholder) | REPLACE |
| `app/(tabs)/settings/prayer-location.tsx` | Active (M12, complete) | KEEP — no changes |
| `app/(tabs)/settings/notifications.tsx` | Active (M13, complete) | KEEP — no changes |
| `app/(tabs)/settings/prayer-calculation.tsx` | **MISSING** | CREATE |
| `app/(tabs)/settings/planning-day.tsx` | **MISSING** | CREATE |
| `app/(tabs)/settings/hijri-calendar.tsx` | **MISSING** | CREATE |
| `app/(tabs)/settings/appearance.tsx` | Dormant (placeholder) | REPLACE |
| `app/(tabs)/settings/journal-privacy.tsx` | **MISSING** | CREATE |
| `app/(tabs)/settings/about.tsx` | Dormant (placeholder) | REPLACE |
| `app/(tabs)/settings/account.tsx` | Removable placeholder | REMOVE |
| `app/(tabs)/settings/calendar-settings.tsx` | Removable placeholder | REMOVE |
| `app/(tabs)/settings/planner.tsx` | Removable placeholder | REMOVE |
| `app/(tabs)/settings/premium.tsx` | Removable placeholder | REMOVE |
| `src/services/SettingsMutationCoordinator.ts` | **MISSING** | CREATE |
| `src/services/HijriAdjustmentConfigLoader.ts` | **MISSING** | CREATE |
| `src/hooks/useSettingsMutation.ts` | **MISSING** | CREATE |
| `src/hooks/useUserSettings.ts` | **MISSING** | CREATE |
| `src/data/repositories/HijriMonthOverrideRepository.ts` | Empty stub | IMPLEMENT |
| `src/features/task-form/recurringHorizonSync.ts` | Active | MODIFY (Hijri config fix) |
| `src/services/journal/journalDateUtils.ts` | Active | MODIFY (re-export from extracted loader) |
| `app/_layout.tsx` | Active | MODIFY (theme wiring) |

---

## 13. Test Coverage Requirements

### 13.1 Unit Tests (Jest)

| Test File | Scope |
|---|---|
| `src/services/__tests__/SettingsMutationCoordinator.test.ts` | **COORDINATOR**: persist → classify → invoke; failed persistence blocks refresh; no refresh for PRESENTATION_ONLY; single fullRefresh for TEMPORAL/HIJRI; downstream failure surfaced |
| `src/services/__tests__/HijriAdjustmentConfigLoader.test.ts` | Loads global adjustment; loads month overrides; defaults to 0 when no settings; handles empty override table |
| `src/data/repositories/__tests__/HijriMonthOverrideRepository.test.ts` | findAll, upsert, delete, unique constraint enforcement |
| `src/hooks/__tests__/useSettingsMutation.test.ts` | Thin hook: calls coordinator, exposes loading/error state |
| `src/hooks/__tests__/useUserSettings.test.ts` | Load on mount, reload, error states |
| `app/(tabs)/settings/__tests__/SettingsHub.test.tsx` | Hub renders all group rows; each row navigates correctly |
| `app/(tabs)/settings/__tests__/PrayerCalculation.test.tsx` | Renders all 5 groups; save calls coordinator with TEMPORAL_FULL_REFRESH; correct patch |
| `app/(tabs)/settings/__tests__/PlanningDay.test.tsx` | Displays FAJR as active; info card shows Premium deferral; no MIDNIGHT/CUSTOM selectable |
| `app/(tabs)/settings/__tests__/HijriCalendar.test.tsx` | Base method selection (PRESENTATION_ONLY); global adjustment stepper (HIJRI_RECURRENCE_REFRESH); month overrides |
| `app/(tabs)/settings/__tests__/Appearance.test.tsx` | Theme mode selection calls setThemeMode; correct value persisted |
| `app/(tabs)/settings/__tests__/JournalPrivacy.test.tsx` | Toggle enable path: biometric auth called first; toggle disable: direct save |
| `app/(tabs)/settings/__tests__/About.test.tsx` | Static content renders; version number present |

### 13.2 Hijri Recurrence Tests (NEW — Issue 1)

| Test | Scope |
|---|---|
| `src/features/task-form/__tests__/recurringHorizonSync.hijriConfig.test.ts` | **H-01**: sync() loads actual hijriGlobalAdjustment from DB, not hardcoded 0 |
| | **H-02**: syncRange() loads actual hijriGlobalAdjustment from DB, not hardcoded 0 |
| | **H-03**: globalAdjustment=+1 shifts desired Hijri recurrence seed dates |
| | **H-04**: month override shifts desired seed dates for specific Hijri months |
| | **H-05**: fullRefresh with updated adjustment reconciles PENDING Hijri occurrences |
| | **H-06**: COMPLETED/MISSED/CANCELLED Hijri occurrences remain untouched after adjustment change |
| | **H-07**: Gregorian-recurring tasks unaffected by Hijri adjustment changes |
| | **H-08**: Calendar/Journal effective Hijri display uses same canonical config |

### 13.3 Planning Day Premium Tests (NEW — Issue 2)

| Test | Scope |
|---|---|
| `app/(tabs)/settings/__tests__/PlanningDay.test.tsx` | **P-01**: Free/default state displays FAJR as active mode |
| | **P-02**: MIDNIGHT is not rendered as a selectable option |
| | **P-03**: CUSTOM is not rendered as a selectable option |
| | **P-04**: `isPremium` is never read or written by planning-day screen |
| | **P-05**: No paywall UI elements rendered |

### 13.4 Mutation Coordinator Tests (NEW — Issue 3)

| Test | Scope |
|---|---|
| `src/services/__tests__/SettingsMutationCoordinator.test.ts` | **MC-01**: Setting persists via upsert before downstream call |
| | **MC-02**: TEMPORAL_FULL_REFRESH invokes fullRefresh exactly once |
| | **MC-03**: HIJRI_RECURRENCE_REFRESH invokes fullRefresh exactly once |
| | **MC-04**: PRESENTATION_ONLY does NOT invoke fullRefresh |
| | **MC-05**: Failed persistence does not invoke downstream refresh |
| | **MC-06**: Downstream refresh failure is surfaced in result (settings already committed) |
| | **MC-07**: No double-refresh: same value → no unnecessary refresh (optimization, optional) |

### 13.5 Integration Invariants

These must be confirmed by implementation tests:

1. **Terminal state safety**: After changing `calculationMethod`, no `COMPLETED` / `MISSED` / `CANCELLED` occurrence row is mutated.
2. **Theme persistence**: After setting theme to `DARK`, a fresh `userSettingsRepository.get()` returns `themeMode: 'DARK'`.
3. **Hijri recurrence consistency**: After changing `hijriGlobalAdjustment`, the next `fullRefresh` uses the updated value in `RecurringHorizonSync`.

---

## 14. Worship Deferment Safeguard

M17 must **not**:
- Render `worshipSuggestionsEnabled` toggle
- Reference `src/domain/worship/` modules
- Add any UI path to `worship_item_settings`

The dormant schema columns (`worshipItemKey`, `worshipSuggestionsEnabled`, `source='WORSHIP'`) and `src/domain/worship/` stubs are preserved as-is.

---

## 15. Design System Compliance

All M17 screens must:
- Use `useTheme()` tokens exclusively (no hardcoded colors/spacing/radii)
- Honor `touchTargets.min` (44px) for all interactive elements
- Use `typography.*` scale for all text
- Follow the existing `prayer-location.tsx` and `notifications.tsx` header pattern (Pressable back button + title + spacer)
- Use `SafeAreaView` with appropriate `edges` prop per screen position

---

## 16. ISSUE 4 — Source-of-Truth Doc Reconciliation

The following documents are amended in the hardening commit:

### 16.1 `docs/MASTER_PRODUCT_SPEC.md`

| Section | Current (stale) | Corrected |
|---|---|---|
| §4 Bottom Navigation | `Today \| Calendar \| + \| Worship \| Settings` | `Today \| Calendar \| + \| Journal \| Settings` |
| §4.4 | "Worship" | "Journal" with description "Private encrypted daily journal with Hijri date display" |
| §4.5 Settings | "Prayer, location, planner, notification, appearance, account, Premium, help" | "Prayer Calculation, Prayer Location, Planning Day, Hijri Calendar, Appearance, Notifications, Journal Privacy, About" |
| §32 Settings IA | Lists "Worship Suggestions", "Account & Sync", "Premium" as active | Add deferment note: "Worship Suggestions: DEFERRED. Account & Sync: DEFERRED. Premium: DEFERRED to M19." |
| §34 Planner Settings | Lists "custom planning-day start" as Premium without stating MIDNIGHT explicitly | Add note: "MIDNIGHT and CUSTOM modes are Premium (M19). FAJR is free/default." |
| Milestone table | M15 "Worship Suggestions engine", M16 "Worship UI" | M15 "Journal Core & Privacy", M16 "Journal Experience / UI" |
| Screen inventory | Lists "Worship Suggestions", "Worship category detail" | Replace with "Journal" |

### 16.2 `docs/IMPLEMENTATION_STATUS.md`

| Change | Detail |
|---|---|
| Line 3 header | Update from "PENDING — ARCHITECTURE NOT YET FROZEN" to "ARCHITECTURE FROZEN — HARDENED" |

### 16.3 `docs/CURRENT_MILESTONE.md`

| Change | Detail |
|---|---|
| Architecture status | Update to reflect hardening amendment commit |

---

## 17. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| D1 | Stack layout inside Settings tab | Prevents sub-screens from leaking into bottom-nav; enables native back gesture |
| D2 | Remove 4 placeholder routes | `account`, `premium`, `calendar-settings`, `planner` have no M17 scope; removing avoids dead routes; future M19+ paths documented |
| D3 | `SettingsMutationCoordinator` (non-React) | Domain orchestration must be testable without React; hooks are thin wrappers only |
| D4 | `useUserSettings` hook | DRY: centralizes DB read + loading state |
| D5 | FAJR-only in M17 (Option A) | Smallest implementation; MIDNIGHT/CUSTOM are Premium (M19); no fake entitlement |
| D6 | One new service (`SettingsMutationCoordinator`) | Replaces hook-based orchestration; validates, persists, classifies, invokes |
| D7 | Theme wiring in `_layout.tsx` root | `ThemeProvider` already at root; persistence belongs in the same layer |
| D8 | Hijri adjustment: `HIJRI_RECURRENCE_REFRESH` | Changing adjustment shifts Hijri-recurring seed dates; requires fullRefresh |
| D9 | Hijri base method: `PRESENTATION_ONLY` | `HijriService` reads base method live; no recurrence membership change |
| D10 | Journal Privacy delegates to `JournalLockController` | M16 owns the biometric contract; Settings is a thin surface |
| D11 | Extract `loadUserHijriAdjustmentConfig` to standalone module | Avoids circular dependency (recurrence → journal); single canonical source |
| D12 | `RecurringHorizonSync` loads config internally | Keeps API surface stable; ensures fresh DB state on every sync invocation |

---

## 18. Dependency and Migration Count

| Metric | Count |
|---|---|
| New npm dependencies | **0** |
| New database migrations | **0** |
| Schema changes | **0** (all tables/columns already exist) |

---

## 19. Verification Plan

### Pre-commit (hardening amendment)

- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Tests pass: `npx jest --passWithNoTests`
- [ ] Git status clean
- [ ] origin/main unchanged at `09c68cd`

### Post-implementation (before review request)

- [ ] All 1092+ existing tests pass
- [ ] New test count meets §13 requirements (12+ new test files)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx eslint src` clean
- [ ] No placeholder screens remain in `app/(tabs)/settings/`
- [ ] Terminal state safety confirmed via test (§13.5.1)
- [ ] Theme persistence confirmed via test (§13.5.2)
- [ ] Hijri recurrence consistency confirmed via test (§13.5.3)
- [ ] Navigation: all rows in hub navigate to correct sub-screens
- [ ] Back-button returns to hub from every sub-screen
- [ ] MIDNIGHT/CUSTOM not selectable in planning-day screen
- [ ] `isPremium` never referenced in M17 production code
- [ ] `SettingsMutationCoordinator` tests pass independently of React
- [x] `RecurringHorizonSync` uses actual stored Hijri adjustment, not hardcoded 0

---

## 14. M17 Closure Record

**Status:** CLOSED / SONNET APPROVED
**Closed:** 2026-09-18

### 14.1 Commits

| Role | Commit |
|---|---|
| Architecture freeze | `00891c2` — `docs: freeze M17 Settings architecture` |
| Architecture hardening | `a2af7a3` — `docs: harden M17 settings architecture` |
| Implementation | `76ac716` — `feat(settings): implement M17 settings experience` |
| Closure (docs + ADR-025) | See DECISIONS.md ADR-025 |

### 14.2 Independent Review Outcome

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 3 |
| OBSERVATION | 4 |

**MEDIUM-1 resolution:** Prayer adjustment ±60 range was architecture-frozen (M17_ARCHITECTURE.md §9.1) but lacked prior ADR provenance. Resolved during closure by adding ADR-025 to `docs/DECISIONS.md`. No production code change required.

### 14.3 Final Pre-Closure Verification

| Check | Result |
|---|---|
| Tests | 1171 / 1171 passing, 102 suites |
| TypeScript | 0 errors |
| ESLint | 0 errors / warnings |
| New migrations | 0 |
| New dependencies | 0 |
| M15 crypto diff | 0 (unchanged) |

### 14.4 Native / Operational QA Carry-Forward

The following require a physical device or simulator and do not reopen M17:
- Cold-start theme hydration visual behavior
- Settings Stack back gesture
- Physical biometric enable/disable through Settings
- Prayer preview / stepper interaction on device
- Confirm exactly five permanent bottom destinations
- Settings persistence across process restart

### 14.5 H-09 Regression Test — M23 Carry-Forward

`syncRange()` loader-failure non-destructive behavior was verified by code analysis and M14 zero-deletion invariant. The dedicated H-09 regression test is deferred to M23 (QA / edge-case milestone) as a regression hardening item. This does not reopen M17.
