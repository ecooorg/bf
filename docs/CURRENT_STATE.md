# Current state (P35)

**Active patch family:** P26 workspace + **P35 Universal File Analysis** delivered (extract PDF/Office/CSV/JSON/text; DATA markers; `test:p35`). Product version **35**.

**Next coding:** P36 — agent file mutations (ChangeSet apply, diff card, confirm, rollback), per `docs/BiForge_TZ_P26.md` §12.

**Gates:** CI must run `test:p35` with `test:p34` / `test:p27` / typecheck / build / check.

---

# Current state

> **Updated:** 15 October 2026.  
> Product version label: **34** (P34 explicit owner-directed code patch; MP3/MANUAL1/UI1 initiative remains separately tracked).  
> **Active work plan:** `docs/MASTER_IMPLEMENTATION_PLAN.md`.


## P34 — Universal Workspace MVP (explicit owner request, 15 October 2026)

- Added individual/multiple file selection to the existing Workspace import UI and made the panel available in Simple, Expert, and Project Mode flows.
- Explicit privacy acknowledgement gates bounded workspace attachments sent through the existing Simple/Expert agent request contract and Project analysis task field; secret-flagged entries are excluded.
- Ingested non-text files are retained byte-for-byte and represented to the agent by safe metadata unless a reader can decode them. P34 does not implement OCR, PDF/Office extraction, image-byte transport to vision models, or audio/video transcription.
- Fixed content-addressed blob persistence and added `test:p34` to `npm run check`.
- Verification status: NOT RUN in this environment because `npm ci --ignore-scripts --no-audit --no-fund` timed out before installing dependencies. Green CI and manual Simple/Expert checks are still required.
- This was an explicit owner-directed exception to the previously paused legacy Workspace queue; the MP3/MANUAL1/UI1 initiative status below is otherwise unchanged.

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
