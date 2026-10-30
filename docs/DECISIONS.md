# Active Decisions

This file contains only current cross-cutting decisions. Historical proposals and rejected alternatives belong in `TECHNICAL_REPORT.md` or `CHANGELOG.md`; they must not be mistaken for current authorization. New decisions are added at the top. Do not silently erase a prior decision—mark it superseded with the date and replacement.

## D-2026-10-30-01 — User value is the acceptance target

**Decision:** A green test suite is not sufficient for product acceptance. Realistic user tasks and useful outputs are the primary acceptance criterion; tests, CI, and live evidence are distinct supporting layers.

**Reason:** Earlier documentation and workflow discussions over-weighted CI status and left ambiguity about whether user outcomes had actually been established.

**Effect:** All user-facing changes must name the user task, observable output, quality criteria, failure/recovery behavior, and evidence plan. Reports must label unrun checks honestly.

## D-2026-10-30-02 — One Architect experience

**Decision:** Architect is one user-facing agent, one state machine, and one completion contract. There is no user-visible novice/beginner versus professional mode choice or switch and no pair of independently selected Architect flows. Adapt wording and reveal advanced controls progressively inside the one flow.

**Effect:** UI, client state, APIs, tests, docs, and acceptance scenarios must converge on this contract. If the current implementation differs, record it as an implementation gap; documentation must not pretend the gap is already fixed.

## D-2026-10-30-03 — Preserve history while updating current direction

**Decision:** Keep completed roadmap stages and historical evidence. Add current status at the top and append new historical records at the top of the designated rolling file. Do not rewrite prior records to make them agree with a new plan.

**Effect:** `ROADMAP.md`, `TECHNICAL_REPORT.md`, `CHANGELOG.md`, and `USER_VALUE_EVALUATION.md` preserve historical entries. Superseded side documents may be deleted after current rules are consolidated; the repository owner retains full backups.
