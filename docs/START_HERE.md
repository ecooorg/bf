# START HERE

> Read this file first. It is enough to start work; do not read the whole specification (225 KB).
> Binding rules: this file and `AGENTS.md`. Where other documents disagree, these two win.

## What this is (5 lines)

1. BiForge is a decision and project agent on Node/Express + React + the Gemini API, deployed on Railway.
2. **Simple Mode** (`/`) works and is used by the owner: a conversation-first decision cockpit (BiForge, internal version 1.6.0).
3. **Project Mode** (`/project`, opt-in, PostgreSQL) is being built step by step from the specification `docs/BiForge_TZ_v3.md` (Russian, canonical).
4. The plan is a list of patches P01…P25 (TZ 16.4.2). Current state: `docs/CURRENT_STATE.md`.
5. Map of the repository, scripts, tests and environment variables: `docs/REPO_MAP.md`.

## The 10 rules

1. **Process.** The owner uploads the current repository archive at the start of a session. The model has no GitHub access. At the end the owner uploads the patch to `main` by hand (GitHub web interface on Android). CI checks `main`. There are no branches and no Pull Requests.
2. **Models change between sessions and remember nothing.** Everything needed must be in the archive and in these documents.
3. **Flat structure.** Files in the root and in first-level directories only; the single exception is `.github/workflows/`. Never create nested directories (for example, no archive subfolder in `docs/`).
4. **Languages.** Program interface: English only. Specification: Russian (canonical). `AGENTS.md` and technical documents: English. Reports and chat with the owner: Russian.
5. **The user sees only the name "BiForge"** in the interface: no versions, step numbers or hashes. (Existing labels `v1.6.0` in Simple Mode and "BIFORGE · BX-06" in the `/project` header are removed in patch P01.)
6. **Save tokens.** The owner is on a free plan. Do not read what you do not need, do not run what you do not need, deliver the patch as early as possible.
7. **Honest reports.** `node_modules` is usually absent in the model environment, so `npm run check` and `npm run build` often cannot run. Say so; report `BLOCKED` or `NOT_RUN`. Never present an unrun check as passed.
8. **Programme code is changed only when the patch says so.** Behaviour, tests and `CHANGELOG.md` change together.
9. **No secrets** in files, reports or chat. Refer to variable names only.
10. **One patch, one verifiable result;** do not start the next patch without the owner's command.

## Delivery

1. Read the spec of the patch (`docs/PNN-SPEC.md`; create it from `docs/PATCH_TEMPLATE.md` at the start).
2. Do the work. Run what can be run (see "Commands").
3. Build **one cumulative patch**: an archive with the latest version of every file changed since the last upload the owner confirmed, at its repository path. Do **not** put any manifest or list-of-files file into the archive.
4. In the chat (Russian) write one line "replace N, add M, delete K" with file names. Deleting files is done by the owner by hand; deletions are never part of the archive.
5. Also in the chat: the report (what was done, what was run and the actual result, what was not run, known issues) and 2–3 steps for the owner to check on GitHub/Railway.
6. The owner uploads the files, CI runs on `main`, the owner reports the result.

## Where things are

- Current state and next patch: `docs/CURRENT_STATE.md` (next patch is P01 until that file says otherwise; the plan is TZ 16.4.2).
- Patch spec template: `docs/PATCH_TEMPLATE.md`. Report template (starred and gate patches): `docs/STEP_REPORT_TEMPLATE.md`.
- Repository map, scripts, tests, environment variables: `docs/REPO_MAP.md`.
- Deployment: `DEPLOY_RAILWAY.md`. Connections inventory: `connectors.yaml`, `docs/CONNECTIONS.md`.

## Commands

```bash
npm ci               # install exactly from package-lock.json
npm run check        # docs, version, copy lint, typecheck, unit and virtual tests
npm run build        # vite build + server compile
npm run test:ui      # browser layout check (needs Playwright; not part of check)
npm run check:docs   # documents only: needs no dependencies, always try this one
```

If dependencies cannot be installed (no network), report `BLOCKED` with the reason, run `node scripts/check-docs.mjs` and `node scripts/check-version.mjs` (they need no packages), and say plainly that the rest was not run. Tests marked "PostgreSQL" in `docs/REPO_MAP.md` run in CI only.

## Which parts of the specification to read

The TZ is 225 KB. Read only the sections listed for your patch (plus 16.3–16.4 once). The list was composed from the plan in 16.4.2 and the section headings; if the patch SPEC names other sections, the SPEC wins.

