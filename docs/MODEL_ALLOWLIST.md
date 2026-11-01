# Gemini model allowlist (free-key deployment)

**Only these model ids may appear in code, tests, defaults, cascades, and probes:**

- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`

Do **not** introduce `gemini-2.*`, `gemini-3.6-*`, `gemini-3.8-*`, `gemini-1.5-*`, `gemma-*`, or pro variants as defaults, probe candidates, or fixture model ids. They do not answer on the deployment API key.

Source of truth: `server/modelAvailability.ts` (`GEMINI_ALLOWED_MODELS`) and `server/modelRegistry.ts` (`GEMINI_MODELS` / `REGISTRY_SEED`).
