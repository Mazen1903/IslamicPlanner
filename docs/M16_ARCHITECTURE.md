# M16 — Journal Experience / UI: Architecture Freeze

> **Status:** CLOSED / SONNET APPROVED
> **Authority:** Authoritative over M16 implementation decisions
> **Baseline:** M15 CLOSED / SONNET APPROVED — 1005/1005 tests, 73 suites, commit `9752921`
> **Architecture Commit:** `a316b19`
> **Implementation Commit:** `b4e09c1`
> **Test-Hardening Commit:** `cb2428a`
> **Final Automated Verification:** 1092/1092 tests (89 suites), clean typecheck, clean lint
> **Last Updated:** 2026-09-18

---

## 1. Milestone Goal

M16 turns the completed M15 encrypted Journal backend into a complete, user-facing Journal tab. The Worship tab placeholder is replaced by a fully functional, calm, private Journal experience aligned with the prayer-centered planner's design language.

**Permanent bottom navigation after M16:**
```
Today | Calendar | + | Journal | Settings
```

Worship Suggestions remain **deferred** — not deleted. Worship domain scaffolding and schema are preserved.

---

## 2. Baseline Facts (M15 API Available to M16)

The M16 UI layer consumes the M15 service layer as-is. No M15 source files are modified.

### 2.1 Available Service API

```typescript
// JournalService — src/services/journal/JournalService.ts

// Resolves current planning day. Returns null if setup is required.
async getCurrentPlanningDayKey(now?: DateTime): Promise<string | null>

// Load and decrypt an entry. Returns null if no entry exists for this key.
async loadEntry(planningDayKey: string): Promise<JournalEntry | null>

// Encrypt and upsert with revision protection.
async saveEntry(input: JournalEntrySaveInput): Promise<JournalEntry>

// Hard-delete by entry UUID. Returns true if deleted.
async deleteEntry(id: string): Promise<boolean>

// Metadata-only history list. Never decrypts content.
async listHistory(options?: JournalListOptions): Promise<JournalEntryMetadata[]>

// Metadata-only date range query.
async findByDateRange(startKey: string, endKey: string): Promise<JournalEntryMetadata[]>
```

### 2.2 Key Domain Types (Unchanged)

```typescript
interface JournalPayload {
  body: string;
  reflections: {
    gratitude: string;
    wentWell: string;
    improvement: string;
    dua: string;
  };
}

interface JournalEntry {
  id: string;
  planningDayKey: string;   // YYYY-MM-DD civil date
  payload: JournalPayload;  // decrypted — plaintext in memory only
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntryMetadata {
  id: string;
  planningDayKey: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  // NOTE: No decrypted content — used for history list display only
}
```

### 2.3 Error Types (Unchanged)

- `JournalError` — base
- `JournalEncryptionError` — crypto failure
- `StaleWriteError` — revision mismatch on save
- `JournalKeyError` — SecureStore key failure

### 2.4 JournalKeyManager.clearMemoryCache()

Available for biometric lock: `journalKeyManager.clearMemoryCache()` wipes the in-memory AES key. The key remains safely in SecureStore; next `getOrCreateKey()` re-reads it.

---

## 3. Product Identity Constraints (Absolute)

The Journal must be:
- **Calm** — no urgency, no pressure, no visual noise
- **Private** — never exposes content; never leaks to notifications, logs, clipboard
- **Simple** — one entry per planning day; no tagging, foldering, search
- **Reflective** — prompts are optional aids, not mandatory fields
- **Warm** — uses existing design system colors and typography exactly
- **Zero-guilt** — no streaks, no missed-day indicators, no word count metrics

The Journal must NOT be:
- A mood tracker / score / XP system
- A streak tracker
- A social journal
- Gamified in any form
- AI-analyzed
- A productivity dashboard

---

## 4. Navigation Architecture Decision

### Decision: Single Journal Tab Screen with Internal Modes (Option A)

The Journal tab uses **a single screen with internal view state**, not nested Expo Router stacks.

**Rationale:**
- The app already manages complex state (Today, Calendar) in single screens via hooks
- Nested stacks would require additional route files, router configuration, and add visual complexity for what is essentially a two-mode (editor/history) UI
- The permanent bottom nav remains stable and visible in all Journal states
- Single screen allows the autosave controller to have unambiguous lifecycle — no route-transition ambiguity

**Journal screen modes:**

```
BOOTSTRAPPING    → loading getCurrentPlanningDayKey + biometric check
SETUP_REQUIRED   → location not configured; calm prompt
LOCKED           → biometric lock enabled; show unlock CTA
UNLOCKING        → biometric prompt actively shown
LOADING_ENTRY    → loading/decrypting current entry
READY_CLEAN      → editor visible, no unsaved changes
READY_DIRTY      → editor visible, unsaved changes pending debounce
SAVING           → save in flight
SAVE_ERROR       → last save failed; draft retained in memory
LOADING_HISTORY  → history list loading
HISTORY          → history list visible
LOAD_ERROR       → failed to load entry
```

State is managed by `useJournal` hook projecting from `JournalAutosaveController` and `JournalLockController`.

---

## 5. Screen Layout

### 5.1 Journal Screen Structure

```
┌─────────────────────────────────────────┐
│  SafeAreaView (top, left, right edges)  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ JournalHeader                     │  │
│  │  "Journal"           [lock icon]  │  │
│  │  Monday, 16 Sep 2026             │  │
│  │  18 Rabi al-Awwal 1448 H         │  │
│  │  [History button]   [SaveStatus] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── EDITOR MODE ──                      │
│  ┌───────────────────────────────────┐  │
│  │ ScrollView                        │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ JournalEditor               │ │  │
│  │  │  multiline TextInput        │ │  │
│  │  │  (main body)                │ │  │
│  │  └─────────────────────────────┘ │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │ ReflectionSection (collapsed)│ │  │
│  │  │  [Reflections ▾]            │ │  │
│  │  │  ─ gratitude               │ │  │
│  │  │  ─ went well               │ │  │
│  │  │  ─ improvement             │ │  │
│  │  │  ─ dua                     │ │  │
│  │  └─────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ── HISTORY MODE ──                     │
│  ┌───────────────────────────────────┐  │
│  │ JournalHistory (FlatList)         │  │
│  │  [← Back to Today's Entry]        │  │
│  │  JournalHistoryRow × N            │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
   BottomNavBar (always visible)
```

