# ADR-02 — Gemini adapter and the future place of Simple Mode

- **Status:** Accepted for P03 (owner may review). Needed by BX-10.a.
- **Context:** `generate()` in `server.ts` mixes the Gemini call, JSON/number validation, health state, cooldowns and the cascade. Project Mode needs a provider-independent layer (TZ 7.2–7.4). Simple Mode is used by the owner and must not change.
- **Options:** (1) rewrite `generate()` on top of the new layer now; (2) build the new layer beside it, prove parity, migrate later; (3) leave Simple Mode on its own path for good.
- **Criteria:** no change to Simple Mode behaviour; existing virtual tests stay unchanged; the new layer is testable without network or keys.
- **Decision:** option 2. P03 adds `server/geminiAdapter.ts` (one call, normalized response, error classes), `server/fakeProvider.ts`, `server/router.ts` (Router-min: candidates from the registry in cascade order, fallback by matrix 7.4, in-memory cooldown) and conformance tests. `generate()` is **not** switched. The adapter takes a client with the same shape as `GoogleGenAI`. Differences from `generate()` kept on purpose: an unknown 4xx is `INVALID_REQUEST` and stops (TZ 7.4) where `generate()` tries the next model; number validation (`validateNumbers`) stays in Simple Mode and is not part of the adapter. Not done yet: DB table for the registry, `model_health` and `route_decisions`, budget check, ledger.
- **Verification:** `npm run test:conformance` (same 11 scenarios on the fake provider and the Gemini adapter; Router-min scenarios); Simple Mode virtual tests unchanged.
- **Revisit when:** Project Mode (BX-09.a) needs its first real call through the layer, or the owner decides to migrate Simple Mode (then a parity test against the virtual tests is required first).
