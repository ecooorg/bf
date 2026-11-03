# C123 ops — carousel (P123.5)

## Secrets (Render / GitHub)

| Env | Role |
|-----|------|
| `GEMINI_API_KEY` | Slot 0 (required for Gemini path) |
| `GEMINI_API_KEY_1` … `GEMINI_API_KEY_10` | Optional pool (any count 1…10) |
| `OPENROUTER_API_KEY` | Candidate second source (catalog `openrouter-free`) |
| `GROQ_API_KEY` | Candidate (`groq-free`); already used by some fallbacks |
| `CAROUSEL_AUTO_ENABLE=true` | Experimental: enable catalog sources that have keys even if `enabled: false` |

Never log raw key values. Lineage uses `keySlot` indices only.

## Probe

```bash
npm run carousel:probe
# or: node --import tsx scripts/carousel-ops-probe.mjs
```

JSON report: enabled / runnable sources, credential presence, in-process health snapshot. Missing keys → `NOT_CONFIGURED`, not a crash.

## Enable a second API source

1. Add secret (e.g. `OPENROUTER_API_KEY`).
2. Set `"enabled": true` on that entry in `config/model-sources.json` **or** set `CAROUSEL_AUTO_ENABLE=true` for ops experiments.
3. Ensure openai-compatible adapter is wired for that provider in the call path (Groq path already exists under `ENABLE_EXTERNAL_MODEL_FALLBACK`).
4. Re-run probe; expect `READY` for the source.

## Health

- Per-source cooldown + breaker: `server/sourceHealth.ts`.
- Production Project Mode passes `globalSourceHealth` into `runAnalysis`.
- Unit tests **must not** rely on process-global health unless they inject a fresh registry.

## Flat patch rule

`config/` is an allowed top-level folder (`scripts/patch-tools.mjs` `ALLOWED_TOP`). Catalog files live at `config/model-sources.json`.


## Automated verification (P123.6)

```bash
# Deterministic (no secrets, no network model calls)
npm run test:carousel

# Live smoke (needs GEMINI_API_KEY)
CAROUSEL_LIVE=true npm run test:carousel
# or
npm run carousel:live
```

GitHub Actions → **carousel-verify**:

| Trigger | What runs |
|---------|-----------|
| PR / push touching carousel paths | Deterministic only |
| Actions → Run workflow, `live=false` | Deterministic + public Render health/config probe |
| Actions → Run workflow, `live=true` | Deterministic + Render probe + live model/search provider matrix |

Repository secrets used for live: `GEMINI_API_KEY` (required), optional `GEMINI_API_KEY_1`…`GEMINI_API_KEY_10`, `GROQ_API_KEY`, `SERPER_API_KEY`, and `JINA_API_KEY`. The primary Gemini key is used for the isolated latency samples; pool slot count is reported separately.


## P124.31 — full latency and Render diagnostics

The workflow **Model Carousel — Routing, Health and Live Smoke** now has three evidence layers:

1. Deterministic routing, key-pool, source-health and bounded-latency tests.
2. Optional live Gemini latency matrix: two short JSON samples per configured LIGHT model, with per-call latency, status, error class and aggregate min/median/max. This spends up to four tiny model calls; keep `live=false` when only checking configuration.
3. Public Render health probe: `/health`, `/api/health`, `/ready`, and `/health/runtime-config`. The latter exposes sanitized non-secret runtime settings only. Search logs now include planner duration and per-provider/connector latency; the ops probe reports the effective shared model-start interval.

Download the `carousel-diagnostics` artifact for the consolidated report and raw JSON/logs; `carousel-verify-live` and `carousel-verify-render` are also uploaded separately. No API key values, prompts, or model response bodies are written to artifacts.

See `docs/RENDER_ENV_CONTRACT.md` for canonical Render values and mismatch handling. Current hard runtime limits are 12 s per model call, 30 s across search/planner plus generation for one conversational request, and 3 generation calls. Larger legacy Render values are clamped and reported as warnings.