### 5.2 Locked State Layout

```
┌─────────────────────────────────────────┐
│  SafeAreaView                           │
│                                         │
│  JournalHeader (title + dates only)     │
│                                         │
│  JournalLockedState                     │
│   [journal icon — book-outline]         │
│   "Private reflections are locked"      │
│   "on this device."                     │
│                                         │
│   [Unlock Journal]   ← Button primary   │
│                                         │
└─────────────────────────────────────────┘
   BottomNavBar (always visible)
```

---

## 6. Planning-Day Key Pinning Contract

### 6.1 Resolution

On entering the Journal tab (or on `useFocusEffect` if tab is already mounted):

1. Call `journalService.getCurrentPlanningDayKey()` once
2. Store the result in component state as `pinnedPlanningDayKey`
3. Pass `pinnedPlanningDayKey` to `JournalAutosaveController.beginSession(planningDayKey)`
4. All `saveEntry()` calls during the session use `pinnedPlanningDayKey` verbatim

### 6.2 Planning-Day Transition During Active Session

The UI **does not** silently switch to a new planning day during an active editing session.

**Policy:**
- If `getCurrentPlanningDayKey()` returns a different key than the current `pinnedPlanningDayKey` (detected on app foreground return or periodic check), the UI may show a **calm informational indicator**: "New planning day has started."
- The user must explicitly tap to open the new day's entry.
- The current draft is flushed and saved before switching.
- **No automatic draft migration.** No silent movement of content.

### 6.3 Null Planning Day Key (SETUP_REQUIRED)

If `getCurrentPlanningDayKey()` returns `null`: display `SetupRequiredState`. Do not request GPS. Do not create a Gregorian fallback.

---

## 7. Autosave Controller Architecture

### 7.1 JournalAutosaveController

A **plain TypeScript class** — not a React hook. Testable independently of rendering.

```typescript
// src/services/journal/JournalAutosaveController.ts

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface AutosaveSnapshot {
  planningDayKey: string;
  payload: JournalPayload;
  revision: number | undefined;  // undefined = new entry (first save)
}

export class JournalAutosaveController {
  constructor(
    private readonly service: JournalService,
    private readonly debounceMs: number = 2000,
    private readonly onStateChange: (state: SaveState) => void
  ) {}

  /** Called once when editor opens for a planning day. */
  async beginSession(planningDayKey: string): Promise<void>

  /** Called on every keystroke. Debounces. */
  enqueueEdit(payload: JournalPayload): void

  /** Immediately flushes any pending dirty draft. Returns when done or on error. */
  async flush(): Promise<void>

  /** Resets controller state. Call when switching planning day or entries. */
  reset(): void

  /** Current controller state for UI projection. */
  get state(): SaveState

  /** Current in-memory draft payload (for recovery from error). */
  get draftPayload(): JournalPayload | null
}
```

### 7.2 Debounce and Coalescing

```
User types → enqueueEdit(payload) → clears old timer → sets 2s debounce timer
                                                           ↓ (2s elapsed)
                                                     _executeWrite()
                                                           ↓
                                              service.saveEntry(pinnedKey, latestDraft, revision)
```

**Invariant:** `_executeWrite()` always uses the **latest** `draftPayload` at the moment of execution — not the payload at the time `enqueueEdit` was called. This coalesces rapid edits so only one write is issued per debounce period.

### 7.3 Write Serialization

The controller uses an internal **serial promise chain** (not a Mutex library) to prevent concurrent writes:

```typescript
// Pseudocode
private _writeChain: Promise<void> = Promise.resolve();

private _scheduleWrite(payload: JournalPayload): void {
  this._writeChain = this._writeChain.then(() => this._doWrite(payload));
}
```

A new write is appended to the chain rather than running concurrently. Combined with debounce coalescing, this guarantees that only the latest draft can ever win — older saves cannot overwrite newer ones.

### 7.4 Stale Write Recovery Policy

`StaleWriteError` is not expected in normal single-user usage, but must be handled safely:

```
StaleWriteError received
   ↓
1. Reload latest persisted entry (journalService.loadEntry)
2. Update internal revision to match latest row
3. Retry save once with the local draft payload and new revision
4. If retry succeeds → state = 'saved'
5. If retry throws StaleWriteError again → state = 'error'
   (surface "Not saved yet" — do NOT discard draft)
6. If retry throws other error → state = 'error'
   (surface "Not saved yet" — do NOT discard draft)
```

**Invariant:** Local draft is NEVER silently discarded on any save error. `draftPayload` remains accessible. User may retry manually or re-enter content.

### 7.5 Flush Triggers

The controller's `flush()` method is called on:

| Trigger | Ordering note |
|---|---|
| App background / inactive | Flush BEFORE clearing locked state / key cache |
| Navigate away from Journal tab | Flush before transition |
| Navigate to history list | Flush current entry first |
| Select historical entry from history | Flush current entry, then load historical |
| Return from historical entry to current | Flush historical edit, then reload current |
| Planning-day transition (explicit user tap) | Flush current, then begin new session |

### 7.6 Empty Entry Policy

**Do NOT create a database row merely because the Journal tab was opened.**

If the user opens Journal, reads the empty editor, and navigates away without typing anything:
- `enqueueEdit` is never called
- No save occurs
- No database row is created

If an existing entry is edited back to completely empty:
- **Policy: Hard-delete on flush if content is completely empty** (body.trim() === '' AND all reflection fields empty)
- Rationale: An encrypted empty entry is wasteful and surprising; the absence of a row correctly represents "nothing written"
- This must be confirmed as a FREEZE decision; implementation must match
- On delete: remove from history, clear editor state, show "Nothing written yet" placeholder

**Implementation note:** The flush method checks the `isEmpty(payload)` condition before deciding whether to `saveEntry` or `deleteEntry`.

