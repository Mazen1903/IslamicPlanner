# M19 — Premium Entitlement Scaffolding Architecture

> **Status:** FROZEN — PENDING OPUS INDEPENDENT REVIEW
> **Authored:** 2026-09-18
> **Baseline commit:** b5666e4ee91dd9f93c0504b695a6927eb8e417c6 (M18 CLOSED)
> **Milestone:** M19 — Premium Entitlement Scaffolding
> **Review required:** Opus independent architecture/security review before implementation begins

---

## 1. Scope

M19 creates a clean, abstract entitlement boundary so that future store billing can replace the entitlement source without rewriting feature UI or planner logic.

**M19 actively gates exactly two features that are already explicitly documented as Premium:**

| Feature key | Persisted value | Authorization |
|---|---|---|
| `PLANNING_DAY_MIDNIGHT` | `MIDNIGHT` | PREMIUM required |
| `PLANNING_DAY_CUSTOM` | `CUSTOM:HH:mm` | PREMIUM required |

**FAJR** (`planningDayStart = 'FAJR'`) remains universally free and selectable by all users.

M19 replaces the temporary M17 FAJR-only guard in `SettingsMutationCoordinator` with a principled, entitlement-aware `PlanningDayMutationCoordinator`.

---

## 2. Non-Goals (Strict)

| Non-goal | Reason |
|---|---|
| App Store / Google Play billing | Future milestone |
| RevenueCat / Stripe / any payment SDK | Future milestone |
| Subscription plans / pricing / trials | Future milestone |
| Fake "Upgrade" button or purchase screen | No purchase flow exists in M19 |
| Accounts / login requirement | No auth system in scope |
| Cloud entitlement validation | Offline-first; no server |
| Auto-downgrade on entitlement loss | Requires temporal reconciliation; explicitly deferred |
| Retroactive gating on M18 Small/Medium widgets | M18 shipped them FREE; they remain FREE |
| Large widget | Still deferred |
| Premium prayer completion tracking | Future milestone |
| Advanced reminder sequences | Future milestone |
| Extra themes / accent customization | Future milestone |
| Journal paywalling | Violates privacy/security isolation |
| New database columns | Zero migrations (isPremium already exists) |
| New npm runtime dependencies | Zero runtime dependencies added |

---

## 3. Entitlement Terminology

| Term | Definition |
|---|---|
| **Tier** | `FREE` or `PREMIUM` |
| **Feature key** | A typed constant identifying a specific Premium capability |
| **Entitlement snapshot** | The resolved tier + metadata at a point in time |
| **EntitlementService** | The non-React abstraction through which all feature code queries entitlement |
| **EntitlementRepository** | Thin read-only data-layer adapter — the only code permitted to read `user_settings.isPremium` for entitlement resolution |
| **PlanningDayMutationCoordinator** | The single authorized service for changing `planningDayStart` — owns validation, authorization, persistence, and refresh |
| **Fail-closed** | Any entitlement read failure results in Premium features being denied, never granted |
| **Authorization boundary** | Entitlement gates the right to CHANGE a Premium setting — it does NOT reinterpret already-persisted planner state |

---

## 4. Entitlement Source of Truth (M19)

For M19, the local entitlement snapshot is `user_settings.isPremium` (BOOLEAN, existing schema column).

| `isPremium` value | Tier |
|---|---|
| `true` | `PREMIUM` |
| `false` | `FREE` |
| Row missing / DB error | `UNAVAILABLE` → fail-closed |

The `EntitlementService` interface is the only surface that future billing adapters need to implement. When StoreKit / Google Play / RevenueCat replaces the local DB source, `LocalEntitlementService` is swapped for a `StoreEntitlementService`. No feature screens change.

---

## 5. EntitlementService Contract

```typescript
// src/domain/entitlement/types.ts

export type EntitlementTier = 'FREE' | 'PREMIUM';

export type PremiumFeature =
  | 'PLANNING_DAY_MIDNIGHT'
  | 'PLANNING_DAY_CUSTOM';

export type EntitlementSnapshot =
  | { status: 'READY'; tier: EntitlementTier; isPremium: boolean; source: 'LOCAL_DB' }
  | { status: 'UNAVAILABLE'; reason: string };

export interface EntitlementService {
  /** Never throws — returns UNAVAILABLE on any read failure. */
  getSnapshot(): Promise<EntitlementSnapshot>;
  /** Returns false on UNAVAILABLE (fail-closed). Never throws. */
  hasFeature(feature: PremiumFeature): Promise<boolean>;
}
```

