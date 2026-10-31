## P122.0 — C122 launch: Expert Mode reliability cycle governance and documentation integration

- Product version advanced to 122; cycle C122 (Expert Mode Reliability, Intelligence Quality & Decision Engineering) is now the active programme.
- Integrated the full C122 technical mandate into existing documentation:
  - `TECHNICAL_SPECIFICATION.md`: new CURRENT NORMATIVE CONTRACT prioritising Expert Mode, four-patch structure, scope, exclusions, Architect freeze, Conversational protection.
  - `ROADMAP.md`: new CURRENT ROADMAP CONTROL with C122 patch sequence, priority matrix, expected results, and frozen/out-of-scope statements.
  - `docs/DECISIONS.md`: D-2026-10-31-03 recording the owner-approved launch of C122 and the freeze of Architect development.
- Architect remains the selected primary implementation but is frozen for feature work during C122; Conversational Mode remains out of scope.
- No product code, API, or test behaviour changed in this patch. This delivery establishes the normative baseline for P122.1–P122.4.
- Verification: documentation consistency inspection only; typecheck/build/tests/hosted CI/live: NOT_RUN (governance-only change).

## P121.0.49 — Fix primary Architect route and align stale boundary contract

- Fixed the route regression: `/project`, `/project-legacy`, and `/architect` render the selected `ProjectMode` Architect; only `/architect-lab` renders the frozen diagnostic Lab.
- Updated the P119 route-boundary test to assert the current single-Architect decision rather than the superseded Lab-primary behavior.
- CI `test:core` and DAG rerun attempted locally; execution is blocked by absent installed dependency `tsx`. No unrelated product logic changed.

## P121.0.48 — Select one primary Architect and detect semantic DOM aliasing

- Selected legacy Architect / `ProjectMode` as the sole active development target after newer comparable reports: legacy artifact `SUCCESS` with all declared validators passing; Lab artifact `PARTIAL` with JS syntax and missing-reference failures.
- `/project`, `/project-legacy`, and `/architect` route to the selected legacy workflow. `/architect-lab` remains frozen for diagnostic comparison; no parallel Lab feature development.
- Strengthened `dom-wiring` validation to reject distinct controller properties bound to the same DOM id, a defect found by inspecting the latest selected artifact despite its previous all-green report.
- Updated DOM repair instructions to avoid mapping unrelated roles onto an existing id just to clear validator findings; added regression coverage.
- Browser/mobile user outcome, production build, full suite, hosted CI, and fresh live generation: NOT_RUN.

## P121.0.47 — Evidence-based Architect selection and visible build progress

- Promoted Architectural Test Lab to the primary `/project` entry based on the supplied comparable build reports: Lab passes syntax validation while legacy has two JS syntax-validator findings; both remain PARTIAL and neither is represented as fully successful.
- Preserved legacy Project Mode at `/project-legacy`; `/architect` and `/architect-lab` remain Lab aliases.
- Both build interfaces expose model-call counts and ready-file counts while work is in progress; Lab also displays stage and elapsed time.
- Added the selection rule to `docs/DECISIONS.md`. Supplied artifact comparison is static evidence only; browser/device user outcome and a fresh live generation remain NOT_RUN.

## P121.0.46 — Model repair must see and preserve the file

- **Observed defect (Legacy Architect build `63e74598`, Expense Tracker):** `app.js` was generated at 26,540 characters with one syntax error. The js-syntax model repair returned a 492-character placeholder (`SyntaxErrorFixerApp`, 464 bytes in the ZIP) and it was accepted because the issue count dropped 1 → 0. The build was reported `SUCCESS` / `goalImplemented: true`.
- **Root cause:** the js-syntax and dom-wiring repair prompts named the file and the errors but did not contain the file, so the model could only invent a replacement; acceptance compared validator issue counts only.
- **`appBuilder/core-engine.ts`:** both model-repair prompts now include the current source of the file as data. A repair that keeps less than half of a file of at least 400 characters is rejected with reason `destructive_shrink` (`js_syntax_repair_rejected` / `dom_wiring_repair_rejected`, with `beforeChars` / `afterChars`) and the original file is kept, so the real validator failure stays visible and the outcome stays `PARTIAL`.
- **`tests/app-builder-repair-integrity-p121.test.mjs`** (registered in `test:app-builder`, part of the `check` DAG profile): prompt carries the source (js-syntax and dom-wiring); placeholder replacement rejected with original bytes preserved and outcome not `SUCCESS`; a faithful small repair is still accepted. On the previous code 4 of the 5 tests fail.
- No UI, route, API, database, or workflow change. Deterministic js-syntax fixes and unit-level regeneration are unchanged. Hosted CI, live builds, and device checks: NOT_RUN.

## P121.0.45 — Align tests with single outer PASTE + no neon workflow

- **test:core:** `neon-initialize-workflow.test.mjs` no longer requires deleted `.github/workflows/neon-initialize.yml`; asserts scripts only and that the workflow file is absent.
- **test:compact-ci-artifacts:** outer dir expectation is `ASSISTANT_PASTE.txt` + `biforge-ci-logs.zip` (evidence remains inside the zip).

## P121.0.44 — Single outer ASSISTANT_PASTE + cumulative CI fixes

- **Artifact layout:** GitHub artifact root is only `ASSISTANT_PASTE.txt` + `biforge-ci-logs.zip`. Full logs, `PATCH_EVIDENCE` / `BIForge-PATCH-EVIDENCE`, metrics, and `ASSISTANT-BRIEF.md` live **inside** the zip (no triplicate summaries at outer root).
- **`package-ci-artifacts.mjs`:** builds the rich outer paste (status, failed stages, log tails, truncated evidence) then strips the dir to those two files.
- **Manual workflows** (`architect-compare`, `ops`): `PACK_OUTER_ARTIFACT=true` on `assistant-run-summary.mjs` packs the same outer layout.
- **Cumulative from 0.43:** four-workflow inventory test; `test:ui-smoke` + Playwright smoke on `ci` after DAG; canonical four workflows.

## P121.0.43 — Workflow inventory fix + Playwright UI smoke on ci

- **test:core:** `p119-agent-boundaries` still expected 16 legacy workflow YAMLs. Updated to the four canonical files: `acceptance.yml`, `architect-compare.yml`, `ci.yml`, `ops.yml`. Push/PR gate assertions now require UI smoke on `ci.yml`; manual workflows stay `workflow_dispatch` only.
- **`npm run test:ui-smoke`:** preflight + `tests/ui-check.mjs` (viewport/shell smoke, not full p120 suite).
- **`ci.yml`:** after successful DAG, Playwright Chromium (cached) + `test:ui-smoke`, log `artifacts/ci-checks/ui-smoke.log`.
- Re-ships the three manual canonical workflows if missing. Delete leftover `architect-dual-compare.yml` if present (chat list).

## P121.0.42 — Four canonical workflows + ASSISTANT_PASTE summary

