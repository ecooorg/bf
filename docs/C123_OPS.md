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
node scripts/carousel-ops-probe.mjs
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