Feature authorization matrix:

| Feature key | FREE | PREMIUM | UNAVAILABLE |
|---|---|---|---|
| `PLANNING_DAY_MIDNIGHT` | false | true | false |
| `PLANNING_DAY_CUSTOM` | false | true | false |

Fail-closed invariant:
```
catch { return false }    // CORRECT — fail-closed on error
catch { return true }     // FORBIDDEN — fail-open, security regression
```

---

## 6. EntitlementRepository Contract

```typescript
// src/data/repositories/EntitlementRepository.ts

/**
 * Read-only data-layer adapter.
 * The ONLY code permitted to read user_settings.isPremium for entitlement.
 * Has NO write methods.
 */
export interface EntitlementRepositoryAPI {
  readIsPremium(): Promise<boolean | null>;
}
```

---

## 7. LocalEntitlementService Implementation

```typescript
// src/domain/entitlement/EntitlementService.ts

export class LocalEntitlementService implements EntitlementService {
  constructor(private readonly repo: EntitlementRepositoryAPI) {}

  async getSnapshot(): Promise<EntitlementSnapshot> {
    try {
      const raw = await this.repo.readIsPremium();
      if (raw === null) return { status: 'READY', tier: 'FREE', isPremium: false, source: 'LOCAL_DB' };
      const tier: EntitlementTier = raw ? 'PREMIUM' : 'FREE';
      return { status: 'READY', tier, isPremium: raw, source: 'LOCAL_DB' };
    } catch (err: any) {
      return { status: 'UNAVAILABLE', reason: err?.message ?? 'Entitlement source unavailable' };
    }
  }

  async hasFeature(feature: PremiumFeature): Promise<boolean> {
    const snapshot = await this.getSnapshot();
    if (snapshot.status === 'UNAVAILABLE') return false; // fail-closed
    return snapshot.tier === 'PREMIUM';
  }
}

export const localEntitlementService = new LocalEntitlementService(new EntitlementRepository());
```

---

## 8. PremiumFeature Registry

M19 active features: `PLANNING_DAY_MIDNIGHT` | `PLANNING_DAY_CUSTOM`

Future candidates (NOT in M19): `PRAYER_COMPLETION_TRACKING`, `ADVANCED_REMINDERS`, `ADVANCED_THEMES`, `ADVANCED_WIDGETS`, `ADVANCED_ROUTINES`, `CLOUD_SYNC`, `STATISTICS`

Do NOT add future candidates to the registry until their gating code is being implemented.

---

## 9. Fail-Closed Rules

1. DB read failure → UNAVAILABLE — `getSnapshot()` catches all thrown errors.
2. UNAVAILABLE → Premium denied — `hasFeature()` returns `false`. No feature accidentally unlocked.
3. No `catch { return true }` anywhere — forbidden fail-open pattern.
4. Authorization failure produces a typed result — `PlanningDayMutationResult` with typed `reason`.
5. Entitlement read never throws to callers — all public methods internally safe.

---

## 10. Direct isPremium Read Restriction

After M19, `user_settings.isPremium` MUST NOT be read directly by feature code, screens, hooks (except `useEntitlement`), widget code, or planner services.

Permitted direct access:
- `EntitlementRepository.readIsPremium()` — canonical read path
- `UserSettingsRepository.upsert()` — data layer default on insert
- Test fixtures

---

## 11. Direct isPremium Mutation Restriction

No production code path writes `user_settings.isPremium = true`.

- `SettingsMutationCoordinator.FORBIDDEN_PATCH_KEYS` already contains `'isPremium'` — UNCHANGED.
- No new UI toggle writes `isPremium`.
- No fake upgrade path.
- Tests may seed `isPremium = true` through `UserSettingsRepository.upsert()` in test setup.

---

## 12. Planning-Day Authorization Matrix

| `planningDayStart` value | Validation | Authorization required |
|---|---|---|
| `'FAJR'` | Always valid | None — universally free |
| `'MIDNIGHT'` | Always valid format | `PLANNING_DAY_MIDNIGHT` (PREMIUM) |
| `'CUSTOM:HH:mm'` (well-formed) | Regex validated | `PLANNING_DAY_CUSTOM` (PREMIUM) |
| `'CUSTOM:HH:mm'` (malformed) | VALIDATION_FAILED | — |
| Any other string | VALIDATION_FAILED | — |