- **`scripts/assistant-run-summary.mjs`**: after each run, writes `ASSISTANT_PASTE.txt` (chat-sized failure extract) and `ASSISTANT_SUMMARY.json` under the log dir. Navigator can paste the text file when ZIP attach is unavailable.
- **Canonical workflows (4):**
  - `ci.yml` — push/PR DAG (existing pipeline + assistant paste before package/upload)
  - `acceptance.yml` — full DAG + Playwright UI, dispatch
  - `architect-compare.yml` — Lab vs Legacy dual-compare on staging, dispatch
  - `ops.yml` — fast diagnostics / dual dry-run, dispatch
- Contract test `tests/assistant-run-summary-contract.test.mjs`.
- Obsolete workflow **deletion paths listed in chat only** (not in ZIP).

## P121.0.41 — Dual-compare fixture flat path (no scripts/fixtures/)

- Moves the dual-compare goal text to `scripts/architect-dual-expense-goal.txt` (same level as other scripts).
- Updates `architect-dual-compare.mjs` and contract test paths.
- **Delete on apply:** `scripts/fixtures/architect-dual-expense-goal.txt` and empty `scripts/fixtures/` if present (listed in chat only, not in ZIP).

## P121.0.40 — test:web English disclosure + dual-compare (cumulative)

- **CI (test:web):** After English-only product disclosures, `web-and-epistemics` still expected Russian freshness/footer strings. Updated assertions to English (`Live figures could not be confirmed…`, `Web search is disabled…`, `Sources (web search)`). `appendFreshnessDisclosure` / `formatSourcesFooter` are English-only (no language-switched chrome).
- **Includes Architect dual-compare automation** (from 0.39): script, workflow, fixture, contract test, npm scripts — so one apply covers red CI and the compare workflow.

## P121.0.39 — Architect dual-compare workflow (Lab vs Legacy automation)

- Adds `scripts/architect-dual-compare.mjs`: same goal through **Lab-shaped** API path (create with proposed passport) and **Legacy-shaped** path (create name+goal, then confirm passport), then poll build, download ZIP, classify via shared P118 helpers, write `report.md` + `report.json` with a **recommendation** (LAB / LEGACY / TIE / …).
- Fixture goal: `scripts/fixtures/architect-dual-expense-goal.txt`.
- GitHub Action `architect-dual-compare` (`workflow_dispatch`): navigator runs one workflow; secrets `STAGING_SERVICE_URL` + `STAGING_APP_PASSWORD`; artifact `architect-dual-compare-report`.
- Dry-run mode (`DUAL_DRY_RUN=true`) for contract checks without staging.
- npm: `architect:dual-compare`, `test:architect-dual-compare`.
- Aligns with product goal: navigator makes the mode-choice decision from the report; routine dual builds are automated.

## P121.0.38 — English UI + Lab contract CI fix (cumulative)

- **CI (commit 89744ae / test:core):** `p119-agent-ui-contract` expected `href="/project"` inside `ArchitectLab.tsx`. After P121.0.36 the link lives in `ArchitectShellHeader.tsx` (More → Legacy Architect). Contract now asserts the shell link and that Lab still documents `/project`.
- **English-only UI (was prepared as 0.37, applied here):** ProjectMode build-status strings; ConversationFiles export labels; decisionDocument headings; Expert display sanitizer; webSearch source footer/prompt markers. Multilingual *input* detection unchanged.
- No Lab engine/chrome changes beyond the contract alignment. Hosted CI after this patch: NOT_RUN until applied.

## P121.0.37 — English-only product UI (Cyrillic chrome removed)

- User-visible Russian remained in working modes, notably Architect/Project **build live status** (`Статус сборки`, stage lines, outcome) and export labels that switched to «Вы / Агент» when conversation text was detected as Russian.
- **ProjectMode:** build progress strings translated to English (status, stages, elapsed, files, outcome).
- **ConversationFiles:** Word/PDF/Drive export labels always English (`You` / `Agent` / `Attached`).
- **decisionDocument:** decision export headings always English (`L.en`); removed auto-switch to `L.ru`.
- **ExpertStepScreens:** display sanitizer replacement text English-only.
- **webSearch:** source footer and prompt markers English-only (`Sources (web search)`, `(according to web search)`). Detection regexes that *understand* Russian user input are unchanged (not UI chrome).
- Crisis/support phrase lists and NLP token tables intentionally keep multilingual user-input matching — not product labels.
- Hosted CI / device: NOT_RUN.

## P121.0.36 — Lab primary chrome parity + js-syntax repair

- **Chrome parity (option A):** `/architect-lab` no longer uses a custom Diagnostics-only toolbar. It mounts the same top pattern as legacy Project Mode: `ModeMenu` (Conversational / Expert / Architect), Drive, and More (User guide, system diagnostics, operations, session log, diagnostic ZIP, legacy workspace link, sign out). Shared component: `src/ArchitectShellHeader.tsx`.
- **js-syntax repair:** After static validators, `appBuilder/core-engine.ts` now repairs failing `.js` files: (1) deterministic fix for the common model typo `toString(36.substr(...))` → `toString(36).substr(...)`; (2) if still failing and budget remains, one bounded coder repair call per script (max 2), accepted only when js-syntax improves and no previously-passing required validator breaks. Addresses live PARTIAL on Expense Tracker (`Invalid or unexpected token` in `app.js`).
- Goal-length clip from 0.35 retained. Long-TЗ agent densification remains OPEN (not this patch).
- Tests: Lab contract + browser E2E updated for shell testids; contract asserts engine repair markers.
- Hosted CI / device: NOT_RUN until applied.

## P121.0.35 — Lab create: honor API goal length (fix "Invalid project data")

- Live device (tablet): Architectural Test Lab showed **Stopped with error / Invalid project data** on Create project brief while Legacy Architect completed the same Expense Tracker goal and produced a downloadable ZIP (OBSERVED screenshots + app-source).
- Root cause: shared `POST /api/projects` validates `goal` with `passportText` (max 2000). Lab sent the full textarea value without clipping; long briefs fail Zod → `projectError` maps to "Invalid project data".
- Lab now clips name (200), goal and passport text fields (2000) before create/build; maps the opaque API error to an actionable message. Create payload shape unchanged otherwise.
- No server schema change, no legacy `/project` change. Hosted CI / device re-try: NOT_RUN until applied.

## P121.0.34 — Lab shell: header and diagnostics reachable in every state

- `ArchitectLab` rendered its toolbar (`Diagnostics ▾`, BiForge, Legacy Architect) only on the authenticated main screen. The three early returns (session check, Project Mode disabled, sign-in) had no header and no diagnostics access.
- Extracted a persistent `LabHeader` rendered in loading, disabled, sign-in, and main states. Diagnostics menu stays visible when signed out or Project Mode is off; choosing an item shows an honest “Sign in to load diagnostics” message instead of a silent failure. Auth is not weakened.
- Narrow-viewport CSS (≤720px) keeps the menu inside the viewport and touch targets usable.
- Extended `tests/p122-architect-lab-e2e.test.mjs`: header/menu asserted on the main flow; new test covers sign-in and disabled states at phone width (390×844) and the sign-in hint path. Existing `architect-lab-completion` path is unchanged.
- data-testid additions: `architect-lab-header`, `architect-lab-diagnostics-panel`, `architect-lab-diagnostics-signin-hint`, `architect-lab-nav-biforge`, `architect-lab-nav-legacy`, `architect-lab-loading`, `architect-lab-disabled`, `architect-lab-disabled-panel`, `architect-lab-signin`, `architect-lab-signin-form`, `architect-lab-main`. Existing testids retained.
- No change to generation engine, validators, passport flow, or `/project`. Hosted CI and device verification: NOT_RUN.

