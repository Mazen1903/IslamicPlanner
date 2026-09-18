# M15 — Journal Core & Privacy: Architecture Freeze

> **Status:** FROZEN — OPUS APPROVED  
> **Authority:** Authoritative over Gemini M15 implementation decisions  
> **Baseline:** M14 CLOSED / SONNET APPROVED — 961/961 tests, 68 suites  
> **Last Updated:** 2026-09-17

---

## 1. Milestone Goal

Implement the persistence, encryption, key-management, and service layers for a private daily Journal feature, keyed to the canonical `planningDayKey`.

**M15 delivers the data layer only.** The Journal screen UI (tab replacement, compose view, history list) ships in M16.

---

## 2. Product Identity

The Journal belongs to the prayer-centered planner. It:

- Uses the same `planningDayKey` semantics as Today/Calendar
- Uses the same `HijriService` for display-only Hijri context
- Uses the same design language (deferred to M16 for visual implementation)
- Remains calm, private, zero-guilt
- Contains **NO** gamification, streaks, XP, mood scoring, religious-performance scoring, social sharing, AI analysis, rich text, or attachments

---

## 3. Frozen Data Model

### 3.1 `journal_entries` Table

```sql
CREATE TABLE journal_entries (
  id                  TEXT PRIMARY KEY NOT NULL,
  planning_day_key    TEXT NOT NULL UNIQUE,
  encrypted_payload   TEXT NOT NULL,           -- base64-encoded AES-256-GCM combined (IV + ciphertext + tag)
  encryption_version  INTEGER NOT NULL DEFAULT 1,
  revision            INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,           -- ISO 8601 UTC
  updated_at          TEXT NOT NULL            -- ISO 8601 UTC
);
```

**Constraints & indexes:**
- `UNIQUE` on `planning_day_key` — enforces one entry per planning day
- `id` — UUIDv4 via existing `generateUuid()`
- `planning_day_key` — `YYYY-MM-DD` format, derived from canonical `PlanningDayEngine` (same semantics as `task_occurrences.planning_day_key`)
- `encrypted_payload` — base64 string from `AESSealedData.combined('base64')`
- `encryption_version` — integer, currently `1`. Allows forward migration to new crypto schemes
- `revision` — monotonically increasing integer per entry, used for stale-write protection
- `created_at` / `updated_at` — ISO 8601 UTC strings, consistent with all other tables

### 3.2 Drizzle Schema Addition

```typescript
// In src/data/schema.ts — append after existing tables

export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    planningDayKey: text('planning_day_key').notNull().unique(),
    encryptedPayload: text('encrypted_payload').notNull(),
    encryptionVersion: integer('encryption_version').notNull().default(1),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  }
);
```

### 3.3 Plaintext Payload Structure (Before Encryption)

The encrypted payload is a **single JSON document** containing both the free-form body and structured reflections:

```typescript
interface JournalPayload {
  body: string;                    // Main free-writing text
  reflections: {
    gratitude: string;             // Optional — "What am I grateful for?"
    wentWell: string;              // Optional — "What went well?"
    improvement: string;           // Optional — "What can I improve tomorrow?"
    dua: string;                   // Optional — Personal dua / supplication
  };
}
```

**Rationale for single-document approach (Option C):**
- One encrypt/decrypt per read/write — minimal crypto operations
- One column in SQLite — no partial-field update complexity
- Reflections are tightly coupled to one entry — no relational normalization needed
- Forward-compatible: new fields can be added to the JSON without migration

**Serialization:** `JSON.stringify(payload)` → UTF-8 bytes → base64 → `aesEncryptAsync()` → stored as `encrypted_payload`

### 3.4 What Is NOT Stored

| Field | Rationale |
|---|---|
| `civilDate` | Derived from `planningDayKey` (they are often identical; when they differ due to planning-day mode, `planningDayKey` is authoritative) |
| `hijriDate` | Derived at display time via `HijriService.fromGregorian()` |
| `timezone` | Not needed; Journal is not a scheduled event |
| `mood` / `score` | Prohibited by product identity |

---

## 4. Frozen Encryption Model

### 4.1 Algorithm

**AES-256-GCM** via `expo-crypto` (first-party Expo SDK 57).