Full authorization decision table:

| Value | FREE | PREMIUM | UNAVAILABLE |
|---|---|---|---|
| `FAJR` | ALLOW | ALLOW | ALLOW |
| `MIDNIGHT` | PREMIUM_REQUIRED | ALLOW | ENTITLEMENT_UNAVAILABLE |
| `CUSTOM:04:00` (valid) | PREMIUM_REQUIRED | ALLOW | ENTITLEMENT_UNAVAILABLE |
| `CUSTOM:25:00` (invalid) | VALIDATION_FAILED | VALIDATION_FAILED | VALIDATION_FAILED |

**FAJR is always allowed regardless of entitlement state.**

---

## 13. PlanningDayMutationCoordinator Contract

Rationale for dedicated coordinator (Approach B over Approach A): Planning-day mutation has unique authorization semantics. A dedicated coordinator keeps `SettingsMutationCoordinator` clean.

```typescript
// src/services/PlanningDayMutationCoordinator.ts

export type PlanningDayMutationFailureReason =
  | 'PREMIUM_REQUIRED'
  | 'ENTITLEMENT_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'PERSISTENCE_FAILED';

export type PlanningDayMutationResult =
  | { status: 'SUCCESS'; refreshed: boolean }
  | { status: 'PERSISTED_REFRESH_FAILED'; error: string }
  | { status: 'FAILED'; stage: 'VALIDATION' | 'AUTHORIZATION' | 'PERSISTENCE'; reason: PlanningDayMutationFailureReason; error: string };
```

setPlanningDayStart execution order:
```
1. VALIDATION
   a. Reject empty/null/unknown values
   b. If 'CUSTOM:*': validate regex /^CUSTOM:([01][0-9]|2[0-3]):([0-5][0-9])$/
   d. On failure → FAILED { stage: 'VALIDATION', reason: 'VALIDATION_FAILED' }

2. AUTHORIZATION (skip if value === 'FAJR')
   a. entitlementService.getSnapshot()
   b. If UNAVAILABLE → FAILED { stage: 'AUTHORIZATION', reason: 'ENTITLEMENT_UNAVAILABLE' }
   c. If FREE and value requires Premium → FAILED { stage: 'AUTHORIZATION', reason: 'PREMIUM_REQUIRED' }

3. PERSISTENCE
   a. userSettingsRepository.upsert({ planningDayStart: validatedValue })
   b. On failure → FAILED { stage: 'PERSISTENCE', reason: 'PERSISTENCE_FAILED' }

4. REFRESH
   a. plannerRefreshCoordinator.fullRefresh()
   b. On success → SUCCESS { refreshed: true }
   c. On failure → PERSISTED_REFRESH_FAILED { error: ... }
```

isPremium mutation invariant: The coordinator MUST NOT pass `{ isPremium: ... }` in the upsert patch. Only `planningDayStart` is written.

---

## 14. SettingsMutationCoordinator Changes in M19

Remove `'planningDayStart'` from `TEMPORAL_ALLOWED_KEYS`:

```typescript
// BEFORE (M17)
const TEMPORAL_ALLOWED_KEYS = new Set([
  'calculationMethod', 'asrMethod', 'highLatitudeRule',
  'polarCircleResolution', 'prayerAdjustments', 'planningDayStart',
]);

// AFTER (M19) — planningDayStart exclusively managed by PlanningDayMutationCoordinator
const TEMPORAL_ALLOWED_KEYS = new Set([
  'calculationMethod', 'asrMethod', 'highLatitudeRule',
  'polarCircleResolution', 'prayerAdjustments',
]);
```

Remove M17 FAJR-only guard (the planningDayStart field no longer reaches field-content validation).

`isPremium` remains in `FORBIDDEN_PATCH_KEYS` — UNCHANGED.

---

## 15. Persisted planningDayStart Representations

| Value | Mode | Tier |
|---|---|---|
| `'FAJR'` | Fajr rollover | FREE (default) |
| `'MIDNIGHT'` | Midnight rollover | PREMIUM |
| `'CUSTOM:HH:mm'` | Fixed local time rollover | PREMIUM |