## P121.0.33 — Release abort listeners on the shared build-job signal

- Model adapters (`geminiAdapter.ts`, `openaiCompatAdapter.ts`) and `realClock.sleep` attached an `abort` listener to the caller's signal on every call and never removed it. A staged build shares one job signal across all model calls, so listeners accumulated (production console showed `MaxListenersExceededWarning`, 11 listeners, 2026-10-30 23:14:44).
- Listeners are now removed when the call or sleep ends. A signal that is already aborted now stops the call before any provider request is sent (`PROVIDER_TRANSIENT`, the same class as in-flight cancellation) and ends a sleep immediately.
- Added four regression tests to `tests/models.test.mjs` (run by `test:models`): no listener accumulation on success and on provider error, in-flight cancellation still works, pre-aborted signal sends no request, `realClock.sleep` lifecycle.
- No UI, routing, API, database, or Neon behavior changed. Local `test:models` 150/150; the new tests fail on the previous code (3 of 4; the in-flight test guards unchanged behavior). Hosted CI and live build behavior: NOT_RUN.

## P121.0.32 — Update remaining cycle-governance Architect route assertion

- Updated `tests/p121-cycle-governance.test.mjs`, the remaining core test that still expected the Architect menu to navigate to `/project`.
- The test now verifies that Architect opens `/architect-lab` without a browser confirmation dialog and that `/project` remains a separate legacy route.
- This addresses the sole direct failure reported for commit `d45e05f4332a3d0365b013fca8387174ea4c96cb`; `workflow-dag` was downstream of `test:core`. No application runtime or generated Expense Tracker behavior changed.
- Targeted test, lint, version metadata, and documentation integrity are recorded only after execution; full Core/DAG, hosted Actions, and deployed UI are not claimed.

## P121.0.31 — Align legacy agent-boundary route contract with Architect Lab entry

- Updated the remaining P119 agent-boundary test that still required the Architect menu to navigate to `/project`.
- The contract now verifies `/architect-lab` and `/architect` mount Architectural Test Lab, `/project` remains the separate legacy ProjectMode route, and the standard Architect menu navigates to `/architect-lab`.
- This directly addresses the sole failing core test reported for commit `64aab1dc566936313a8c97cb2e476d3ba989ca3e`; the workflow-DAG failure was downstream of `test:core`.
- No application runtime, routing, generated-app, database, or Neon behavior changed. Local targeted test, full core suite, DAG, hosted CI, and deployed UI status are recorded only after execution; no hosted result is claimed here.

## P121.0.30 — Repair Lab CI contracts and diagnostics readiness check

- Reworded user-facing Lab copy to remove internal terminology while retaining the proposed/confirmed project review flow; `lint:copy` now passes without changing its allowance.
- Updated the legacy P119 route contract to assert that the standard Architect entry opens `/architect-lab` and that `/project` remains available as the fallback workspace.
- Hardened the Lab browser fixture by matching the diagnostics endpoint with optional query strings and waiting for the successful diagnostics response before asserting the loaded report.
- Made Quick Diagnostics preserve stdout/stderr channels while streaming child-process output live; its contract now verifies both streams rather than relying on a single implementation-specific output call.
- Owner evidence for commit `231e7b4034e449af66f95a7da02d5dfcc03467ff` identified these stale contracts and the diagnostics loading race. No generated Expense Tracker runtime, Neon schema, database, or build API behavior changed.
- Local targeted contracts: PASS 13/13; copy lint: PASS; syntax/version/docs checks: PASS. Full Core/DAG and browser E2E: NOT_RUN. Hosted Actions and deployed UI: NOT_RUN.

## P121.0.29 — Wait for Lab diagnostics to finish loading in browser test

- Fix the Lab browser E2E race: after opening Compact session log, wait up to 10 seconds for the textarea value to equal the mocked diagnostic fixture before asserting it.
- The test still verifies the diagnostics request result and then continues through passport confirmation, build completion, and ZIP download.
- No application runtime, routing, API, generated-app behavior, database, or Neon behavior changed. Owner evidence for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows the diagnostics textarea was still at its initial loading value at assertion time.
- Local test syntax and version/docs checks: pending. Hosted Actions, browser E2E after applying this patch, and deployed UI: NOT_RUN.

## P121.0.28 — Reapply live Quick Diagnostics streaming workflow

- Reapply the verified Quick Diagnostics workflow and its matching contract test together, because the owner-reported commit still contains the older redirected-output command (`> log 2>&1`) rather than a `tee` pipeline.
- Dependency installation and both Chromium installation paths stream combined output through `tee` with `set -o pipefail`, preserving live Actions logs and the real command exit status.
- No application runtime, Architect routing, Lab UI, API, database, Neon, or generated-app behavior changed. Owner evidence for commit `db1f2800463d92c12535b3aa08d4e8de422ea486` shows typecheck and Lab contract passing; browser/UI was disabled; the sole failure was the dependency tee contract.
- Local targeted checks: pending. Hosted Actions after applying this patch: NOT_RUN.

## P121.0.26 — Make Quick Diagnostics live install logging explicit

- Reworked dependency and both Chromium installation steps into explicit multiline Bash blocks that stream combined stdout/stderr through `tee` while preserving the installer exit status with `pipefail`.
- Strengthened the workflow contract test to inspect the dependency step and each browser-install step independently, requiring live `tee` streaming rather than merely checking that log paths exist.
- No product runtime, API, database, Neon, or Architectural Test Lab behavior changed. Owner evidence for commit `d8f74020a215fb5b8015b3185b142842e519dc0d` showed typecheck, Lab contract, browser installation, and Lab browser/UI passing; only the Quick Diagnostics workflow contract failed.
- Local workflow contract and dependency-free metadata/docs checks: pending. Hosted Actions after applying this patch: NOT_RUN.

## P121.0.25 — Add explicit Architectural Test Lab passport confirmation

- Changed the Lab entry flow to create a proposed project passport from the submitted project name and goal, then present its scope, users, inputs/outputs, constraints, security guidance, and success criteria for review.
- Generation is now gated behind an explicit user action that persists the passport with `status: confirmed` using the project's expected state version before calling `/code/build`.
- Updated Lab browser E2E to assert that the confirmed passport is saved before the build endpoint is called, then verify completion and download. Added a focused source-contract regression check.
- No legacy Architect UI, Neon schema, migration, or production data changes.
- Local dependency-backed browser E2E, hosted Actions, and deployed user outcome after this patch: NOT_RUN.

