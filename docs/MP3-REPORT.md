# MP3 Report — information-mode output quality guard

**Date:** 14 October 2026  
**Status:** Implementation delivered; live-model behaviour NOT_RUN.

## Scope delivered

1. **Soft-fail detectors** (`server/intentFlags.ts`):
   - limitation-only reply (short answers that only state impossibility);
   - methodology / “I am an AI” preamble before substance;
   - invented precision / live-data requirement the user did not ask for;
   - lecture content after methodology ban, direct-answer demand, or evasion critique.

2. **Information-mode retry** (`server.ts` `/api/conversation`):
   - for `conversationMode === "information"`, heavy gain-audit is still skipped (MP2);
   - soft-fail triggers one retry with the same information prompt plus `informationRetryHint` (not the decision repair package);
   - non-information modes keep the existing gain-audit + decision repair path;
   - one retry max; call budget and error handling unchanged; person receives the draft if retry fails.

3. **Tests** (`tests/mp3.test.mjs`):
   - unit coverage of soft-fail and retry-hint contracts;
   - Graubünden information fixture (classification + light prompt);
   - Expert / Project instruction regression (EXPERT_STEP_PREFIX, ANALYST_INSTRUCTION, server wiring);
   - `tests/regression.json` unchanged.

## PASS criteria (offline)

| Criterion | Result |
| --- | --- |
| limitation-only recognised in scenarios | unit tests pass |
| retry does not replace information with decision | retry hint has no STEP/gain/decision package language |
| retry limits preserved | single soft retry, existing generate() path |
| three mode fixtures | information / Expert / Project offline checks |
| Expert/Project structural strictness | prefixes and ANALYST_INSTRUCTION asserted |
| target tests | `node --test tests/mp3.test.mjs` (see run log) |
| full `npm run check` | NOT_RUN in this agent session (no full install) |

## Not in this patch

- UI1 mode selection on the start screen;
- live model acceptance (MANUAL1);
- QA1 end-to-end suite;
- any change to Expert/Project prompt bodies beyond regression assertions.

## Files touched

- `server/intentFlags.ts` (extended)
- `server.ts` (information soft-retry branch)
- `tests/mp3.test.mjs` (new)
- `docs/CURRENT_STATE.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `docs/MP3-REPORT.md`