---

## 8. History Behavior

### 8.1 History List

- Sourced from `journalService.listHistory({ limit: 50 })`
- Newest-first (confirmed by M15 repository implementation)
- Displays per row: Gregorian date (formatted), Hijri date (derived at display time), relative time hint
- **No content preview of any kind**
- No word count
- No excerpt
- No reflection snippet

### 8.2 History Row Tap

1. Flush current dirty draft (if any)
2. `reset()` current autosave controller session
3. `beginSession(selectedPlanningDayKey)` for the historical entry
4. Load and decrypt selected entry
5. Display in editor — same component, different planningDayKey

The editor makes no visual distinction between "current day" and "historical day" except:
- The header shows the historical date
- A "← Return to Today's Entry" action is visible

### 8.3 Return to Current Entry

1. Flush historical draft (if any)
2. `reset()`
3. `beginSession(originalPinnedPlanningDayKey)`
4. Reload current day entry

### 8.4 History Pagination

Initial load: 50 entries. Load-more on scroll if `hasMore` is returned. The `findByDateRange` API is not used for history display (it's available for future Calendar integration).

---

## 9. Delete Entry

Delete is only exposed for an existing persisted entry (not for new/empty state).

```
User taps delete icon
   ↓
Confirmation modal:
  "Delete this journal entry?"
  "This cannot be recovered."
  [Cancel]  [Delete]
   ↓ (Delete tapped)
1. Cancel any pending debounce
2. journalService.deleteEntry(entry.id)
3. Clear editor state
4. Remove from history list (local state update)
5. If deleting current planning day entry → show empty editor for that day
6. If deleting historical entry → return to history list or back-nav
```

Copy must be calm and factual. No guilt language.

---

## 10. Hijri Date Display

### 10.1 Strategy

Derive Hijri date from `planningDayKey` at display time using the **existing canonical `HijriService`**.

```typescript
// In JournalHeader component:
const hijriDate = hijriService.toHijri(planningDayKey);
// Format: "18 Rabi al-Awwal 1448 H"
```

Do NOT:
- Store Hijri dates
- Create a new Hijri converter
- Use a new library

The `HijriService` is available at `src/domain/calendar/HijriService.ts` via the existing singleton.

### 10.2 Display Format

```
Primary:   Monday, 16 Sep 2026
Secondary: 18 Rabi al-Awwal 1448 H
```

Gregorian date is primary; Hijri date is secondary (smaller, muted color `colors.textSecondary`).

Hijri adjustment configuration from user settings is applied automatically by `HijriService.toHijri()`.

---

## 11. Biometric Lock Architecture

### 11.1 Model

Biometric lock is a **separate session gate** layered above the M15 encryption stack.

```
Journal Tab
   ↓
JournalLockController (checks lockEnabled + sessionUnlocked)
   ↓ (unlocked)
Journal UI → useJournal hook → JournalService
   ↓
M15: JournalCryptoService + JournalKeyManager + JournalRepository
```

The M15 AES-256-GCM encryption remains active **regardless** of whether biometric lock is enabled. Biometrics do not modify the encryption key or the key storage slot. The lock is additive.

### 11.2 JournalLockController

A **plain TypeScript class** — not a React hook. Testable independently of rendering.

```typescript
// src/services/journal/JournalLockController.ts

export type LockState = 'unlocked' | 'locked' | 'unlocking';

export class JournalLockController {
  constructor(
    private readonly lockPref: JournalLockPreference,
    private readonly keyManager: JournalKeyManager,
    private readonly localAuth: LocalAuthenticationAdapter
  ) {}

  /** Current in-session lock state. NEVER persisted. */
  get state(): LockState

  /** Returns true if biometric lock feature is enabled in preferences. */
  get isEnabled(): boolean

  /** Called when entering Journal tab. Determines whether to prompt. */
  async checkOnFocus(): Promise<LockState>

  /** Triggers biometric authentication prompt. Returns new state. */
  async unlock(): Promise<LockState>

  /** Locks the session. Clears in-memory key cache. */
  lock(): void

  /** Enable journal lock. Verifies biometrics first. Returns success. */
  async enableLock(): Promise<boolean>

  /** Disable journal lock. Returns success. */
  async disableLock(): Promise<boolean>

  /** Called on app background. Locks session. */
  onBackground(): void
}
```

**Session state:**
- `sessionUnlocked: boolean` — lives in memory only, never persisted
- Starts as `false` if `lockEnabled = true`
- Starts as `true` (implicitly always unlocked) if `lockEnabled = false`

### 11.3 Lock Preference Storage

**Decision: SecureStore slot `journal_biometric_lock_enabled_v1`**

Rationale:
- Zero new SQLite migrations
- Consistent with existing SecureStore usage pattern (JOURNAL_KEY_STORAGE_SLOT)
- The value is a boolean preference, not secret content — but SecureStore is already a project dependency and avoids adding AsyncStorage
- The preference is small and read-once at startup

```typescript
// src/services/journal/JournalLockPreference.ts

export const JOURNAL_LOCK_PREF_SLOT = 'journal_biometric_lock_enabled_v1';

export class JournalLockPreference {
  async isEnabled(): Promise<boolean>
  async setEnabled(value: boolean): Promise<void>
}
```

### 11.4 Enabling Lock — Pre-Conditions

Before enabling Journal Lock:

1. `LocalAuthentication.hasHardwareAsync()` — device has biometric hardware
2. `LocalAuthentication.isEnrolledAsync()` — biometrics are enrolled
3. Trigger `LocalAuthentication.authenticateAsync()` — user completes successful auth
4. Only on success: `JournalLockPreference.setEnabled(true)`
5. Mark session as unlocked (user just proved identity)

If any step fails:
- Do NOT enable
- Show calm explanatory message based on failure type
- Surface user-friendly messages (see §11.8)

### 11.5 Unlock Behavior

If `lockEnabled = false`: Journal opens without prompt. `state = 'unlocked'`.

If `lockEnabled = true`:
- On tab focus: `checkOnFocus()` returns `'locked'`
- Show `JournalLockedState`
- User taps "Unlock Journal"
- Call `LocalAuthentication.authenticateAsync()` with options (see §11.7)
- On success: `state = 'unlocked'`; key cache re-populated on next `getOrCreateKey()`
- On failure/cancel: `state = 'locked'`; remain on locked screen

**Do NOT re-prompt on every render.** The prompt fires once per unlock attempt (user-initiated).

### 11.6 Background Lock Sequence

When app transitions to `background` or `inactive`:

```
AppState → 'background'
   ↓
1. journalAutosaveController.flush()       ← flush FIRST (protect unsaved text)
   ↓
2. journalLockController.onBackground()    ← lock session
   - sessionUnlocked = false
   - journalKeyManager.clearMemoryCache()  ← wipe AES key from memory
   ↓
3. Clear decrypted Journal UI state
   (editor content, entry payload — do not render plaintext while locked)
```

**Ordering is critical:** flush before locking to avoid losing unsaved text.

### 11.7 LocalAuthentication Options

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const AUTH_OPTIONS: LocalAuthentication.LocalAuthenticationOptions = {
  promptMessage: 'Unlock your Journal',
  cancelLabel: 'Cancel',
  disableDeviceFallback: true,  // No PIN/passcode fallback
  // biometricsSecurityLevel: 'strong' on Android (SDK 30+) where supported
};
```

`disableDeviceFallback: true` enforces biometrics-only — no system PIN fallback. This matches the product's "biometrics only" intent.

On Android, check `LocalAuthentication.getEnrolledLevelAsync()` to confirm `BIOMETRIC_STRONG` level where relevant; degrade gracefully on older devices.

### 11.8 Authentication Error Handling

| Error | User-visible message |
|---|---|
| `user_cancel` | (No message — user chose to cancel; remain locked) |
| `app_cancel` | (Silent — auth cancelled programmatically) |
| `authentication_failed` | "Authentication failed. Please try again." |
| `not_enrolled` | "No biometrics are enrolled on this device. Please set up Face ID or fingerprint in Settings." |
| `not_available` | "Biometric authentication is not available on this device." |
| `lockout` | "Too many failed attempts. Please try again later." |
| `system_cancel` | (Silent — system cancelled; remain locked) |

Do not surface raw error codes to the user.

### 11.9 Biometric Enrollment Changes

Because M16 uses LocalAuthentication as a session gate (not as a key derivation input):

- Changing biometrics **does NOT make encrypted data unrecoverable**
- If biometrics become unavailable while lock is enabled:
  - Journal remains locked
  - Show: "Biometrics are no longer available. Please re-enroll in device Settings."
  - **Do NOT auto-disable the lock**
  - **Do NOT bypass the lock**
  - A future explicit recovery flow (M17 Settings or later) may offer a deliberate disable-lock option

### 11.10 App Restart Lock Behavior

On process restart with `lockEnabled = true`:
- `JournalLockController` initializes with `sessionUnlocked = false`
- The locked state is shown immediately when Journal tab is focused
- No persistence of `sessionUnlocked = true` anywhere

### 11.11 Journal Lock Privacy UI (In-Tab)

M17 is the full Settings milestone. M16 exposes a minimal lock control within the Journal tab:

- A small `[lock icon]` or `[privacy]` affordance in the `JournalHeader`
- Tapping opens `JournalPrivacySheet` — a simple modal/sheet
- Contents: toggle for Journal Lock, explanatory copy, current status

```
Journal Privacy

Journal Lock
Use Face ID / fingerprint to lock
your private entries on this device.

[Toggle: Off → On]

"Biometric authentication is required
to enable this feature."
```

This sheet can later be mirrored in M17 Settings without duplication. It should live in a composable component `JournalPrivacySheet`.

---

## 12. Face ID Permission (iOS)

`expo-local-authentication` requires the Face ID usage string in app.json.

### 12.1 Plugin Configuration

```json
// app.json
{
  "expo": {
    "plugins": [
      // ... existing plugins ...
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow islamic-planner-app to use Face ID to unlock your private Journal."
        }
      ]
    ]
  }
}
```

**App name note:** The current `app.json` uses `"name": "islamic-planner-app"` and slug `"islamic-planner-app"`. The Face ID string uses this slug name. If the final public product name changes, this string must be updated in M17/M24. Do not guess a different brand name.

### 12.2 Installation Command

```bash
npx expo install expo-local-authentication
```

This triggers autolinking. A native development build is required for actual biometric verification.

---

## 13. Component Architecture

### 13.1 Component Tree

```
app/(tabs)/journal.tsx                    ← Route (replaces worship.tsx)
  └─ JournalScreen                       ← Main view (from useJournal hook)
       ├─ JournalHeader                  ← Title, dates, save status, nav
       ├─ JournalLockedState             ← Rendered when state === LOCKED/UNLOCKING
       ├─ SetupRequiredState             ← Reused from today/ (when SETUP_REQUIRED)
       ├─ ActivityIndicator              ← When BOOTSTRAPPING/LOADING_ENTRY
       ├─ KeyboardAvoidingView           ← Wraps editor + reflections
       │   └─ ScrollView
       │       ├─ JournalEditor          ← Main body TextInput
       │       └─ ReflectionSection      ← Collapsible prompts
       │           ├─ ReflectionField × 4  ← Gratitude, Went Well, Improve, Dua
       ├─ JournalHistory                 ← History list (FlatList)
       │   └─ JournalHistoryRow × N
       ├─ JournalPrivacySheet            ← Lock toggle modal
       └─ JournalDeleteDialog            ← Delete confirmation modal