| Parameter | Value |
|---|---|
| Algorithm | AES-GCM |
| Key size | 256 bits (`AESKeySize.AES256`) |
| IV length | 12 bytes (default) |
| Tag length | 16 bytes (default, only supported on Apple) |
| Ciphertext format | Combined: `IV (12) ‖ ciphertext (variable) ‖ tag (16)` |
| Storage encoding | Base64 string (via `sealedData.combined('base64')`) |

### 4.2 Encrypt Flow

```
plaintext: JournalPayload
  → JSON.stringify()
  → TextEncoder.encode() → Uint8Array
  → aesEncryptAsync(bytes, encryptionKey)
  → sealedData.combined('base64')
  → stored as encrypted_payload TEXT column
```

### 4.3 Decrypt Flow

```
encrypted_payload: base64 string
  → AESSealedData.fromCombined(base64String)
  → aesDecryptAsync(sealedData, encryptionKey, { output: 'bytes' })
  → TextDecoder.decode() → JSON string
  → JSON.parse() → JournalPayload
```

### 4.4 Crypto Invariants

1. Journal prose and structured private reflection content must **never** be persisted in plaintext
2. Same plaintext encrypted twice must produce different ciphertext (random IV per encrypt)
3. Tampered ciphertext must fail closed — `aesDecryptAsync` throws; the error is caught and surfaced as a decryption failure, **never** as corrupted plaintext
4. Plaintext content must never appear in error messages, logs, or crash reports
5. Keys must never appear in error messages, logs, or crash reports

### 4.5 Encryption Version Strategy

- `encryption_version = 1` → AES-256-GCM via `expo-crypto` SDK 57
- Future versions (2, 3, …) may introduce algorithm changes
- `JournalCryptoService.decrypt()` must dispatch on `encryption_version` to select the correct decryption path
- Re-encryption on save: when an entry with `encryption_version < CURRENT_VERSION` is saved, it is re-encrypted with the current version

---

## 5. Frozen Key-Management Model

### 5.1 Key Lifecycle

1. **First Journal access** → `JournalKeyManager.getOrCreateKey()`:
   - Check `expo-secure-store` for key at slot `journal_encryption_key_v1`
   - If present: `AESEncryptionKey.import(hexString, 'hex')` → return key
   - If absent: `AESEncryptionKey.generate(256)` → `key.encoded('hex')` → `SecureStore.setItemAsync('journal_encryption_key_v1', hexString)` → return key
2. **Subsequent accesses** → cached in-memory for the app session
3. **App restart** → key reloaded from SecureStore

### 5.2 Key Storage

| Attribute | Value |
|---|---|
| Store | `expo-secure-store` |
| Key name | `journal_encryption_key_v1` |
| Format | Hex-encoded 256-bit key (64 hex chars) |
| Access control | Default SecureStore (iOS Keychain, Android EncryptedSharedPreferences) |
| Biometric binding | **Not in M15**. M16 may add `requireAuthentication` option |

### 5.3 Key Failure Scenarios

| Scenario | Behavior |
|---|---|
| SecureStore read fails | Surface error to UI layer; Journal features disabled for session |
| Key missing after reinstall | Journal entries are unreadable; show calm "Journal entries from previous installation cannot be recovered" |
| Key missing after device migration | Same as reinstall — entries unrecoverable |
| SecureStore write fails on generation | Throw; do not persist unencrypted content |
| Corrupted key in SecureStore | Decryption fails; handled as tampered-ciphertext case |

### 5.4 Key Safety Rules

- **Never** store the key in SQLite
- **Never** hardcode the key
- **Never** derive the key from device ID, bundle ID, or other predictable values
- **Never** log the key
- **Never** include the key in error reports
- The key slot name includes a version suffix (`_v1`) to support future key rotation without colliding with previous keys

---

## 6. Frozen PlanningDayKey / Date Semantics

### 6.1 Journal Entry Ownership

The Journal entry for "today" belongs to `currentPlanningDayKey` as resolved by `PlanningDayEngine` using the same `TodayTemporalInputProvider` infrastructure.

**Example under FAJR planning-day mode:**
- Civil time: Tuesday 2:00 AM (before Tuesday Fajr)
- `currentPlanningDayKey` = Monday's date (`2026-09-15`)
- Journal entry created/edited at this moment belongs to `planning_day_key = '2026-09-15'`

**Example under MIDNIGHT mode:**
- Civil time: Tuesday 2:00 AM
- `currentPlanningDayKey` = Tuesday's date (`2026-09-16`)
- Journal entry belongs to `planning_day_key = '2026-09-16'`

