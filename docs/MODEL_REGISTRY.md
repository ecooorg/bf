## ImmoGR model usage boundary (2026-11-27)
No ImmoFinder model role or prompt is active. ImmoGR may use approved provider transport only after deterministic page acquisition and structured evidence extraction; models may resolve ambiguity but cannot invent facts or replace evidence. Provider limits and budgets are specified in IMMOGR_ARCHITECTURE.md and IMMOGR_QUALITY_STANDARD.md.

> **Property-search status — owner decision 2026-11-27:** ImmoFinder is permanently retired and must not be run, developed, or used. Any ImmoFinder material below is historical archive only: it is not a current requirement, roadmap, technical instruction, or source of decisions. ImmoGR is the sole active property-search project; its current authority is the docs/IMMOGR_*.md document set.

# Model registry and sources

**Authority:** Runtime allowlists and cascades live in code (`server/modelAvailability.ts`, `server/modelRegistry.ts`) and `config/model-sources.json`. This document is the prose summary for assistants; it must not diverge from those sources. When a patch changes cascades or allowed ids, update this file in the same delivery.

## Gemini free-key allowlist (in force)

Only these Gemini model ids may be used as defaults, probes, cascades, or live eval targets:

- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`

Do **not** introduce `gemini-2.*`, `gemini-3.6-*`, `gemini-3.8-*`, `gemini-1.5-*`, `gemma-*`, or pro variants as defaults or probe candidates on the organisation’s free-tier Gemini keys.

**Code source of truth:** `GEMINI_ALLOWED_MODELS` / `GEMINI_MODELS` / `REGISTRY_SEED` in `server/modelAvailability.ts` and `server/modelRegistry.ts`.

## Default cascades (env, production baseline)

When env is unset, code falls back to the same order. Production Render contract (`docs/OPERATIONS_AND_RELEASES.md`) currently records:

- `MODEL_CASCADE_LIGHT` = `gemini-3.5-flash-lite,gemini-3.1-flash-lite`
- `MODEL_CASCADE_STRONG` = `gemini-3.5-flash-lite,gemini-3.1-flash-lite`

Prefer the faster flash-lite first for light stages when live probes show material latency difference.

## Catalog and carousel

- Runtime catalog: `config/model-sources.json` only (public metadata; secrets via env). Do not add a parallel `.yaml` catalog.
- Enabled production source (catalog): `gemini-free-pool` (adapter `gemini`, priority 100), models flash-lite strong/light as above, key pool slots `GEMINI_API_KEY` … `GEMINI_API_KEY_10` (`max_slots: 10`).
- Adding a source means editing configuration and secrets, not patching agent code.
- Search-provider routing and LLM generation routing remain separate concerns; cross-provider generation fallback is explicitly opt-in.
- Free-tier inventories change frequently; prefer catalog + health probes over hard-coded model ids outside the Gemini allowlist.

## Inventory snapshot notes (historical)

Candidate providers observed in inventory work (OpenRouter free routes, Groq, Cloudflare Workers AI, Mistral, NVIDIA NIM, regional EU options, etc.) remain candidates until keys, adapter path, and health probes are enabled. Retired or uncertain free tiers must not be treated as production capacity.

For current enabled sources and cascade order, inspect `config/model-sources.json` and the live `/health/runtime-config` snapshot.
