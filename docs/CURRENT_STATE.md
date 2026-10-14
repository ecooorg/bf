# Current state

> **Updated:** 14 October 2026.  
> Product version label: **24** (do not bump for documentation-only work; MP2 code changes keep label until owner decides).  
> **Active work plan:** `docs/MASTER_IMPLEMENTATION_PLAN.md`.

## Current initiative

| Field | Value |
| --- | --- |
| **ID** | **MP2 — shared prompt core and Simple/information contract** |
| **Base archive** | `bf-v27.zip` (owner upload) |
| **Scope** | Shared `promptCore.ts`; expanded information detection; default unclear → information; skip gain-audit/retry for information; preserve Expert/Project |
| **Code permission** | Granted by owner command «Приступай к следующему этапу» |
| **Next after MP2** | MP3 — information-mode output quality guard, soft retry and mode regression fixtures |
| **Plan** | `docs/MASTER_IMPLEMENTATION_PLAN.md` |

## Confirmed decisions

- The user chooses Simple, Expert or Project on the start screen.
- The selected product mode is not silently overridden by automatic routing.
- Simple targets general information and consultation; Expert targets deep analysis and non-obvious solutions; Project targets software/scientific/engineering project work.
- Use a small shared core plus specialised mode contracts. Preserve Expert and Project strictness while removing unnecessary decision scaffolding from Simple/information.
- MP1–MP3 are documented in the master plan. MP1 exists as preliminary file separation but does not prove the behaviour problem is solved.
- Documentation must be ready before coding. Coding begins only after a separate owner command.

## MP2 changes (this patch)

- Added `server/promptCore.ts` (language, honesty/search, safety).
- `detectConversationMode`: expanded RE_INFORMATION; decision only on explicit signals; default → information.
- `modeParagraph(information)`: explicit skip of decision-engine rituals.
- `/api/conversation`: skip `conversationGainAudit` / quality retry when `conversationMode === "information"`.
- `buildSimpleConversationPrompt` prepends shared core.

## Deferred, not marked done

The previous `docs/NEXT.md` queue for P27+ workspace work and the owner RM-* gates are paused as the active sequence while the mode initiative is underway. This pause does not mean those tasks are implemented or cancelled. After MANUAL1, the owner decides which remaining work becomes the next plan.
