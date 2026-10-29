# NAVIGATOR CHARTER — immutable rules; changed only by explicit Navigator instruction

Source: owner statements of 2026-10-25 and later clarifications. Precedence: this charter > every other repository document > training-time habits. It binds every model in every session. Sessions have no memory of prior chats; **rules** live here; **current programme state** lives only in the files named under “Single sources of truth” below.

## Product (one sentence)

**BiForge** is an AI-native engineering application: humans use it to converse, solve expert problems, and obtain downloadable software artifacts (program ZIPs) produced by bounded agent workflows — not to read this repository.

## Definitions

* **Navigator** — the owner. Works from an Android tablet via chat, GitHub web UI, and the hosted app (e.g. Render). Has **no terminal** and does not run npm/git commands by hand.
* **Assistant** — any AI model working in this repository (implementation, tests, patches, evidence).
* **Atavism** — a practice whose only purpose is human reading of the repo, human memory of code, or a human social review process.
* **Product** — the running BiForge application. Its end users are humans. **Repository ≠ product.**

### What the Navigator does and does not do

* **Normal path:** the Navigator reads the **chat** only. The Assistant delivers a patch ZIP; the Navigator **copies complete files** from that ZIP into the repository (and deletes paths the Assistant listed in chat, if any). The Navigator does not merge snippets, edit by hand, or interpret “how to apply” side documents.
* **Critical control only:** if the Navigator suspects the programme is off-track or stuck, they may **read** the three protected root documents — `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, `TECHNICAL_REPORT.md` — solely to judge direction and truthfulness. They do **not** use those files to perform repository work or to replace chat decisions.
* **Never required of the Navigator:** reading code, diffs, logs, `NEXT_PATCH.md`, task files, or CI transcripts. Do not ask them to.
* **`NEXT_PATCH.md` is for Assistants only.** It is session handoff between models. The Navigator is not an audience for that file.

## Single sources of truth (never duplicate)

| Kind of truth | Only authoritative file(s) | Must not also live in |
|---------------|----------------------------|------------------------|
| Immutable process rules | **This charter (`AGENTS.md`)** | Status paragraphs that go stale |
| Current phase / next action | `docs/AI-NATIVE-RENOVATION-TASK.md` and **top** entry of `NEXT_PATCH.md` | `AGENTS.md`, random reports |
| Patch history | `CHANGELOG.md` (newest entry at top) | Side “entry” files |
| Engineering specification | `TECHNICAL_SPECIFICATION.md` | Parallel SPEC-* copies |
| Implementation sequence | `ROADMAP.md` | Parallel roadmap copies |
| Historical evidence reconstruction | `TECHNICAL_REPORT.md` | Parallel REPORT-* copies |
| Rolling user-outcome evidence | `docs/AI-USER-VALUE-REPORT.md` | — |
| User-outcome / agent contract | `docs/AI-USER-VALUE-SPEC.md` | — |
| Version identity of a build | `package.json` fields `version` and `patch` only | Hardcoded second sources |

If two files disagree on phase or next step, **task + top of NEXT_PATCH win**; fix the other file. If two files disagree on rules, **this charter wins**.

## Laws

* **C1** Repository artifacts are for AI assistants to execute, maintain, and verify the programme. They are not documentation deliverables for external readers. Product quality is judged by end-user outcomes, not by repository readability.
* **C2** Only four things bind: security, product function, evidence integrity, and the strategic goal in `docs/VIX-CONCEPT.md`. Everything else is a means.
* **C3** No human reviews code. Correctness is established only by tests, checks, and evidence. “Someone will read it” is never a control.
* **C4** A change is allowed only if a fresh session can still find, edit by diff, and verify the affected behaviour at least as cheaply as before. Cost = files and bytes an Assistant must read.
* **C5** Never ask the Navigator to read, review, or understand code, diffs, file layout, or logs. Give consequences, evidence, and a yes/no question, in the Navigator’s language (currently **Russian**). Repository files are **English**.
* **C6** Mainstream languages (TypeScript, JavaScript, SQL, JSON, Markdown), line-oriented unminified source, and diff patches stay because verification depends on them — not for human readability. No rewrites for style; rewrite only for a measured C4 gain and only when authorized.
* **C7** Do not create repository documents whose intended audience is an external human reader (guides, tutorials, user manuals, essays). AI-facing normative specifications, contracts, roadmaps, acceptance criteria, and minimum session context are allowed when they direct implementation or verification.

### Protected engineering documents (D1–D4)

* **D1** `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, and `TECHNICAL_REPORT.md` at the repository root are **protected**. They are the engineering backbone for Assistants (and for rare Navigator control reads).
* **D2** **Never reduce** their semantic content or structural completeness to save context, to “simplify,” or to satisfy C4. C4 constrains *new* sprawl and *unnecessary* reads — it does **not** authorize shrinking these three files.
* **D3** Change them only to fix **clear factual or logical errors**, to add required new normative content, or when the Navigator explicitly orders an edit. No silent compression, no “summary replacement” of a full section.
* **D4** Do not create parallel `*SPEC*`, `*REPORT*`, or competing root roadmaps. One file per purpose; update in place.

