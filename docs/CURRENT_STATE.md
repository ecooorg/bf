# Current state

> **Updated:** 14 October 2026.  
> Product version label: **24** (do not bump for documentation-only work; MP2/MP3 code changes keep label until owner decides).  
> **Active work plan:** `docs/MASTER_IMPLEMENTATION_PLAN.md`.

## Current initiative

| Field | Value |
| --- | --- |
| **ID** | **MP3 — information-mode output quality guard, soft retry and mode regression fixtures** |
| **Base archive** | `bf-main (13).zip` (owner upload; prior MP2 completion in tree) |
| **Scope** | Light soft-fail for Simple/information (limitation-only, methodology preamble, invented precision, lecture after ban); one short information-mode retry; mode fixtures; preserve Expert/Project |
| **Code permission** | Granted by owner command «Приступай к следующему этапу» (14 October 2026) |
| **Status** | MP3 implementation delivered in this patch. Closes when CI is green on `main` and the owner confirms. Live-model behaviour remains unverified until MANUAL1 |
| **Next after MP3** | UI1 — user mode selection on the start screen (after owner command) |
| **Plan** | `docs/MASTER_IMPLEMENTATION_PLAN.md` |

## Confirmed decisions

- The user chooses Simple, Expert or Project on the start screen.
- The selected product mode is not silently overridden by automatic routing.
- Simple targets general information and consultation; Expert targets deep analysis and non-obvious solutions; Project targets software/scientific/engineering project work.
- Use a small shared core plus specialised mode contracts. Preserve Expert and Project strictness while removing unnecessary decision scaffolding from Simple/information.
- MP1–MP3 are documented in the master plan. MP1 exists as preliminary file separation but does not prove the behaviour problem is solved.
- Documentation must be ready before coding. Coding begins only after a separate owner command.

## MP3 (this patch)

- `informationSoftFail` / `informationRetryHint` in `server/intentFlags.ts`: detect limitation-only, methodology preamble, invented precision requirement, lecture after methodology ban / direct-answer demand / evasion critique.
- `/api/conversation`: for `conversationMode === "information"` run the light soft-fail instead of heavy gain-audit; on fail, one retry with the same information prompt plus a short information-mode repair hint (not the decision package).
- Non-information modes keep the existing gain-audit + decision repair path.
- Retry limits, call budget and error handling unchanged (one soft retry; person still receives the draft if retry fails).
- `tests/mp3.test.mjs`: unit detectors, retry-hint contract, Graubünden information fixture, Expert/Project instruction regression, server wiring checks.
- Not done: UI mode selection (UI1); live-model acceptance (MANUAL1); QA1 end-to-end suite.

## MP2 (prior)

- Shared `promptCore.ts`; expanded information detection; default unclear → information; skip gain-audit for information; light information prompt branch; `tests/mp2.test.mjs`.

## Deferred, not marked done

The previous `docs/NEXT.md` queue for P27+ workspace work and the owner RM-* gates are paused as the active sequence while the mode initiative is underway. This pause does not mean those tasks are implemented or cancelled. After MANUAL1, the owner decides which remaining work becomes the next plan.
