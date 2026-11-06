# EXPERIMENTS — measurement ledger (C127)

## Experiment 0 — Instrument validation & architecture baseline

| Field | Value |
|-------|-------|
| **ID** | EXP-0 |
| **Date** | 2026-11-06 |
| **Patch** | P127.1 (instrument only) |
| **Type** | EXPERIMENT |
| **User problem and evidence** | No measured oracle for factual answer quality across 100+ iterations (see Perestroika §1–§2). |
| **Hypothesis** | A versioned question set + multi-config harness can produce comparable W-rate / G-rate / abstention metrics for BiForge Simple, Expert, direct Gemini+Search, and a negative control. |
| **Baseline** | NOT_RUN (instrument ships in this patch) |
| **Metric and acceptance thresholds** | Materiality defaults §7.4: ΔG ≥15 pp or ΔW ≥10 pp on dev set, direction holds in ≥2 category groups. Instrument validity §7.6 checks 1–3. |
| **Scope** | `config/eval-questions.json`, `scripts/baseline-eval.mjs`, `tests/eval-harness.test.mjs`, workflow `baseline-eval.yml`. No product behaviour change. |
| **Regression risks** | None for product path (frozen). |
| **Result** | NOT_RUN |
| **Decision** | PENDING after P127.2 smoke + full run |

### Configurations (§7.1)

| ID | Description |
|----|-------------|
| A | BiForge Simple as deployed |
| B | BiForge Expert as deployed |
| C | Gemini one-call + googleSearch, same model as A primary |
| D | Same as C, strongest available model |
| N | A with ENABLE_WEB_SEARCH=false (negative control) |

### Outcome matrix (pre-registered)

| Outcome | Condition | Next step |
|---------|-----------|-----------|
| O1 | Architecture hurts (A/B materially worse than C on W or G) | Ablate one layer |
| O2 | Model tier dominates (D ≫ C ≈ A) | Model / quota work |
| O3 | Search path broken (N not clearly worse on lookup) | Fix instrument or search gate |
| O4 | BiForge ≥ C | Keep; targeted fix per taxonomy |
| O5 | Simple vs Expert gap | Align the weaker |
| O6 | Instrument invalid / inconclusive | Repair instrument; no product change |

### Results table

| Run | Commit | Set hash | Config | n | W-rate | G-rate | Notes |
|-----|--------|----------|--------|---|--------|--------|-------|
| — | — | — | — | — | NOT_RUN | NOT_RUN | Awaiting P127.2 |

Holdout authoring and labelling are independent of the coding session (C127 rule 7).
