# P49 — Multi-provider free-tier cascade (deferred)

**Status.** **DEFERRED** — do not implement until the owner confirms that Gemini + Groq quotas are insufficient for real use (or a key is lost / revoked). External tester wave and MANUAL1 proceed on **P48 / v48** without this patch.

**Goal.** Extend the model cascade with **three primary** and **two spare** official free/limited API providers so conversation and analysis survive single-vendor outages and daily rate limits, without scraping web UIs and without paid tiers as a requirement.

**Base (when activated).** Tree at or after **P48** (epistemic layer). Re-read live free-tier docs on the day of implementation — model IDs and limits drift.

**Research snapshot (2026-10-16).** Used only as design intent; re-verify before coding:

| Slot | Provider | Role | Typical free envelope |
| --- | --- | --- | --- |
| **P1** | Google **Gemini** API | Primary quality + JSON | Flash / Flash-Lite free of charge within project RPM/RPD (AI Studio) |
| **P2** | **Groq** | Fast fallback + P48 verifier | ~30 RPM; large models ~1k RPD / ~200k TPD per model |
| **P3** | **Cloudflare Workers AI** | Second free-tier vendor | 10 000 Neurons/day (UTC reset); OpenAI-compatible catalog |
| **S1** | **NVIDIA NIM** (build.nvidia.com) | Spare open-weight pool | ~40 RPM prototyping; Developer Program; not marketed as production |
| **S2** | **OpenRouter** `:free` | Last-resort multi-model | 20 RPM; 50 RPD (or 1 000 RPD after $10 lifetime credits); roster rotates |

---

## Cascade order (locked intent)

```text
conversation / strong path:
  Gemini (P1) → Groq (P2) → Cloudflare (P3) → [if enabled] NIM (S1) → [if enabled] OpenRouter :free (S2)
  → user-visible provider failure (short, honest; no invented answer)

P48 verifier (unchanged policy):
  Groq small only when GROQ_API_KEY present and triggers fire
  else skip — never blocks primary reply
```

**Must not:** browser scraping, unofficial web-chat automation, hard dependency on S1/S2 for PASS.

---

## May change (when implemented)

- `server/modelRegistry.ts` — registry entries for `cloudflare`, `nvidia` (NIM), `openrouter`; capabilities `json_output` only when verified.
- `server/openaiCompatAdapter.ts` or thin wrappers — base URLs, auth headers (CF / NIM / OpenRouter differ slightly).
- `server.ts` / analysis generate path — **conversation** cascade must use the same multi-adapter path as analysis (today Groq is easier to miss on chat-only Gemini `generate()`).
- Env: `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` (or documented CF Workers AI key shape), `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`; document in `.env.example` and `docs/OWNER_OPS.md` / CONNECTIONS — **no secrets in git**.
- `scripts` verify:connections — probe each configured provider.
- Tests: offline registry + fake adapters + cascade order; no live keys required in CI.
- Docs: STATUS, PATCH_JOURNAL, REPORT, CHANGELOG; version bump to **49** when this ships.
- Optional: ops/health non-secret flags `providers: { gemini, groq, cloudflare, … }` ok/missing (no key material).

## Must not change

- UI1 / mode cards / More menu.
- P48 uncertainty prompt contract and “verifier never blocks reply”.
- Authentication, Drive, Project Mode gates, `CODE_EXECUTOR`, GitHub write.
- Deleting Gemini or Groq as first two slots.
- Forcing all five keys for the app to start — **missing spare keys = skip that slot**.

---

## Behaviour

1. **Presence-gated slots.** A provider enters the live cascade only if its env secret is set and registry status is `active` after a successful verify (or explicit owner enable).
2. **429 / transient.** Follow existing fallback matrix: try next slot; do not spin forever.
3. **Auth failure.** Disable or skip that provider for the request (and optionally cooldown); continue cascade.
4. **All slots exhausted.** Stable API error + short user-facing message: model service unavailable; projects/files still available. No silent empty 200 with fake content.
5. **Model IDs.** Pin in registry with `lastVerifiedAt`; prefer stable IDs over `:latest`. OpenRouter entries must use explicit `:free` model IDs chosen at implement time (roster will have changed).
6. **Data policy.** Record `dataPolicy` / training notes per provider in registry (Gemini free-tier improvement use; CF “not used for training” where documented; OpenRouter depends on upstream).

---

## PASS criteria (when implemented)

1. With only `GEMINI_API_KEY`: conversation still works (P1 only).
2. With Gemini forced fail + `GROQ_API_KEY`: conversation succeeds via P2 (or documented PARTIAL if chat path still Gemini-only — **must be fixed in P49**).
3. Offline tests: cascade order, skip missing keys, parse errors do not crash process.
4. `verify:connections` reports each configured provider without printing secrets.
5. Version **49** surfaces consistent; `check-docs` / `check-version` PASS.
6. P48 tests still PASS; verifier remains Groq-optional.

## Tests to add (when implemented)

- `tests/p49-cascade.test.mjs` — pure order, skip, fake adapter failover.
- Extend connections tests only with mocks in CI.

## Not done / postponed (stays out of P49)

- Paid tiers, BYOK UI overhaul, web search grounding productization.
- Multi-agent routers, local Ollama as sixth slot (separate SPEC if ever needed).
- Automatic weekly free-API scanner (#1 backlog) — optional companion, not required for P49.

## Owner trigger to start P49

Implement only after an explicit command, e.g. when:

- repeated 429 / daily cap on Gemini and Groq in production, or  
- loss of one primary key, or  
- owner decides to pre-provision CF / NIM / OpenRouter keys.

Until then: **P48 + current Gemini/Groq only.**

*P49-SPEC*
