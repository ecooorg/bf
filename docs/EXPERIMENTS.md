# EXPERIMENTS — measurement ledger (C127)

## Experiment 0 — Instrument validation & architecture baseline

| Field | Value |
|-------|-------|
| **ID** | EXP-0 |
| **Date** | 2026-11-06 |
| **Patch** | P127.3 (Stage B pre-register + live harness) |
| **Type** | EXPERIMENT |
| **User problem and evidence** | No measured oracle for factual answer quality (Perestroika §1–§2). |
| **Hypothesis** | Versioned question set + multi-config harness yields comparable W/G/A rates for Simple (A), Expert (B), Gemini+Search (C), strongest (D), negative control (N). |
| **Baseline** | Set `dev-1`; hash written into every report. Full baseline numbers NOT_RUN until smoke + full run. |
| **Metric and acceptance thresholds (pre-registered, locked before full run)** | Materiality §7.4: ΔG ≥15 pp **or** ΔW ≥10 pp on dev set **and** direction holds in ≥2 category groups. Else INCONCLUSIVE. Instrument §7.6: (1) N worse than A on lookup; (2) scorer unit tests green; (3) double-label subset later. |
| **Scope** | Instrument only. Fact path frozen. |
| **Regression risks** | None for product path. |
| **Result** | NOT_RUN (awaiting Navigator smoke dispatch + labels) |
| **Decision** | PENDING O1–O6 after Stage E |

### Question set

- Version: `dev-1`
- Count: 12
- Hash: computed at run time from `config/eval-questions.json` (see report)
- Holdout: owner/other session only; coding assistant does not author or view

### Configurations (§7.1)

| ID | Description | Smoke requirement |
|----|-------------|-------------------|
| A | BiForge Simple as deployed | `EVAL_BASE_URL` |
| B | BiForge Expert | `EVAL_BASE_URL` |
| C | Gemini one-call + googleSearch, primary model | `GEMINI_API_KEY` |
| D | Same, strongest model | `GEMINI_API_KEY` |
| N | A with no web search | deploy cannot flip flag remotely → smoke may proxy; isolation imperfect until local/flag |

### Outcome matrix (pre-registered)

| Outcome | Condition | Next step |
|---------|-----------|-----------|
| O1 | Architecture hurts (A/B materially worse than C) | Ablate one layer |
| O2 | Model tier dominates (D ≫ C ≈ A) | Model / quota |
| O3 | Search path broken (N not clearly worse on lookup) | Fix instrument or search gate |
| O4 | BiForge ≥ C | Keep; targeted fix per taxonomy |
| O5 | Simple vs Expert gap | Align weaker |
| O6 | Instrument invalid / inconclusive | Repair instrument; no product change |

### Results table

| Run | Commit | Set hash | Config | n | W-rate | G-rate | Notes |
|-----|--------|----------|--------|---|--------|--------|-------|
| smoke | — | — | — | — | NOT_RUN | NOT_RUN | Awaiting Navigator dispatch |
| full | — | — | — | — | NOT_RUN | NOT_RUN | After smoke passes §7.6 |

### Stage status

| Stage | Status |
|-------|--------|
| A Smoke | NOT_RUN — Navigator dispatches Baseline Eval |
| B Pre-register | DONE this patch |
| C Full run | blocked on A |
| D Label | Navigator |
| E Score/decide | Assistant offline after labels |
| F Ablate | conditional |
