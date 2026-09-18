# Current Milestone: M15 — Journal Core & Privacy

> **Current State:** M15 ARCHITECTURE FROZEN / OPUS APPROVED  
> **Baseline:** 961/961 tests, 68 suites (M14)  
> **Milestone Status:** M15 — ARCHITECTURE FROZEN, AWAITING IMPLEMENTATION  
> **Architecture Status:** FROZEN (see `docs/M15_ARCHITECTURE.md`)  
> **Implementation Status:** NOT STARTED  

---

## 1. Milestone Goal

Implement encrypted private Journal persistence, keyed to `planningDayKey`, with AES-256-GCM field encryption via `expo-crypto` and key storage via `expo-secure-store`.

M15 delivers the **data layer only**. The Journal UI (tab, compose, history) ships in M16.

---

## 2. Key Decisions

| Decision | Resolution |
|---|---|
| Journal replaces Worship in bottom nav | **LOCKED** — Worship is deferred, not deleted |
| One entry per planningDayKey | **LOCKED** — UNIQUE constraint |
| Encryption algorithm | AES-256-GCM via `expo-crypto` (first-party Expo SDK 57) |
| Key storage | `expo-secure-store` slot `journal_encryption_key_v1` |
| Structured reflections | Single encrypted JSON document (body + reflections) |
| Stale-write protection | Revision counter with optimistic concurrency |
| Biometric lock | Deferred to M16 |
| Worship schema | Dormant — no changes |

---

## 3. Authoritative Architecture Document

**`docs/M15_ARCHITECTURE.md`** — Contains the complete frozen specification including:
- Data model
- Encryption model
- Key management
- Persistence/upsert contract
- Concurrency policy
- Deletion semantics
- Test matrix
- File creation/modification manifest
- Implementation handoff instructions

---

## 4. Implementation Status

| Component | Status |
|---|---|
| Architecture freeze | ✅ COMPLETE |
| `expo-crypto` installation | ❌ Not started |
| Schema + migration | ❌ Not started |
| Domain types | ❌ Not started |
| JournalRepository | ❌ Not started |
| JournalCryptoService | ❌ Not started |
| JournalKeyManager | ❌ Not started |
| JournalService | ❌ Not started |
| Tests | ❌ Not started |
| Doc updates | ✅ COMPLETE |
