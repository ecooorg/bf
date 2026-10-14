# MP2 REPORT — shared prompt core and Simple/information contract

**Date:** 2026-10-14  
**Base:** `bf-v27.zip`  
**Product version:** 24 (unchanged)

## Done

- `server/promptCore.ts` — universal core: date, language, honesty/search, safety.
- `server/conversationMode.ts` — expanded RE_INFORMATION (расскажи/объясни/подскажи/tell me/explain…); decision only on explicit RE_DECISION; default → `information`.
- `modeParagraph('information')` — explicit instruction to skip STEP 0–6 / decision rituals.
- `server/promptPacks.ts` — prepends `buildPromptCore(today)`.
- `server.ts` — when `conversationMode === "information"`, force `audit.passed = true` (no quality retry).

## PASS mapping (against MASTER_IMPLEMENTATION_PLAN MP2)

| Criterion | Result |
| --- | --- |
| Direct information requests get light information contract | Code path + modeParagraph (behaviour to be confirmed by MP3 fixtures / MANUAL1) |
| Decision/choice still gets decision contract | RE_DECISION unchanged and checked first after research/engineering |
| Shared constraints preserved | Core + existing HARD BOUNDARIES in pack |
| Expert / Project not weakened | No changes to Expert prefixes or contextBuilder Project instruction |
| Prompt size baseline | `scripts/measure-prompt.mjs` exists; measurement NOT_RUN in this environment |
| `npm run check` / `build` | NOT_RUN (sandbox lacked full node_modules / timed-out full extract) |

## Out of scope (MP3+)

- Soft quality gate / limitation-only soft retry for information
- New regression fixtures (Graubünden dialogue etc.)
- UI mode selection (UI1)
- Schema changes to make gain/newOptions optional

## Checks run

- Static review of changed files.
- `node` syntax not executed (no full install).
- Existing unit tests for mode/intent: NOT_RUN.

## Known gaps

- Full prompt body for Simple still contains the long decision STEPs; information mode relies on modeParagraph override + skipped audit. A future tightening can branch the body text itself.
- Prompt size measurement and `npm run check` deferred to environment with dependencies.

## Owner next

1. Apply patch to base, run CI.
2. Optionally measure prompt with `node scripts/measure-prompt.mjs`.
3. Command **MP3** when ready for quality-guard fixtures.