### 6.2 No GPS Prompts

`JournalService.getCurrentPlanningDayKey()` reuses `TodayTemporalInputProvider`. If status is `SETUP_REQUIRED`, the Journal degrades gracefully (shows setup prompt matching Today/Calendar behavior). It does **not** independently request GPS permissions.

### 6.3 Hijri Display

Hijri date for a Journal entry is derived at display time: `HijriService.fromGregorian(planningDayKey)`. Not stored.

---

## 7. Frozen Persistence / Upsert / Autosave Contract

### 7.1 Core API: `JournalRepository`

```typescript
interface JournalRepository {
  findByPlanningDayKey(planningDayKey: string): Promise<JournalEntryRow | null>;
  save(entry: JournalEntrySaveInput): Promise<JournalEntryRow>;
  delete(id: string): Promise<boolean>;
  listHistory(options?: { limit?: number; offset?: number }): Promise<JournalEntryMetadata[]>;
  findByDateRange(startKey: string, endKey: string): Promise<JournalEntryMetadata[]>;
}
```

### 7.2 Upsert Semantics

`save()` implements **create-or-update** (upsert) keyed on `planningDayKey`:

```
IF no existing row for planningDayKey:
  INSERT with revision = 1
ELSE:
  IF input.revision === existingRow.revision:
    UPDATE with revision = existingRow.revision + 1
  ELSE:
    REJECT as stale write (StaleWriteError)
```

This prevents older asynchronous saves from overwriting newer text.

### 7.3 `JournalEntrySaveInput`

```typescript
interface JournalEntrySaveInput {
  planningDayKey: string;
  payload: JournalPayload;       // plaintext — encrypted by service layer
  revision?: number;             // required for updates; omit for creates
}
```

### 7.4 `JournalEntryRow` (Domain Model)

```typescript
interface JournalEntryRow {
  id: string;
  planningDayKey: string;
  encryptedPayload: string;       // base64 ciphertext
  encryptionVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

### 7.5 `JournalEntryMetadata` (For History Lists)

```typescript
interface JournalEntryMetadata {
  id: string;
  planningDayKey: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  // No decrypted content — used for list display
}
```

### 7.6 Transaction Behavior

- `save()` runs inside `runInTransaction()` (existing infrastructure)
- Encryption happens **before** entering the transaction (crypto is async; minimize transaction duration)
- If the DB write fails after successful encryption, the error propagates; no partial state

---

## 8. Frozen Concurrency / Stale-Write Policy

### 8.1 Revision Counter

Each `save()` call:
1. Reads current `revision` from the existing row (if any)
2. Compares against the `revision` in the save input
3. If match: increments and writes
4. If mismatch: throws `StaleWriteError`

### 8.2 Autosave Contract (API Surface for M16)

`JournalService` exposes:

```typescript
interface JournalService {
  loadEntry(planningDayKey: string): Promise<JournalEntry | null>;
  saveEntry(input: JournalEntrySaveInput): Promise<JournalEntry>;
  deleteEntry(id: string): Promise<void>;
  listHistory(options?: { limit?: number; offset?: number }): Promise<JournalEntryMetadata[]>;
}
```

M16 will implement debounced autosave in the UI layer:
- Debounce interval: ~2 seconds after last keystroke
- Flush on: app background, navigation away, explicit save action
- Track `revision` from last successful save; pass it on next save
- On `StaleWriteError`: reload latest entry and merge/overwrite (single-user device; unlikely in practice)

### 8.3 Failed Encryption During Save

If encryption fails (`aesEncryptAsync` throws):
- Save is aborted
- Transaction is never opened
- Error surfaces to UI as a generic "Unable to save entry" message
- **No plaintext is persisted**

### 8.4 Rapid Sequential Saves

The `runInTransaction()` serialization lock ensures sequential execution. Combined with the revision counter, rapid saves are safe:
- Save A (revision 1→2) acquires lock, completes
- Save B (revision 2→3) acquires lock, completes
- If B arrives with stale revision 1, rejected

---

## 9. Frozen Deletion Semantics

- `deleteEntry(id)` → hard delete of the SQLite row
- **No soft-delete** — encrypted content should not be retained unnecessarily
- Deleting a Journal entry:
  - Deletes that Journal row only
  - Never affects tasks, TaskDefinitions, TaskOccurrences
  - Never affects planning-day lifecycle
  - Never affects Calendar occurrences
  - Never affects prayer data
- No cascading relationships
- No undo (consistent with zero-guilt; no "deletion regret" mechanics)

---

## 10. Biometric Boundary for M16

### 10.1 M15 Scope

M15 does **NOT** install `expo-local-authentication`.

M15 does **NOT** implement biometric locking.

M15 **does** architect the security boundary:
- All Journal content reaches SQLite only as ciphertext (encryption invariant)
- `JournalKeyManager` is an injectable service, not a static singleton
- M16 can gate `JournalKeyManager.getOrCreateKey()` behind biometric authentication
- The key remains in SecureStore regardless of biometric lock state

### 10.2 M16 Biometric Design (Documented for Forward Compatibility)

When biometric lock is enabled:
- Authenticate when entering Journal tab
- Keep Journal unlocked during the active foreground session
- Lock Journal when app backgrounds
- Lock again after app restart
- Do NOT authenticate separately for every entry
- Do NOT expose entry previews while locked
- Do NOT put Journal content in notifications

When biometric is unavailable/cancelled:
- Show calm "Journal is locked" state
- Do not fall back to PIN (deferred)

`expo-local-authentication` installation is deferred to M16.

---

## 11. Migration Strategy

### 11.1 New Migration: `0003_*`

A new forward migration `0003_<drizzle_generated_name>.sql` will be generated by `drizzle-kit generate`.

SQL content:

```sql
CREATE TABLE `journal_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `planning_day_key` text NOT NULL,
  `encrypted_payload` text NOT NULL,
  `encryption_version` integer DEFAULT 1 NOT NULL,
  `revision` integer DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `journal_entries_planning_day_key_unique` ON `journal_entries` (`planning_day_key`);
```