```

### 13.2 New Files to Create

**Routes:**
- `app/(tabs)/journal.tsx` — Journal route (replaces worship route)

**Components:**
- `src/components/journal/JournalEditor.tsx`
- `src/components/journal/JournalHeader.tsx`
- `src/components/journal/JournalHistory.tsx`
- `src/components/journal/JournalHistoryRow.tsx`
- `src/components/journal/JournalLockedState.tsx`
- `src/components/journal/JournalPrivacySheet.tsx`
- `src/components/journal/JournalSaveStatus.tsx`
- `src/components/journal/ReflectionSection.tsx`
- `src/components/journal/ReflectionField.tsx`
- `src/components/journal/JournalDeleteDialog.tsx`
- `src/components/journal/index.ts`

**Hooks:**
- `src/hooks/useJournal.ts` — Adapts controllers into React state for the screen

**Services:**
- `src/services/journal/JournalAutosaveController.ts`
- `src/services/journal/JournalLockController.ts`
- `src/services/journal/JournalLockPreference.ts`
- `src/services/journal/LocalAuthenticationAdapter.ts` — Thin testable adapter over expo-local-authentication

**Mocks (for tests):**
- `src/__mocks__/expo-local-authentication.ts`

### 13.3 Files to Modify

| File | Change |
|---|---|
| `app/(tabs)/_layout.tsx` | Rename `worship` → `journal`; title `'Worship'` → `'Journal'` |
| `src/components/layout/BottomNavBar.tsx` | `TAB_CONFIG`: `worship` key → `journal` key; `icon: 'prayer'` → `icon: 'journal'`; label `'Worship'` → `'Journal'` |
| `app.json` | Add `expo-local-authentication` plugin with Face ID string |
| `docs/AI_PROJECT_CONSTITUTION.md` | M16 status → CLOSED (at closure time) |
| `docs/IMPLEMENTATION_STATUS.md` | M16 row → CLOSED (at closure time) |
| `docs/ARCHITECTURE_INDEX.md` | Add Section 20 Journal UI (at closure time) |

### 13.4 Files to Delete

| File | Reason |
|---|---|
| `app/(tabs)/worship.tsx` | Placeholder replaced by `journal.tsx` |

**IMPORTANT:** Delete `worship.tsx` only after `journal.tsx` is verified and passing tests. The file is a placeholder with no logic or tests.

### 13.5 Files NOT to Modify

| File | Reason |
|---|---|
| `src/domain/worship/` | Dormant scaffolding — preserved |
| `src/data/schema.ts` | No new tables in M16 |
| `src/data/migrations/` | Zero migrations in M16 |
| `src/services/journal/JournalService.ts` | M15 sealed |
| `src/services/journal/JournalCryptoService.ts` | M15 sealed |
| `src/services/journal/JournalKeyManager.ts` | M15 sealed |
| `src/data/repositories/JournalRepository.ts` | M15 sealed |
| `src/domain/journal/` | M15 sealed |
| `src/components/calendar/` | M14 — not reopened |
| `app/(tabs)/today.tsx` | M7 — not reopened |

---

## 14. Hook Architecture: useJournal

```typescript
// src/hooks/useJournal.ts

