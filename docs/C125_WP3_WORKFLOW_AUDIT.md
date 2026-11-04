# C125 WP3 Step 1 — Workflow and verification-DAG audit (P125.3)

Audit-only table required by `docs/C125_ANSWER_QUALITY_PROGRAMME.md` §4 step 1.  
Disposition values: **keep** / **update** / **merge** / **archive** / **delete**.  
Labels: OBSERVED (from workflow YAML and recent CI behaviour in this archive), INFERRED (from purpose and code references).

## Workflows (`.github/workflows`)

| Workflow | Purpose | Last real signal (archive) | Caught user-visible defect? | Disposition | Notes |
|---|---|---|---|---|---|
| `ci.yml` | Main PR/push CI: lint, unit/core tests, build | Green on 125.2 baseline | Indirectly (unit regressions) | **keep** | Primary gate. Keep; prefer behaviour tests over source-text regex (WP3 step 2). |
| `acceptance.yml` | Acceptance / product-outcome checks | Present; signal depends on hosted run | Partially (acceptance scenarios) | **keep** / **update** | Keep; expand with answer-quality replay when fixtures land (step 3). |
| `architect-compare.yml` | Dual-architect compare | Present | Architect path only | **keep** | Narrow scope; keep. |
| `carousel-verify.yml` | Model carousel verification | Present (C123/C124) | Carousel routing | **keep** | Out of C125 answer-quality scope; keep. |
| `expert-verify.yml` | Expert-agent verification | Present | Expert path | **keep** | Keep. |
| `information-quality.yml` | Information-quality / search integrity | Present (P124 search work) | Search/retrieval regressions | **update** | Align with P125.3 routing tests and future answer-quality suite. |
| `ops.yml` | Ops / deploy-adjacent checks | Present | Ops only | **keep** | Keep. |

## Verification-DAG / check inventory (representative)

Full inventory lives in `docs/generated-check-graph.json` and `docs/verification-manifest.json`. High-level disposition:

| Class | Example checks | Ever caught user-visible defect? | Disposition |
|---|---|---|---|
| Source-text regex contracts (file content pins) | Navigation count, fixed prompt strings | Often false red on intentional edits (OBSERVED programme evidence) | **update** → replace with behaviour tests where offline-safe (WP3 step 2); keep only security/routing invariants |
| Search integrity / trigger coverage | `p124-38`, `p124-39`, `p125-1` | Yes (search path) | **keep** / **update** — extended by `p125-3-search-routing-grounding` |
| Agent boundary / isolation | `p119-*`, `p12318-*` | Isolation regressions | **keep** |
| Architect result shape / UI contract | `p121-*`, `p119-agent-ui` | Architect completion | **keep** |
| Security headers / redact | `security-headers`, `redact-secrets` | Security | **keep** |
| Diagnostics export shape | `p124-24` | Diagnostics completeness | **update** (WP3 step 4 / item 8 fidelity) |
| Workflow action pins | `workflow-action-pins` | CI self-consistency | **keep** |

## Step 1 delivery note

This table is the WP3 step-1 deliverable for review. Steps 2–4 of the base audit continue in later work where owner feedback requires it.  
P125.3 **also** implements the owner-approved **WP3 scope extension** (search routing and answer grounding items 1, 2, 5, 6, 7 and tests) because that work is user-visible and takes priority over pure audit polish (`AGENTS.md` cascade P2 before P4).

Live hosted CI and live dialogue replay on a deployed release remain **NOT_RUN** until Navigator runs Actions / a release equal to this patch (`AGENTS.md` G5).
