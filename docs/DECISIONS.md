# Active Decisions

## D-2026-10-30-07 — Navigator channel, clean patch ZIP, automate verification

**Decision:**
1. **Patch ZIP purity:** Archives delivered for Navigator application contain only new or changed repository files at exact repository-relative paths. No `PATCH_SUMMARY`, README, apply guides, manifests, checksums, scripts, reports, logs, or other auxiliary files may appear in the ZIP. Apply instructions and deletion lists belong in chat only.
2. **Navigator environment:** The Navigator operates on an Android tablet via GitHub web UI (and web render). Instructions for the Navigator must never assume a computer, local terminal, or local `npm`/`node`. Navigator verification is file view, commit, Actions tab, workflow logs, and mobile browser UI.
3. **Automate first:** Where a check can be automated, assistants add or update `tests/` and/or `.github/workflows/` so the Navigator can rely on GitHub Actions instead of manual technical steps on the tablet.

**Authority:** Binding assistant protocol in `AGENTS.md` §7. Supersedes informal habits that put helper files in patch ZIPs or wrote terminal-based Navigator runbooks.

**Effect:** Every session that delivers a patch or Navigator plan must comply. CI may assert presence of these rules in `AGENTS.md`.


## D-2026-10-30-04 — English-only repository, language-neutral intent handling

**Decision:** Maintained repository artifacts (source, comments, identifiers, tests, fixtures, prompts, scripts, technical documentation, and developer-facing messages) use English only. Intent/routing logic should not depend on isolated natural-language marker lists tied to particular languages when stable structured contracts or robust classification are feasible.

**Boundary:** This is not a decision to restrict end-user input/output to English. Product language support remains a separate contract and must not be narrowed by repository cleanup. Historical evidence is preserved unless an explicit, meaning-preserving migration is recorded.

**Effect:** Repository-wide language auditing is a standing roadmap stage. Findings are classified before changes; runtime changes require behaviorally equivalent regression coverage. A static no-Cyrillic scan alone is not sufficient acceptance evidence.

This file contains only current cross-cutting decisions. Historical proposals and rejected alternatives belong in `TECHNICAL_REPORT.md` or `CHANGELOG.md`; they must not be mistaken for current authorization. New decisions are added at the top. Do not silently erase a prior decision—mark it superseded with the date and replacement.

## D-2026-10-30-06 — Preserve historical records, retire obsolete test payloads independently

**Clarification / supersedes any broader reading of D-2026-10-30-05:** Repository minimalism targets obsolete active artifacts, not useful historical records. Preserve completed roadmap stages, changelog entries, factual technical reports, decision history, and concise summaries of tests/experiments that ran and the conclusions supported by their evidence. Do not delete or rewrite these records merely to reduce repository size.

**Test lifecycle:** Once a test or experiment has served its purpose, remove its executable test implementation, obsolete fixtures/prompts, temporary outputs, and one-off scripts when they no longer protect a current requirement and have no active dependency. Keep a concise record of its execution/result where historically relevant. Retain or recreate a focused regression test only when it protects a current contract or meaningful recurrence risk. Preserve raw historical payloads outside the repository only for a concrete reproducibility or audit need.

**Effect:** Every audit must classify historical records separately from active test code and temporary payloads. The former are preserved; the latter may be retired after dependency, CI, compatibility, and unique-coverage checks.

## D-2026-10-30-05 — Keep the repository minimal and current

**Decision:** Repository contents must earn their place by serving a current product, engineering, verification, operational, security, or documentation need. Historical origin or prior usefulness alone is not a retention reason.

**Test policy:** Retain tests that protect current requirements, meaningful user scenarios, supported contracts, or material regression risks not adequately covered elsewhere. Retire tests for completed experiments and obsolete behavior; consolidate duplicates; prefer small current-contract regression tests over permanent historical test suites.

**Safety boundary:** Before removal, check references, CI/workflow usage, compatibility commitments, and unique coverage. Preserve required audit evidence, but move historical reports and experimental artifacts outside the active repository when they have a concrete future use. Do not archive everything by default, and do not delete binding requirements or evidence needed for an explicit obligation.

**Effect:** Repository-minimalism and test-lifecycle review becomes a recurring roadmap stage. Git history remains the record of repository changes, not a justification for keeping obsolete files in the working tree.

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
