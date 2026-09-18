# Current Milestone: M16 — Journal Experience / UI

> **Current State:** M16 PENDING — ARCHITECTURE NOT YET FROZEN
> **Previous Milestone:** M15 CLOSED / SONNET APPROVED
> **Milestone Status:** M16 — PENDING ARCHITECTURE FREEZE
> **Architecture Status:** NOT STARTED
> **Implementation Status:** NOT STARTED

---

## Prerequisites

| Prerequisite | Status |
|---|---|
| M15 — Journal Core & Privacy (data layer) | ✅ CLOSED / SONNET APPROVED |
| M1 — Design system and theme tokens | ✅ CLOSED |
| M7 — Today Screen UI patterns | ✅ CLOSED / OPUS APPROVED |
| Canonical `PlanningDayEngine` | ✅ CLOSED (M3) |
| Canonical `HijriService` | ✅ CLOSED (M8) |

---

## 1. Milestone Goal

Deliver the user-facing Journal experience: tab replacement, compose editor with debounced autosave, history list, and optionally biometric lock.

M16 consumes the M15 data layer (`JournalService`, `JournalRepository`, `JournalCryptoService`, `JournalKeyManager`) directly — it does NOT reimplement any encryption, key management, or persistence.

---

## 2. Scope

### In Scope

- **Tab replacement:** `app/(tabs)/worship.tsx` → `app/(tabs)/journal.tsx`; update `BottomNavBar` (worship → journal entry)
- **Journal screen:** Compose editor view keyed to `currentPlanningDayKey`
- **Autosave:** Debounced (~2 seconds after last keystroke); flush on app background, navigation away, explicit save
- **Planning-day key pinning:** Resolve `JournalService.getCurrentPlanningDayKey()` at editor open; pass pinned key to every `saveEntry()` call
- **History list:** `JournalService.listHistory()` metadata only — no decrypted content previews
- **SETUP_REQUIRED state:** Calm prompt matching Today/Calendar behavior — no independent GPS prompt
- **Optional biometric lock:** `expo-local-authentication` (installation deferred to M16)
- **Visual design:** Calm, zero-guilt design language matching M1 design system

### Explicitly Out of Scope

- **No re-implementation of encryption** — use M15 `JournalCryptoService` as-is
- **No new migrations** — `journal_entries` table and `encryption_version` column are already in place
- **No search** — encrypted content cannot be searched; deferred
- **No cloud sync** — local-only
- **No rich text / attachments** — plain text only
- **No mood scoring / gamification**
- **No mood indicators** in Calendar cells (deferred)

---

## 3. Key M15 API Surface (Ready for M16 Consumption)

```typescript
// Resolve current planning day (call once on editor open)
await journalService.getCurrentPlanningDayKey(now?: DateTime): Promise<string | null>

// Load existing entry (decrypt + return payload)
await journalService.loadEntry(planningDayKey: string): Promise<JournalEntry | null>

// Save (encrypt + upsert with revision protection)
await journalService.saveEntry({
  planningDayKey: string,    // pinned from getCurrentPlanningDayKey()
  payload: JournalPayload,   // { body: string, reflections: { gratitude, wentWell, improvement, dua } }
  revision?: number,         // required for updates; omit for first save
}): Promise<JournalEntry>

// Hard delete
await journalService.deleteEntry(id: string): Promise<boolean>

// History (metadata only — no decrypted content)
await journalService.listHistory(options?: { limit?, offset? }): Promise<JournalEntryMetadata[]>
```

---

## 4. Biometric Lock Design (Specified in M15_ARCHITECTURE.md §10.2)

When `expo-local-authentication` is installed in M16:
- Authenticate when entering the Journal tab
- Keep Journal unlocked during the active foreground session
- Lock when app backgrounds
- Lock again after app restart
- Do NOT authenticate per-entry
- Do NOT expose entry previews while locked
- Do NOT put Journal content in notifications

---

## 5. Architecture Notes

- `JournalKeyManager` is injectable — M16 can gate `getOrCreateKey()` behind biometric authentication
- The key remains in SecureStore regardless of biometric lock state
- `JournalEntrySaveInput.planningDayKey` must be pinned at editor open — `saveEntry()` does not recalculate it
- On `StaleWriteError`: reload latest entry and overwrite (single-user device; this is rare in practice)
- `listHistory()` returns `JournalEntryMetadata[]` — never decrypted content; do NOT display entry previews

---

## 6. Worship Deferment Reminder

- `app/(tabs)/worship.tsx` placeholder → replace with `journal.tsx` in M16
- `src/components/layout/BottomNavBar.tsx` worship entry → journal entry in M16
- `src/domain/worship/` empty stubs → preserved (do not delete)
- Worship schema (`worship_item_settings`, `worshipItemKey`, source `WORSHIP`) → dormant, preserved

---

## 7. Roadmap Context

```
M15 — Journal Core & Privacy       ✅ CLOSED / SONNET APPROVED
M16 — Journal Experience / UI      ← CURRENT (ARCHITECTURE NOT YET FROZEN)
M17 — Settings
M18 — Widgets
M19 — Premium entitlement scaffolding
M20 — Onboarding
M21 — Dark mode polish
M22 — Accessibility / RTL
M23 — QA + edge cases
M24 — Release preparation
```

Worship Suggestions remain **DEFERRED** (not deleted). May be re-introduced post-M24.
