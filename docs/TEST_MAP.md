# TEST_MAP — where to put new checks

**Rule:** extend an existing category suite. Do **not** create `tests/pNNN-*.test.mjs` or `test:pNNN-*` npm scripts.

| Category file | Product zone | When to edit |
|---------------|--------------|--------------|
| `agents-contract.test.mjs` | ModeMenu, App/Project chrome, routes, labels, All Logs menu wiring | UI agent switch, More menu, rename modes |
| `conversation-simple-direct.test.mjs` | Simple Direct prompt/handler | Simple conversation path |
| `search-retrieval.test.mjs` + `search-decoupling.test.mjs` | Search, planner, Simple vs search | Retrieval / follow-up |
| `providers-models.test.mjs` | Model router, cascades, budgets | Provider/router behaviour |
| `providers-router-policy.test.mjs` | Call-limit / policy stop | Router policy edge cases |
| `providers-fallback.test.mjs` | Gemini → Groq/Cloudflare fallback | Provider outage path |
| `project-mode-contract.test.mjs` + `project-builder-recovery.test.mjs` | Project Mode / appBuilder | Project workspace & recovery |
| `diagnostics-ops.test.mjs` | All Logs, health commit, diagnostics API | Logging / ops handoff |
| `security-redact.test.mjs` / `security-headers.test.mjs` | Secrets & headers | Security |
| `governance-repo.test.mjs` | Version, TEST_MAP, AGENTS, script layout | Repo process |
| `governance-workflow-pins.test.mjs` | GitHub Actions SHA pins | Workflow pin changes |
| `eval-harness.test.mjs` | Baseline eval instrument (schema, scorer, intervals, blinding) | Measurement harness / Experiment 0 |

## Tags

Inside `test('…')` names, prefix with the patch id when useful, e.g. `P126.17 layout forbids per-patch files`.

## Forbidden

- New files matching `p[0-9]+`, `*-p[0-9]+`, `c[0-9]+-*` under `tests/`
- New npm scripts `test:pNNN-*`
- One file per patch “for traceability”

## E2E / live

Browser and live-model suites belong in dedicated workflows, not as per-patch unit files. Prefer extending existing e2e scripts when UI flows change (see AGENTS G4).

## Shared helpers (not suites)

| File | Role |
|------|------|
| `_sources.mjs` | Aggregated server/app source text for static contracts |
| `_prompts.mjs` | Agent prompt builders for tests |
| `app-builder-golden.json` | Golden fixture for model/task scoring in providers-models |

These are imported by category suites; they are not run directly.
