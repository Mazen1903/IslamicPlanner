# M24 — Release Preparation Architecture (Revision 2)

**Status:** ARCHITECTURE REVISED — AWAITING CHATGPT TECHNICAL LEAD + OPUS REVIEW
**Revision:** 2 (Lead Correction Gate — 2026-09-19)
**Milestone:** M24 — Release Preparation
**Baseline HEAD:** `910016116f0b915fcf7b2063a7aed572d825ad30`
**Baseline origin/main:** `910016116f0b915fcf7b2063a7aed572d825ad30` (synchronized)
**Architecture revised:** 2026-09-19
**Author role:** Software Architect (Sonnet)
**Working tree at freeze:** CLEAN (docs-only revision pending commit)
**Baseline tests:** 1653 / 1653 — 144 / 144 suites — 0 failures
**TypeScript:** 0 errors | **ESLint:** 0 errors / 0 warnings
**Dependencies added since M23:** 0 (runtime) | 0 (dev) — SQL bundling dep authorized below
**Migrations added since M23:** 0

---

## 0. Lead Correction Summary (Revision 1 → Revision 2)

The following findings from the ChatGPT Technical Lead review have been incorporated:

| Finding | Correction |
|---|---|
| LF-1: Project workflow misclassified as bare Android | Corrected. Project is **Expo CNG / Prebuild**. `android/` and `ios/` are ignored generated directories. |
| LF-2: RB-M24-SQL-BUNDLE missing | New P0 blocker added. SQL bundling must be confirmed before runtime migration is release-safe. |
| LF-3: `migrator.ts` top-level Node imports | Architecture updated. The entire module must be Node-free, not just the function body. Node loader extracted to test-only module. |
| LF-4: Concurrency / transaction claims | Replaced broad assertions with verified Drizzle source behavior. Transaction semantics sourced from installed `drizzle-orm@0.45.x`. |
| LF-5: Root route state machine ordering | Corrected. RootGate is in the parent `_layout.tsx`. PENDING state intercepted before `app/index.tsx` renders. |
| LF-6: Android release signing model | Separated QA binary path (CNG prebuild + release-mode build) from distribution signing (EAS credentials). |
| LF-7: iOS App Group field | Removed `ios.appGroupIdentifier`. Correct field is `groupIdentifier` in `expo-widgets` plugin props. Plugin default `group.com.mm1903.islamicplannerapp` verified from installed source. |
| LF-8: Notification permission uses CNG output | Updated to require merged release manifest inspection, not committed AndroidManifest.xml. |
| LF-9: Demo route blank screen | Corrected. `if (!__DEV__) return null` leaves a blank reachable route. Replaced with redirect strategy. |
| LF-10: P2 branding changes deferred | P2-USERINTERFACE-STYLE, P2-APP-NAME, P2-SPLASH deferred; not automatic M24 implementation changes. |
| OPUS: Review recommendation changed | YES. Rationale documented in §25. |

---

## 1. Project Workflow Classification

**EXPO CNG / PREBUILD (Managed CNG Model)**

This is the authoritative workflow classification for M24 and all future work.

**Evidence (verified from repository):**

- `.gitignore` (lines 33–34):
  ```
  # generated native folders
  /ios
  /android
  ```
  Both directories are explicitly ignored.
- Neither `android/` nor `ios/` is committed to the remote repository at the M23 baseline.
- Native directories may exist locally as the result of a prior `npx expo run:android` or `npx expo prebuild`. These are **generated, non-canonical artifacts**.

**Invariants:**

- Persistent native configuration MUST be represented through `app.json`, Expo config plugins, or `eas.json`.
- Direct edits to generated `android/` or `ios/` MUST NOT be committed as canonical source.
- Generated native files may be inspected after a clean prebuild for diagnostic and QA purposes only.
- Any locally observed file under `android/` or `ios/` is **diagnostic evidence only**.

---

## 2. Baseline Verification

```
git rev-parse HEAD:           910016116f0b915fcf7b2063a7aed572d825ad30
git rev-parse origin/main:    910016116f0b915fcf7b2063a7aed572d825ad30
ahead / behind:               0 / 0
working tree:                 CLEAN (docs revision uncommitted at architecture freeze)
top commit:                   docs(m23): close M23 after final QA -- APPROVED
```

---

## 3. Scope

### In Scope

1. **RB-M24-MIGRATOR-FS** — Split `migrator.ts` into a Node-free runtime module and a Node-only test helper. (WP-1)
2. **RB-M24-SQL-BUNDLE** — Configure SQL bundling (babel + metro) for Hermes-safe migration imports. Authorize build-time dependency if required. (WP-1)
3. **RB-M24-BOOTSTRAP** — Wire runtime `migrateDatabase()` into `app/_layout.tsx` bootstrap before first DB read. (WP-2)
4. **RB-M24-ROOT** — Create `app/index.tsx` with canonical redirect only. (WP-2)
5. **Bootstrap test coverage** — Reconcile and extend existing MG / RootGate tests. (WP-3)
6. **Release configuration** — `app.json` (authorized changes only), `eas.json` (new file). (WP-4)
7. **Native release verification** — CNG clean prebuild → release binary → QA gates. (WP-5)

### Explicit Non-Goals

- No Supabase, Firebase, PostgreSQL, remote backend, or cloud sync.
- No new application features or database migrations.
- No changes to prayer engine, recurrence engine, task domain, or temporal logic.
- No dark mode, accessibility, or RTL implementation changes (verification only).
- Worship Suggestions remain deferred.
- P2-USERINTERFACE-STYLE, P2-APP-NAME, P2-SPLASH: deferred unless confirmed release-breaking.
- No committing generated `android/` or `ios/` directories.