## P121.0.24 — Align Lab download assertion and harden diagnostics contract

- Corrected the Architectural Test Lab browser test to expect the filename the UI actually assigns to downloaded Blob results: `architectural-lab-result.zip`.
- Made the Quick Diagnostics workflow contract verify the `npm ci`/Playwright commands, their dedicated log paths, and `tee` streaming independently, avoiding a brittle single-line command-shape assertion.
- No product runtime, API, database, or Neon migration behavior changed. Owner evidence for commit `85583fc938ad507dffbe7544a886133fa7de8bc9` showed CI green, the workflow contract test failing on its text matcher, and the browser test failing only at the expected download filename assertion.
- Local checks and hosted Actions after this patch: NOT_RUN until the patch is applied and the workflow is rerun.

## P121.0.23 — Restore CI and Lab browser checks

- Added the approved `neon-initialize.yml` workflow to the exact Core workflow inventory, resolving the evidenced `test:core` deep-equality failure.
- Updated the staged-build regression expectation to the actual user-facing terminal note produced by `stagedArchitectNote`, resolving the evidenced `test:project` assertion mismatch without changing product behavior.
- Hardened the Architectural Test Lab browser fixture by explicitly disabling legacy Project Mode and clearing inherited `DATABASE_URL`; strengthened its contract test. The browser fixture continues to mock its project/session/build APIs and does not connect to Neon.
- The supplied CI evidence is from commit `896046f2552458bde0da3d693c02290cf831adb1`. Local dependency-backed Core, Project, and browser runs plus hosted Actions after this patch: NOT_RUN.

## P121.0.22 — Guarded Neon schema initialization

- Added a manual GitHub Actions workflow to run the repository's existing 19 SQL migrations against `DATABASE_URL`, after explicit backup-branch and production-target confirmations.
- Added a read-only preflight that refuses an untracked, non-empty `public` schema; added post-migration verification of the migration ledger and required BiForge tables.
- No SQL schema was hand-written, no data deletion/reset is performed, and no live Neon migration was run while preparing this patch.
- Local workflow-contract tests and static checks only; hosted Actions and Neon mutation remain NOT_RUN until the owner dispatches the workflow.

# P121.0.21 — Legacy Architect staged-result render guard (2026-10-30)

- Fixed the `/project` React crash when staged App Builder responses omit the legacy `codeTask` object. The result state now treats that legacy-only field as optional, and all render-time reads are guarded.
- Removed synthetic `codeTask` placeholders from the three build-result paths; staged result fields (`status`, `note`, `downloadUrl`, `jobId`) remain the source of truth.
- Added a regression test covering a completed staged build response with no `codeTask`.
- Neon migration/data state was not changed: no live database connection or migration evidence was available, and no Neon-specific failure was established.

## P121.0.20 — Restore live workflow logs and isolate Lab browser server

- Restored live child-process output in the verification DAG for both serial and parallel checks; parallel lines are prefixed with the check ID while full logs continue to be written to per-check files.
- Quick Diagnostics now streams dependency installation, Chromium installation, typecheck, Lab contract, and browser/UI test output directly into the GitHub Actions console while retaining the single compact `ERROR_SUMMARY.txt` artifact.
- The isolated Lab browser test no longer enables legacy Project Mode during server startup; its project/session/build API calls are intercepted by the browser fixture, so the test does not require a database URL or start the legacy project worker.
- Added regression assertions for live output and isolated server configuration. Legacy Architect runtime and the three core user-facing modes are unchanged.
- Local syntax/contract checks: pending; full dependency-backed tests and hosted Actions: NOT_RUN.

## P121.0.19 — Consolidate Quick Diagnostics into one error report

- Replaced separate CI/UI summaries and uploaded per-check logs with one `ERROR_SUMMARY.txt`, containing bounded sections for dependency installation, typecheck, Architectural Test Lab contract, browser/UI, and overall status.
- Detailed command output remains only in the ephemeral Actions runner directory; the downloadable artifact contains exactly one compact text file.
- Dependency and Chromium installation failures are recorded; dependent checks are marked BLOCKED, and report generation/upload run after failures.
- Added a focused workflow contract test for the single-file artifact and required report sections; the Lab browser smoke test now captures page errors, console errors, and failed requests so UI failures enter the same report.
- Legacy Architect runtime and generation behavior unchanged. Hosted workflow execution and actual artifact size/duration: NOT_RUN.

## P121.0.18 — Fix focused CI and Architectural Test Lab browser diagnostics

- Kept emergency resource-error handling type-safe by narrowing `event.target` to `Element` and reading only supported image, script, and link resource URLs; this removes the invalid `HTMLElement` versus `window` comparison reported by TypeScript.
- Changed the Lab browser smoke server launcher to use the current Node executable with `--import tsx`, avoiding reliance on `node_modules/.bin` being present in the child process PATH.
- Added the manually triggered `quick-diagnostics.yml` workflow to the explicit workflow inventory allowlist so the Core boundary test accepts this approved diagnostic workflow.
- Scope: diagnostics, Lab browser-test harness, and workflow inventory only; legacy Architect runtime and generation behavior unchanged.
- Verification: source syntax, workflow YAML, version metadata, and docs integrity PASS; dependency-backed typecheck/Core/browser tests BLOCKED because local `npm ci` timed out; hosted Actions and Android live UI: NOT_RUN.

## P121.0.17 — On-demand quick diagnostics workflow

- Added a manually triggered GitHub Actions workflow that skips the full verification DAG and runs focused typecheck, Architectural Test Lab contract tests, and an optional isolated Lab browser smoke test.
- Uploads small `CI_ERROR_SUMMARY.txt` and `UI_ERROR_SUMMARY.txt` files plus bounded per-check logs as a single short-lived artifact, including failures rather than stopping at the first failed check.
- Browser smoke can be disabled at dispatch when only fast static diagnostics are needed; Chromium is cached between runs.
- Hosted execution and elapsed time: NOT_RUN; expected duration depends on dependency/browser cache state.

## P121.0.16 — Prioritize Architectural Test Lab development

- Recorded the owner-approved strategy: focus new development on the separate `/architect-lab` experimental fourth mode; pause routine legacy Architect repairs and use legacy defects as diagnostic/regression input.
- Clarified the boundary between the three core agents and the separate experimental mode, and documented that the Lab currently has an isolated frontend but still shares backend project/build orchestration.
- Defined the target for independent Lab instructions, workflow/state machine, generation engine, progress, timeout/cancellation, recovery, and completion behavior. Legacy promotion or retirement requires a separate owner decision and user-outcome evidence.
- Documentation/governance only; no runtime behavior changed. Local documentation/version checks: pending. Hosted CI and live Android behavior: NOT_RUN.

## P121.0.14 — Critical-screen emergency recovery

