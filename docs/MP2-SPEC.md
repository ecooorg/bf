# MP2 SPEC — shared prompt core and Simple/information contract (completion patch)

## MP2 — close the unfinished criteria of the stage

**Goal.** After the patch the Simple/information prompt is a light contract (no STEP 0–6, SECOND TEST, WHAT THE PERSON SHOULD EXPERIENCE, BEFORE ANSWERING, outside-view or no-homework rituals), while decision, research and engineering keep the full method unchanged. The MP2 PASS criteria that were `NOT_RUN` in `docs/MP2-REPORT.md` now have tests and recorded results.

**Base.** Owner archive `bf-main__12_.zip` (14 October 2026): MP2 first delivery (core, classification, audit skip) plus the CI fix that aligned `tests/pi03.test.mjs`, `tests/regression.json`, `tests/stage2.test.mjs` and the decision-signal patterns.

**May change.** `tests/pi01.test.mjs` (upper bound of the contract-position assertion only), `server/promptPacks.ts`, `server/conversationMode.ts` (paragraph text only), `server.ts` (pass the detected mode to the prompt builder), `package.json` (`test:mp2` and the `check` chain), docs, one new test file.

**Must not change.** Expert and Project instructions; the response shape of `/api/conversation`; `tests/regression.json`; `tests/acceptance/**`; the decision / research / engineering prompt text; models, UI, storage, authentication; the product version label (24).

**Files.** New: `docs/MP2-SPEC.md`, `tests/mp2.test.mjs`. Changed: `server/promptPacks.ts`, `server/conversationMode.ts`, `server.ts`, `package.json`, `tests/pi01.test.mjs`, `docs/MP2-REPORT.md`, `docs/CURRENT_STATE.md`, `docs/PATCH_JOURNAL.md`, `docs/NEXT.md`, `docs/REPO_MAP.md`, `CHANGELOG.md`.

**PASS criteria.**
- Machine: `npm run check`, `npm run build`, `npm run test:mp2`.
- The information prompt contains the shared core, the unavailable-answer contract, files/documents rules, a compact crisis triage and the JSON keys the server reads, and none of the decision rituals.
- decision, research, engineering and an omitted mode produce the same prompt as before the patch (verified against a snapshot taken before the change).
- Expert (`EXPERT_STEP_PREFIX`) and Project (`ANALYST_INSTRUCTION`) are untouched and still wired.
- A light information answer (no gain / options / newOptions / nextStep / derived_numbers) is accepted; the response keeps every field as an empty value; one model call; no quality retry.
- A weak decision draft is still retried; the crisis path still works.
- Prompt size baseline and result are recorded in `docs/MP2-REPORT.md`.

**Read in the TZ.** None; `docs/MASTER_IMPLEMENTATION_PLAN.md` section MP2 is the source.

**Tests to add or change.** New `tests/mp2.test.mjs` (classification, prompt assembly, Expert/Project retention, fake-Gemini integration). No existing test is weakened.

**`CHANGELOG.md`.** Added: MP2 completion entry.

**Defaults chosen.**
1. The `mode` argument of `buildSimpleConversationPrompt` defaults to `decision`, so any caller that omits it keeps the old full prompt.
2. The information JSON contract keeps the same keys; scaffold fields (`gain`, `options`, `newOptions`, `newOptionTypes`, `nextStep`, `derived_numbers`) are optional. The server already defaults them, so no schema change is needed.
3. Prompt size is measured offline by building the prompts directly; `scripts/measure-prompt.mjs` needs a live server and a provider key and was not run.

**Not done / postponed.** Output quality guard and soft retry (MP3); Graubünden / Expert / Project fixtures (MP3); mode selection UI (UI1); live-model behaviour (MANUAL1).
