# ANTIGRAVITY_WORKFLOW

This file defines how to use AI agents on the project.

## Recommended model split

### Claude Opus 4.6 Thinking
Use for:
- initial technical architecture
- dependency decisions
- scheduling/date/time architecture
- database design
- recurrence design
- code review of critical milestones
- difficult debugging
- architecture conflicts

### Gemini 3.8 High
Use for:
- implementing approved milestones
- React Native screens
- forms and UI
- straightforward domain code after architecture is defined
- refactors
- tests
- wiring services
- routine bug fixes

## Required workflow

1. Put `MASTER_PRODUCT_SPEC.md` in `/docs`.
2. Ask Opus to read it completely.
3. Opus creates:
   - `/docs/TECHNICAL_ARCHITECTURE.md`
   - `/docs/DATA_MODEL.md`
   - `/docs/SCHEDULING_ENGINE.md`
   - `/docs/PRAYER_ENGINE.md`
   - `/docs/NOTIFICATIONS.md`
   - `/docs/TEST_PLAN.md`
   - `/docs/IMPLEMENTATION_PLAN.md`
4. Review the plan before coding.
5. Gemini implements one milestone at a time.
6. Gemini updates `/docs/IMPLEMENTATION_STATUS.md`.
7. After critical milestones, Opus reviews implementation against specs.
8. Gemini applies approved fixes.
9. Repeat.

## Critical milestones requiring Opus review

At minimum:
- M2 Prayer-time engine
- M3 Planning-day engine
- M4 Task data model
- M5 Scheduling engine
- M9 Recurrence
- M11 Location/travel
- M12 Notifications
- M14 Hijri calendar
- M15 Worship engine
- M19 Premium entitlement architecture
- M23 final QA

## Rules for implementation agents

- Never build the whole app in one giant pass.
- Never change product semantics to make implementation easier.
- Never put scheduling logic directly in UI components.
- Never ignore failing date/time tests.
- Never install major libraries without documenting rationale.
- Never delete tests to make CI pass.
- Never modify unrelated screens during a milestone unless necessary.
- Always state assumptions.
- Escalate major ambiguity.

## Suggested repository docs

```text
/docs
  MASTER_PRODUCT_SPEC.md
  TECHNICAL_ARCHITECTURE.md
  DATA_MODEL.md
  SCHEDULING_ENGINE.md
  PRAYER_ENGINE.md
  WORSHIP_ENGINE.md
  NOTIFICATIONS.md
  UI_SYSTEM.md
  TEST_PLAN.md
  IMPLEMENTATION_PLAN.md
  IMPLEMENTATION_STATUS.md
  DECISIONS.md
```

Use `DECISIONS.md` as an architecture decision log.