### 11.2 Migration Safety

- Previous migrations (0000, 0001, 0002) are **never modified**
- Existing tables are untouched
- Existing Worship schema tables (`worship_item_settings`) remain dormant
- Existing task columns (`worship_item_key`, source `WORSHIP`) remain dormant
- `user_settings.worship_suggestions_enabled` remains dormant
- The new table is purely additive — no ALTER TABLE, no data transformation

### 11.3 Migration Loader Update

`src/data/migrations/migrations.js` must be updated to import `m0003`.

`src/data/migrations/meta/_journal.json` must include the new entry.

---

## 12. Worship Deferment Strategy

### 12.1 Classification of Worship References

| Category | Files | Action |
|---|---|---|
| **Schema (dormant DB scaffolding)** | `src/data/schema.ts` (worshipItemSettings table, worshipItemKey column, source WORSHIP check, worshipSuggestionsEnabled) | **KEEP** — no schema changes to avoid migration risk |
| **Empty domain stubs** | `src/domain/worship/WorshipEngine.ts`, `types.ts`, `worshipDefinitions.ts` (11 bytes each) | **KEEP** — harmless empty stubs |
| **Navigation placeholder** | `app/(tabs)/worship.tsx` | **KEEP in M15** — M16 replaces with `journal.tsx` |
| **Nav config** | `src/components/layout/BottomNavBar.tsx` (worship entry), `app/(tabs)/_layout.tsx` | **KEEP in M15** — M16 renames |
| **Authoritative docs** | `docs/WORSHIP_ENGINE.md` | **Add deferment header** |
| **Constitution nav line** | `docs/AI_PROJECT_CONSTITUTION.md` (line 37: Worship in bottom nav) | **Update** to document Journal replacement |
| **Architecture Index** | `docs/ARCHITECTURE_INDEX.md` (Section 17: Worship) | **Add deferment note + Journal section** |
| **Implementation Status** | `docs/IMPLEMENTATION_STATUS.md` | **Update M15/M16 rows** |
| **Historical milestone closures** | All M1–M14 closure records | **DO NOT REWRITE** |
| **Test code referencing source WORSHIP** | Various test fixtures | **KEEP** — they test valid schema invariants |

### 12.2 Roadmap Update

```
M15 — Journal Core & Privacy    (was: Worship Suggestions Engine)
M16 — Journal Experience / UI   (was: Worship Suggestions UI)
M17 — Settings
M18 — Widgets
M19 — Premium entitlement scaffolding
M20 — Onboarding
M21 — Dark mode polish
M22 — Accessibility/RTL
M23 — QA + edge cases
M24 — Release preparation
```

