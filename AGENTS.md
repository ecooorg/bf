# AGENTS — BiForge start file

> **The only start file.** Read this first. It holds the rules, the current state and the map.
> Zone **STATE** is rewritten by every patch. Zone **RULES** changes only with owner review.
> Product version: single source `APP_VERSION` in `src/config.ts` (equal to `package.json` `"version"`, enforced by `scripts/check-version.mjs`). Never write the version number in Markdown.

---

# STATE (rewrite in every patch)

| Item | Value |
| --- | --- |
| Last patch | P70 — UI audit closed: shared states and labels, Simple banner removed, copy-lint debt cleared |
| Product line | **builder**: pipeline-first generation (IR → verified scaffolds → optional model slice → ZIP) |
| Modes | Simple (P63 empty state and guide), Expert (P61 layout; P63 shared header/guide), Project (P62/P67–P70 UI; `POST /code/build` uses `server/appBuilderPipeline.ts`) |
| Code delivery | Scaffold ZIP needs no model. Optional model slice: `CODE_EXECUTOR=model_patch` and `APP_BUILDER_MODEL_SLICE=true`. Legacy `engine: "model_patch"` still available |
| GitHub write | Deferred (ADR-06); off by default; `GITHUB_DIFF_UPLOAD` is the only opt-in switch |
| Owner authorisation pending | GitHub App write; executing generated code on the BiForge host |
| Next | P71: open every screen in a browser at 1200 px and 390 px (not done since P65) and fix what it shows. Open decisions: `docs/12-Documentation-Migration-and-Open-Decisions.md` |
| Last full `npm run check` | 2026-10-23 — PASS (exit 0): docs, lint:copy, typecheck, all test suites; `test:database` ran its 3 non-live tests only (no PostgreSQL here). Browser `test:ui` not run: Playwright cannot download Chromium here, so P67–P70 screens are not checked at 1200 px and 390 px. |

Generation flow: wizard / goal → App IR → resolve stack → materialize scaffold → optional model slice → ZIP (README + BIFORGE-IR.json) → the owner uploads to GitHub or a host by hand.

Strings such as DEPLOY-MANUAL.md inside generated ZIPs are archive contents, not paths in this repository.
---

# MAP

Flat structure. Nested folders that exist today: `.github/workflows/` and `src/workspace/`. Do not add others.

| Path | Purpose |
| --- | --- |
| `server.ts` | Express entry point and route registration |
| `server/` | Server modules (file names state the responsibility) |
| `src/` | React UI and client logic; `src/config.ts` holds `APP_VERSION` |
| `tests/` | Grouped test suites; `tests/feature-manifest.json` is the regression guard |
| `scripts/` | Checks, patch packing, evidence, migrations, ops tools |
| `migrations/` | Ordered SQL migrations |
| `docs/` | Canonical documentation (table below) |
| `.github/workflows/` | CI |
| Root configs | `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.server.json`, `railway.toml`, `nixpacks.toml`, `.env.example`, `.nvmrc`, `connectors.yaml`, `index.html` |

To find a module, search by name or by `grep`; do not rely on a hand-written file list.

| Document | Role |
| --- | --- |
| `docs/01-Product-and-System-Specification.md` | Product scope, modes, boundaries |
| `docs/02-Architecture-and-Components.md` | Runtime architecture, module responsibilities |
| `docs/03-API-and-Integration-Contracts.md` | HTTP, provider contracts, environment configuration |
| `docs/04-Database-and-State-Machines.md` | Schema and state machines |
| `docs/05-Agent-Runtime-and-Prompt-Contracts.md` | Agent runtime and prompts |
| `docs/06-UI-Workspace-and-File-Handling.md` | UI, Workspace, files |
| `docs/07-Security-Privacy-and-Operations.md` | Security and ops controls |
| `docs/08-Deployment-and-Runbook.md` | Install, run, deploy, rollback, operator quickstart |
| `docs/09-Testing-and-Equivalence.md` | Tests and acceptance |
| `docs/10-Requirements-Traceability.csv` | Requirements matrix |
| `docs/11-Repository-and-Route-Inventory.md` | Route and environment inventory (snapshot) |
| `docs/12-Documentation-Migration-and-Open-Decisions.md` | Open decisions and gaps |
| `docs/13-Implementation-Roadmap.md` | Roadmap |
| `docs/14-SQL-Migration-Reference.md` | SQL reference |
| `docs/15-Prompt-Source-Snapshot.md` | Prompt snapshot (large; read only when working on prompts) |
| `docs/16-Project-Mode-App-Builder.md` | Project Mode app builder |
| `docs/17-App-Builder-IR-Pipeline.md` | IR pipeline |
| `docs/18-UI-Cross-Mode-Audit.md` | Cross-mode UI audit (P66); defect list for P67+ |
| `CHANGELOG.md` | History. Newest entry on top. Read only the top entry |

Do not read everything. Read this file, the files the task names, and the files you will change.

Evidence labels used in the docs: **IMPLEMENTED (static)**, **TESTED (executed)**, **DOCUMENTED ONLY**, **GAP / NOT IMPLEMENTED**, **NOT RUN / BLOCKED**, **OWNER DECISION REQUIRED**. Static inventory is not proof of runtime acceptance.

---

# RUN AND DEPLOY

```bash
npm ci && npm run build && npm start      # health: GET /health
npm run check                             # full gate
```

Environment names, the operator quickstart and rollback: `docs/08-Deployment-and-Runbook.md`. Start from `.env.example`. Never commit secrets.

