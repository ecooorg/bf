# BiForge Technical Specification v3.1: Index

**Status:** approved by owner (v3.0, 10 October 2026); from 13 October 2026 — revision 3.1: the TZ is split into parts; **decisions D-01…D-17, requirements and acceptance criteria are unchanged**; normative text was moved verbatim. **Language:** English is the canonical engineering language of the repository. **Replaces:** the monolithic TZv3.0 (kept unchanged at `ARCHIVE/TZ_v3.0_monolith.md`).

This file keeps the path `docs/BiForge_TZ_v3.md` because `AGENTS.md`, `README.md`, `DEPLOY_RAILWAY.md`, `docs/START_HERE.md`, `docs/REPO_MAP.md`, policies and ADRs link to it. It is the entry point.

## TZ parts

| File | Question it answers | Changes |
| --- | --- | --- |
| `docs/SPEC_PRODUCT.md` | What we build and how we accept it: decisions D, goals and non-goals, principles, State schema, modes and UI, gates G0–G4, acceptance criteria, deferred items | Rarely, via ADR |
| `docs/SPEC_ENGINE.md` | How it works: resources and assumptions, architecture, data, models and Router, task executor, profiles, artifacts, Code Delivery, gates, security, budgets, operations, risks and ADR | Rarely, via reviewed PR |
| `docs/SPEC_DEV_PROCESS.md` | How BiForge itself is built: roles, step cycle, stop rules, patches, extended tests, review checklist, assignment template, `AGENTS.md` | Rarely |
| `docs/SPEC_CONNECTIONS.md` | Connections: Gemini, providers, Railway, GitHub App; `connectors.yaml` manifest; diagnostics; external facts | When connections change |
| `docs/NEXT.md` | **What remains until G4**: flat checklist of `RM-*` steps (inputs and PASS), decision points | **After every step** |
| `ARCHIVE/TZ_v3.0_*.md` | History: v3.0 monolith, Appendices C, F, G, patch history P01–P24 and BX catalogue, original §16.7 | Frozen |

## Section → file map

Section numbering is preserved; references such as “TZ 7.4”, “§11.9”, “Appendix E.6” still work — use the table below.

| TZ section | Location now |
| --- | --- |
| 1–2 Goals, non-goals, principles | `SPEC_PRODUCT.md` |
| 3 Resources and assumptions | `SPEC_ENGINE.md` |
| 4–6 Architecture, data, State | `SPEC_ENGINE.md` / State in `SPEC_PRODUCT.md` |
| 7 Models, Router, Context Builder | `SPEC_ENGINE.md` |
| 8–12 Executor, profiles, artifacts, Code Delivery, gates | `SPEC_ENGINE.md` |
| 13 Security | `SPEC_ENGINE.md` |
| 14 Budgets and operations | `SPEC_ENGINE.md` |
| 15 Risks, ADR, deferred | `SPEC_ENGINE.md` / deferred in `SPEC_PRODUCT.md` |
| 16 Development process (Part B) | `SPEC_DEV_PROCESS.md` |
| Modes, UI, acceptance, G0–G4 | `SPEC_PRODUCT.md` |
| Appendix E Connections | `SPEC_CONNECTIONS.md` |
| Plan / remaining steps | `NEXT.md` |

## Normative keywords

**MUST** — mandatory. **SHOULD** — preferred; deviation needs justification. **MAY** — allowed.

On conflict with product goals or acceptance criteria, **`docs/SPEC_PRODUCT.md` takes priority**.