export type JournalScreenMode =
  | 'BOOTSTRAPPING'
  | 'SETUP_REQUIRED'
  | 'LOCKED'
  | 'UNLOCKING'
  | 'LOADING_ENTRY'
  | 'READY_CLEAN'
  | 'READY_DIRTY'
  | 'SAVING'
  | 'SAVE_ERROR'
  | 'LOADING_HISTORY'
  | 'HISTORY'
  | 'LOAD_ERROR';

export interface JournalScreenState {
  mode: JournalScreenMode;
  pinnedPlanningDayKey: string | null;
  gregorianDisplay: string;        // "Monday, 16 Sep 2026"
  hijriDisplay: string;            // "18 Rabi al-Awwal 1448 H"
  currentEntry: JournalEntry | null;
  draftPayload: JournalPayload;    // Live editor state
  history: JournalEntryMetadata[];
  selectedHistoryKey: string | null;
  lockEnabled: boolean;
  saveState: SaveState;
  error: string | null;
  showDeleteDialog: boolean;
  showPrivacySheet: boolean;
}

export interface JournalScreenActions {
  onBodyChange: (text: string) => void;
  onReflectionChange: (field: keyof JournalReflections, text: string) => void;
  onHistoryOpen: () => void;
  onHistoryRowPress: (meta: JournalEntryMetadata) => void;
  onReturnToCurrent: () => void;
  onDeletePress: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onUnlockPress: () => void;
  onToggleLock: () => void;
  onPrivacySheetOpen: () => void;
  onPrivacySheetClose: () => void;
  onRetry: () => void;
}