---

# RULES (frozen; change only with owner review)

## 1. Authority and language

- *Navigator* is the human co-developer (the owner). *AI Assistant* is the AI co-developer (the agent these rules are written for).
- Canonical product documentation is English only, under `docs/`. Code, comments and repository documentation: English. UI strings: English in source. Agent dialogue with the user: language of the user's first message.
- Specifications, patch reports and historical plans are retired from the repository and exist only in the owner's local archives. Do not treat them as requirements. Do not recreate the retired start files (START_HERE, STATUS, DEPLOY, README, APPLY, AUDIT_EVIDENCE, ROUTE-CATALOG): everything they held is in this file or in `docs/08-Deployment-and-Runbook.md`.
- If an instruction conflicts with an approved owner decision or the canonical docs, stop and report the conflict.

## 2. Scope

- Work only on the explicitly authorised scope. The owner commands each implementation stage.
- Do not invent product requirements. A gap in the docs is an open decision: record it in `docs/12-Documentation-Migration-and-Open-Decisions.md` and ask the Navigator.
- Identifiers of completed historical patches are frozen.

## 3. Sources of truth (priority)

1. STATE zone of this file: what is current and what is next. If any plan disagrees with it, this file wins.
2. RULES zone of this file: process rules.
3. Canonical set `docs/01`–`docs/17`: product contract.
4. Code, migrations, tests: implementation evidence. For what exists, code wins; log any conflict with the docs instead of silently choosing.
5. Owner command in the current session: overrides plans, never overrides safety.

## 4. Hard prohibitions

- Do not commit secrets, API keys or real credentials.
- Do not enable GitHub write, silent merge to main, or production deploy without explicit owner authorisation.
- Do not change application behaviour in a documentation-only patch.
- Do not reintroduce retired specification files.
- Do not claim a test passed if it did not run, or a dependency is present if install failed.
- Do not expand scope beyond the authorised patch.

## 5. Delivery of work

- The model may have no GitHub access. The owner uploads archives and applies patches by hand.
- **Required deliverable for every patch:** a downloadable archive with only the **changed and new files** (not a full tree). A `.patch` or `.diff` alone does not replace the archive.
- An archive cannot carry deletions. List every file to delete, by path, in the hand-over message.
- Every patch: rewrite the STATE zone above and add one entry on top of `CHANGELOG.md`. Do not write the product version number in Markdown.
- Removing a public feature on purpose: edit `tests/feature-manifest.json` in the same patch and explain it in `CHANGELOG.md`.
- After code changes: run the narrowest relevant test, then `npm run check` once when the environment allows.
- When a file is renamed, moved or deleted: search the whole tree for its old path (code, tests, scripts, docs, this file) in the same patch.

## 6. Safety and honesty

- Prefer failing a check over claiming success without evidence.
- Record environment limits (missing packages, no DB, no network) explicitly.
- Security, auth and permission changes require owner review.

## 7. Token economy

Goal: fewest tokens, time and tool calls that still give a correct, tested, safe result. Economy never replaces a required test or a correct answer.

- **Read narrowly.** Only what the task names plus the files you will change.
- **Ask once.** Only questions that block the start, in one message.
- **Act, do not narrate.** No plans or recaps unless the owner asks.
- **Test in order.** Narrowest test first, then full `npm run check` once.
- **Do not repeat output.** Name files and results in one or two lines.
- **Stay in scope.** Change only authorised files.
- **Deliver small.** The archive holds only changed and new files.
- **Honest limits.** If a command could not run, say so in one line.

## 8. Delegation of decisions

- **Tier 0:** Act (routine implementation inside authorised scope).
- **Tier 1:** Decide and disclose (local design choices that do not change product contract).
- **Tier 2:** Prepare a decision for the Navigator (product scope, security gates, external integrations).
- **Tier 3:** Never decide alone — merge to production, GitHub App write rights, billing, secrets, formal acceptance (MANUAL1), waiving gates.

Silence is never consent in Tiers 2 and 3.

## 9. Screens and interface text

The interface is for a person who has never seen the system. These rules apply to every screen in Simple, Expert and Project.

- **One screen, one job.** A title says what to do now. One primary action. Everything else is secondary and visually quieter.
- **Few words.** A hint is at most 12 words. Anything longer goes behind a "?" control, at most 25 words. `scripts/lint-copy.mjs` fails visible text over 24 words.
- **No internals.** Never show names of internal mechanisms, data fields, versions or file formats (the list is in `scripts/lint-copy.mjs`). Say what the person gets or must do, not how the system works.
- **One name per thing.** Names of loops are in `src/uiTerms.ts`, names of steps are `STAGES[].label` in `src/decision.ts`. Do not invent a second name; do not show the internal ids.
- **No control without a job.** Do not show Attach or Download when there is nothing to attach or save. A disabled main button says why in at most 8 words next to it.
- **Never point at what is not on the screen** ("under the message box" when there is no message box).
- **Say it once.** The same explanation appears in one place only.
- **Fields look like fields.** Every input has a visible border or background and a visible label.
- **Debt only goes down.** The allowances in `scripts/lint-copy.mjs` record old violations. Never raise one; fix the text. When you fix a text, lower the allowance.
- **Look before you ship.** For any UI change open the screen at 1200 px and at 390 px width and check: no horizontal scroll, nothing cut off, every button has a visible label.

## 10. Changing this file

Edit only the STATE zone in a normal patch. A change to RULES is a policy change and requires owner review in the same patch.
