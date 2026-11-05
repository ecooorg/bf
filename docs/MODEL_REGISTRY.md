# Model registry and sources

**Authority:** Runtime allowlists and cascades live in code (`server/modelAvailability.ts`, `server/modelRegistry.ts`) and `config/model-sources.json`. This document is the prose summary for assistants; it must not diverge from those sources.

## Gemini free-key allowlist (in force)

Only these Gemini model ids may be used as defaults, probes, cascades, or live eval targets:

- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`

Do **not** introduce `gemini-2.*`, `gemini-3.6-*`, `gemini-3.8-*`, `gemini-1.5-*`, `gemma-*`, or pro variants as defaults or probe candidates on the organisation’s free-tier Gemini keys.

**Code source of truth:** `GEMINI_ALLOWED_MODELS` / `GEMINI_MODELS` / `REGISTRY_SEED`.

## Catalog and carousel

- Runtime catalog: `config/model-sources.json` (public metadata only; secrets via env).
- Adding a source means editing configuration and secrets, not patching agent code.
- Up to 13 legitimate API key sets per provider may be configured for carousel capacity.
- Search-provider routing and LLM generation routing remain separate concerns; cross-provider generation fallback is explicitly opt-in.
- Free-tier inventories change frequently; prefer catalog + health probes over hard-coded model ids outside the Gemini allowlist.

## Inventory snapshot notes (historical, 2026-11)

Approved runtime path centres on the Gemini free pool. Candidate providers observed in inventory work (OpenRouter free routes, Groq, Cloudflare Workers AI, Mistral, NVIDIA NIM, regional EU options, etc.) remain candidates until keys, adapter path, and health probes are enabled. Retired or uncertain free tiers (e.g. Hugging Face free credits, some trial-only plans) must not be treated as production capacity.

For current enabled sources and cascade order, inspect `config/model-sources.json` and the live `/health/runtime-config` snapshot.
