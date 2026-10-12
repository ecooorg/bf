# PI-02 — Intent flags and post-processing (Simple Mode)

**Goal.** Server-side detectors of user intent adjust existing conversation post-processing: forbid follow-up questions when the user banned them, force a soft quality retry when an approximate answer was requested but the draft is only limitations, adapt the retry prompt when the user criticized evasion, and record `search_expected` when a web search was requested (no search tool yet). Source: `CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md` §5, §7 P2; TZ 16.4.2 row PI-02.

**Base.** Owner archive `bf-vPI-01.zip` (version label `PI-01`).

**May change.** `server.ts` (detectors + wiring next to `conversationGainAudit` / `askAllowed` / retry), version files, `tests/pi02.test.mjs`, `package.json` scripts, docs (`PI-02-SPEC`, `CURRENT_STATE`, `NEXT`, changelogs).

**Must not change.** Project Mode; JSON schema of the conversation answer; `derived_numbers` validation; parser and repair; algorithms of `scrubInternalLabels`, `stripMarkdown`, `firstQuestionOnly`, `buildVisibleReply` (only the `askAllowed` input); HARD BOUNDARIES / uncertainty-contract prompt text from PI-01; `tests/acceptance/**`; `tests/regression.json`.

## Behaviour

### Detectors (last user text + recent user history)

| Flag | Meaning |
| --- | --- |
| `userForbadeQuestions` | Explicit ban on questions («не задавай», «просто дай», «don't ask», …) |
| `userAskedApproximate` | Request for a rough / preliminary estimate |
| `userAskedSearch` | Request to find / search online materials |
| `userCriticizedEvasion` | Explicit criticism that the answer does not solve the task |

No new fields in the model JSON.

### Effects

1. **askAllowed:** `askAllowed = askAllowed && !userForbadeQuestions`.
2. **Soft quality-audit:** if `userAskedApproximate` and the draft is limitation-only (no substantive gain, no nextStep, limitation wording) → `passed = false` → existing one retry.
3. **Retry text:** if `userCriticizedEvasion` (and/or approximate), append a short requirement to change strategy / give a usable result under the uncertainty contract.
4. **Search:** if `userAskedSearch` → `search_expected: true` in response `meta` and a log line; the reply path does not claim a search was performed (PI-01 contract already forbids that in the prompt).

## Defaults chosen

- Version label `PI-02` (instruction track, same pattern as `PI-01`).
- Detectors are pure regex over the last user text and the last few user turns (standing ban on questions survives across turns).
- Limitation-only check is local and deterministic; it does not invent gain types.
- Critical-ambiguity override of a question ban is not introduced (would need an explicit meta mark; out of scope).

## PASS criteria

- Machine: `npm run test:pi02`; `npm run test:pi01`; `node scripts/check-version.mjs`; `node scripts/check-docs.mjs`; `npm run check` (or the relevant subset); `npm run build` if feasible.
- Owner on Railway after deploy: 1) `GET /health` shows version `PI-02`. 2) After «не задавай вопросы, просто дай» the visible reply has no follow-up question. 3) After a request for an approximate figure and a limitation-only draft, a retry path is used when multiple strong models are configured. 4) «Найди прогнозы в сети» yields `meta.search_expected === true` and no claim that a search was performed.

## Tests

`tests/pi02.test.mjs`: unit checks of `detectUserIntentFlags`; integration through real `server.ts` on a fake Gemini for (a) question ban → empty `question`, (b) search request → `meta.search_expected`, (c) uncertainty contract still present (PI-01 regression). Does not prove live answer quality.

## Not done

- Mode paragraph (PI-03).
- Actual search tool (TZ-INSTRUCTIONS-01 P4).
- Critical-ambiguity meta override of a question ban.
- Changes to `tests/regression.json` or Project Mode.