---

## 4. P0 Release Blockers

| ID | Severity | Description |
|---|---|---|
| RB-M24-BOOTSTRAP | **P0 RELEASE BLOCKER** | `migrateDatabase()` not invoked at boot; fresh install produces empty/uncreated schema |
| RB-M24-MIGRATOR-FS | **P0 RELEASE BLOCKER** | `migrator.ts` has top-level `node:fs` / `node:path` imports; entire module unsafe for Metro/Hermes bundling |
| RB-M24-SQL-BUNDLE | **P0 RELEASE BLOCKER** | `.sql` imports in `migrations.js` not configured for Metro bundling; no `babel.config.js`, `babel-plugin-inline-import` absent, `sql` not in `sourceExts` |
| RB-M24-ROOT | **P0 RELEASE BLOCKER** | `app/index.tsx` absent; launcher cold-start navigates to `+not-found` |

---

## 5. RB-M24-MIGRATOR-FS: Root-Cause and Target Architecture

### 5.1 Current State

`src/data/migrator.ts` lines 1–2:

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
```

These are **top-level module imports**. When `app/_layout.tsx` imports `migrateDatabase`, Metro must resolve the entire `migrator.ts` module graph. Top-level `node:fs` and `node:path` imports cause Metro to fail at bundle time for the Hermes/React Native target.

Changing only the body of `migrateDatabase()` while leaving the top-level imports in the same module is **insufficient**. The entire module must be Node-free.

`loadMigrationConfig()` in the same file is used exclusively by test infrastructure:
- `src/data/__tests__/migrations.test.ts`
- `src/data/__tests__/testDbHelper.ts`

It must be preserved but relocated to a Node-only test helper module.

### 5.2 Target Architecture

**Split the module into two separate files:**

**`src/data/migrator.ts` — Runtime module (Node-free):**

```ts
// RUNTIME MODULE — Zero node: imports
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { AppDatabase } from './db';
import migrationsBundle from './migrations/migrations.js';

export async function migrateDatabase(db: AppDatabase): Promise<void> {
  await migrate(db, migrationsBundle);
}
```

- Zero `node:` imports at top level or within any exported function
- Zero runtime filesystem discovery
- Uses `migrations.js` static bundle exclusively

**New Node-only test helper:**

Candidate filename: `src/data/__tests__/migrationConfigLoader.node.ts`

- Contains `loadMigrationConfig()`, the `MigrationConfig`, `MigrationJournal`, `MigrationJournalEntry` type definitions, and all `node:fs` / `node:path` imports
- MUST NOT be imported from any runtime-reachable module
- The `.node.` infix is an established pattern in React Native / Expo projects signaling Node-only files excluded from Metro bundling

**Convention note:** Inspect the project's existing `__tests__` naming pattern before finalizing the filename. If the project uses a different test-only file pattern, match it.

**Update test infrastructure imports:**

- `src/data/__tests__/migrations.test.ts` — update `loadMigrationConfig` import from the new Node-only helper
- `src/data/__tests__/testDbHelper.ts` — update `loadMigrationConfig` import from the new Node-only helper

---

## 6. RB-M24-SQL-BUNDLE: Root-Cause and Target Architecture

### 6.1 Current State

`src/data/migrations/migrations.js`:

```js
import journal from './meta/_journal.json';
import m0000 from './0000_initial.sql';
import m0001 from './0001_lazy_the_order.sql';
import m0002 from './0002_solid_reaper.sql';
import m0003 from './0003_colorful_gorilla_man.sql';
```

Metro does NOT know how to handle `.sql` file imports unless explicitly configured.

**Missing (verified from repository):**

1. **No `babel.config.js`** — `Test-Path babel.config.js` → `False`. Expo SDK 57 projects require `babel-preset-expo`.
2. **`babel-plugin-inline-import` not installed** — absent from both `dependencies` and `devDependencies` in `package.json`.
3. **`metro.config.js` does not include `sql` in `sourceExts`** — current config only adds `dat` to `assetExts`.

### 6.2 Official Drizzle Expo SQLite Bundling Contract

The Drizzle Expo SQLite migration documentation specifies:

1. Install `babel-plugin-inline-import`
2. Update `babel.config.js` to use `babel-preset-expo` with `inline-import` for `.sql`
3. Update `metro.config.js` to add `sql` to `sourceExts`

### 6.3 Target Configuration

**`babel.config.js` — NEW tracked file:**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
```

**`metro.config.js` — MODIFY:**

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('dat');   // preserve existing
config.resolver.sourceExts.push('sql');  // add: Drizzle SQL bundling

module.exports = config;
```

**`package.json` — MODIFY devDependencies:**

Add `babel-plugin-inline-import` as a `devDependency`. Installation command:

```bash
npm install --save-dev babel-plugin-inline-import
```

This updates `package.json` and `package-lock.json` (both tracked).

**`drizzle.config.ts` — unchanged:**

```ts
dialect: 'sqlite',
driver: 'expo',
```

This is correct. Do NOT modify.

**Migration SQL files — unchanged.** `migrations.js` — unchanged unless a proven generation defect is found. Do NOT hand-edit `migrations.js`.

### 6.4 Dependency Constraint Refinement

The prior blanket "No npm dependencies" constraint is refined for M24:

> **Authorized:** `babel-plugin-inline-import` as a `devDependency` for SQL build-time bundling.
>
> **Constraint retained:** No new **runtime / application feature dependencies** unless separately authorized by the Technical Lead.

---

## 7. Runtime Migrator Contract (Production)

```
React Native-safe migrator (src/data/migrator.ts)
  → static migrations.js bundle (SQL strings inlined by babel-plugin-inline-import at build time)
  → drizzle-orm/expo-sqlite/migrator: migrate()
    → SQLiteSyncDialect.migrate() [verified — see §8]
  → SQLite (expo-sqlite)
