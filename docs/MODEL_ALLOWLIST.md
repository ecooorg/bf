# Gemini model allowlist (free-key deployment)

**Status:** In force for the Gemini family  
**Cycle:** C122 introduced the lock; C123 keeps it until the model-sources catalog fully validates Gemini ids

**Only these Gemini model ids may be used as defaults, probes, cascades, or live eval targets:**

- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`

Do **not** introduce `gemini-2.*`, `gemini-3.6-*`, `gemini-3.8-*`, `gemini-1.5-*`, `gemma-*`, or pro variants as defaults or probe candidates. They do not answer on the organisation’s free-tier Gemini keys.

**Source of truth (code):** `server/modelAvailability.ts` (`GEMINI_ALLOWED_MODELS`) and `server/modelRegistry.ts` (`GEMINI_MODELS` / `REGISTRY_SEED`).

**Contract test:** `tests/model-allowlist-contract.test.mjs`

**C123 note:** Additional *providers* enter via `docs/MODEL_SOURCES_CATALOG.md`. They do not expand the Gemini id list. Up to **13 legitimate API key sets** per provider may be configured for carousel capacity (see `docs/C123_MODEL_CAROUSEL.md` §3.2).
