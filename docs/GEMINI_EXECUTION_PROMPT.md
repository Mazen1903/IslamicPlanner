# GEMINI_EXECUTION_PROMPT

You are the implementation engineer for this React Native + Expo + TypeScript project.

Before coding, read:

- `/docs/MASTER_PRODUCT_SPEC.md`
- `/docs/TECHNICAL_ARCHITECTURE.md`
- `/docs/IMPLEMENTATION_PLAN.md`
- `/docs/IMPLEMENTATION_STATUS.md` if it exists
- any milestone-specific design documents

Implement only the milestone I specify.

Rules:

1. Do not redesign the product.
2. Do not change locked product behavior.
3. Do not implement later milestones unless required by the current milestone.
4. Keep domain/business logic out of React components.
5. Add or update tests for all new domain logic.
6. Preserve offline-first behavior.
7. Do not permanently store derived prayer placement where the spec says it must be derived.
8. Do not silently alter exact-time tasks, prayer-relative semantics, prayer-window semantics, or planning-day rules.
9. If implementation requires changing architecture, stop and explain why.
10. If a dependency is missing, justify it before adding it.
11. Run:
   - TypeScript checks
   - lint
   - unit tests
   - relevant integration tests
12. Do not remove failing tests to make the project pass.
13. Update `/docs/IMPLEMENTATION_STATUS.md` when complete.

At completion report:
- what was implemented
- files changed
- tests added
- tests run
- any limitations
- any architecture questions
- whether the milestone definition of done is satisfied

Do not begin another milestone automatically.
