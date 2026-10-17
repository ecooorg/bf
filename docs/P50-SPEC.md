# P50 — Optional web search for fresh facts (Simple conversation)

**Goal.** The agent answers current-events and live-data questions (news, rates, prices, weather) from the web instead of from the model's training data, and says where the facts came from.

**Base.** Archive `bf-v48.zip` (product version 48). No version bump: the patch is additive and off by default.

## Problem

`/api/conversation` calls Gemini through the API without any tool. The web chat of Gemini has search built in; the API does not unless the Google Search tool is requested. The prompt (UNAVAILABLE contract, rule 4) correctly forbids claiming a search that did not happen, so the agent said it had no internet access.

## Design (variant: separate grounded call, then the normal JSON call)

1. Gate: `ENABLE_WEB_SEARCH=true` (default off). With the flag off no new code path runs and responses are byte-identical to v48.
2. Trigger (`server/webSearch.ts`, `shouldSearchWeb`): the person explicitly asks to search (existing `userAskedSearch`), or in `WEB_SEARCH_MODE=auto` the last message is clearly time-sensitive (news, rates, quotes, weather, "latest ..."). Never on a crisis or distress turn, never for `intent=DOCUMENT`, never when files are attached (except an explicit search request).
3. One short Gemini call with a model-compatible Google Search tool (`googleSearchRetrieval` for Gemini 2.x; `googleSearch` for Gemini 3+) and **no** JSON mode (the tool and the JSON contract of the main call are not combined). Light cascade, at most two models, 15 s timeout (`WEB_SEARCH_TIMEOUT_MS`). The result is accepted only when the response carries grounding metadata; an answer from model memory is discarded.
4. The digest enters the main conversation prompt as an **untrusted data block** (`asUntrustedDataBlock`), with its own header telling the model to treat it as data and to quote sourced figures. `server/promptPacks.ts` is not changed. The digest is added to `extraNumberSource`, so sourced numbers and percentages do not trip the invented-number check.
5. Response is additive: sources are appended to `reply` as a plain list (the client shows only `reply`), plus `sources` and `meta.web_search` fields. Both appear only when a search was attempted/used.
6. Any failure (no key, cooldown, daily cap, 429/503, timeout, no grounding) continues the normal flow unchanged. The search call does not write to the model-health table.

## May change

`server/webSearch.ts` (new), `server.ts` (import, `runConversationWebSearch`, wiring in `/api/conversation`), `tests/p50-web-search.test.mjs` (new), `package.json` (`test:p50`), `.env.example`, `connectors.yaml`, `docs/CONNECTIONS.md`, `docs/REPO_MAP.md`, `DEPLOY_RAILWAY.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`.

## Must not change

Prompt packs, intent detectors, JSON contract of the conversation, UI, Expert/Project endpoints, Groq verifier (P48), auth, rate limits.

## Defaults chosen

- Default **off**; owner enables it with one Railway variable.
- Scope is **Simple conversation only**; Expert and Project endpoints are untouched.
- Only the last user message is sent to search (no history, brief, state or attachment text).
- Search counts against `DAILY_CALL_CAP` per attempt but not against `MAX_MODEL_CALLS` of the main request.
- No version bump.

## Data note (CONNECTIONS R7)

The question text goes to Google Search through the Gemini API. On a free Gemini plan Google may use it for product improvement; use a billed project before enabling this on real user data.

## Acceptance

1. `npm run test:p50` passes offline (fake client).
2. `npm run check` stays green.
3. Manual smoke (owner): with `ENABLE_WEB_SEARCH=true`, ask "Какие последние новости по ключевой ставке?" — the reply uses fresh facts and ends with a source list; `meta.web_search` is `used`. With the flag off the behaviour equals v48.
