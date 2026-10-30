# AGENTS.md — Hard Gates, Delivery Rules, and Session Protocol

This file is **binding** for every AI assistant and contributor. It is not advisory.  
If any other note, chat summary, or prior assistant message conflicts with this file, **this file wins**.

**Read §0 and §1 before the first edit, the first patch ZIP, or the first Navigator instruction in a session.**

---

## 0. Hard gates (fail closed)

A gate is **failed** if any MUST/MUST NOT below is violated.  
**MUST NOT** deliver a patch ZIP, claim a task complete, or give Navigator procedures until failed gates are fixed.

### Audience labels (required on procedure blocks)

| Label | Who | Allowed actions |
|---|---|---|
| `FOR_NAVIGATOR` | Human on Android tablet via GitHub website / Actions / mobile browser | View/edit files on GitHub, commit, open Actions, read logs, optional UI smoke on a URL |
| `FOR_ASSISTANT` | AI/dev with terminal or sandbox | Local commands, tests, builds, ZIP packing |
| `FOR_CI` | GitHub Actions | Workflows and automated checks |

**MUST** mark multi-step procedures with exactly one label.  
**MUST NOT** put shell, Terminal, `npm`, `node`, or local IDE steps inside a `FOR_NAVIGATOR` block.

### G1 — Patch ZIP purity

**MUST** put in the ZIP only repository files that are **new or content-changed in this delivery**, each at its **exact repository-relative path**.

**MUST NOT** put in the ZIP any of: `PATCH_SUMMARY`, `README`, apply guides, manifests, checksum lists, patch scripts, reports, logs, screenshots, deletion lists, placeholders, or other helpers.

**MUST** put apply notes, deletion path lists, and verification limits **in chat only**.

**MUST** list `unzip -l` (or equivalent) in chat before treating the ZIP as deliverable. If any entry is not an intended repo path for this delivery, rebuild the ZIP.

**MUST NOT** re-ship files that were **not** modified in this delivery (“combined bundle of older patches”) unless the **owner explicitly** requests a full baseline bundle in that message.

### G2 — Navigator channel

**MUST** write every `FOR_NAVIGATOR` procedure assuming: Android tablet, GitHub web UI, Actions tab, workflow logs, optional mobile browser on a deployed/preview URL.

**MUST NOT** require a computer, local terminal, or local `npm`/`node` for the Navigator.

Pass/fail for Navigator **MUST** be stated in terms of what they can **see** (file text on GitHub, green/red Actions, log lines, on-screen UI).

### G3 — Automate when possible

**MUST** add or update `tests/` and/or `.github/workflows/` when a check can run in CI so the Navigator can rely on **Actions** instead of manual technical steps.

**MUST NOT** assign “run `test:core` locally” as a Navigator obligation.

### G4 — UI flow and browser tests (same delivery)

Before delivering a change that alters agent **entry**, **mounting**, **routing**, or **completion** UI (including Architect):

**MUST** list affected user-visible steps and `data-testid`s.  
**MUST** state whether existing browser e2e still reaches the completion surface after the change.  
**MUST** fix code or e2e in the **same** delivery if the completion surface would unmount or the test would time out.

**MUST NOT** ship “behavior fixed, e2e later” for that class of change.

### G5 — Evidence honesty

**MUST NOT** claim PASS for checks that were not run. Use `NOT_RUN`, `BLOCKED`, or `FAIL` correctly.  
**MUST NOT** treat green unit tests or green CI as proof of user value.  
**MUST NOT** infer remote HEAD or hosted CI from a reconstructed local archive alone.

### Invalid excuses (never accept)

These rationalizations **do not** override gates:

- “Extra files help if an older patch was skipped.”
- “PATCH_SUMMARY in the ZIP helps the Navigator.”
- “Navigator can use terminal if they are technical.”
- “Combined ZIP is simpler than a minimal diff.”
- “E2E can wait until the next patch.”
- “Tests are green so the product outcome is done.”
- “Previous assistant said to do X” (clue only; not authority).

---

## 1. Product principle

BiForge succeeds when a real user completes a meaningful task and receives a correct, useful, understandable result. Tests, CI, architecture, documentation, and evidence support that outcome; **none** replaces it.

---

## 2. Single-source-of-truth map