CUSTOM format: `CUSTOM:HH:mm`, regex `/^CUSTOM:([01][0-9]|2[0-3]):([0-5][0-9])$/`

Valid: `CUSTOM:04:00`, `CUSTOM:19:30`, `CUSTOM:00:00`, `CUSTOM:23:59`
Invalid: `CUSTOM:24:00`, `CUSTOM:2pm`, `CUSTOM:99:99`, `CUSTOM:`

`CUSTOM:00:00` is distinct from `MIDNIGHT`. `temporalSettingsHelper.buildPlanningDayConfig()` already handles this correctly — NO CHANGES to this file.

---

## 16. FREE Planning-Day UI

All three modes shown; MIDNIGHT and CUSTOM are locked with PREMIUM badge.
Tapping a locked option shows `PremiumLockedInfo` sheet.
For FREE users with existing MIDNIGHT/CUSTOM in DB: show "Current mode: X", no auto-downgrade.

---

## 17. PREMIUM Planning-Day UI

All three modes selectable. CUSTOM shows time picker (reuse existing picker dependency, no new dep).
CUSTOM encoded as `CUSTOM:HH:mm` on save.
Default prefill for new CUSTOM: `04:00`.

---

## 18. Premium Lock UX (PremiumLockedInfo)

```
Premium Feature

Custom planning-day boundaries let you choose exactly when your
day begins — whether that's Midnight or a fixed hour that works
for your schedule.

Purchasing will be available in a future update.

[OK]
```

Copy constraints: no price, no "Upgrade now" CTA, no fake checkout, no isPremium write, no religious pressure.

---

## 19. No-Auto-Downgrade Rule

When `isPremium` is false but `planningDayStart` is `'MIDNIGHT'` or `'CUSTOM:*'`:
- Persisted value is left unchanged
- Planner continues using the stored value correctly
- Planning Day screen shows locked UI
- NO silent rewrite

Opening the Planning Day screen causes ZERO writes.

---

## 20. Critical Distinction — Entitlement vs. Planner Runtime

Entitlement is an AUTHORIZATION BOUNDARY, not a temporal engine.

```
Entitlement governs: CAN the user SELECT/CHANGE this mode?
Entitlement does NOT govern: HOW does the planner interpret the stored value?
```

Files that MUST NOT contain entitlement checks:
- `PlanningDayEngine.ts`
- `TodayTemporalInputProvider.ts`
- `temporalSettingsHelper.ts`
- `SchedulingEngine.ts`
- `MaterializationEngine.ts`
- `WallClockResolver.ts`

---

## 21. useEntitlement Hook Contract

```typescript
// src/hooks/useEntitlement.ts
export interface UseEntitlementResult {
  isLoading: boolean;
  isPremium: boolean;            // false while loading or on error (fail-closed)
  tier: EntitlementTier | null;  // null while loading
  hasFeature: (feature: PremiumFeature) => boolean; // sync; returns false on error
  error: string | null;
  reload: () => Promise<void>;
}
```

No global React Context required. No polling. Business logic lives in `EntitlementService`.

---

## 22. Widget Entitlement Policy

M18 Small and Medium widgets are FREE and remain FREE. No entitlement checks in any widget path.

---

## 23. Journal and Privacy Isolation

Journal is completely independent from Premium entitlement. M15/M16 security contracts unchanged.

---

## 24. Dependencies

Runtime dependencies added in M19: **Zero.**
Dev/test dependencies added in M19: None.
New migrations: **Zero.** `user_settings.isPremium` already exists.

---

## 25. Files to Create (New)

| File | Purpose |
|---|---|
| `src/domain/entitlement/types.ts` | Types: `EntitlementTier`, `PremiumFeature`, `EntitlementSnapshot`, interface |
| `src/domain/entitlement/EntitlementService.ts` | `LocalEntitlementService` + singleton |
| `src/data/repositories/EntitlementRepository.ts` | Read-only `readIsPremium()` adapter |
| `src/services/PlanningDayMutationCoordinator.ts` | Auth + mutation + refresh coordinator |
| `src/hooks/useEntitlement.ts` | Thin React hook |
| `src/components/premium/PremiumBadge.tsx` | Premium indicator component |
| `src/components/premium/PremiumLockedInfo.tsx` | Informational bottom sheet/modal |
| `src/components/premium/index.ts` | Barrel export |
| `src/domain/entitlement/__tests__/EntitlementService.test.ts` | E-01–E-10 |
| `src/data/repositories/__tests__/EntitlementRepository.test.ts` | Data layer tests |
| `src/services/__tests__/PlanningDayMutationCoordinator.test.ts` | A/P/S series |
| `src/hooks/__tests__/useEntitlement.test.ts` | Hook tests |
| `src/components/premium/__tests__/PremiumBadge.test.tsx` | Component tests |
| `src/components/premium/__tests__/PremiumLockedInfo.test.tsx` | Copy + component tests |
| `app/(tabs)/settings/__tests__/PlanningDayM19.test.tsx` | UI-01–UI-11 |