- Install global browser error and unhandled-rejection capture before React mounts.
- Wrap the application root in an ErrorBoundary; record React component stack and render a visible recovery screen with a downloadable plain-text emergency log.
- On uncaught window/resource errors or unhandled promise rejections, replace the app root with a DOM-only emergency screen so a React render failure cannot leave a blank interface.
- Persist a bounded, redacted-by-design event list in localStorage; report URL path, browser, viewport, timestamps, messages, source locations, and component stacks. No request bodies, prompts, source files, cookies, or credentials are collected.
- Checks: source-level regression test added; typecheck, production build, hosted CI, and Android runtime: NOT_RUN in this workspace.

## P121.0.13 — Browser black-screen evidence capture

- Added bounded client-side error/rejection, visibility, mount, DOM-root geometry and post-mount snapshots; events are sent to the authenticated diagnostics endpoint without page content, prompts, request bodies or credentials.
- Expanded the paste-ready session log with recent browser events and HTTP request metadata so a blank-screen state can be correlated with the completed build.
- Verification in this reconstructed workspace: source inspection only; typecheck, build, tests, hosted CI and Android live black-screen capture NOT_RUN.

## P121.0.12 — Paste-ready compact session diagnostics

- Added an authenticated plain-text endpoint and Diagnostics menu action that produces one bounded report for the latest operation, with runtime/check status, correlated operation timeline, matching application errors, provenance and explicit evidence limits.
- Added an in-dialog copy button and read-only text area for mobile browsers; no ZIP or file attachment is required.
- Report excludes prompts, generated source, request/response bodies, credentials and cookies; HTTP completion is not represented as proof of browser download completion.
- Verification: source-level regression added; runtime/build and hosted CI status pending.

## P121.0.11 — Restore docs-integrity marker in AGENTS.md

- Restored required heading text `Mandatory protocol for the beginning of every session` (docs-integrity / p121-cycle-governance) while keeping §0 hard gates.
- Local: `docs:integrity PASS`; p121-cycle-governance + p121-navigator-protocol PASS. Hosted CI NOT_RUN here.

## P121.0.10 — AGENTS.md hard gates (fail closed)

- Rewrote `AGENTS.md`: §0 hard gates G1–G5 first (ZIP purity, Navigator tablet/GitHub-only, automate-first, UI/e2e same delivery, evidence honesty); invalid excuses listed; audience labels FOR_NAVIGATOR / FOR_ASSISTANT / FOR_CI; delivery checklist; preserved obligations, SoT map, session protocol, minimalism, security.
- Updated `tests/p121-navigator-protocol.test.mjs` to assert the new gate structure.
- Verification: governance test is source-level; full suite / hosted CI NOT_RUN in authoring workspace.

## P121.0.9 — Fix Architect e2e unmount and lint:copy UserGuide

- Keep guided wizard mounted after create/build (`showGuidedStart` no longer clears on `onFinished`; selection no longer hides the done step). Restores `novice-done` visibility for P120 Architect browser e2e.
- Shorten UserGuide §6.2 copy to satisfy `lint:copy` 24-word visible-string limit (root cause of DAG `lint:copy` FAIL).
- Soften done-step helper text in ProjectNoviceWizard.
- Verification in authoring workspace: `node scripts/lint-copy.mjs` PASS. Full e2e / hosted CI NOT_RUN here.

## P121.0.8 — Navigator channel rules (tablet GitHub web), clean patch ZIP, automate-first

- Strengthened `AGENTS.md` §7: three categorical rules — (1) patch ZIP contains only new/changed repository paths, no PATCH_SUMMARY/README/helpers; (2) Navigator instructions assume Android tablet + GitHub web/Actions only, never local terminal; (3) assistants must add tests and/or GitHub workflows when checks can be automated.
- Recorded `D-2026-10-30-07` in `docs/DECISIONS.md`; Navigator verification channel in `docs/TESTING_AND_ACCEPTANCE.md`.
- Added `tests/p121-navigator-protocol.test.mjs` and wired it into `test:core`.
- Includes prior P121.0.7 one-Architect client unification files when applied as a combined delivery.
- Verification: governance test is source-level; full suite / hosted CI NOT_RUN in authoring workspace.

## P121.0.7 — One Architect flow (remove novice/professional path choice)

- Removed the user-visible dual entry for Architect: no more mandatory “Simple words” vs “Professional” path chooser.
- Guided start (former novice wizard) is the default single entry when no project is selected; full analysis/plan/delivery tools remain available after a project is selected or created.
- Updated ProjectMode, ProjectNoviceWizard labels, UserGuide, capabilities note, and P120 Architect browser e2e to match the one-flow contract (BIO-004 / D-2026-10-30-02).
- ProjectPathChooser.tsx remains in the tree but is unused by the primary flow; can be retired in a later minimalism pass.
- Verification: source inspection confirms no path chooser in ProjectMode; e2e no longer clicks path-novice. Full typecheck/build/test suite, hosted CI, and live generation remain NOT_RUN in this reconstructed workspace.

## P121.0.6 — Clarify history preservation vs. test retirement

- Clarified that repository minimalism removes obsolete active test implementations, fixtures, temporary experiment payloads, and one-off tools—not useful historical records.
- Required preservation of completed roadmap history, changelog entries, factual reports, decisions, and concise records of test/experiment outcomes.
- Distinguished concise historical evidence from old test code and raw test inputs/outputs; archive raw payloads only for concrete reproducibility or audit needs.
- Documentation/governance only; no tests or historical records were removed. Prepared against a reconstructed local tree, not the current remote checkout.
- Verification: see the current evidence note in `TECHNICAL_REPORT.md`; hosted CI and remote checkout validation are NOT_RUN.

## P121.0.5 — Repository minimalism and test lifecycle policy

- Defined a current-purpose requirement for maintained repository files and a test-retention rule tied to current product obligations, meaningful scenarios, contracts, and material regression risk.
- Added a recurring review process to classify candidates as keep, update, merge, archive outside the repository, or delete after checking references, CI usage, compatibility commitments, and unique coverage.
- Clarified that historical origin alone is not a reason to retain artifacts, while required audit evidence and meaningful regression coverage must not be discarded.
- Documentation/governance only; no runtime code or existing tests were removed. This patch was prepared against an available reconstructed archive, not the current remote checkout.
- Verification: pending local documentation and version checks; hosted CI and remote checkout validation are NOT_RUN.

## P121.0.4 — Repository language policy and recurring language-neutrality audit

- Added a normative English-only policy for maintained repository artifacts while explicitly separating repository language from end-user language support.
- Added requirements against brittle language-specific marker-word routing and defined a recurring roadmap stage for classifying, correcting, and verifying language residue.
- No runtime source behavior was changed in this documentation-only patch. Previously identified Cyrillic in runtime logic and tests remains to be audited against the actual repository; this reconstructed workspace is not the current remote checkout.
- Verification: pending local documentation integrity and version checks; hosted CI and runtime language-neutrality tests are NOT_RUN.

## P121.0.3 — CI regression repair and single-source version metadata

- Fix C121 regression test that hardcoded P121.0.1 after patch P121.0.2.
- Introduce `version:check` / `version:sync`: `package.json` is authoritative; only npm lockfile root version metadata is synchronized. Historical version records are not rewritten.
- Governance tests derive the current patch from package metadata instead of hardcoding a prior patch.