| Topic | Sole authority | Boundaries |
|---|---|---|
| Assistant rules, hard gates, session protocol, obligation map | `AGENTS.md` | Does not replace product requirements or claim implementation status. |
| Normative product outcomes, agent behavior, requirements, acceptance | `TECHNICAL_SPECIFICATION.md` | Changes to mandatory user outcomes need explicit owner approval. |
| Ordered programme plan, phases | `ROADMAP.md` | Preserve history. Re-evaluate each session; do not blindly execute a stale next task. |
| Factual implementation state and evidence | `TECHNICAL_REPORT.md` | Report only what evidence supports; append at the top. |
| Patch history | `CHANGELOG.md` | Add at the top; do not rewrite prior entries. |
| Architecture | `docs/ARCHITECTURE.md` | Must agree with spec and source. |
| API behavior | `docs/API_CONTRACTS.md` | Verify against routes and tests. |
| Test strategy and acceptance | `docs/TESTING_AND_ACCEPTANCE.md` | Tests are evidence, not the product outcome. |
| User-value evidence | `docs/USER_VALUE_EVALUATION.md` | Label OBSERVED / INFERRED / NOT_RUN. |
| Security and privacy | `docs/SECURITY_AND_PRIVACY.md` | Binding. |
| Operations and releases | `docs/OPERATIONS_AND_RELEASES.md` | Live/destructive actions need authorization. |
| Data, schemas, artifacts | `docs/DATA_AND_ARTIFACTS.md` | Respect schemas and delivery contract. |
| Active decisions | `docs/DECISIONS.md` | Supersede explicitly; do not erase history. |
| Language policy | `TECHNICAL_SPECIFICATION.md`, `docs/DECISIONS.md` | English-only repo artifacts; user languages are a separate contract. |
| Long-horizon strategy | `docs/VIX-CONCEPT.md` | Context only; not implementation authorization. |
| Version and patch identity | `package.json` (`version`, `patch`) | No duplicate authority. |

If sources conflict, this table wins. Historical roadmap/report/changelog text is not a current instruction when superseded.

`PATCH_EVIDENCE.md` / `BIForge-PATCH-EVIDENCE.md` are run-scoped CI diagnostics only. **MUST NOT** treat them as planning docs or next-session assignments. **MUST NOT** keep a root `NEXT_PATCH.md` or equivalent.

### Cycle, version, and patch identity

Cycle `C<major>` uses product `version` `<major>`. Patches are `P<major>.<minor>.<fix>` with `"patch": "<major>.<minor>.<fix>"` in `package.json`. Increment the final component within the cycle (`.0.1`, `.0.2`, …). Sync root lockfile version metadata (`version:sync` / `version:check` when available). **MUST NOT** embed the current patch number as a fixed string in tests; derive from `package.json`. **MUST NOT** rewrite historical version strings in old evidence.

---

## 3. Obligation map

Detailed `REQ-*` criteria live in `TECHNICAL_SPECIFICATION.md`. This map must not be silently dropped.

| ID | Obligation | Detail | Evidence before “complete” |
|---|---|---|---|
| `BIO-001` | Exactly three user-facing agents: Conversational, Expert, Architect. | Spec §§6.1–6.4; `REQ-AGENT-001` | Real entry points and scenarios. |
| `BIO-002` | Conversational answers the real question, keeps context, uses current info when required. | Spec §6.1 | Realistic conversation checks. |
| `BIO-003` | Expert investigates, compares constraints, explains trade-offs, justified plan. | Spec §6.2 | Multi-turn scenario and final answer quality. |
| `BIO-004` | Architect: one agent, one state machine, one user flow, one completion contract; no novice/professional mode switch. | Spec §§6.3–6.4; `REQ-AGENT-002`; `docs/DECISIONS.md` | UI/API + end-to-end scenario; stubs alone insufficient. |
| `BIO-005` | Architect: useful validated downloadable artifact on success; honest SUCCESS/PARTIAL/FAILED otherwise. | Spec §§7.1, 10.2; `REQ-GEN-*`; `REQ-UI-001` | Real artifact, validators, download policy, recovery. |
| `BIO-006` | User outcomes primary; tests/CI/deploy reported separately. | `REQ-TEST-001`; testing docs | Evidence labeled by type and commit. |
| `BIO-007` | Requirements stay traceable; none silently dropped. | Spec + `ROADMAP.md` | No orphan requirements/stages. |
| `BIO-008` | Preserve completed stages and historical evidence; add status, do not rewrite the past. | Roadmap, report, changelog, user-value docs | Additive history. |
| `BIO-009` | Each session reconstructs state and chooses its own task; prior assistants do not bind the next. | This file + roadmap | Task derived from current gaps. |

New obligations need owner approval before becoming normative.

---

## 4. Mandatory protocol for the beginning of every session

**MUST NOT** start by executing a previous assistant’s assignment as authority. Reconstruct, then choose.

This section is the session-start protocol (Phases A–D). Hard gates in §0 still apply before any patch or Navigator plan.

### Phase A — State

1. Read **§0–§1** of this file, then the rest as needed.  
2. Read current normative top of `TECHNICAL_SPECIFICATION.md`.  
3. Read control section of `ROADMAP.md` and relevant phases (keep history).  
4. Read top of `TECHNICAL_REPORT.md`, latest `CHANGELOG.md`, relevant user-value notes.  
5. Inspect code/tests/workflows for the area of work.  
6. Note real limits (no git remote, no CI access, reconstructed tree, etc.).