export function useJournal(): JournalScreenState & JournalScreenActions
```

The hook owns:
- Mounting lifecycle (`useFocusEffect`)
- App background listener (via `useAppForeground` pattern adapted for background)
- Controller instantiation (`JournalAutosaveController`, `JournalLockController`)
- State projection to screen

The hook does NOT contain business logic — it delegates to controllers.

---

## 15. Component Specifications

### 15.1 JournalEditor

```typescript
interface JournalEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  planningDayKey: string;
  placeholder?: string;
  testID?: string;
}
```

- `multiline={true}`, `textAlignVertical="top"`
- Font: `Inter` (body font — not Outfit display font)
- Font size: `bodyLarge` (16px)
- Line height: 24px
- Minimum height: ~200px; grows with content
- Background: `colors.surface`
- Border radius: `radii.card`
- Padding: `spacing.lg`
- `returnKeyType="default"` (allows newlines)
- `keyboardType="default"`
- `autoCorrect={true}`
- `spellCheck={true}`
- `accessibilityLabel="Journal entry"`
- `accessibilityHint="Write your thoughts for this planning day"`

### 15.2 ReflectionSection

```typescript
interface ReflectionSectionProps {
  reflections: JournalReflections;
  onReflectionChange: (field: keyof JournalReflections, text: string) => void;
  testID?: string;
}
```

- Default: collapsed (shows "Reflections ▾" with chevron-down icon)
- Tap expands to show 4 ReflectionField components
- No validation — all optional
- Animated expand/collapse (simple LayoutAnimation or Animated.Value)

### 15.3 ReflectionField

```typescript
interface ReflectionFieldProps {
  label: string;
  prompt: string;
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
}
```

Field labels and prompts:

| Field | Label | Placeholder prompt |
|---|---|---|
| `gratitude` | Gratitude | "What are you grateful for today?" |
| `wentWell` | What went well | "What went well today?" |
| `improvement` | For tomorrow | "What could be better tomorrow?" |
| `dua` | Dua | "Any duas on your heart today?" |

### 15.4 JournalHeader

```typescript
interface JournalHeaderProps {
  gregorianDisplay: string;
  hijriDisplay: string;
  saveState: SaveState;
  isHistorical: boolean;
  lockEnabled: boolean;
  onHistoryPress: () => void;
  onPrivacyPress: () => void;
  testID?: string;
}
```

### 15.5 JournalSaveStatus

Small status indicator (not a toast):

| SaveState | Display |
|---|---|
| `idle` / `saved` | "" (empty — no noise when clean) |
| `dirty` | "" (silent — debounce in progress) |
| `saving` | "Saving…" (textSecondary, small) |
| `error` | "Not saved" (warning color, small) |

### 15.6 JournalHistoryRow

```typescript
interface JournalHistoryRowProps {
  meta: JournalEntryMetadata;
  gregorianDisplay: string;  // formatted from meta.planningDayKey
  hijriDisplay: string;      // derived at render time
  onPress: () => void;
  testID?: string;
}
```

No content preview. No excerpt. No word count.

### 15.7 JournalLockedState

```typescript
interface JournalLockedStateProps {
  onUnlockPress: () => void;
  isUnlocking: boolean;
  error: string | null;
  testID?: string;
}
```

Content while locked:
- `Icon name="journal"` (book-outline), size 48, color `colors.primary`
- "Private reflections are locked on this device." (`bodyMedium`, `textSecondary`)
- `Button` "Unlock Journal" (`primary`)
- Error message if auth failed (small, `colors.warning`)

### 15.8 JournalDeleteDialog

```typescript
interface JournalDeleteDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}
```

Modal with:
- Title: "Delete this journal entry?"
- Body: "This entry cannot be recovered."
- Cancel button (`ghost` or `secondary`)
- Delete button (`destructive`)

---

## 16. Editor Keyboard Behavior

- `KeyboardAvoidingView` wraps the scrollable editor area
  - `behavior="padding"` on iOS; `behavior="height"` on Android
- `ScrollView` with `keyboardShouldPersistTaps="handled"`
- When keyboard is open:
  - Editor scrolls so active input stays visible
  - Bottom nav bar is NOT hidden (permanent nav)
  - `contentContainerStyle={{ paddingBottom: keyboardHeight + spacing.section }}` pattern
- Keyboard dismiss: tap outside editor or use `scrollKeyboardDismissMode="interactive"`
- ReflectionFields scroll into view using `ref.measure` + `ScrollView.scrollTo`

---

## 17. Accessibility Requirements

- All `Pressable` components: `accessibilityRole`, `accessibilityLabel`
- Buttons: `accessibilityState={{ disabled: isDisabled }}`
- Save status: `accessibilityLiveRegion="polite"` for "Saving…" / "Not saved" updates
- Locked state: `accessibilityLabel="Journal locked. Tap to unlock."` on unlock button
- History rows: `accessibilityRole="button"`, descriptive label with date
- TextInput: `accessibilityLabel` + `accessibilityHint`
- Toggle in Privacy Sheet: `accessibilityRole="switch"`, `accessibilityState={{ checked }}`
- No color-only save/error state: text must accompany color
- Touch targets: min 44px, comfortable 48px (existing theme tokens)

---

## 18. New Dependencies

### 18.1 Production

| Package | Version | Justification | Plugin required |
|---|---|---|---|
| `expo-local-authentication` | `~57.x` (SDK 57 compatible) | Biometric session gate for Journal Lock | **Yes** — Face ID string in app.json |

**Installation:**
```bash
npx expo install expo-local-authentication
```

**No other new production dependencies.**

### 18.2 app.json Change

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-sqlite",
      "expo-font",
      "expo-secure-store",
      "expo-asset",
      "@react-native-community/datetimepicker",
      "expo-notifications",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow islamic-planner-app to use Face ID to unlock your private Journal."
        }
      ]
    ]
  }
}
```

---

## 19. Database Migrations

**ZERO migrations in M16.**

The `journal_entries` table from M15 migration `0003_colorful_gorilla_man.sql` is sufficient. The `journal_biometric_lock_enabled_v1` preference is stored in SecureStore — no schema change required.

---

## 20. Test Matrix

### Category: Navigation (NAV)

| ID | Test |
|---|---|
| NAV-01 | BottomNavBar renders `journal` tab with `book-outline` icon |
| NAV-02 | BottomNavBar renders `Journal` label for journal route |
| NAV-03 | `worship` key is absent from TAB_CONFIG |
| NAV-04 | `journal` key is present in TAB_CONFIG |
| NAV-05 | Navigation order unchanged: today, calendar, add, journal, settings |
| NAV-06 | `_layout.tsx` has `name="journal"` Tabs.Screen |
| NAV-07 | `_layout.tsx` has no `name="worship"` Tabs.Screen |

### Category: Autosave Controller (ASC)

| ID | Test |
|---|---|
| ASC-01 | `enqueueEdit` does not trigger immediate save |
| ASC-02 | `enqueueEdit` triggers save after debounce interval |
| ASC-03 | Multiple rapid `enqueueEdit` calls coalesce to single write |
| ASC-04 | `flush()` immediately saves pending dirty draft |
| ASC-05 | No save occurs for empty/untouched entry (no `beginSession` edit) |
| ASC-06 | `flush()` on clean state is a no-op |
| ASC-07 | `saveState` transitions: idle → dirty → saving → saved |
| ASC-08 | `saveState` on save error: saving → error; `draftPayload` retained |
| ASC-09 | Write serialization: second save waits for first to complete |
| ASC-10 | Out-of-order settlement cannot overwrite newer payload |
| ASC-11 | `StaleWriteError` triggers reload + single retry |
| ASC-12 | Retry succeeds on StaleWriteError if new revision matches |
| ASC-13 | Repeated StaleWriteError on retry → `error` state; draft retained |
| ASC-14 | `reset()` clears debounce, revision, and draft |
| ASC-15 | `flush()` before background correctly serializes with lock |
| ASC-16 | Empty payload on flush triggers `deleteEntry` not `saveEntry` |
| ASC-17 | Non-empty payload on flush triggers `saveEntry` |