```

**No runtime filesystem discovery. No Node APIs.**

---

## 8. Migration Transaction Semantics (Verified from Installed Source)

**Source:** `node_modules/drizzle-orm/sqlite-core/dialect.js` — `SQLiteSyncDialect.migrate()`
**Verified drizzle-orm version:** `^0.45.2` (installed 2026-09-14)

### 8.1 Verified Implementation

```
SQLiteSyncDialect.migrate(migrations, session, config):

  1. CREATE TABLE IF NOT EXISTS __drizzle_migrations  [idempotent DDL]
  2. SELECT last applied migration by created_at DESC LIMIT 1
  3. session.run(BEGIN)
  4. for each migration in bundle:
       if not yet applied (folderMillis > lastDbMigration.created_at):
         execute each SQL statement
         INSERT INTO __drizzle_migrations (hash, created_at)
  5. session.run(COMMIT)
  6. on any error: session.run(ROLLBACK); throw error
```

### 8.2 Key Properties

- **Single BEGIN/COMMIT transaction:** All pending migrations execute atomically within one transaction.
- **Rollback on failure:** If any statement throws, `ROLLBACK` is issued and the error re-thrown. The database returns to its pre-migration state.
- **Idempotency guard:** Only migrations whose `folderMillis > lastDbMigration.created_at` are applied. Already-applied migrations are skipped without re-execution.
- **Ledger-based tracking:** Applied migrations are recorded by `created_at` (folderMillis timestamp), not SQL content hash. The `hash` column is present but inserted as `""` by the Expo migrator layer (verified in `expo-sqlite/migrator.js`).

### 8.3 Failure and Recovery

On migration failure:
- The open transaction is rolled back
- The database state is identical to before the migration attempt
- Bootstrap enters ERROR state
- On user-triggered retry, `migrateDatabase()` is called again
- The migrator correctly re-identifies all pending migrations (because none were committed)
- The retry applies them again from the beginning

**Do NOT state:** "ADD COLUMN is safe to re-execute independently." The correct guarantee is **transaction rollback**. Re-execution safety is a consequence of the failed transaction being rolled back — not of the idempotency of individual DDL statements.

---

## 9. Duplicate-Call and Concurrency Safety

### 9.1 Async Overlap Analysis

Async JavaScript operations CAN have overlapping lifetimes. The `migrateDatabase()` function returns a `Promise`. Two near-concurrent calls against the same database may interleave their microtask continuations.

**Analysis:**

`SQLiteSyncDialect.migrate()` is **synchronous** at the SQLite execution level (no `async`/`await` internally; all `session.run()` calls are synchronous). Two concurrent async JS contexts calling `migrate()` against the same expo-sqlite database will serialize at the native SQLite layer.

SQLite serializes concurrent writers at the native level (default journal mode or WAL). The second call's `BEGIN` will not proceed while the first call's transaction is open. Therefore, two concurrent `migrateDatabase()` calls against the same database are safe without an application-level mutex.

**Do NOT over-engineer:** A user-space mutex is not required. This architecture freezes no mutex design.

### 9.2 React StrictMode

React `StrictMode` double-invokes effects in development builds only. The bootstrap state guard (`LOADING → READY/ERROR` state) prevents redundant bootstrap execution from reaching `migrateDatabase()` a second time after the first has settled. Even if both effect invocations reach `migrateDatabase()`, §9.1 demonstrates safety.

### 9.3 Required Integration Test (MB-09)

Two near-concurrent `migrateDatabase()` calls against the SAME in-memory test database:
- Both settle without error
- Final schema is correct (all expected tables present)
- `__drizzle_migrations` contains exactly one row per migration (no duplicate ledger entries)
- No schema mutation is applied twice

### 9.4 Bootstrap Retry Safety

After ERROR state, user taps retry:
- Bootstrap resets to LOADING
- Full bootstrap sequence re-invoked
- `migrateDatabase()` called again on the same database instance
- Because the failed transaction was rolled back, `lastDbMigration` reflects pre-failure state
- Migrator correctly identifies pending migrations and applies them

Inherently safe. No additional guard required.

---

## 10. Root Bootstrap Lifecycle State Machine

Replace the prior `themeReady: boolean` model with an explicit three-state lifecycle:

```
BOOTSTRAP_STATE = LOADING | READY | ERROR
```

| State | Meaning | UI Rendered |
|---|---|---|
| LOADING | Migration not yet complete or in progress | `BootstrapLoadingView` |
| READY | Migration succeeded + theme loaded (or safely fell back) | `RootGate` mounts |
| ERROR | Migration threw — fatal for this bootstrap attempt | `BootstrapErrorView` + retry action |

**Bootstrap sequence in `app/_layout.tsx` `useEffect`:**

```
Initial state: LOADING

Step 1: initNotificationHandler()          [no DB; side-effect only]
Step 2: await migrateDatabase(db)          [NEW — P0 fix]
        SUCCESS → continue
        FAILURE → setBootstrapState(ERROR); BootstrapErrorView; STOP