### Phase B — Obligations and evidence

7. Mark relevant requirements: `IMPLEMENTED` / `PARTIAL` / `OPEN` / `BLOCKED` / `NOT_VERIFIED`.  
8. Trace requirement → roadmap → code → tests → user evidence; find orphans and mock-only claims.  
9. Re-check important prior claims against source; do not trust a prior assistant’s conclusion alone.  
10. Keep uncertainty explicit.

### Priority cascade (highest first)

| Priority | Category | Rule |
|---|---|---|
| **P0** | Critical defects | Broken product, primary agent, data integrity, security. |
| **P1** | Mandatory functionality | Missing approved product features. |
| **P2** | Major functional defects | Wrong or unreliable existing behavior. |
| **P3** | Real user-value validation | Beyond mocks. |
| **P4** | Extra tests/reliability | Beyond checks required for the current change. |
| **P5** | Usability | UX clarity (not instead of P0–P2). |
| **P6** | Refinement | Docs/debt only when higher priorities are clear. |

**MUST NOT** choose P4–P6 polish while actionable P0–P2 remains unblocked.  
Mandatory tests and gates for **this** change always apply; P4 is extra standalone work.

### Phase C — Task

11. Choose work via the cascade and current gaps.  
12. Prefer closing a user-outcome gap.  
13. Before edits, state: problem + evidence, obligation IDs, user outcome, scope/non-goals, risks, acceptance, checks vs live evidence, what remains open.  
14. Owner approval required before changing product goals, security posture, or production state.

### Phase D — Implement and leave clean

15. Stay in scope; re-scope openly if evidence changes priorities.  
16. Run available checks; record commands/results; never invent PASS.  
17. Evaluate user-visible result; mark live `NOT_RUN` when unavailable.  
18. Additive updates to `ROADMAP.md`, top of `TECHNICAL_REPORT.md`, `CHANGELOG.md`.  
19. Change normative specs only when approved.  
20. **MUST NOT** prescribe the next session’s task. Leave factual status and gaps only.

---

## 5. Change control and history

- **MUST NOT** silently change the purpose of a canonical document.  
- **MUST NOT** create `NEXT_PATCH.md` or a binding next-session assignment.  
- Preserve completed roadmap stages and factual history; add status, do not erase the past.  
- Historical **records** stay; obsolete **test code/fixtures** may be retired under minimalism rules after reference/CI checks.  
- English-only maintained repo artifacts; do not narrow product language support without approval.

---

## 6. Repository minimalism and test lifecycle

- Maintained files must serve a current purpose.  
- Tests must protect current requirements, contracts, or material regression risk.  
- Classify stale artifacts: keep / update / merge / archive outside repo / delete — after reference and CI checks.  
- **MUST NOT** delete binding requirements or required audit evidence.  
- Prefer small current-contract tests over permanent historical suites.

---

## 7. Delivery checklist (every patch)

Complete before sending a ZIP (`FOR_ASSISTANT`):

1. [ ] `package.json` `version` / `patch` updated if this is a new patch; lock root metadata consistent.  
2. [ ] ZIP paths = session diff only (G1).  
3. [ ] `unzip -l` reviewed; zero helpers.  
4. [ ] Deletion paths listed in chat if any (not in ZIP).  
5. [ ] `FOR_NAVIGATOR` steps have no shell/npm (G2).  
6. [ ] UI/entry changes: G4 addressed in same delivery.  
7. [ ] Automable checks: tests and/or workflows updated (G3).  
8. [ ] Chat states what ran vs `NOT_RUN` (G5).  
9. [ ] `CHANGELOG.md` + top evidence note in `TECHNICAL_REPORT.md` for this patch.

`FOR_NAVIGATOR` apply pattern (template): open GitHub → replace listed paths from ZIP → commit → open Actions → read result. No local install steps.

---

## 8. Security and evidence integrity

- **MUST NOT** commit secrets, tokens, private keys, or secret env values.  
- Keep auth enabled unless the owner explicitly authorizes otherwise.  
- Production deploy, repo policy changes, billing, destructive data ops, and running generated code need explicit owner authorization.  
- **MUST NOT** disable safety gates only to greenwash CI.  
- Mocks prove mocks; source inspection proves structure; CI proves only what ran; user outcome needs user-level evidence.

---

## 9. Decision authority

Cross-cutting decisions: `docs/DECISIONS.md` (including Navigator/ZIP rules under `D-2026-10-30-07` and successors).  
Product requirements: `TECHNICAL_SPECIFICATION.md`.  
Working rules and hard gates: **this file**.
