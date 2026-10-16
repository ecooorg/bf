# PI-01 — Uncertainty contract in the Simple Mode prompt

**Goal.** When an ideal answer is unavailable, the Simple Mode conversation gives the best available result of a marked kind instead of repeating the limitation, without inventing numbers or claiming a search that did not happen. Source: CONCEPTS uncertainty TZ (off-repo) §4, §7 P1, §8.1; TZ 16.4.2 row PI-01.

**Base.** Owner archive `bf-v22.zip` (production version 22, `main` `da38c1419d51`).

**May change.** `buildConversationPrompt` in `server.ts` (one inserted block), version files, `tests/pi01.test.mjs`, `package.json` scripts, docs, two tests pinned to the numeric version (`tests/p22-acceptance.test.mjs`, `tests/package-c.test.mjs`).

**Must not change.** Project Mode; JSON schema of the conversation answer; `derived_numbers` validation; parser and repair; `askAllowed`, quality audit, `scrubInternalLabels`, `buildVisibleReply`; HARD BOUNDARIES text; `tests/acceptance/**`; `tests/regression.json`.

## Behaviour

Block `WHEN THE IDEAL ANSWER IS UNAVAILABLE` (5 short items) sits after HARD BOUNDARIES and before BEFORE ANSWERING:
1. one sentence on what is unavailable and why;
2. the best available result with its kind named in plain words (own input or sources, scenario under assumptions, range or qualitative estimate, comparison, hypothesis with a check);
3. no repeated limitation instead of a result; a rough estimate on explicit request is given with caveats;
4. no invented numbers, percentages or forecasts; no claim of a search or check (the conversation has no search tool);
5. after "this does not solve my task", change the approach.

## Defaults chosen

- Version label `PI-01` (the track patch has no P-number; precedent: `20b`). Two older tests that pinned a numeric version were made version-independent (they compare `src/config.ts` with `package.json`; `package-c` regex also accepts `PI-NN`). No assertion was removed or weakened.
- Item 4 forbids claiming a search because the conversation call has no search tool; this is the PI-01 part of the TZ rule "do not imitate a search". The `search_expected` flag is PI-02.
- Item 2 lists "hypothesis with a way to check" in addition to the four kinds of TZ §4, matching the statement kinds table of TZ §4.
- The word kinds are plain English words, not schema labels, so the rule against method labels in the reply still holds.

## PASS criteria

- Machine: `npm run test:pi01`; `node scripts/check-version.mjs`; `node scripts/check-docs.mjs`; `npm run check`; `npm run build`.
- Owner on Railway after deploy: 1) `GET /health` shows version `PI-01`. 2) In `/` write the Swiss winter dialog (region; "do not ask questions, just give a forecast"; "give your analytics"). Expect a scenario or range with caveats, not only "an exact forecast is impossible". 3) Ask "find forecasts on the web". Expect a statement that nothing was searched, not "I found".

## Tests

`tests/pi01.test.mjs`: six-step winter dialog through the real `server.ts` on a fake Gemini. Proves: the contract is in the prompt once, in place, on every turn; the user text and history reach the model; the server path keeps no markup, no crisis triage, empty `derived_numbers`, at most one retry; wording of the hard limits is present; no new JSON field. It does **not** prove live answer quality (the fake model returns fixed text); that is the owner's live check above.

## Not done

- Intent flags, `askAllowed` from the user's ban on questions, soft-audit reaction, retry text (PI-02).
- Mode paragraph (PI-03), search tool (TZ-INSTRUCTIONS-01 P4).
- No change to `tests/regression.json` or Simple Mode post-processing.