---

## 26. Files to Modify

| File | Change |
|---|---|
| `src/services/SettingsMutationCoordinator.ts` | Remove `planningDayStart` from `TEMPORAL_ALLOWED_KEYS`; remove M17 FAJR-only guard |
| `src/services/__tests__/SettingsMutationCoordinator.test.ts` | Update: `planningDayStart` now rejected |
| `app/(tabs)/settings/planning-day.tsx` | Full M19 rewrite |
| `app/(tabs)/settings/__tests__/PlanningDay.test.tsx` | Update for M19 UI |
| `docs/CURRENT_MILESTONE.md` | M19 FROZEN |
| `docs/ARCHITECTURE_INDEX.md` | §22 M19 FROZEN |
| `docs/IMPLEMENTATION_STATUS.md` | M19 architecture section |
| `docs/DECISIONS.md` | Add ADR-027; fix ADR-026 typo |
| `docs/AI_PROJECT_CONSTITUTION.md` | Update milestone table |

---

## 27. Files That Must Remain Untouched (Production Logic)

`PlanningDayEngine.ts`, `TodayTemporalInputProvider.ts`, `temporalSettingsHelper.ts`, `SchedulingEngine.ts`, `MaterializationEngine.ts`, `WallClockResolver.ts`, `PlannerRefreshCoordinator.ts`, `schema.ts`, `migrations/`, `UserSettingsRepository.ts`, all of `src/services/journal/`, all of `src/services/widget/`, all of `widgets/`, `useToday.ts`, `useUserSettings.ts`, `useSettingsMutation.ts`.

---

## 28. Test Matrix

### E-series (Entitlement Service)
E-01: No row → FREE. E-02: isPremium=false → FREE. E-03: isPremium=true → PREMIUM. E-04: DB failure → UNAVAILABLE. E-05/07: hasFeature() → false for FREE. E-06/08: hasFeature() → true for PREMIUM. E-09: UNAVAILABLE → false (fail-closed). E-10: getSnapshot() never throws.

### A-series (Authorization)
A-01: FREE+FAJR → ALLOW. A-02: FREE+MIDNIGHT → PREMIUM_REQUIRED. A-03: FREE+CUSTOM:04:00 → PREMIUM_REQUIRED. A-04: PREMIUM+MIDNIGHT → ALLOW. A-05: PREMIUM+CUSTOM:19:30 → ALLOW. A-06: CUSTOM:25:00 → VALIDATION_FAILED. A-07: CUSTOM: → VALIDATION_FAILED. A-08: UNAVAILABLE+MIDNIGHT → ENTITLEMENT_UNAVAILABLE. A-09: UNAVAILABLE+FAJR → ALLOW. A-10: isPremium cannot be set via SettingsMutationCoordinator. A-11: planningDayStart rejected by SettingsMutationCoordinator.

### P-series (Persistence)
P-01: MIDNIGHT persists `'MIDNIGHT'`. P-02: CUSTOM:04:00 persists `'CUSTOM:04:00'`. P-03: Success calls exactly one fullRefresh(). P-04: Persistence failure → no refresh. P-05: Persist success + refresh failure → PERSISTED_REFRESH_FAILED. P-06: FAJR always succeeds. P-07: upsert patch contains ONLY planningDayStart.

### S-series (Planner Safety)
S-01: Entitlement failure does NOT rewrite planningDayStart. S-02: Opening screen causes zero DB writes. S-03: Existing MIDNIGHT displayed when FREE, no downgrade. S-04: Existing CUSTOM displayed when FREE, no downgrade. S-05: FAJR switch succeeds regardless of tier. S-06/07/08: Terminal COMPLETED/MISSED/CANCELLED occurrences unchanged.

