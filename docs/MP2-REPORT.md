# MP2 REPORT — shared prompt core and Simple/information contract

**Date:** 2026-10-14  
**Base:** `bf-main__12_.zip`  
**Product version:** 24 (unchanged)  
**Agent:** Claude (Anthropic), chat session

## Done

First delivery (earlier): `server/promptCore.ts`; expanded information detection and default `information`; audit/retry skipped for `information`; core prepended to the Simple prompt.

This completion patch:
- `server/promptPacks.ts` split into named blocks. `buildSimpleConversationPrompt(..., mode)` builds a light prompt for `information` (core, short Simple intro, light method, light boundaries, the unavailable-answer contract, the mode paragraph, files/documents rules, light JSON contract). Every other mode (and an omitted `mode`) builds the unchanged full decision prompt.
- `server.ts` passes the detected mode into the prompt builder.
- `server/conversationMode.ts`: the information paragraph no longer tells the model to skip rituals the information prompt no longer contains.
- `tests/mp2.test.mjs` (+ `test:mp2` in `check`): classification, prompt assembly, Expert/Project retention, fake-Gemini integration.

## PASS mapping (against MASTER_IMPLEMENTATION_PLAN MP2)

| Criterion | Result |
| --- | --- |
| Direct information requests get the light contract | PASS in tests (prompt content and integration). Quality of live answers: NOT_RUN (MP3 / MANUAL1) |
| Decision/choice keeps the decision contract | PASS: decision, research, engineering and no-mode prompts are byte-identical to the pre-patch snapshot; weak decision draft still retried (calls = 2) |
| Shared constraints preserved | PASS: core, honesty/search, unavailable-answer contract, files rules, crisis triage, language present in the information prompt (tested) |
| Expert / Project not weakened | PASS: `EXPERT_STEP_PREFIX` and `ANALYST_INSTRUCTION` untouched; Expert path still prefixes its steps (tested) |
| JSON contract and consumers | PASS: server reads every optional field with defaults; a light answer returns empty arrays for `gain`, `options`, `newOptions`, `newOptionTypes`, `factsToCheck` and `''` for `nextStep` (tested) |
| Prompt size baseline | Simple prompt, chars, same input (`USER INPUT`, date 2026-10-14, no attachments): information 28 668 → 12 413 (−56.7 %); decision 28 168, research 28 342, engineering 28 103 unchanged. Measured offline by building the prompts; `scripts/measure-prompt.mjs` (live server + key) NOT_RUN |
| `npm run check` / `npm run build` | see "Checks run" |

## Checks run

Run in the session sandbox (Node 22, `npm ci` succeeded), 14 October 2026, on the patched tree:

| Command | Result |
| --- | --- |
| `npm run check` (docs, version, copy lint, typecheck and all unit/virtual suites including the new `test:mp2`; PostgreSQL-tagged tests as defined in `docs/REPO_MAP.md`) | PASS, exit 0 |
| `npm run build` (vite + server compile) | PASS, exit 0 |
| `node scripts/check-version.mjs`, `node scripts/check-docs.mjs` | PASS |
| `npx tsx tests/mp2.test.mjs` | PASS |
| Pre/post prompt snapshot (decision, research, engineering, no-mode, attachments) | identical |
| `scripts/measure-prompt.mjs` (live server + provider key) | NOT_RUN |
| `npm run test:ui` (Playwright) | NOT_RUN (UI untouched) |
| Live Gemini / manual dialogue | NOT_RUN |

Test adjustment: `tests/pi01.test.mjs` asserted the unavailable-answer contract sits before `BEFORE ANSWERING (silent)`. The master plan removes that ritual from information, so the upper bound is now the nearest of `BEFORE ANSWERING (silent)` / `FILES THE PERSON ATTACHES`; the full prompt keeps the original bound. The assertion still checks presence, uniqueness and order.

## Known gaps

- Live behaviour with a real model is unverified (no provider key in the session).
- `scripts/measure-prompt.mjs` was not run (needs a live server and key).
- `tests/regression.json` was changed in an earlier CI fix (`calls` of five cases) although the master plan lists it as not to be changed; see the owner note in the session summary.

## Owner next

1. Apply the patch, let CI run on `main`.
2. Command **MP3** when ready.