Worship Suggestions are **DEFERRED** — not deleted. They may be re-introduced as a future milestone after M24.

---

## 13. New Dependency

### 13.1 `expo-crypto`

| Attribute | Value |
|---|---|
| Package | `expo-crypto` |
| Version | `~57.0.x` (matches SDK 57) |
| Justification | First-party Expo AES-256-GCM implementation; no third-party crypto needed |
| Plugin required | Yes — add `"expo-crypto"` to `app.json` plugins array |
| Native rebuild | Required (after `npx expo install expo-crypto`) |
| Test mock | `expo-crypto` must be mockable for unit tests |

**No other new dependencies.**

`expo-local-authentication` is **NOT** installed in M15.

---

## 14. Exact Files — NEW

| File | Purpose |
|---|---|
| `src/domain/journal/types.ts` | `JournalPayload`, `JournalEntryRow`, `JournalEntryMetadata`, `JournalEntrySaveInput`, error types |
| `src/domain/journal/errors.ts` | `JournalEncryptionError`, `StaleWriteError`, `JournalKeyError` |
| `src/domain/journal/index.ts` | Public module exports |
| `src/data/repositories/JournalRepository.ts` | SQLite CRUD, upsert with revision check, history listing |
| `src/services/journal/JournalCryptoService.ts` | Encrypt/decrypt via `expo-crypto` AES-256-GCM |
| `src/services/journal/JournalKeyManager.ts` | Key generation/retrieval via `expo-secure-store` |
| `src/services/journal/JournalService.ts` | Orchestrator: planningDayKey resolution, encrypt-then-persist, decrypt-on-load |
| `src/services/journal/index.ts` | Public service exports |
| `src/data/migrations/0003_*.sql` | Migration SQL (generated by drizzle-kit) |
| `src/data/repositories/__tests__/JournalRepository.test.ts` | Repository unit tests |
| `src/services/journal/__tests__/JournalCryptoService.test.ts` | Crypto round-trip tests |
| `src/services/journal/__tests__/JournalKeyManager.test.ts` | Key lifecycle tests |
| `src/services/journal/__tests__/JournalService.test.ts` | Integration tests |
| `docs/M15_ARCHITECTURE.md` | This file |

## 15. Exact Files — MODIFY

| File | Change |
|---|---|
| `src/data/schema.ts` | Add `journalEntries` table definition (append only) |
| `src/data/migrations/migrations.js` | Add `m0003` import |
| `src/data/migrations/meta/_journal.json` | Add idx 3 entry |
| `package.json` | Add `expo-crypto` dependency |
| `package-lock.json` | Updated by npm install |
| `app.json` | Add `"expo-crypto"` to plugins array |
| `docs/AI_PROJECT_CONSTITUTION.md` | Update bottom nav line (Worship → Journal), add Journal invariants |
| `docs/ARCHITECTURE_INDEX.md` | Add Section 19 (Journal), update Section 17 (Worship deferred) |
| `docs/IMPLEMENTATION_STATUS.md` | Update M15/M16 rows, roadmap |
| `docs/CURRENT_MILESTONE.md` | Replace with M15 specification |
| `docs/WORSHIP_ENGINE.md` | Add deferment header (content preserved) |
| `src/components/common/Icon.tsx` | Add `'journal'` icon name (maps to `'book-outline'` Ionicon) |

---

## 16. Required Test Matrix

### 16.1 JournalRepository Tests

| Test ID | Description |
|---|---|
| JR-01 | Create entry — returns row with id, revision 1, timestamps |
| JR-02 | Unique planningDayKey — second insert with same key fails |
| JR-03 | Find by planningDayKey — returns correct row |
| JR-04 | Find by planningDayKey — returns null for nonexistent |
| JR-05 | Update (upsert) — matching revision increments revision |
| JR-06 | Stale write — mismatched revision throws StaleWriteError |
| JR-07 | Delete — removes row, returns true |
| JR-08 | Delete — nonexistent id returns false |
| JR-09 | List history — returns metadata newest-first by updatedAt |
| JR-10 | List history — respects limit/offset |
| JR-11 | Find by date range — returns entries within range |
| JR-12 | Rapid sequential saves — serialized correctly via transaction lock |
| JR-13 | Transaction rollback — failed write leaves DB unchanged |

### 16.2 JournalCryptoService Tests