Step 3: userSettingsRepository.get()       [DB-safe — migration complete]
Step 4: setThemeMode(settings?.themeMode ?? SYSTEM)
Step 5: setBootstrapState(READY)           [RootGate mounts]
```

**Theme load failure (post-migration):**
If `userSettingsRepository.get()` throws after migration success, fall back to SYSTEM theme and
proceed to READY. This is a non-fatal theme load failure per existing ADR-029 semantics.
Migration failure is the only fatal bootstrap failure.

**Retry:**
`BootstrapErrorView` provides a retry action. Retry resets state to LOADING and re-invokes the
full effect sequence.

---

## 11. Root Routing State Machine

```
App launch (launcher icon tap)
│
└─ Navigate to "/" → RootLayout (bootstrap = LOADING)
   │
   ├─ [LOADING] BootstrapLoadingView rendered; RootGate NOT mounted
   │
   └─ Bootstrap → READY:
      └─ RootGate mounts (defined in app/_layout.tsx, parent of ALL routes)
         │
         ├─ [onboarding status = LOADING]
         │   BootstrapLoadingView; Slot blocked
         │
         ├─ [onboarding status = PENDING]
         │   RootGate → redirect to /onboarding
         │   app/index.tsx is NEVER reached
         │
         ├─ [onboarding status = COMPLETE]
         │   RootGate permits Slot
         │   → app/index.tsx renders (at "/")
         │   → <Redirect href="/(tabs)/today" />
         │   → Today tab renders
         │
         └─ [onboarding status = ERROR]
            BootstrapErrorView + retry
```

**Key correction from Revision 1:**
RootGate is in `_layout.tsx` and guards ALL child routes, including `app/index.tsx`. The PENDING
state is intercepted at the RootGate layer before `app/index.tsx` ever renders. There is no path
where a PENDING user reaches `app/index.tsx` and is then redirected to `/onboarding`.

**No redirect loops:**
- COMPLETE at "/": `app/index.tsx` → redirect to `/(tabs)/today` → RootGate (COMPLETE + at /tabs) → Today renders. ✓
- COMPLETE at "/(tabs)/today": Today renders directly. ✓
- PENDING: intercepted by RootGate; `app/index.tsx` never mounts. ✓
- Deep links / notification taps: bypass `app/index.tsx`; enter at target route; RootGate gates normally. ✓

---

## 12. app/index.tsx Architecture

**Complete intended implementation:**

```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/today" />;
}
```

**Invariants (enforced by tests IR-01, IR-02):**
- MUST contain only the redirect
- MUST NOT read `useOnboardingStore`, `userSettingsRepository`, or any store
- MUST NOT contain routing decision or onboarding logic
- All routing authorization remains solely in `RootGate` in `app/_layout.tsx`

---

## 13. CNG Native Configuration Strategy

**M24 tracked configuration changes (committed source):**

| File | Status | Description |
|---|---|---|
| `app.json` | MODIFY (conditional) | Android permissions if prebuild audit requires |
| `eas.json` | NEW | EAS build profiles |
| `babel.config.js` | NEW | babel-preset-expo + inline-import for .sql |
| `metro.config.js` | MODIFY | Add sql to sourceExts |
| `package.json` | MODIFY | Add babel-plugin-inline-import devDep |
| `package-lock.json` | MODIFY | npm lockfile |

**Generated native project (diagnostic use only):**

After `npx expo prebuild --clean --platform android`:
- Inspect generated `android/` for permissions verification, manifest audit
- Do NOT commit any results
- `ios/` requires macOS / EAS environment

**CNG release QA binary (canonical procedure):**

```bash
# 1. Clean prebuild from committed app.json / plugins
npx expo prebuild --clean --platform android