| Patch | Read TZ sections |
| --- | --- |
| P01 | 5, 6.1–6.4, 16.3–16.4 |
| P02 | 7.1, 7.2, 7.4 (error classes), 7.10, 12.2 |
| P03 | 7.2–7.5, 7.10, 20.2 (ADR-02) |
| P04 | 7.8, 10.1–10.2, 3.2 (A-01, A-02), Appendix E (E.0, E.1, E.6, E.7) |
| P05 | 5.2–5.6 |
| P06 | 5.5, 7.7, 17 (G1a), 18.0 |
| P07 | 7.1, 7.2, 7.6, 3.2 (A-08), Appendix E.2, E.6 |
| P08 | 7.3, 7.8, 14.2–14.4, 20.2 (ADR-07) |
| P09 | 7.4, 7.5, 7.8 |
| P10 | 7.1, 7.6, 12, 14.5, 20.2 (ADR-04) |
| P11 | 8.1, 8.2, 12.2 |
| P12 | 8.1, 8.3 |
| P13 | 8.4–8.6, 14 |
| P14 | 10, 20.2 (ADR-05, ADR-08) |
| P15 | 11.9, 17, 18.1, 20.2 (ADR-10) |
| P16 | 11.2, 11.7, 11.8, 13.3, Appendix E.5, 20.2 (ADR-06) |
| P17 | 11.8, 12 |
| P18 | 11.3–11.5 |
| P19 | 9.2 (`code_author`), 11.4, 11.9 |
| P20 | 6.4, 9.2 (`brief_writer`), 11.3 |
| P21 | 9.2 (`reviewer`), 11.5, 12.3 |
| P22 | 11.6, 12.5 |
| P23 | 13, 20.1 |
| P24 | 15.3–15.6, 20.2 (ADR-09) |
| P25 | 17, 18.2, 18.3 |

Always useful: 0.1 (decisions D-01…D-17), 2 (principles), 16.3 (rules of a step).

## History: do not read

These files are kept as history. Reading them is not needed for any patch. Older step specs, reports and audits (BX-01…BX-05, BF-01) were deleted in P00; their results are in `docs/CURRENT_STATE.md`.

| File | What it is |
| --- | --- |
| `docs/BX-06-REPORT.md`, `docs/BX-07-REPORT.md` | Reports of the latest finished steps (`docs/CURRENT_STATE.md` summarizes everything done). |
| `docs/ADR-01-postgresql.md` | Accepted decision; read only if you change database access |


## Informational materials (agent instructions) — do not read for patches

These files document Simple Mode agent behaviour, a proposed improvement track, and a post-launch shelf proposal on hallucinations. They are **not** binding requirements, **not** part of any PNN SPEC, and **must not** be used as acceptance criteria or test fixtures until a future patch explicitly adopts them.

| File | What it is |
| --- | --- |
| `docs/BiForge_Agent_Instructions_v1_Extracted.md` | Snapshot of the **current** agent instructions as extracted from the v1.6.0 codebase (prompts, V17, post-processing, quality-gate). Reference only. |
| `docs/BiForge_Agent_Instructions_v2_Target.md` | **Proposed** target instruction set (uncertainty contract, intent flags, modes on a single base). Not implemented in code. |
| `docs/TZ_BiForge_Instructions_Uncertainty.md` | Standalone technical specification (TZ-INSTRUCTIONS-01) for incremental adoption of the v2 behaviour (P1–P3 style patches). Independent of TZv3.0 BX plan. |
| `docs/BiForge_analytical_note_recommendations.md` | Analytical note and recommendations on the dialogue failure mode (uncertainty vs strict honesty) and architecture options. Background only. |
| `docs/TP_BiForge_Hallucination_CrossCheck.md` | Post-launch proposal (TP-HALLUC-01): multi-model cross-check and anti-hallucination contour. **Not for implementation now**; shelf plan if hallucinations become a problem after launch. |

Rules for coding agents:

- Do **not** open these files unless the owner explicitly assigns work on agent instructions / TZ-INSTRUCTIONS-01 / TP-HALLUC-01.
- Do **not** change Simple Mode prompts or post-processing because of these documents without an explicit patch SPEC.
- `npm run check`, acceptance tests, and regression suites **do not** and **must not** depend on these informational files.
- `scripts/check-docs.mjs` only verifies that local Markdown links and backticked paths resolve; presence of these files is enough. They introduce no new required behaviour.

## Other documents

- `CHANGELOG.md` — the changelog of the project from BX-07 onward. Add an entry for every behaviour change.
- `CHANGELOG_AGENT_BEHAVIOR.md` — history of the **behaviour of the Simple Mode agent** (versions 1.x: prompts, method, answer layer). Not a project changelog. `npm run check` requires a section for the current version there; do not delete it.
- `docs/BiForge_Avanproekt_v3.md` — the concept paper (in Russian; its header says it is the conceptual document and the TZ takes priority on technical details). Not a source of requirements: use the TZ.
- Process documents (reference, may repeat each other; binding rules are here and in `AGENTS.md`): `docs/DEVELOPMENT.md`, `docs/DEVELOPMENT_PROTOCOL.md`, `docs/TESTING_POLICY.md`, `docs/universal_testing_protocol.md` (29 KB, general methodology, read only when designing tests), `docs/GIT_POLICY.md`, `docs/RESOURCE_ECONOMY.md`, `docs/SECURITY_POLICY.md`. Read `docs/SECURITY_POLICY.md` before touching authentication, secrets or uploads.
- `QA_DRIVE_CHECKLIST.md` — manual check of Google Drive sync (needs real Google).
- Agent-instruction and post-launch reference pack (informational only; see section above): `docs/BiForge_Agent_Instructions_v1_Extracted.md`, `docs/BiForge_Agent_Instructions_v2_Target.md`, `docs/TZ_BiForge_Instructions_Uncertainty.md`, `docs/BiForge_analytical_note_recommendations.md`, `docs/TP_BiForge_Hallucination_CrossCheck.md`.
