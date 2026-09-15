# OPUS_CRITICAL_REVIEW_PROMPT

Act as the senior architecture and correctness reviewer.

Read:
- `/docs/MASTER_PRODUCT_SPEC.md`
- `/docs/TECHNICAL_ARCHITECTURE.md`
- `/docs/DATA_MODEL.md`
- `/docs/SCHEDULING_ENGINE.md`
- `/docs/PRAYER_ENGINE.md`
- `/docs/TEST_PLAN.md`
- `/docs/IMPLEMENTATION_STATUS.md`
- the implementation for the milestone under review

Do not rewrite working code merely for style.

Review specifically for:

- violations of the product specification
- prayer-boundary errors
- incorrect before-Fajr handling
- planning-day bugs
- DST bugs
- timezone bugs
- manual-location bugs
- travel bugs
- prayer-relative cross-boundary bugs
- prayer-window duplication
- recurrence duplication
- stale cached prayer placement
- incorrect stored-vs-derived data
- notification rescheduling problems
- race conditions
- migration risks
- poor offline behavior
- performance problems
- unnecessary dependency coupling
- test gaps

Classify findings:

- BLOCKER
- HIGH
- MEDIUM
- LOW

For each finding provide:
- affected file/module
- exact problem
- why it matters
- minimal recommended fix
- test that should prove the fix

If there are no blockers or high-severity issues, explicitly say the milestone is safe to proceed.