### Category: Lock Controller (LC)

| ID | Test |
|---|---|
| LC-01 | `lockEnabled = false` → `state = 'unlocked'` immediately |
| LC-02 | `lockEnabled = true` → `state = 'locked'` on init |
| LC-03 | `enableLock()` checks hardware availability first |
| LC-04 | `enableLock()` checks enrollment before prompting |
| LC-05 | `enableLock()` triggers auth prompt |
| LC-06 | `enableLock()` succeeds on auth success → persists preference |
| LC-07 | `enableLock()` fails on auth cancel → does not persist |
| LC-08 | `enableLock()` fails on not-enrolled → does not persist |
| LC-09 | `unlock()` calls `authenticateAsync` with correct options |
| LC-10 | Successful `unlock()` → `state = 'unlocked'` |
| LC-11 | Cancelled `unlock()` → `state = 'locked'` |
| LC-12 | Failed `unlock()` → `state = 'locked'` |
| LC-13 | `onBackground()` sets `state = 'locked'` |
| LC-14 | `onBackground()` calls `journalKeyManager.clearMemoryCache()` |
| LC-15 | `disableDeviceFallback: true` in auth options |
| LC-16 | App restart with lock enabled → starts locked |
| LC-17 | Lock disabled: no history/editor content rendered while locked (N/A — unlock gate) |
| LC-18 | `lockout` error → user-friendly message, state stays locked |

### Category: History (HIST)

| ID | Test |
|---|---|
| HIST-01 | `listHistory()` result contains no decrypted content |
| HIST-02 | History rows show only planningDayKey-derived date, no body |
| HIST-03 | History row tap flushes current entry first |
| HIST-04 | History row tap loads selected historical entry |
| HIST-05 | Return to current day reloads pinned planning-day entry |
| HIST-06 | Delete confirmation dialog shown on delete press |
| HIST-07 | Delete confirmed → `deleteEntry()` called → removed from list |
| HIST-08 | Delete cancelled → entry retained |
| HIST-09 | Deleting current-day entry → empty editor shown for that day |
| HIST-10 | Deleting historical entry → return to history list |

### Category: Editor (ED)

| ID | Test |
|---|---|
| ED-01 | Planning day key resolved once on mount |
| ED-02 | Existing entry loaded and decrypted on open |
| ED-03 | Empty state: no entry exists, editor shows placeholder |
| ED-04 | Body text change calls `onBodyChange` |
| ED-05 | Reflection field change calls `onReflectionChange` |
| ED-06 | Historical entry editing uses historical planningDayKey |
| ED-07 | Draft remains pinned across planning-day boundary detection |
| ED-08 | Planning-day transition shows informational indicator (no auto-switch) |
| ED-09 | `SetupRequiredState` shown when `getCurrentPlanningDayKey()` returns null |
| ED-10 | `SetupRequiredState` does not trigger GPS request |
| ED-11 | Load error shows calm error state with retry |

### Category: Biometric UX (BIO)

| ID | Test |
|---|---|
| BIO-01 | Disabled lock: Journal opens normally without prompt |
| BIO-02 | Enabled lock: Journal shows `JournalLockedState` |
| BIO-03 | `JournalLockedState` renders unlock button |
| BIO-04 | `JournalLockedState` does not render editor content |
| BIO-05 | `JournalLockedState` does not render history rows |
| BIO-06 | Successful unlock → editor/history becomes visible |
| BIO-07 | Cancel unlock → locked state remains |
| BIO-08 | Background with lock enabled → locked state on return |
| BIO-09 | App restart modeled as locked (state initialized to locked) |
| BIO-10 | Enabling lock requires successful biometric auth |
| BIO-11 | Not-enrolled: cannot enable lock; calm message shown |
| BIO-12 | Hardware unavailable: cannot enable lock; calm message shown |
| BIO-13 | Disable lock succeeds → preference updated |
| BIO-14 | No PIN fallback in auth options |

### Category: Security (SEC)

| ID | Test |
|---|---|
| SEC-01 | Journal body text never appears in error messages |
| SEC-02 | Journal body text never appears in log calls |
| SEC-03 | Biometric preference slot contains no prose content |
| SEC-04 | M15 encryption path unchanged (no new saveEntry/decrypt calls) |
| SEC-05 | `clearMemoryCache()` called on background |
| SEC-06 | `draftPayload` in autosave controller is cleared on session `reset()` |

### Category: Regression (REG)

| ID | Test |
|---|---|
| REG-01 | All 1005 M15 tests pass with M16 implementation present |

**Total M16 test count target: ~70 new tests** (exact count after implementation)

---

## 21. LocalAuthenticationAdapter

A thin testable wrapper over `expo-local-authentication` to allow Jest mocking:

```typescript
// src/services/journal/LocalAuthenticationAdapter.ts

export interface LocalAuthenticationAdapter {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  authenticateAsync(options?: object): Promise<{ success: boolean; error?: string }>;
}

export class ExpoLocalAuthenticationAdapter implements LocalAuthenticationAdapter {
  async hasHardwareAsync() { return LocalAuthentication.hasHardwareAsync(); }
  async isEnrolledAsync() { return LocalAuthentication.isEnrolledAsync(); }
  async authenticateAsync(options?: object) { return LocalAuthentication.authenticateAsync(options); }
}
```

**Jest mock:**
```typescript
// src/__mocks__/expo-local-authentication.ts
export const hasHardwareAsync = jest.fn().mockResolvedValue(true);
export const isEnrolledAsync = jest.fn().mockResolvedValue(true);
export const authenticateAsync = jest.fn().mockResolvedValue({ success: true });
```

---

## 22. Native Verification Checklist (Post-Implementation)

Required on a physical device with a development build before release/QA:

### M15 (Pending from previous milestone)
- [ ] `expo-crypto` AES-256-GCM encrypt round-trip produces valid ciphertext
- [ ] Journal entry saved and reopened after app restart — decrypts correctly
- [ ] Tampering with `encrypted_payload` column → `JournalEncryptionError` (not a crash)

