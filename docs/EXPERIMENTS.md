# EXPERIMENTS — measurement ledger (C127)

## Experiment 0 — Instrument validation & architecture baseline

| Field | Value |
|-------|-------|
| **ID** | EXP-0 |
| **Date** | 2026-11-06 |
| **Patch** | P127.2b (Experiment 0 smoke: login + quota-aware C; still Stage A/B of P127.2) |
| **Type** | EXPERIMENT |
| **User problem and evidence** | No measured oracle for factual answer quality (Perestroika §1–§2). |
| **Hypothesis** | Versioned question set + multi-config harness yields comparable W/G/A rates for Simple (A), Expert (B), Gemini+Search (C), strongest (D), negative control (N). |
| **Baseline** | Set `dev-1`. Production runtime snapshot below. Full numbers NOT_RUN until smoke + labels. |
| **Metric and acceptance thresholds (locked before full run)** | Materiality §7.4: ΔG ≥15 pp **or** ΔW ≥10 pp on dev **and** direction in ≥2 category groups. Else INCONCLUSIVE. §7.6: (1) N worse than A on lookup; (2) scorer unit tests green; (3) double-label subset. |
| **Scope** | Instrument only. Fact path frozen. |
| **Result** | NOT_RUN (awaiting smoke dispatch + labels) |
| **Decision** | PENDING O1–O6 |

### Production runtime snapshot (Navigator, 2026-11-06)

Source: `https://biforge.onrender.com/health/runtime-config` · commit `3451600` · version 127

| Area | Effective |
|------|-----------|
| Search | enabled=true, planner=true, carousel=[connector,serper,gemini], country=CH, timeout=15s, maxQueries=2 |
| Features | directGeminiMode=**true**, epistemicVerifier=**false**, weather=true, projectMode=true, appAuth=true |
| Models light/strong | gemini-3.5-flash-lite → gemini-3.1-flash-lite |
| Credentials | gemini=true (10 slots), serper=true, jina=true, groq=true |
| Caps | dailyCallCap=1000, rateLimitPerHour=200 |

**Implication for configs:** A ≈ production Simple with Direct mode ON and search ON. N (ENABLE_WEB_SEARCH=false) cannot be forced on the shared deploy without a dedicated flag/env; smoke will mark N isolation limits.

### Question set

- Version: `dev-1` · 12 questions · hash at run time from `config/eval-questions.json`
- Holdout: owner/other session only

### Configurations

| ID | Description | Smoke need |
|----|-------------|------------|
| A | BiForge Simple (deploy) | EVAL_BASE_URL=https://biforge.onrender.com |
| B | BiForge Expert | same |
| C | Gemini one-call + googleSearch, primary | GEMINI_API_KEY |
| D | Strongest model + search | GEMINI_API_KEY |
| N | No web search control | imperfect on shared deploy |

### Outcome matrix (pre-registered)

| Outcome | Condition | Next |
|---------|-----------|------|
| O1 | A/B materially worse than C | Ablate one layer |
| O2 | D ≫ C ≈ A | Model/quota |
| O3 | N not worse on lookup | Instrument or search gate |
| O4 | BiForge ≥ C | Keep; taxonomy fix |
| O5 | Simple vs Expert gap | Align weaker |
| O6 | Instrument invalid | Repair; no product change |

### Results

| Run | Commit | Set hash | Config | n | W | G | Notes |
|-----|--------|----------|--------|---|---|---|-------|
| smoke | — | — | — | — | NOT_RUN | NOT_RUN | Dispatch pending |
| full | — | — | — | — | NOT_RUN | NOT_RUN | After smoke §7.6 |

### Stage status

| Stage | Status |
|-------|--------|
| A Smoke | READY — needs APP_PASSWORD in GH secrets; dispatch A,B,C |
| B Pre-register | DONE |
| C–F | blocked on A |


### Auth for A/B (P127.2b)

Production has `appAuth=true`. Smoke logs in via `POST /api/login` using GitHub secret `APP_PASSWORD` (mapped to `EVAL_APP_PASSWORD`). Cookie `be_session` is attached to product calls. C/D use `GEMINI_API_KEY` only; 429 retries with model fallback (`3.5` → `3.1` flash-lite) and 6s pacing.


### Smoke ops (P127.2e)

- Default configs **A,B** via deploy + `APP_PASSWORD` (product envelope `data.reply`).
- **C** not required for §7.6 smoke gate from Actions (shared IP → 429 even with 10 independent keys). Set `include_c=true` only when quota/IP allow; prefer C off-Actions.
- Gemini pool: serialize, 12s gap, 60s slot cooldown on 429 (aligned with `keyPool`).


## P127.3 — Ungrounded quantitative honesty gate

| Field | Value |
|-------|-------|
| **Type** | EXPERIMENT / targeted intervention |
| **Hypothesis** | On statistic/lookup turns, Simple/Expert often assert specific figures when search did not ground the turn → high machine W on dev-12. |
| **Change** | Expand quantitative-question detection; `applyUngroundedStatisticGate` replaces confident quantities when search status is not `used`/`used_weak`. Wired on Simple Direct + structured path behind **`UNGROUNDED_FACT_GATE=true` (default off)**. Also `needsFreshWebInfo` treats population/GDP/rate questions as needing lookup. |
| **Metric** | Smoke A/B on same 12: infra still &lt;25%; paired W-rate on statistic/lookup subset not worse; fewer confident bare numbers when search not_run. |
| **Rollback** | Unset / `false` the env flag. |
| **Result** | NOT_RUN live after deploy with flag on |