# 2. Release-mode build for QA (no production signing required for emulator)
npx expo run:android --variant release
```

This produces a release-mode APK from freshly generated native files derived from committed source.
This is the canonical QA binary.

**Key invariant:** QA MUST use a freshly generated binary derived from committed `app.json` and config
plugins. QA must NOT use stale local `android/` output from a prior prebuild.

---

## 14. app.json / EAS Configuration

### 14.1 Authorized M24 app.json Changes

| Field | Current | Action | Priority |
|---|---|---|---|
| `android.permissions` | Not set | Audit after prebuild. Add `POST_NOTIFICATIONS` via `android.permissions[]` if absent from merged manifest. | P1-VERIFY |
| Exact alarm permission | Not set | Product confirmation required before adding. | P1-PRODUCT |
| `ios.appGroupIdentifier` | N/A | **DO NOT ADD.** Field does not exist in expo-widgets schema. | N/A |

**NOT authorized as automatic M24 changes (P2-deferred):**
- `userInterfaceStyle`: "light" → "automatic"
- `name`: store display name change
- Splash screen configuration

These are product/design decisions. They do not block release.

### 14.2 expo-widgets App Group — Verified Finding

**Source:** `node_modules/expo-widgets/plugin/src/withWidgets.ts` (installed expo-widgets ~57.0.20)

The plugin exposes `groupIdentifier?: string` as a config plugin prop (not an `app.json` `ios.*` field):

```ts
// "App group identifier used for communication between the main app and widgets.
// Defaults to group.<main app bundle identifier>"
groupIdentifier?: string;
```

**Current `app.json`:** The `expo-widgets` plugin entry has NO `groupIdentifier` prop.

**Plugin behavior (from `withIosWidgets.ts`):**
When `groupIdentifier` is absent, the plugin logs a warning and falls back to:
```
group.com.mm1903.islamicplannerapp
```
(derived from `config.ios.bundleIdentifier = "com.mm1903.islamicplannerapp"`)

**This is the correct default** for this project.

**M24 action:**
- Do NOT add `ios.appGroupIdentifier` to `app.json` — that field does not exist in the expo-widgets schema.
- During GATE-5 verification, inspect generated iOS entitlements to confirm App Group is `group.com.mm1903.islamicplannerapp`.
- Only if the entitlements are wrong: add `groupIdentifier: "group.com.mm1903.islamicplannerapp"` to the `expo-widgets` plugin config in `app.json`.

### 14.3 EAS Configuration (eas.json — new file)

**Recommended profile structure:**

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

**Profile rationale:**
- `development`: internal dev client
- `preview`: internal QA; `buildType: "apk"` produces an installable APK for emulator/device QA without store signing
- `production`: default AAB (Android App Bundle) for store distribution; auto-increment version code

**External prerequisites — USER / ACCOUNT ACTION REQUIRED (not code changes):**

1. `eas init` — generates `extra.eas.projectId` in `app.json`. Do NOT invent a project ID.
2. `eas login` — Expo account authentication.
3. Apple Developer Program membership (for iOS builds/distribution).
4. Apple Team ID (for iOS Xcode project signing).
5. `eas credentials --platform android` — Android keystore generation/management.

**No credentials committed to source control.** EAS manages credentials out-of-band.

### 14.4 Android Distribution Signing

**Local QA binary** (sufficient for GATE-3, GATE-6, GATE-RB1, GATE-RB2):
```bash
npx expo run:android --variant release
```
Uses a debug/development keystore. No production signing required for functional gate verification.

**Distribution binary** (Play Store):
```bash
eas build --platform android --profile production
```
EAS managed signing. Never commit `*.jks`, keystore passwords, or signing material.

---

## 15. Android Notification Permission Verification

Because `android/` is generated and ignored, the local `AndroidManifest.xml` is not canonical source.

**Verification procedure:**

1. `npx expo prebuild --clean --platform android`
2. Inspect `android/app/src/main/AndroidManifest.xml` (generated, merged)
3. Check for:
   - `android.permission.POST_NOTIFICATIONS` (required on Android 13+ for runtime notification permission prompt)
   - `android.permission.SCHEDULE_EXACT_ALARM` (required if exact-time delivery is used — requires product confirmation)
4. If `POST_NOTIFICATIONS` absent from merged manifest, add via CNG-compatible path:

```json
// app.json (add only after prebuild audit confirms absence):
"android": {
  "permissions": ["android.permission.POST_NOTIFICATIONS"]
}
```

**Product question (must confirm before WP-4):**
Does this application require exact-time alarm delivery? `expo-notifications` supports both exact and inexact scheduling. If inexact is acceptable, `SCHEDULE_EXACT_ALARM` is not required. Do NOT add `USE_EXACT_ALARM` without a documented product requirement.

---

## 16. Demo Route Correction (P2-DEMO)

**Finding:** `app/demo.tsx` is reachable at `/demo` in production.

**Rejected approach (Revision 1):** `if (!__DEV__) return null`
This creates a blank, navigable production route. Rejected.

**Authorized M24 approach:** In production, redirect to Today:

```tsx
import { Redirect } from 'expo-router';