| Test ID | Description |
|---|---|
| JC-01 | Encrypt/decrypt round trip — plaintext matches after decrypt |
| JC-02 | Random IV — encrypting same plaintext twice produces different ciphertext |
| JC-03 | Tampered ciphertext — decryption throws (not silently corrupts) |
| JC-04 | Tampered tag — decryption throws |
| JC-05 | Wrong key — decryption throws |
| JC-06 | Empty payload — encrypts/decrypts correctly |
| JC-07 | Unicode payload — Arabic/emoji text round-trips correctly |
| JC-08 | Encryption version dispatching — decrypt selects correct handler |
| JC-09 | No plaintext in persisted row — encrypted field is not JSON-parseable |

### 16.3 JournalKeyManager Tests

| Test ID | Description |
|---|---|
| JK-01 | First call generates and stores key |
| JK-02 | Subsequent call returns cached key (no SecureStore read) |
| JK-03 | After cache clear, reads from SecureStore |
| JK-04 | Missing key in SecureStore — generates new key |
| JK-05 | SecureStore read failure — throws JournalKeyError |
| JK-06 | SecureStore write failure — throws JournalKeyError, no unencrypted fallback |
| JK-07 | Key never logged or included in error messages |

### 16.4 JournalService Integration Tests

| Test ID | Description |
|---|---|
| JS-01 | Save new entry — encrypts and persists |
| JS-02 | Load entry — decrypts and returns JournalPayload |
| JS-03 | Update entry — revision incremented, content updated |
| JS-04 | Stale write rejected |
| JS-05 | Delete entry — row removed |
| JS-06 | List history — returns metadata without decrypted content |
| JS-07 | Pre-Fajr planning day ownership (FAJR mode) |
| JS-08 | MIDNIGHT planning day ownership |
| JS-09 | SETUP_REQUIRED — returns appropriate status, no GPS prompt |
| JS-10 | Failed encryption — no plaintext persisted |
| JS-11 | Failed DB write — no partial state |

### 16.5 Migration & Compatibility Tests

| Test ID | Description |
|---|---|
| JM-01 | Migration 0003 applies cleanly on existing M14-era database |
| JM-02 | All previous 961 tests remain green |
| JM-03 | Existing Worship schema (worship_item_settings, worshipItemKey, source WORSHIP) remains valid |
| JM-04 | journal_entries UNIQUE constraint on planning_day_key is enforced |

### 16.6 Test Infrastructure

- `expo-crypto` must be mocked in Jest (it requires native modules)
- Mock provides deterministic encrypt/decrypt for unit tests
- Mock must still validate that encrypt output ≠ plaintext
- `expo-secure-store` must be mocked (existing pattern)
- `JournalKeyManager` accepts injected dependencies for testability

---

## 17. Explicit Non-Goals

1. **No Journal UI screen** — deferred to M16
2. **No biometric lock implementation** — deferred to M16
3. **No expo-local-authentication installation** — deferred to M16
4. **No full-text search** on encrypted content
5. **No cloud sync** — local-only
6. **No rich text** — plain text only
7. **No attachments** — text only
8. **No mood scoring / religious performance scoring**
9. **No AI analysis of journal content**
10. **No social sharing**
11. **No custom PIN/recovery system**
12. **No whole-database encryption migration** (no SQLCipher)
13. **No Calendar integration** (no journal indicator dots on Calendar cells)
14. **No notification content from Journal**
15. **No worship tab replacement** — deferred to M16
16. **No worship schema cleanup** — dormant fields remain

---

## 18. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Key loss on reinstall/device migration | HIGH (by design) | Explicit UX messaging: "Journal entries from previous installation cannot be recovered." No recovery promise. Document in M16 UI. |
| `expo-crypto` AES API not available in Jest/Hermes test environment | MEDIUM | Create `src/__mocks__/expo-crypto.ts` providing deterministic mock implementations. Validate real crypto via integration test on device. |
| Autosave race conditions | LOW | Revision counter + `runInTransaction()` serialization. Single-user local device — concurrent access is implausible except from rapid UI debounce. |
| SecureStore size limits | LOW | Key is 64 hex characters. Well within SecureStore's 2048-byte limit. |
| Planning-day boundary shift while editing | LOW | Journal ownership determined at save time using `currentPlanningDayKey`. If day boundary shifts mid-edit, next save goes to new day's entry. UI (M16) can handle by checking `planningDayKey` match before save. |
| Base64 encoding overhead | LOW | ~33% overhead. Acceptable for text journal entries (typically < 10 KB plaintext). |