# C121 / P121.0.2 — Remove Architect launch confirmation

- Removed the browser-native “Open Architect?” confirmation when the user selects Architect. Selection now records the start mode and navigates directly to `/project`.
- Added regression coverage for direct Architect launch and updated current patch assertions. Confirmations for destructive actions are unchanged.
- Version/patch: 121 / 121.0.2.

---

# C121 / P121.0.1 — Verification cycle bootstrap and documentation integrity repair

- Introduced cycle-based identity: cycle C121, product version 121, patch P121.0.1. Synchronized `package.json` and root `package-lock.json` version metadata.
- Removed the retired `NEXT_PATCH.md` handoff and 14 superseded prose documents whose current responsibilities were consolidated into canonical documentation. Historical references in retained history remain historical.
- Changed the P120 E2E preflight from a hard-coded current-version gate into a regression-suite preflight that validates the current version/patch relationship. Updated the P120 evidence regression test to preserve the historical P120.0.7 record while asserting current C121 metadata.
- Verification: `npm run docs:check` PASS; version check PASS; P120 regression preflight PASS; focused C121/P120 acceptance tests 8/8 PASS; DAG/evidence tests 27/27 PASS. `npm ci --ignore-scripts --no-audit --no-fund` timed out, so the full DAG remains FAIL (4 PASS, 14 FAIL, 6 BLOCKED) due missing `tsx`/`jszip`; typecheck, build, browser E2E, hosted CI, deployed app, and live model/artifact quality are NOT_RUN. The Architect one-flow obligation remains open.
- No runtime product behavior change is claimed. The Architect one-flow obligation remains an open implementation gap, not a passed acceptance item.

---

# Session governance and documentation consolidation — 2026-10-30

- Added a mandatory session-start protocol and top-level obligation map to `AGENTS.md`. Each session must reconstruct and verify the actual state before selecting its own task; assistants must not inherit a pre-written next-step assignment as binding.
- Removed the persistent root `NEXT_PATCH.md` planning/handoff concept. CI-generated run reports are named `PATCH_EVIDENCE.md` and `BIForge-PATCH-EVIDENCE.md`, and workflow scripts/tests are aligned with those names.
- Updated current roadmap controls and root navigation while preserving completed roadmap phases and prior report/changelog history.
- This patch changes governance/documentation and CI diagnostic naming only. It does not implement the Architect single-flow runtime requirement or claim live user-value acceptance.
- Verification in the reconstructed tree: `npm run docs:check` PASS; modified `.mjs` files pass `node --check`; `node --test tests/dag-p107.test.mjs tests/evidence-p105.test.mjs` PASS 27/27; a temporary-directory packaging smoke check produced exactly `BIForge-PATCH-EVIDENCE.md` and `biforge-ci-logs.zip`. `tests/ci-diagnostics-chain.test.mjs` and `tests/compact-ci-artifacts-p94.test.mjs` could not run because `jszip` is not installed in this reconstructed tree. Full DAG, full suite, hosted CI, browser tests, deployment and live user scenarios: NOT_RUN.

---

# Documentation reconciliation — 2026-10-30

- Consolidated normative authority into `AGENTS.md`, `TECHNICAL_SPECIFICATION.md`, `ROADMAP.md`, and `TECHNICAL_REPORT.md`; added eight specialist docs and kept `docs/VIX-CONCEPT.md` as strategy-only context.
- Explicitly set product acceptance to real user outcomes rather than test/CI completion, and defined Architect as one user-facing agent, one flow, and one completion contract with no novice/professional mode choice.
- Preserved all existing roadmap phases and historical report/changelog entries; added current notes at the top rather than rewriting prior history.
- Replaced the documentation-integrity guard's old document topology with the new canonical set and updated operational-script references.
- Superseded prose documents are listed for deletion in the patch handoff. Machine schemas and generated inventories remain.
- Verification status: pending execution in the reconstructed archive; this entry does not claim product/runtime changes.

---

## P119.0.4 — Agent-owned prompt text, agent-named chat routes, dead legacy import removed