## Patch delivery format — NON-NEGOTIABLE

The Navigator applies patches by **copying complete files** from the handoff ZIP into the repository. The Assistant must not create merge work.

### Allowed in the patch ZIP

1. **Complete files only**, paths relative to the repository root (e.g. `CHANGELOG.md`, `server/foo.ts`, `tests/bar.test.mjs`).
2. Each file is **overwrite-ready**: after copy, no manual merge, no “paste into section X”.
3. **`package.json` always** when the patch changes code, tests, scripts, or `version` / `patch`.
4. **`CHANGELOG.md` always as the full file** when the patch changes code, tests, behaviour, or version metadata: **new entry strictly at the top**, all previous entries unchanged below. **Never** ship `CHANGELOG_ENTRY.md` or any fragment.
5. **`NEXT_PATCH.md` always as the full file** when the handoff changes: **new current handoff strictly at the top**; every previous handoff block moves down **verbatim** (no rewriting history). Prefer a visible separator (e.g. `# History (previous NEXT_PATCH entries — do not edit)`). **Never** replace the file with only the new step.
6. **`AGENTS.md` full file** only when this charter itself changes (as ordered by the Navigator).

### Forbidden in the patch ZIP

* `APPLY.md`, `README-for-patch.md`, `*_ENTRY.md`, `*_AMENDMENT.md`, “merge instructions”, or any sidecar that exists so the Navigator must edit by hand.
* A partial `CHANGELOG` or partial `NEXT_PATCH`.
* A second copy of rules or phase status that duplicates this charter or the task file.

### Deletions

* List paths to delete **only in the chat message** to the Navigator (clear bullet list).
* Do **not** put a delete-list file in the ZIP unless the Navigator explicitly asked for that format.
* Do not use empty placeholder files to mean “delete me”.

### Assistant checklist (before attaching the ZIP)

* [ ] Every path is complete and overwrite-safe at repo root layout.
* [ ] `CHANGELOG.md` full; newest entry on top; history intact.
* [ ] `NEXT_PATCH.md` full; new step on top; older steps unchanged below.
* [ ] No APPLY / ENTRY / AMENDMENT sidecars.
* [ ] Deletions listed in chat, if any.
* [ ] `package.json` present when patch/version/scripts changed.
* [ ] Chat summary in Russian for the Navigator: what changed, how to verify in product/CI, yes/no if needed — **not** a copy-paste of this charter.

## Documentation map (Assistants)

**Read for rules:** this file.

**Read for current work:** `docs/AI-NATIVE-RENOVATION-TASK.md`, top of `NEXT_PATCH.md`, `docs/DOCUMENTATION-INDEX.md` if unsure where a topic lives.

