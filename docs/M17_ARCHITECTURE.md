# M17 — Settings Architecture

> **Status:** FROZEN — APPROVED FOR IMPLEMENTATION
> **Authored:** 2026-09-18
> **Milestone:** M17 — Settings & Preferences UI
> **Baseline commit:** 09c68cd (M16 closed / Sonnet approved)
> **Implementation commit:** TBD

---

## 0. Document Purpose

This document freezes the technical architecture for M17. Implementation agents **must not** begin coding until this document is committed locally with the freeze commit. No production code may deviate from this specification without a formal revision.

---

## 1. Goal Summary

Deliver a fully functional, accessible Settings experience that:

1. Surfaces all existing user-facing preferences stored in `user_settings`.
2. Coordinates preference mutations through **existing canonical services** — never bypassing them.
3. Wires theme persistence into the existing `ThemeProvider` (already live in root `_layout.tsx`).
4. Adds a **Stack navigator layout** to `app/(tabs)/settings/` so sub-screens navigate with a proper back-button stack without leaking routes into the Bottom Nav.
5. Implements a unified Settings Hub (`index.tsx`) that lists all settings groups as navigable rows.
6. Builds each sub-screen to completion — **no placeholders at M17 close**.

---

## 2. Scope Boundary

### 2.1 In Scope — M17

| Group | Sub-screen route | Description |
|---|---|---|
| **Prayer Calculation** | `prayer-calculation.tsx` *(new)* | Method, Asr school, High-latitude rule, Polar circle resolution, per-prayer minute adjustments |
| **Location** | `prayer-location.tsx` *(existing, keep)* | AUTO/MANUAL mode, city search — already fully implemented |
| **Planning Day** | `planning-day.tsx` *(new)* | Day-start boundary: Fajr / Midnight / Custom time |
| **Hijri Calendar** | `hijri-calendar.tsx` *(new)* | Global ±2 day adjustment, per-month override list |
| **Appearance** | `appearance.tsx` *(replace placeholder)* | Light / Dark / System theme selector |
| **Notifications** | `notifications.tsx` *(existing, keep)* | Permission grant, reconcile trigger — already fully implemented |
| **Journal Privacy** | `journal-privacy.tsx` *(new)* | Biometric lock toggle (reads/writes `JournalLockController`) |
| **About** | `about.tsx` *(replace placeholder)* | App version, open-source credits (GeoNames, Adhan, Expo), legal |
| **Settings Hub** | `index.tsx` *(replace placeholder)* | Root list: all groups as tappable rows |
| **Stack layout** | `_layout.tsx` *(new)* | Expo Router Stack navigator for settings sub-screens |

### 2.2 Explicitly Out of Scope — M17

| Item | Reason |
|---|---|
| Premium / entitlement gating | Deferred to M19 |
| Account / cloud sync | Not designed |
| Data export / destructive reset | Not architecturally vetted — defer |
| Worship Suggestions toggle | Worship deferred; `worshipSuggestionsEnabled` column preserved dormant |
| Prayer alert toggles | Deferred; notification engine has no per-prayer alert UI |
| Custom planning day *prayer-offset* mode | `CUSTOM:prayer+offset` format exists in schema; UI deferred post-MVP |
| Premium planning day features (Midnight, Custom) | UI gating deferred to M19; expose all options in M17 with no paywall guard |

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

### 3.3 Route Map

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

Removable stubs (currently placeholder only):
- `account.tsx` → **REMOVE** (no account system in M17)
- `calendar-settings.tsx` → **REMOVE** (no calendar settings defined; Calendar is view-only)
- `planner.tsx` → **REMOVE** (planning day is covered by `planning-day.tsx`)
- `premium.tsx` → **REMOVE** (deferred to M19)

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

Settings screens are **thin UI shells** over canonical services. They **never** implement preference logic themselves; they delegate exclusively to existing service layer.

```
Settings UI
    │
    ▼
userSettingsRepository.upsert(patch)      ← data layer
    │
    ▼
plannerRefreshCoordinator.fullRefresh()   ← canonical refresh pipeline
    │
    ▼
[RecurringHorizonSync, TodayOrchestrator, OccurrenceLifecycleService,
 NotificationReconciliationService]
    │
    ▼
useTodayStore.commitRefresh(...)
```

### 5.2 Mutation Side-Effect Matrix