- Navigator decisions (2026-10-29): add agent-named routes and keep the old one; legacy `engine=legacy` host usage unknown, so only the dead import is removed.
- Prompt text: intro paragraphs, `expertDialogueParagraph`, `EXPERT_STAGES` and `EXPERT_STEP_PREFIX` moved from `server/promptPacks.ts` into `server/conversationalAgent.ts` / `server/expertAgent.ts`. `promptPacks.ts` keeps the shared method/boundary/contract blocks plus `assembleConversationPrompt`; `buildSimpleConversationPrompt` and `ProductMode` removed. Model-facing bytes unchanged: SHA-256 of 8 prompts (2 agents × 4 modes), the Expert paragraph and the step prefix were captured from the P119.0.3 implementation before the move and now locked in tests.
- Routes: new `POST /api/agent/conversational` and `POST /api/agent/expert` pin the agent (`pinConversationAgent`; the route overrides `body.productMode`). `POST /api/conversation` stays and still selects by `productMode`. One shared handler (`conversationHandler`). The client (`src/conversationRoutes.ts`, `ConversationScreens.tsx`, `App.tsx`) calls the named routes.
- `server.ts` no longer imports `runAppBuilderPipeline` / `irFromPlainAnswers` (the import was unused). The gated `engine=legacy` branch in `server/projectRoutes.ts` is unchanged.
- Tests: new `tests/p119-agent-prompts-routes.test.mjs` (in `test:core` and `test:p119-agents`); HTTP checks R1–R10 added to `tests/pipeline.test.mjs`; new helper `tests/_prompts.mjs`; `KNOWN_SHARED_PATH` tests in `tests/p119-agent-boundaries.test.mjs` updated; `core`, `conversation-turn`, `pipeline` and `p119-agent-isolation` tests now import from the agent modules.
- Generated inventories regenerated (`docs/generated-route-inventory.json`, `-module-map`, `-check-graph`, `-capability-graph`); `tests/feature-manifest.json` lists the new routes.
- Docs: `TECHNICAL_SPECIFICATION.md` §6.4 (status, route table, REQ-AGENT-001/003/004), `ROADMAP.md` Phase 6 table, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`.
- Version/patch: `119` / `119.0.4`.

## P119.0.3 — Conversational/Expert isolation (first bounded step), legacy names removed from user copy

- Added `server/agentRouting.ts`, `server/conversationalAgent.ts`, `server/expertAgent.ts`: agent selection, turn planning and prompt entry are agent-owned; `server.ts` handler delegates. Output byte-identical to the pre-split logic (verified against a reference copy). Route `POST /api/conversation`, wire key `productMode`, internal `AppMode` keys and `promptPacks.ts` text intentionally unchanged.
- User-visible copy: `UserGuide.tsx` and the Architect confirmation dialog use only Conversational / Expert / Architect.
- Tests: new `tests/p119-agent-isolation.test.mjs`; `tests/p119-agent-boundaries.test.mjs` updated; both in `test:core`; new script `test:p119-agents` includes them.
- Docs: ROADMAP Phase 6 table updated, Phase 7 gets the P120 slice plan, gates and sequence carried over from `docs/p119-p121.md`; TECHNICAL_SPECIFICATION §6.4 updated (REQ-AGENT-004); `docs/p119-p121.md` got a pointer note.
- `package.json`: `typecheck`, `lint`, `build:server` run tsc with `--stack-size=4000` — `tsc` failed intermittently with `RangeError: Maximum call stack size exceeded` (also on the unmodified P119.0.2 tree); 6/6 local runs clean afterwards; guarded by a test.
- Version/patch: `119` / `119.0.3`.

## P119.0.2 — Agent boundaries: inventory, contracts, regression tests

- Inventoried routes, internal modes, workflows and shared orchestration. Result recorded once in `TECHNICAL_SPECIFICATION.md` §6.4 (boundary map, REQ-AGENT-001..003): Conversational and Expert share `POST /api/conversation` and one prompt builder selected by `productMode`; Architect is isolated (`/project`, `/api/projects/*`, `appBuilder/`, own client modules).
- Added `tests/p119-agent-boundaries.test.mjs` (21 tests) to `test:core`; new script `test:p119-agents`. Covers route ownership, client/route/import isolation, explicit agent selection (Expert only on `productMode === 'Expert'`), Architect gating, workflow inventory (no `p119-*` workflow yet), and `KNOWN_SHARED_PATH` locks for the documented shared paths.
- `tests/p119-agent-ui-contract.test.mjs`: patch assertion relaxed to `119.*`.
- `ROADMAP.md` Phase 6: P119 slice plan reconciled (0.2 boundaries, 0.3 legacy isolation; 0.4–0.7 proposed). `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-USER-VALUE-REPORT.md`, `TECHNICAL_REPORT.md` §7.3 synchronized.
- No runtime behaviour change. Version/patch: `119` / `119.0.2`.

## P119.0.1 — Three-agent entry UI and P118 status reconciliation

- Start screen and agent menu now expose Conversational, Expert, and Architect instead of the legacy-facing Simple / Project names.
- Preserved internal mode keys during this first migration slice to avoid changing accepted conversation and Architect flows before dedicated replacement pipelines are covered.
- Corrected stale P118 status in the current task, rolling user-outcome report, renovation roadmap, and protected roadmap: P118 was accepted by Navigator on 2026-10-29 after CI 27/27 and the supplied live staged ZIP evidence.
- Explicitly retain optional P118 residuals (PARTIAL download policy and dependency audit) as open, not completed.
- Version/patch: `119` / `119.0.1`. Local runtime verification is pending in this environment.

## P118.5.6 — Bounded dom-wiring repair after check failure

- **Engine:** after static validators run, if `dom-wiring` fails and budget remains, one repair call per broken script (max 2). Prompt lists the real HTML `id`s and the exact mismatch messages. Result accepted only when (1) no previously-passing required validator starts failing and (2) `dom-wiring` issue count strictly decreases. Events: `dom_wiring_repair`, `dom_wiring_repair_accepted`, `dom_wiring_repair_rejected`.
- **Tests:** `tests/app-builder-dom-wiring-p118-5-6.test.mjs` (validator unit + repair accept/reject/budget/no-op); registered in `test:app-builder`.
- **Version:** patch `118.5.6`.
- Live on 118.5.5 was honest PARTIAL (`validators_failed: dom-wiring`) — this patch closes the gap so a single model slip can recover to SUCCESS without a full rebuild.

## P118.5.5 — Dom-wiring validator + architecture boundaries + DAG

- **False SUCCESS fix (core):** new required static validator `dom-wiring` — every `getElementById` / `querySelector('#id')` literal in JS must exist as an `id` in some HTML file. Catches the live P118 mismatch (kebab-case JS vs camelCase HTML). Added to `REQUIRED_VALIDATORS` (7th) and `runStaticValidators`.
- **Architecture boundaries:** `stagedArchitectNote` moved to client-safe `src/architectNote.ts`; `src/projectBuildJob.ts` no longer imports from `appBuilder/`. Explicit `allowedExceptions` entry for intentional `src/config.ts → package.json` (single version source). `architecture:check` now PASS.
- **CI-DAG:** `architecture:check` added to `docs/verification-manifest.json` (profiles `check` + `ci`); 26 → 27 checks.
- **Version:** patch `118.5.5`.
- **Still open (follow-up):** bounded repair after `dom-wiring` failure in the engine, full test suite for the new validator, zod/body-parser/qs audit clean, docs regeneration, live re-run after deploy. Do not start P119 until CI green + working live artifact.

## P118.5.4 — Live script staged default + audit alignment

- `scripts/p118-architect-live.mjs`: stop sending `engine: 'pipeline'` (mapped to legacy and returned `LEGACY_DISABLED` on live commit `bd0e95d`). Build requests now use the staged default so exit evidence measures the Archive Delivery Canon path.
- Documentation: refreshed `docs/AI-NATIVE-RENOVATION-TASK.md` to match applied 5.1–5.3 and this fix; audit report `docs/AUDIT-2026-10-29.md`; DOCUMENTATION-INDEX entry; ARCHIVE-DELIVERY-CANON numbering aligned with shipped patches.
- Live transcript evidence (OBSERVED): build_request HTTP 409 `LEGACY_DISABLED` when script still forced pipeline — fixed in this patch (code path only; re-run live after deploy).
- CI on `bd0e95d` was PASS (26/26) after P118.5.3 adapter test fix; this patch does not change unit-test expectations beyond live client.

# P118.5.3 — CI: align stagedEnabled adapter test with P118.5.1 default

- `tests/app-builder-adapter-p93-3.test.mjs` expected `stagedEnabled({}) === false`; staged is default-on since P118.5.1. Test updated (applied on green CI `bd0e95d`).

## P118.5.2 — Archive delivery E2E proof

- Added `tests/archive-delivery-e2e-p118-5-2.test.mjs`: fake-model multi-file static_site build → JSZip open → required paths (`index.html`, `style.css`, `app.js`, `README.md`) + `build-report.json`.
- Delivery contract checks via `publicJob` + `classifyBuild` / `zipVerified` from `scripts/p118-architect-live-lib.mjs`.
- SUCCESS without `downloadUrl` or without a verified ZIP classifies as **FALSE_SUCCESS**.
- `package.json` patch field `118.5.2`; script `test:archive-delivery` runs archive-delivery unit + E2E tests.
- Live architect workflow already enforces ZIP verification; no live-script change required in this patch.
- P118 exit still requires Navigator review of evidence (offline tests + preferred live run).

## P118.5.1 — Archive Delivery Canon (implementation)

- Staged App Builder is the **default** A3 path (`stagedEnabled` true unless `APP_BUILDER_ENGINE=legacy|off|pipeline`).
- `POST /code/build` without `engine` → staged (202 + jobId). Missing DB/adapters → `STAGED_UNAVAILABLE` (not silent legacy).
- Legacy IR pipeline only with `engine=legacy` (or alias `pipeline`) **and** `ALLOW_LEGACY_APP_BUILDER=true`.
- Staged SUCCESS without a stored artifact is forced to failed (`archive_missing` / `artifact_save_failed`).
- `publicJob.downloadUrl` only when `artifactId` is set (artifact download route only).
- UI ProjectMode no longer sends `engine: 'pipeline'` on program build.
- Tests: `tests/archive-delivery-p118-5-1.test.mjs`.
- E2E download proof follows in P118.5.2.

## P118.4 — Documentation Order (DOC-ORDER-1)

- Introduced three protected primary documents at repository root:
  - `TECHNICAL_SPECIFICATION.md` — complete engineering specification (architecture, data model, API, three agents, REQ-IDs, acceptance).
  - `ROADMAP.md` — sequential implementation plan from empty repository through P118 and forward phases P119–P121.
  - `TECHNICAL_REPORT.md` — historical reconstruction and evidence record with confidence levels.
- Updated `AGENTS.md`: new laws **D1–D4** (protection against semantic reduction and fragmentation), status, reversal table, reporting requirements.
- Updated `docs/DOCUMENTATION-INDEX.md`: protected documents listed first; binding rules restated.
- Added `scripts/docs-integrity.mjs` — machine guard for existence, required sections and REQ-ID baseline.
- No runtime behaviour change. Version stays 118; patch field becomes `118.4`.

**Verification:** `node scripts/docs-integrity.mjs` must report PASS.  
**Not evaluated:** any product live run (this is a pure documentation + guard patch).

## P118.3.3 — Code-stage file marker repair (live run on 9ff44ac)

- Live evidence (OBSERVED, commit `9ff44ac`): spec and plan passed; unit `index.html` failed with `missing_expected_file_or_truncated`. The model returned a complete file (`finishReason=STOP`, 3703 chars) under the header `<<<FILE path>>>index.html`: it copied the placeholder `path` from the prompt. The parser read `path` as the file name. Reproduced locally with the same output shape.
- Prompt (`appBuilder/core-prompts.ts`): the coder prompt now names the real header `<<<FILE index.html>>>`; no copyable placeholder. `PROMPT_VERSION` → `static_site.v2` (invalidates cached unit results).
- Parser (`appBuilder/core-markers.ts`): with an expected path it deterministically accepts three known slips and reports them in `coerced`: placeholder header, decorated header (`path=index.html`), code fence around the content. A different file name is never accepted.
- Engine (`appBuilder/core-engine.ts`): one bounded repair call per file when the expected file is missing or the reply is cut off (counts against the call budget; skipped when the budget is used or the job is cancelled). New events `unit_attempt` (found paths, issues, `finishReason`, text preview, coerced) and `unit_repair`. Failure reason is now specific: `expected_path_not_found:index.html (found: …)`.
- Adapter (`server/appBuilderAdapter.ts`): `unitId` carried in event data is no longer dropped from application-log details.
- Tests: `tests/app-builder-unit-repair-p118.test.mjs` (7 tests, mutation-checked); `test:app-builder` script updated; cache-key test no longer uses the now-current prompt version as the "other" one.
- Not evaluated: hosted CI, a live run, later units/validators (`styles.css`, `storage.js`, `app.js`, `refs`, `acceptance`) and ZIP packing/verification — the live run has never reached them.

## P118.3.2 — Single version source (package.json) and documentation audit

- Version: `package.json` is the only source. New field `"patch"` (last applied patch, e.g. `118.3.2`); `"version"` must equal its first number. `src/config.ts` derives `APP_VERSION`/`APP_PATCH` from `package.json` (the browser bundle receives only these two fields via a Vite plugin); diagnostics `release` = `patch`.
- `scripts/check-version.mjs` validates `package.json` only; it no longer reads `src/config.ts`, `server.ts` or `CHANGELOG.md`. Tests in `tests/core.test.mjs` rewritten accordingly.
- `scripts/patch-tools.mjs` `versionPreflight` (called by `patch-pack`): `package.json` must be in every patch; patch number must match `--patch`, must be higher than the base patch and not below the program version.
- `tsconfig.json`, `tsconfig.server.json`: `resolveJsonModule`. `scripts/patch-quality-report.mjs`: version context from `package.json`.
- Documentation audit: `AGENTS.md` (new "Version and patch numbering", status, evidence rule, navigation), `docs/AI-OPERATING-RULES.md`, `docs/DOCUMENTATION-INDEX.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md` (P118 exit gate), `docs/AI-USER-VALUE-REPORT.md` (new records, title fixed), `docs/AI-ENVIRONMENT-CONTEXT.md`, `docs/OPERATIONS.md`, `NEXT_PATCH.md`.
- Verification (local): `tsc` client+server, `build`, `test:core`, `test:app-builder`, `test:compact-ci-artifacts`, full `ci` DAG. Hosted CI and live workflow NOT_RUN.
- Known limitation: sub-patches share one program version; `/health` reports `version` and `commit` only (patch is in diagnostics `release`).

## P118.3.1 — CI repair for P118.3

- CI run on 1a98a6a was red (4 DAG nodes): `version-consistency`, `typecheck`, `build`, `test:compact-ci-artifacts`.
- Root causes: (1) P118.3 bumped APP_VERSION/package.json to 119 while the release label is P118.3 — `check-version` requires the CHANGELOG major to equal APP_VERSION; version restored to 118. (2) `appBuilder/core-engine.ts`: with `strict:false` TypeScript does not narrow `{ok:true}|{ok:false}` by `!x.ok`; failure fields are now read through `'error' in x` / `'issues' in x`. (3) `test:compact-ci-artifacts` (P105 end-to-end) failed only because it runs `version-consistency`; fixed by (1).
- No behavior change in the Spec repair logic.

## P118.3 — Spec bounded repair + assistant diagnostics

- Live #3: planner returned parseable JSON that failed Spec validation; recovery did not run (only on unparseable).
- Spec stage: explicit `schemaVersion:1`, `parseJsonLenient`, `validateSpec` with issue list, one recovery call that includes previous issues, concrete `failureReason` / `error.detail`.
- Diagnostics: `spec_attempt`/`spec_repair`/`spec_failed` events with text previews; adapter logs model `responsePreview` and forwards event data into application logs.
- Tests: `tests/app-builder-spec-repair-p118.test.mjs`.
- APP_VERSION stays 118 (version = phase number; sub-patches P118.x do not bump it).


## P121.0.15 — Architectural Test Lab isolated entry

- Added a separately lazy-loaded `/architect-lab` experimental workspace with its own responsive presentation, form, progress surface, completion panel, and error boundary.
- The lab creates a separately named project and uses the authenticated project-build API and shared staged-job polling; it does not mount `ProjectMode.tsx` or the legacy result UI.
- This is an isolated UI/workflow experiment, **not yet an independent backend generation engine**. Provider orchestration, validation, and artifact persistence remain shared with the existing backend.
- Added route/mount/completion contract tests. Existing three-agent entry points remain unchanged; the lab is available only by direct route.
- Local source-contract tests and ZIP validation are reported in the delivery note; typecheck/build and live Android tests remain separate evidence.