export default function Demo() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)/today" />;
  }
  // ... existing demo content
}
```

This is P2, non-P0. If M24 implementation scope is constrained, may defer to M25.
**Decision: Authorized P2 fix — defer/execute during WP-4.**

---

## 17. Release-Readiness Audit

### P0 — RELEASE BLOCKERS

See §4 table. All four must be resolved before M24 closes.

### P1 — MUST FIX / VERIFY

| ID | Area | Finding | Resolution Path |
|---|---|---|---|
| P1-SIGNING-DIST | Android distribution signing | EAS credential management required for Play Store | External prerequisite — EAS account action |
| P1-EAS | EAS project init | `eas.json` to be committed; `extra.eas.projectId` requires `eas init` | External prerequisite — user action |
| P1-NOTIFICATIONS-POST | Android permission | `POST_NOTIFICATIONS` requires prebuild audit | Clean prebuild → inspect → `app.json` if absent |
| P1-EXACT-ALARM | Android exact alarm | Product confirmation required | Product decision → `app.json` if needed |
| CF-M24-G3 | TalkBack 5 modals | CF-A6/A8/A12/A14/A16 BLOCKED in M23 by Metro transport issue | Release binary + TalkBack |
| CF-M24-G4 | iOS widget gallery | iOS environment unavailable in M23 | EAS build + physical iOS device |
| CF-M24-G5 | iOS App Group terminated delivery | iOS environment unavailable in M23 | EAS build + physical iOS device |
| CF-M24-G6 | Android RTL visual | BLOCKED in M23 by Metro multipart issue | Release binary + ar-SA locale |

### P2 — AUTHORIZED FIXES

| ID | Area | Finding | Status |
|---|---|---|---|
| P2-DEMO | `app/demo.tsx` | Blank production route | Authorized fix — may defer to M25 |
| P2-USERINTERFACE-STYLE | `userInterfaceStyle` | "light" vs "automatic" | Deferred — product decision |
| P2-APP-NAME | App display name | Slug format `islamic-planner-app` | Deferred — product decision |
| P2-SPLASH | Splash branding | Default Expo splash | Deferred — product decision |

### P3 — DEFER

- Android Play Store submission: post-M24; requires store listing setup
- iOS App Store submission: post-M24; requires EAS submit + App Store Connect
- Android R8 minification profile: post-release
- Native biometric physical device verification: P3; user opt-in feature
- Native AES journal physical device verification: P3; user opt-in feature
- Real local notification device delivery verification: P3; path already verified in M13

---

## 18. Test Architecture — Reconciled

### 18.1 Existing MG Suite (migrations.test.ts)

| Test | Coverage |
|---|---|
| MG-01 | Fresh DB: all migrations applied; all expected tables + columns present |
| MG-02 | M4-era upgrade: existing rows preserved; new columns NULL |
| MG-03 | Idempotency: second `migrateDatabase()` call skips all already-applied migrations; ledger unchanged |
| MG-04 | Consistency: journal, SQL files, snapshots, `migrations.js` all agree |
| MG-05 | Fresh DB includes `last_auto_latitude` / `last_auto_longitude` on `user_settings` |
| MG-06 | M11-era upgrade with AUTO row backfills `location_mode` to MANUAL |

MG-01 and MG-03 already invoke `migrateDatabase(db)` against an in-memory Node SQLite database. They exercise the production migration code path and are NOT redundant with new M24 tests.

After the migrator module split (WP-1):
- MG-04 will import `loadMigrationConfig()` from the Node-only helper (correct — MG-04 is a test-infrastructure integrity check)
- MG-01, MG-02, MG-03, MG-05, MG-06 will continue to call `migrateDatabase()` from the runtime module (which no longer exports `loadMigrationConfig`)

### 18.2 Existing RootGate / Layout Coverage

`app/__tests__/RootGate.test.tsx` and `app/__tests__/_layout.test.tsx` cover LOADING, PENDING,
COMPLETE, ERROR RootGate states with B-series tests. These are not replaced or duplicated.

### 18.3 New M24 Test Requirements (Gap Analysis)

| ID | Gap | Test Location |
|---|---|---|
| MB-01 | Runtime `migrator.ts` module contains zero `node:` imports (structural) | `src/data/__tests__/migrator.runtime.test.ts` (new) |
| MB-02 | `migrateDatabase()` does NOT call `loadMigrationConfig()`; uses static bundle | Same |
| MB-03 | Bootstrap: `migrateDatabase()` invoked before `userSettingsRepository.get()` | `app/__tests__/_layout.test.tsx` (extend) |
| MB-04 | Bootstrap READY: `userSettingsRepository.get()` called only after migration success | Same |
| MB-05 | Bootstrap ERROR: migration failure → `setBootstrapState(ERROR)`; no DB child flow exposed | Same |
| MB-06 | Bootstrap ERROR: `BootstrapErrorView` renders; retry action available | Same |
| MB-07 | Bootstrap retry: resets state to LOADING; re-invokes sequence; `migrateDatabase()` re-attempted | Same |
| MB-09 | Two near-concurrent `migrateDatabase()` calls → both settle; correct schema; one ledger row per migration | `src/data/__tests__/migrations.test.ts` (extend) |
| IR-01 | `app/index.tsx` renders only `<Redirect href="/(tabs)/today" />` | `app/__tests__/RootRoute.test.tsx` (new) |
| IR-02 | No store reads, DB reads, or decision logic in `app/index.tsx` (structural) | Same |
| IR-03 | PENDING: RootGate intercepts before index.tsx mounts; no redirect loop | Covered by existing B-series; verify no gap |
| IR-04 | COMPLETE + at "/": index.tsx mounts → redirect to `/(tabs)/today` | `app/__tests__/RootRoute.test.tsx` |
| IR-05 | LOADING/ERROR bootstrap: `BootstrapLoadingView` / `BootstrapErrorView` rendered; Slot blocked | Covered by MB-05/MB-06 + existing B-series |
| SB-01 | `babel.config.js` exists and includes `inline-import` for `.sql` | `__tests__/bundleConfig.test.ts` or equivalent |
| SB-02 | `metro.config.js` includes `sql` in `sourceExts` | Same |

**Do NOT add:** Duplicate coverage of MG-01/MG-03 (idempotency, fresh-DB migration — already covered).
**MB-08 satisfied by:** existing MG-03.

Exact count reconciliation is Gemini's responsibility during implementation after reviewing the
full existing suite. Rationale for each test must be documented in the implementation.

### 18.4 Static Verification Gates

```bash
npm run typecheck    # 0 TypeScript errors
npm run lint         # 0 ESLint errors / 0 warnings
npm test             # 1653 baseline + all M24 new tests pass; 0 failures
```

---

## 19. CNG Native Release Verification

### 19.1 Android QA

**Minimum acceptable environment:** M23_QA_ROOT (API 36 Android emulator) for GATE-3 and GATE-6.
Physical Android device may additionally be used.

**Canonical QA procedure:**

```bash
npx expo prebuild --clean --platform android
npx expo run:android --variant release
```

**Required checks:**

| ID | Check | Gate |
|---|---|---|
| AND-R1 | App opens from launcher icon | GATE-RB2 |
| AND-R2 | No `+not-found` screen on launcher launch | GATE-RB2 |
| AND-R3 | Fresh install (clear app data): bootstrap → onboarding (migration succeeds) | GATE-RB1 |
| AND-R4 | Migration: all tables created; no `BootstrapErrorView` | GATE-RB1 |
| AND-R5 | Onboarding: 4-step flow; reach Today | GATE-RB1 |
| AND-R6 | Today: prayer tabs visible; data intact | Functional |
| AND-R7 | App restart: data persists | Functional |
| AND-R8 | ar-SA locale: all 8 directional chevrons flip in RTL | GATE-6 |
| AND-R9..R13 | TalkBack: CF-A6/A8/A12/A14/A16 modal focus trapping | GATE-3 |
| AND-R14..R15 | Widget: Small + Medium render from launcher; tap deep-links | Native |

Additionally: Inspect merged permissions in generated `android/app/src/main/AndroidManifest.xml`.

### 19.2 iOS QA

GATE-4 and GATE-5 require EAS build + physical iOS device.

| Gate | Requirement | Status |
|---|---|---|
| GATE-4 (widget gallery) | EAS build + iOS device | Required for iOS release |
| GATE-5 (App Group terminated delivery) | EAS build + iOS device | Required for iOS release |

If iOS environment is unavailable: BLOCKED status accepted **only with explicit Technical Lead
authorization**. This is not automatic and does not relax the requirement.

---

## 20. Native Gate Table

| Gate | Description | M23 Status | M24 Requirement |
|---|---|---|---|
| GATE-1 | TaskCard TalkBack composite | PASS | None — retained |
| GATE-2 | PrayerHeader TalkBack composite | PASS | None — retained |
| GATE-3 CF-A6 | JournalDeleteDialog modal focus trap | PENDING | **PASS REQUIRED** |
| GATE-3 CF-A8 | JournalPrivacySheet modal focus trap | PENDING | **PASS REQUIRED** |
| GATE-3 CF-A12 | EditScopeSheet modal focus trap | PENDING | **PASS REQUIRED** |
| GATE-3 CF-A14 | PremiumLockedInfo modal focus trap | PENDING | **PASS REQUIRED** |
| GATE-3 CF-A16 | Hijri Calendar modal focus trap | PENDING | **PASS REQUIRED** |
| GATE-4 | iOS widget gallery render | PENDING | Required (iOS) or BLOCKED w/ Lead approval |
| GATE-5 | iOS App Group terminated delivery | PENDING | Required (iOS) or BLOCKED w/ Lead approval |
| GATE-6 | 8 directional chevrons RTL (ar-SA) | PENDING | **PASS REQUIRED** |
| GATE-7 | Planning-day boundary behavior | PASS | None — retained |
| GATE-RB1 | Fresh install bootstrap (migration + onboarding) | NEW | **PASS REQUIRED** |
| GATE-RB2 | Launcher cold-start root route (no +not-found) | NEW | **PASS REQUIRED** |

---

## 21. Completion Criteria

M24 MUST NOT close while any of the following is true:

1. `src/data/migrator.ts` contains any `node:` import at top level or within any function.
2. `babel.config.js` is absent or does not include `inline-import` for `.sql`.
3. `metro.config.js` does not include `sql` in `sourceExts`.
4. `babel-plugin-inline-import` is not installed as a `devDependency`.
5. `app/_layout.tsx` does not invoke `migrateDatabase()` before `userSettingsRepository.get()`.
6. `app/index.tsx` is absent or contains routing decision logic.
7. Any test fails (`npm test` returns non-zero).
8. TypeScript errors > 0 or ESLint errors > 0.
9. GATE-3 (CF-A6/A8/A12/A14/A16): any of the 5 modal focus tests not PASS.
10. GATE-6: RTL directional chevron verification not PASS.
11. GATE-RB1: Fresh install bootstrap not PASS.
12. GATE-RB2: Launcher cold-start root route not PASS.

---

## 22. Work Packages

### WP-1 — Runtime Migration Foundation (P0)

**Goal:** Make the full migration path Hermes-safe: zero Node imports in runtime module; SQL bundling configured.

**Expected tracked changes:**

| File | Status | Change |
|---|---|---|
| `src/data/migrator.ts` | MODIFY | Rewrite as Node-free runtime module |
| `src/data/__tests__/migrationConfigLoader.node.ts` | NEW | Node-only `loadMigrationConfig()` helper |
| `src/data/__tests__/migrations.test.ts` | MODIFY | Update `loadMigrationConfig` import |
| `src/data/__tests__/testDbHelper.ts` | MODIFY | Update `loadMigrationConfig` import |
| `babel.config.js` | NEW | `babel-preset-expo` + inline-import |
| `metro.config.js` | MODIFY | Add `sql` to `sourceExts` |
| `package.json` | MODIFY | Add `babel-plugin-inline-import` devDep |
| `package-lock.json` | MODIFY | npm lockfile |

**Invariants:**
- `migrator.ts` zero `node:` imports
- `migrateDatabase()` uses `migrations.js` bundle exclusively
- `loadMigrationConfig()` inaccessible from any runtime-reachable module
- Migration SQL files and `migrations.js` unmodified
- `drizzle.config.ts` unmodified

---

### WP-2 — Bootstrap Integration + Root Route (P0)

**Goal:** Wire migration into bootstrap; create canonical root route.

**Expected tracked changes:**

| File | Status | Change |
|---|---|---|
| `app/_layout.tsx` | MODIFY | LOADING/READY/ERROR bootstrap state; `await migrateDatabase()`; retry |
| `app/index.tsx` | NEW | `<Redirect href="/(tabs)/today" />` only |

**Invariants:**
- `migrateDatabase()` completes before `userSettingsRepository.get()`
- Migration failure → ERROR state; `BootstrapErrorView` renders
- Retry re-invokes full sequence
- `app/index.tsx` contains zero onboarding/DB logic

**Dependencies:** WP-1.

---

### WP-3 — Automated Test Reconciliation (P1)

**Goal:** Fill release-critical test gaps; do not duplicate existing MG/B-series coverage.

**Expected tracked changes:**

| File | Status | Tests |
|---|---|---|
| `src/data/__tests__/migrator.runtime.test.ts` | NEW | MB-01, MB-02 |
| `app/__tests__/_layout.test.tsx` | MODIFY | MB-03..MB-07 |
| `src/data/__tests__/migrations.test.ts` | MODIFY | MB-09 |
| `app/__tests__/RootRoute.test.tsx` | NEW | IR-01..IR-04 |
| Config test location TBD | NEW | SB-01, SB-02 |

**Dependencies:** WP-1, WP-2.

---

### WP-4 — Release Configuration (P1)

**Goal:** Commit EAS config; perform authorized `app.json` changes only after prebuild audit.

**Expected tracked changes:**

| File | Status | Change |
|---|---|---|
| `eas.json` | NEW | EAS build profiles |
| `app.json` | MODIFY (conditional) | Android permissions if prebuild audit requires |
| `app/demo.tsx` | MODIFY (P2) | Production redirect (authorized; may defer to M25) |

**Do NOT:**
- Add `ios.appGroupIdentifier` (wrong field)
- Commit Android keystore or credentials
- Change `userInterfaceStyle`, display name, or splash
- Commit generated `android/` or `ios/`

**Dependencies:** WP-1, WP-2 (independent; committed after P0 blockers).

---

### WP-5 — Native Release Verification (P1)

**No committed source changes.** QA execution only.

Procedure: See §19. Execute GATE-RB1, GATE-RB2, GATE-3, GATE-6, GATE-4/5 per §20.

**Dependencies:** WP-1, WP-2, WP-4.

---

## 23. File-Level Tracked Change Map

### Must Change

| File | WP | Description |
|---|---|---|
| `src/data/migrator.ts` | WP-1 | Node-free runtime module |
| `src/data/__tests__/migrationConfigLoader.node.ts` | WP-1 | NEW: Node-only loader |
| `src/data/__tests__/migrations.test.ts` | WP-1, WP-3 | Import update + MB-09 |
| `src/data/__tests__/testDbHelper.ts` | WP-1 | Import update |
| `src/data/__tests__/migrator.runtime.test.ts` | WP-3 | NEW: MB-01, MB-02 |
| `babel.config.js` | WP-1 | NEW: babel config |
| `metro.config.js` | WP-1 | Add sql to sourceExts |
| `package.json` | WP-1 | Add babel-plugin-inline-import devDep |
| `package-lock.json` | WP-1 | npm lockfile |
| `app/_layout.tsx` | WP-2 | Bootstrap state machine |
| `app/index.tsx` | WP-2 | NEW: root route redirect |
| `app/__tests__/_layout.test.tsx` | WP-3 | Add MB-03..MB-07 |
| `app/__tests__/RootRoute.test.tsx` | WP-3 | NEW: IR-01..IR-04 |
| `eas.json` | WP-4 | NEW: EAS build profiles |

### Conditional Changes

| File | WP | Condition |
|---|---|---|
| `app.json` | WP-4 | Only if prebuild audit reveals missing Android permissions |
| `app/demo.tsx` | WP-4 | P2: production redirect (authorized; may defer to M25) |

### Must NOT Be Tracked Changes

- `android/` — generated, ignored by `.gitignore`
- `ios/` — generated, ignored by `.gitignore`
- All migration SQL files (`src/data/migrations/*.sql`)
- `src/data/migrations/migrations.js` (unless proven generation defect)
- `src/data/migrations/meta/_journal.json`
- `drizzle.config.ts`
- All domain, scheduling, recurrence, materialization source
- All M22/M23 accessibility/RTL implementation files
- All widget source files
- `src/stores/useOnboardingStore.ts`
- `src/data/repositories/UserSettingsRepository.ts`

---

## 24. Validation Commands

```bash
# After each WP:
npm run typecheck
npm run lint
npm test

# CNG release binary (Android):
npx expo prebuild --clean --platform android
npx expo run:android --variant release

# Permissions audit (after prebuild):
cat android/app/src/main/AndroidManifest.xml | grep -i permission

# EAS builds (when environment available):
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

---

## 25. OPUS Review Recommendation

**OPUS REVIEW RECOMMENDED: YES**

**Rationale:** The corrected M24 architecture touches:

1. **Runtime module boundary** — splitting a Node/Hermes-mixed module into separate runtime and test-only modules with strict import discipline
2. **Build toolchain** — new Babel config, Metro config change, new dev dependency
3. **Database bootstrap ordering** — asynchronous lifecycle with explicit failure semantics and retry
4. **Transaction and concurrency reasoning** — verified from Drizzle source; correctness depends on understanding SQLite write serialization
5. **CNG release artifact construction** — first CNG release binary for this project

**Scope of Opus audit (narrowly bounded):**

- WP-1: Is the migrator module split correct? Is the import boundary clean?
- WP-1: Is the SQL bundling configuration complete and correct for Expo SDK 57 + Drizzle?
- WP-2: Is the bootstrap state machine correct? Are all failure modes handled correctly?
- WP-2: Is the routing state machine sound? No redirect loops?
- §9: Is the concurrent-call safety conclusion defensible from the Drizzle source evidence?

**Opus must NOT be asked to redesign the application architecture, domain logic, or UI.**

---

## 26. ADR Governance

No new ADRs required for M24. Implementation governed by:

- **ADR-002** — expo-sqlite / Drizzle migration mechanism
- **ADR-028** — onboarding gate contract
- **ADR-029** — themeReady bootstrap gate (M24 extends with explicit ERROR state)
- **ADR-031** — refresh coordinator semantics (downstream of bootstrap)

The bootstrap state machine amendment (`LOADING | READY | ERROR`) is an implementation correction
within the ADR-029 / ADR-028 framework, not a new architectural decision.

---

## 27. M25+ Deferrals

| Item | Rationale |
|---|---|
| Android Play Store submission | Post-M24; requires store listing, review process |
| iOS App Store submission | Post-M24; requires EAS submit, App Store Connect setup |
| `userInterfaceStyle`: "automatic" | P2 deferred; product/design decision |
| App display name correction | P2 deferred; product decision |
| Splash screen branding | P2 deferred; product decision |
| Worship Suggestions | Permanently deferred; schema dormant |
| Native biometric physical verification | P3; user opt-in feature |
| Native AES journal physical verification | P3; user opt-in feature |
| Real notification device delivery | P3; delivery path verified in M13 |
| Android R8 minification | P3; post-release optimization |
| Cloud backup / sync | Separate product decision |

---

*M24 RELEASE-PREP ARCHITECTURE CORRECTED AND FROZEN —
AWAITING CHATGPT TECHNICAL LEAD + OPUS ARCHITECTURE REVIEW.*