### UI-series
UI-01: FREE: FAJR selectable, others locked. UI-02/03: No purchase navigation on locked tap. UI-04: PREMIUM+MIDNIGHT calls setPlanningDayStart. UI-05: PREMIUM+CUSTOM shows time picker. UI-06: Time picker validates HH:mm. UI-07: No fake checkout UI. UI-08: No price/subscription text. UI-09: No toggle writes isPremium. UI-10: PremiumLockedInfo copy is calm. UI-11: Existing Premium mode shown when FREE.

### I-series (Integration)
I-01: Premium mutation updates Today via fullRefresh(). I-02/03: Notifications/widgets still integrated. I-04: No entitlement check in widget path. I-05: No entitlement import in journal services. I-06: M15 crypto tests still pass.

### REGRESSION
All 1230 M18 baseline tests remain green.

---

## 29. Architecture Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Caller bypasses PlanningDayMutationCoordinator | HIGH | SettingsMutationCoordinator refusal + code review |
| hasFeature() called in temporal engine | HIGH | Import restriction invariant + CI grep |
| Entitlement check inside fullRefresh() | HIGH | fullRefresh() is called AFTER authorization; code review |
| PremiumLockedInfo triggers isPremium=true | HIGH | Presentation-only component; Approach B architecture |
| planningDayStart re-added to TEMPORAL_ALLOWED_KEYS | MEDIUM | ADR-027 documents the decision |
| Stale isPremium in useEntitlement | LOW (M19) | reload() available; no purchase events in M19 |

---

## 30. Future Billing Adapter Seam

To add real billing:
1. Implement `StoreEntitlementService` implementing `EntitlementService`.
2. Replace `localEntitlementService` singleton.
3. Add `EntitlementRepository.commitPurchase()` to persist verified entitlement.
4. Optionally add Context provider for real-time events.

No feature screens, planner engine, or widget code requires changes.

---

## 31. Unresolved BLOCKER Items for Opus Review

| # | Item | Type |
|---|---|---|
| B-01 | Approach B (PlanningDayMutationCoordinator) vs Approach A (inject into SettingsMutationCoordinator) — confirm analysis | ARCHITECTURE |
| B-02 | planningDayStart removal from TEMPORAL_ALLOWED_KEYS — confirm no other callers besides planning-day.tsx | ARCHITECTURE |
| B-03 | Fail-open audit — confirm all catch blocks return false/UNAVAILABLE | SECURITY |
| B-04 | FAJR always free rule — confirm no scenario blocks FAJR | SECURITY |
| B-05 | Re-selecting active Premium mode: UI-level no-op vs. service-layer no-op | ARCHITECTURE |
| B-06 | Custom time picker dependency — confirm existing picker is reusable | DEPENDENCY |

---

## Appendix A — ADR-027 (Proposed)

**ADR-027: Feature Code Consumes EntitlementService, Not user_settings.isPremium Directly**

**Status:** Proposed (2026-09-18) — pending Opus review

**Decision:**
1. All feature code queries `EntitlementService.hasFeature()` or `getSnapshot()`. Direct reads of `user_settings.isPremium` from feature code are forbidden.
2. `user_settings.isPremium` is read exclusively by `EntitlementRepository`.
3. Entitlement gates authorization to CHANGE Premium settings, not how the temporal engine interprets stored values.
4. Entitlement read failure → fail-closed (`catch { return false }`).
5. `user_settings.isPremium` mutation is reserved for a future billing adapter.
6. `PlanningDayMutationCoordinator` is the sole authorized path for changing `planningDayStart`.

**Alternatives considered:**
- Approach A (inject EntitlementService into SettingsMutationCoordinator): Mixing concerns, harder to test.
- Direct read in Planning Day screen: Breaks abstraction seam.
- Auto-downgrade: Temporal mutation requiring explicit reconciliation; deferred.

---

## Appendix B — Documentation Cleanup

### B-1: ADR-026 Typo
`docs/DECISIONS.md` line 598: `\react-native-android-widget` → `react-native-android-widget`

### B-2: test-renderer Package Name
Some M18 closure docs reference `react-test-renderer ^1.3.0`. Actual package name in `package.json` is `test-renderer ^1.3.0`. Documentation corrected.

### B-3: AI_PROJECT_CONSTITUTION Milestone Table
M16/M17 shown as *PENDING* (stale). M18/M19 absent. Corrected.