---

## 19. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     M16 (Future)                         │
│              JournalScreen / JournalTab                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   JournalService                         │
│  loadEntry() / saveEntry() / deleteEntry() / listHistory│
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ JournalKeyManager│    │ TodayTemporalInputProvider│   │
│  │  (SecureStore)    │    │  (planningDayKey)         │   │
│  └────────┬─────────┘    └──────────────────────────┘   │
│           │                                              │
│  ┌────────▼─────────┐                                    │
│  │JournalCryptoService                                   │
│  │ encrypt(payload)  │                                   │
│  │ decrypt(ciphertext)│                                  │
│  │ (expo-crypto AES) │                                   │
│  └────────┬─────────┘                                    │
│           │                                              │
│  ┌────────▼─────────┐                                    │
│  │JournalRepository │                                    │
│  │ findByPlanningDay │                                   │
│  │ save (upsert)     │                                   │
│  │ delete / list     │                                   │
│  └────────┬─────────┘                                    │
│           │                                              │
└───────────┼──────────────────────────────────────────────┘
            │
   ┌────────▼─────────┐
   │   SQLite (drizzle)│
   │  journal_entries  │
   │  (ciphertext only)│
   └──────────────────┘
```

---

## 20. Implementation Handoff Instructions for Gemini

### 20.1 Read First

1. This file (`docs/M15_ARCHITECTURE.md`) — the authoritative specification
2. `docs/AI_PROJECT_CONSTITUTION.md` — permanent invariants
3. `src/data/schema.ts` — existing schema patterns
4. `src/data/db.ts` — `runInTransaction()` infrastructure
5. `src/data/repositories/TaskOccurrenceRepository.ts` — repository pattern reference
6. `src/services/TodayTemporalInputProvider.ts` — temporal input seam
7. `src/utils/uuid.ts` — UUID generation pattern
8. `src/utils/dateValidation.ts` — date validation utilities

### 20.2 Execution Order

1. **Install `expo-crypto`**: `npx expo install expo-crypto`; add to `app.json` plugins
2. **Add schema**: Append `journalEntries` to `src/data/schema.ts`
3. **Generate migration**: `npx drizzle-kit generate` — produces `0003_*.sql`
4. **Update migration loader**: `src/data/migrations/migrations.js` + `_journal.json`
5. **Create domain types**: `src/domain/journal/types.ts`, `errors.ts`, `index.ts`
6. **Create JournalRepository**: `src/data/repositories/JournalRepository.ts`
7. **Create JournalCryptoService**: `src/services/journal/JournalCryptoService.ts`
8. **Create JournalKeyManager**: `src/services/journal/JournalKeyManager.ts`
9. **Create JournalService**: `src/services/journal/JournalService.ts`
10. **Create expo-crypto mock**: `src/__mocks__/expo-crypto.ts`
11. **Write all tests** per the test matrix (Section 16)
12. **Update Icon component**: Add `'journal'` icon name
13. **Update docs**: Constitution, Architecture Index, Implementation Status, Current Milestone, Worship Engine deferment
14. **Run verification**: `npx jest --runInBand`, `npx tsc --noEmit`, lint

### 20.3 Verification Gates

| Gate | Target |
|---|---|
| All existing tests | 961/961 green (zero regressions) |
| New M15 tests | All green |
| `npx tsc --noEmit` | 0 errors |
| ESLint | 0 errors |
| New npm dependencies | Exactly 1 (`expo-crypto`) |
| New migrations | Exactly 1 (`0003`) |
| Plaintext in DB | Never (verified by JC-09) |
| Schema changes to existing tables | Zero |

### 20.4 Critical Implementation Rules

1. **No business logic in React components** — all Journal logic in `src/domain/journal/` and `src/services/journal/`
2. **No second PlanningDayEngine** — reuse the existing one via `TodayTemporalInputProvider`
3. **No GPS prompt** from Journal — use same `SETUP_REQUIRED` pattern
4. **No Worship schema changes** — worship fields remain dormant
5. **No M14 Calendar reopening**
6. **No auto-roll semantics applied to Journal**
7. **No gamification**
8. **No rich text or attachments**
9. **Mock `expo-crypto` in tests** — it's a native module
10. **Mock `expo-secure-store` in tests** — existing pattern