### M16
- [ ] `expo-local-authentication` Face ID prompt appears on iOS
- [ ] `expo-local-authentication` fingerprint prompt appears on Android
- [ ] Successful biometric → Journal unlocks
- [ ] Cancel biometric → Journal stays locked
- [ ] App background → Journal relocks on return (foreground)
- [ ] Process kill/restart → Journal starts locked (when lock enabled)
- [ ] Lock preference persists across app restarts
- [ ] In-memory key cache cleared on background (verify no crash on next unlock)
- [ ] Journal entry written, app killed, reopened, unlock, entry decrypts correctly
- [ ] Face ID phrasing string ("Allow islamic-planner-app to use Face ID…") appears in iOS permission dialog

---

## 23. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| `expo-local-authentication` API changes between SDK 57 releases | Medium | Pin to `~57.x` exact; verify API surface against installed package version before implementation |
| `disableDeviceFallback: true` behavior varies on Android | Medium | Test on physical Android device; document per-platform behavior notes |
| Autosave flush ordering on background is platform-dependent | High | Flush `promise.then(lock)` to enforce ordering; never assume instant completion |
| Planning-day boundary crossed during active editing session | Low | Detect on foreground return; show informational message; never auto-migrate draft |
| Journal empty-on-flush delete races with concurrent load | Low | Serial write chain in controller prevents this; document as invariant |
| Face ID string in app.json uses slug not final brand name | Low | Note in architecture; update in M24 release preparation |
| Journal content rendered briefly before lock state resolves | Medium | Initialize `mode = 'BOOTSTRAPPING'`; never render editor until mode is confirmed READY or LOCKED |
| `KeyboardAvoidingView` keyboard overlap on older Android | Medium | Test on emulator + physical device; use `behavior="height"` on Android with scroll offset |
| SecureStore read failure for lock preference at startup | Low | Default to `lockEnabled = false` on SecureStore error; log internal error without content |

---

## 24. Explicit Non-Goals (M16)

- Full M17 Settings system
- Cloud sync of any kind
- Journal content search (encrypted content cannot be searched)
- Rich text editor (bold, italic, etc.)
- Attachments or images
- AI analysis, summarization, or suggestions
- Mood tracking or scoring
- Streaks, XP, badges, gamification of any kind
- Calendar Journal indicators (dots on calendar cells)
- Journal content in notifications
- Export or sharing
- Custom PIN fallback
- Password recovery mechanism
- SQLCipher or database-level encryption (M15 field encryption is sufficient)
- Encryption redesign of any kind
- Worship Suggestions implementation
- Dark mode expansion (deferred to M21)
- Full RTL overhaul (deferred to M22)
- `expo-local-authentication` `requireAuthentication: true` on SecureStore key (not supported in current SecureStore integration)

---

## 25. Source File Summary

### New Files (M16)

```
app/(tabs)/journal.tsx
src/components/journal/JournalEditor.tsx
src/components/journal/JournalHeader.tsx
src/components/journal/JournalHistory.tsx
src/components/journal/JournalHistoryRow.tsx
src/components/journal/JournalLockedState.tsx
src/components/journal/JournalPrivacySheet.tsx
src/components/journal/JournalSaveStatus.tsx
src/components/journal/JournalDeleteDialog.tsx
src/components/journal/ReflectionSection.tsx
src/components/journal/ReflectionField.tsx
src/components/journal/index.ts
src/hooks/useJournal.ts
src/services/journal/JournalAutosaveController.ts
src/services/journal/JournalLockController.ts
src/services/journal/JournalLockPreference.ts
src/services/journal/LocalAuthenticationAdapter.ts
src/__mocks__/expo-local-authentication.ts
src/components/journal/__tests__/JournalEditor.test.tsx
src/components/journal/__tests__/JournalHeader.test.tsx
src/components/journal/__tests__/JournalHistory.test.tsx
src/components/journal/__tests__/JournalHistoryRow.test.tsx
src/components/journal/__tests__/JournalLockedState.test.tsx
src/hooks/__tests__/useJournal.test.ts
src/services/journal/__tests__/JournalAutosaveController.test.ts
src/services/journal/__tests__/JournalLockController.test.ts
src/services/journal/__tests__/JournalLockPreference.test.ts
```

### Modified Files (M16)

```
app/(tabs)/_layout.tsx           (worship → journal rename)
src/components/layout/BottomNavBar.tsx  (worship → journal in TAB_CONFIG)
app.json                         (add expo-local-authentication plugin)
docs/AI_PROJECT_CONSTITUTION.md  (M16 status at closure)
docs/IMPLEMENTATION_STATUS.md    (M16 status at closure)
docs/ARCHITECTURE_INDEX.md       (add Section 20 at closure)
```

### Deleted Files (M16)

```
app/(tabs)/worship.tsx           (placeholder removed — replaced by journal.tsx)
```

---

## 26. Architecture Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Navigation model | Single screen, internal modes | Matches existing patterns; avoids nested route complexity |
| Lock preference storage | SecureStore `journal_biometric_lock_enabled_v1` | Zero new migrations; consistent with existing SecureStore usage |
| Empty entry on flush | Hard-delete if completely empty | Least surprising clean behavior; encrypted empty ciphertext is wasteful |
| Biometric fallback | `disableDeviceFallback: true` | Product intent is biometrics-only; no PIN fallback |
| Autosave concurrency | Serial promise chain + debounce coalescing | Proven pattern; avoids Mutex libraries; safe for single-user device |
| StaleWrite recovery | Reload + single retry; error on second conflict | No silent loss; no infinite loop |
| Lock + M15 encryption relationship | Additive session gate only | M15 AES-256-GCM always active; biometrics do not touch encryption key |
| Biometric enrollment change | Do NOT auto-disable lock | Security > convenience; recovery via device settings re-enrollment |
| Planning-day switch during session | Informational indicator; user must explicitly switch | Prevents silent draft migration; preserves user intent |
| Reflection section | Collapsible, secondary | Avoids overwhelming primary writing surface; prompts feel optional |