| Setting Changed | DB Write | fullRefresh Required | Additional Side Effect |
|---|---|---|---|
| `calculationMethod` | `userSettings.upsert` | **YES** | Prayer times change → all PENDING occurrences shift |
| `asrMethod` | `userSettings.upsert` | **YES** | Same as above |
| `highLatitudeRule` | `userSettings.upsert` | **YES** | Same as above |
| `polarCircleResolution` | `userSettings.upsert` | **YES** | Same as above |
| `prayerAdjustments` | `userSettings.upsert` | **YES** | Per-prayer minute offsets shift task placement |
| `planningDayStart` | `userSettings.upsert` | **YES** | Planning day boundaries shift; occurrences re-project |
| `hijriBaseMethod` | `userSettings.upsert` | NO | HijriService reads live; no PENDING occurrence shift |
| `hijriGlobalAdjustment` | `userSettings.upsert` | NO | Calendar display only |
| `themeMode` | `userSettings.upsert` + `ThemeProvider.setThemeMode()` | NO | Visual-only; no planner pipeline impact |
| `locationMode` / coordinates | Already handled by `useLocation` hook | — | `useLocation` owns the full mutation + refresh cycle |

> **Terminal State Safety**: `fullRefresh()` → `PlannerRefreshCoordinator` → `OccurrenceLifecycleService.sweepExpired()` only touches `PENDING` occurrences. Terminal states (`COMPLETED`, `MISSED`, `CANCELLED`) are permanently immutable and will not be reinterpreted by any settings change.

### 5.3 usePrayerSettingsMutation Hook (new)

To avoid duplicating mutation logic across sub-screens, introduce a single shared hook:

```ts
// src/hooks/usePrayerSettingsMutation.ts
interface MutationOptions {
  requiresFullRefresh: boolean;
}
interface MutationResult {
  isSaving: boolean;
  save: (patch: UserSettingsPatch) => Promise<void>;
  error: string | null;
}
export function usePrayerSettingsMutation(
  options: MutationOptions
): MutationResult;
```

Internal flow:
1. `setIsSaving(true)`
2. `userSettingsRepository.upsert(patch)`
3. If `requiresFullRefresh`:
   - `token = useTodayStore.getState().startRefresh()`
   - `result = await plannerRefreshCoordinator.fullRefresh()`
   - `useTodayStore.getState().commitRefresh(token, {...}, true)`
4. `setIsSaving(false)`
5. On error: `setError(message)`

This hook is the **only** place in M17 that calls `plannerRefreshCoordinator.fullRefresh()` from a Settings screen.

> **Note on Location**: Location mutation is **not** routed through `usePrayerSettingsMutation`. It is owned exclusively by the existing `useLocation` hook which already contains the full mutation + refresh cycle per M12 architecture.

### 5.4 Theme Wiring

`ThemeProvider` (at `app/_layout.tsx` root) currently accepts `initialMode` but does not load the persisted `themeMode` from the database on mount.

**M17 must add a thin wiring layer in `app/_layout.tsx`**:

```tsx
// app/_layout.tsx
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

The Appearance screen calls `setThemeMode()` from `useTheme()`, which propagates through `ThemeProvider`'s `onModeChange` callback into the root state and persists to DB.

> **Constraint**: Must use `ThemeProvider`'s existing controlled-mode API (`mode` + `onModeChange` props). Must NOT use `AsyncStorage` directly or implement a second theme state store.

---

## 6. Sub-Screen Specifications

### 6.1 Prayer Calculation (`prayer-calculation.tsx`)

**Reads from:** `userSettings` (via `userSettingsRepository.get()`)
**Writes via:** `usePrayerSettingsMutation({ requiresFullRefresh: true })`

**UI sections:**

1. **Calculation Method** — single-select list of all 12 methods from `CALCULATION_METHOD_LABELS` (in `calculationMethods.ts`). Shows `label` and `description` per item.
2. **Asr School** — two-option toggle: `SHAFI` (Standard) / `HANAFI` (Hanafi). Shows brief description of each.
3. **High Latitude Rule** — four-option single-select: `AUTO` (Recommended) / `MIDDLE_OF_NIGHT` / `ONE_SEVENTH` / `ANGLE_BASED`. `AUTO` is the default and recommended.
4. **Polar Circle Resolution** — three-option single-select: `AQRAB_YAUM` (Nearest Day) / `AQRAB_BALAD` (Nearest Place) / `UNRESOLVED`. Only relevant for extreme latitudes; shown as an advanced option.
5. **Prayer Time Adjustments** — six stepper controls (±60 min, step 1 min): Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha. Parsed from/serialized to `prayerAdjustments` JSON.

**Persistence**: All five groups are saved as a single `upsert` call when the user taps "Save" or navigates away (auto-save with debounce acceptable). `requiresFullRefresh: true` for all changes.

**Transparency requirement (Constitution §7.4)**: A persistent info card explains the active method label and authority.

---

### 6.2 Prayer Location (`prayer-location.tsx`)

**Already complete.** Implemented in M12. Uses `useLocation` hook.

No changes in M17.

---

### 6.3 Planning Day (`planning-day.tsx`)

**Reads from:** `userSettings.planningDayStart`
**Writes via:** `usePrayerSettingsMutation({ requiresFullRefresh: true })`

**Schema encoding** (already in DB):
- `'FAJR'` → `{ mode: 'FAJR' }`
- `'MIDNIGHT'` → `{ mode: 'MIDNIGHT' }`
- `'CUSTOM:HH:MM'` → `{ mode: 'CUSTOM', localTime: 'HH:MM' }` (e.g. `'CUSTOM:04:30'`)

**UI:**

1. **Mode selector** — three-option single-select:
   - `FAJR` (Default — Recommended): "Day begins at Fajr prayer."
   - `MIDNIGHT`: "Day begins at civil midnight."
   - `CUSTOM`: "Day begins at a fixed local time." → reveals time picker.
2. **Custom time picker** (visible only when `CUSTOM` selected): `HH:MM` local time input, range 00:00–23:59.
3. **Info card**: Explains the impact on task occurrence assignment.

> **No paywall in M17**: All three modes are exposed. Premium gating is M19's responsibility.

---

### 6.4 Hijri Calendar (`hijri-calendar.tsx`)

**Reads from:** `userSettings.hijriBaseMethod`, `userSettings.hijriGlobalAdjustment`, `hijriMonthOverrides` table
**Writes:** `userSettingsRepository.upsert(patch)` (no `fullRefresh` required for Hijri settings)

**UI sections:**

1. **Base Method** — single-select: `UMM_AL_QURA` (Official Saudi Arabia) / `CIVIL` (Arithmetic Civil). Brief description of each.
2. **Global Day Adjustment** — stepper ±2 days (range: -2 to +2, step 1). "Adjust all Hijri dates ±1–2 days to match local moon-sighting announcements."
3. **Month-by-Month Overrides** — list of months with individual ±2 day adjustments. Reads/writes `hijriMonthOverrides` table via `HijriMonthOverrideRepository` (already exists from M8).
4. **Info card**: "Hijri dates are calculated algorithmically. Use adjustments to align with your local moon-sighting authority."

**Schema note**: `hijriMonthOverrides` table is already schema-defined. Repository methods must be verified at implementation time.

---

### 6.5 Appearance (`appearance.tsx`)

**Reads from:** `ThemeContext.themeMode` (via `useTheme()`)
**Writes via:** `ThemeContext.setThemeMode()` → propagates through `onModeChange` → persists to DB

**UI:**

1. **Theme Mode** — three-option single-select with visual previews:
   - `LIGHT` — "Always light"
   - `DARK` — "Always dark"
   - `SYSTEM` — "Follow system setting" (default)
2. Each option shows a small color swatch preview of the theme palette.

**No fullRefresh required.** Theme is purely visual.

> **Note**: `DO NOT expand dark mode during MVP` (Constitution §9.12) means `DARK` mode is selectable but visual polish is deferred to M21. M17 only wires the toggle; the `darkTheme` tokens already exist.

---

### 6.6 Notifications (`notifications.tsx`)

**Already complete.** Implemented in M13. Uses `NotificationSchedulerAdapter`, `NotificationChannelManager`, `NotificationReconciliationService`.

No changes in M17.

---

### 6.7 Journal Privacy (`journal-privacy.tsx`)

**Reads from:** `JournalLockController.getLockPreference()` (M16)
**Writes via:** `JournalLockController.setLockPreference(enabled: boolean)` (M16)

**UI:**

1. **Biometric Lock** — toggle switch.
   - Label: "Require biometric authentication to view journal entries."
   - When enabling: attempt biometric authentication first; only save `true` if auth succeeds.
   - When disabling: save `false` immediately.
2. **Status row**: Shows current lock state.
3. **Info card**: "Your journal is encrypted with AES-256-GCM. Biometric lock adds an access control layer."

**Implementation notes:**
- Import `JournalLockController` from `@/services/journal/JournalLockController`.
- Uses `LocalAuthentication` (already wired in M16) for the enabling flow.
- No `fullRefresh` needed — journal lock is not in the planner pipeline.

---

### 6.8 About (`about.tsx`)

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

## 7. Component Reuse

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

## 8. New Service / Hook

### 8.1 `usePrayerSettingsMutation` (new hook)

**File:** `src/hooks/usePrayerSettingsMutation.ts`

Encapsulates the standard mutation + optional fullRefresh pattern used by Prayer Calculation and Planning Day screens. See §5.3 for full interface and flow.

### 8.2 `useUserSettings` (new hook)

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

### 8.3 No New Service Layer

M17 adds **no new services** to `src/services/`. All mutation routing goes through:
- `userSettingsRepository` (existing)
- `plannerRefreshCoordinator` (existing)
- `JournalLockController` (existing, M16)

---

## 9. File Classification

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

---

## 10. Test Coverage Requirements

### 10.1 Unit Tests (Jest)

| Test File | Scope |
|---|---|
| `src/hooks/__tests__/usePrayerSettingsMutation.test.ts` | Verifies upsert + fullRefresh orchestration; verifies no fullRefresh called when flag is false |
| `src/hooks/__tests__/useUserSettings.test.ts` | Load on mount, reload, error states |
| `app/(tabs)/settings/__tests__/SettingsHub.test.tsx` | Hub renders all group rows; each row navigates correctly |
| `app/(tabs)/settings/__tests__/PrayerCalculation.test.tsx` | Renders all 5 groups; save calls upsert with correct patch; fullRefresh triggered |
| `app/(tabs)/settings/__tests__/PlanningDay.test.tsx` | FAJR/MIDNIGHT/CUSTOM selection; CUSTOM shows time picker; correct patch encoding |
| `app/(tabs)/settings/__tests__/HijriCalendar.test.tsx` | Base method selection; global adjustment stepper; no fullRefresh |
| `app/(tabs)/settings/__tests__/Appearance.test.tsx` | Theme mode selection calls setThemeMode; correct value persisted |
| `app/(tabs)/settings/__tests__/JournalPrivacy.test.tsx` | Toggle enable path: biometric auth called first; toggle disable: direct save |
| `app/(tabs)/settings/__tests__/About.test.tsx` | Static content renders; version number present |

### 10.2 Integration Invariants

These must be confirmed by implementation tests:

1. **Terminal state safety**: After changing `calculationMethod`, no `COMPLETED` / `MISSED` / `CANCELLED` occurrence row is mutated.
2. **Theme persistence**: After setting theme to `DARK`, a fresh `userSettingsRepository.get()` returns `themeMode: 'DARK'`.
3. **No double-refresh**: Changing a setting value that is already the current value does not trigger an unnecessary fullRefresh.

---

## 11. Worship Deferment Safeguard

M17 must **not**:
- Render `worshipSuggestionsEnabled` toggle
- Reference `src/domain/worship/` modules
- Add any UI path to `worship_item_settings`

The dormant schema columns (`worshipItemKey`, `worshipSuggestionsEnabled`, `source='WORSHIP'`) and `src/domain/worship/` stubs are preserved as-is.

---

## 12. Design System Compliance

All M17 screens must:
- Use `useTheme()` tokens exclusively (no hardcoded colors/spacing/radii)
- Honor `touchTargets.min` (44px) for all interactive elements
- Use `typography.*` scale for all text
- Follow the existing `prayer-location.tsx` and `notifications.tsx` header pattern (Pressable back button + title + spacer)
- Use `SafeAreaView` with appropriate `edges` prop per screen position

---

## 13. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| D1 | Stack layout inside Settings tab | Prevents sub-screens from leaking into bottom-nav; enables native back gesture |
| D2 | Remove 4 placeholder routes | `account`, `premium`, `calendar-settings`, `planner` have no M17 scope; removing avoids dead routes |
| D3 | `usePrayerSettingsMutation` hook | DRY: centralizes upsert + fullRefresh pattern across 2+ screens |
| D4 | `useUserSettings` hook | DRY: centralizes DB read + loading state |
| D5 | All modes exposed, no paywall | Premium gating is M19; exposing all options avoids architecture coupling |
| D6 | No new services | All needed service interfaces already exist |
| D7 | Theme wiring in `_layout.tsx` root | `ThemeProvider` already at root; persistence belongs in the same layer |
| D8 | Hijri: no fullRefresh | `HijriService` reads settings live per call; no PENDING occurrence re-projection needed |
| D9 | Journal Privacy delegates to `JournalLockController` | M16 owns the biometric contract; Settings is a thin surface |

---

## 14. Verification Plan

### Pre-commit (architecture freeze)

- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Tests pass: `npx jest --passWithNoTests`
- [ ] Git status clean

### Post-implementation (before review request)

- [ ] All 1092+ existing tests pass
- [ ] New test count meets §10.1 requirements (9+ new test files)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx eslint src` clean
- [ ] No placeholder screens remain in `app/(tabs)/settings/`
- [ ] Terminal state safety confirmed via test
- [ ] Theme persistence confirmed via test
- [ ] Navigation: all rows in hub navigate to correct sub-screens
- [ ] Back-button returns to hub from every sub-screen