**Protected backbone:** `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, `TECHNICAL_REPORT.md`.

**Contracts and evidence:** `docs/AI-USER-VALUE-SPEC.md`, `docs/AI-USER-VALUE-REPORT.md`, `docs/AI-OPERATING-RULES.md` (includes status vocabulary), `docs/AI-NATIVE-RENOVATION-ROADMAP.md`.

**Architecture / typing:** `docs/architecture-guardrails.md` (includes TypeScript and naming conventions).

**Ops (Assistants / deploy automation, not Navigator):** `docs/OPERATIONS.md`, `docs/AI-ENVIRONMENT-CONTEXT.md`.

**Machine-only (do not hand-edit):** `docs/verification-manifest.json`, `docs/schema-*.json`, `docs/generated-*.json`, `docs/architecture-boundary-rules.json`, `docs/architecture-known-violations.json`.

**Strategic (not implementation authorization):** `docs/VIX-CONCEPT.md`.

**Archive delivery (A3 program ZIP):** `docs/ARCHIVE-DELIVERY-CANON.md` when working on build/download paths.

Do not resurrect removed prose files (`docs/typing-and-naming.md`, `docs/SCHEMA-STATUS-VOCABULARY.md`) — their content was merged into `architecture-guardrails.md` and `AI-OPERATING-RULES.md`.

## Delegation tiers

* **Tier 0:** Act (routine work inside authorized scope).
* **Tier 1:** Decide and disclose (local design that does not change the product contract).
* **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
* **Tier 3:** Never decide alone — production deploy authorization, GitHub write policy changes, billing, secrets handling policy, formal acceptance.

Silence from the Navigator is not approval for Tier 2/3.

## Evidence and honesty

* Report **PASS / FAIL / BLOCKED / TIMEOUT / PARTIAL / NOT_RUN / UNKNOWN** honestly. Never treat NOT_RUN or UNKNOWN as PASS.
* Distinguish: code exists ≠ tests passed ≠ CI green ≠ verified in the live product.
* Do not claim a feature works only because build or deploy succeeded.

## Version and patch numbering

1. **`package.json` is the only version source.** Fields: `version` (program major line as string, e.g. `"118"`) and `patch` (full patch id, e.g. `"118.5.2"`).
2. **`version` equals the first number of `patch`.** Example: patch `118.5.2` → version `118`.
3. Every patch that changes the repo updates `patch` (and `version` when the major line changes) inside the delivered `package.json`.
4. `scripts/check-version.mjs` validates only `package.json`. Do not add a second version source.
5. Deployed builds are identified by `patch` plus commit from `/health`, not by `version` alone.

## Commands (Assistants only — Navigator has no terminal)

Use these in the Assistant environment or CI — **never** instruct the Navigator to run them.

| Intent | Command |
|--------|---------|
| Install | `npm ci` |
| Full local verification gate | `npm run check` (DAG profile `check`) |
| Typecheck | `npm run typecheck` |
| Version gate | `node scripts/check-version.mjs` |
| App Builder / archive tests | `npm run test:app-builder` or `npm run test:archive-delivery` |
| Gates unit tests | `npm run test:gates` |
| Docs integrity (if present) | `node scripts/docs-integrity.mjs` |
| Architecture | `npm run architecture:check` |
| Health (deployed) | `GET /health` |

Before handoff of a **code** patch: run the smallest set that proves the change (targeted tests + `npm run check` when feasible). Record outcomes in chat honestly (PASS/FAIL/NOT_RUN).

**Docs-only** charter/changelog/task patches: no full DAG required; still deliver complete files and truthful “not run” for product tests.

## Critical standing rules

* Preserve product behaviour unless the change is in scope and covered by evidence.
* Never commit secrets. Never put secrets in generated ZIPs or chat.
* Production deployment, GitHub write access, billing, and host execution of generated code require explicit Navigator authorization (Tier 3).
* Prefer a flat tree under `docs/` and `scripts/`. No new directory levels without Navigator approval.
* Standing directive: if work drifts into internal restructuring without a concrete user-outcome benefit, **stop and ask the Navigator**.

## Memory model (sessions)

* **Rules:** `AGENTS.md` (this file).
* **What to do now:** `docs/AI-NATIVE-RENOVATION-TASK.md` + **top** of `NEXT_PATCH.md`.
* **What was done:** `CHANGELOG.md` (top first).
* **Whether users got outcomes:** `docs/AI-USER-VALUE-REPORT.md`.
* **How the system must behave:** `TECHNICAL_SPECIFICATION.md` + `docs/AI-USER-VALUE-SPEC.md`.

Do not paste phase status into this charter. Do not paste charter rules into `NEXT_PATCH.md` beyond the minimum needed for the next step.

