# Current state

> **Updated:** 14 October 2026.  
> Product version label: **24** (do not bump for documentation-only work).  
> **Active work plan:** `docs/MASTER_IMPLEMENTATION_PLAN.md`.

## Current initiative

| Field | Value |
| --- | --- |
| **ID** | **D0 — documentation package** |
| **Base archive** | `bf-v27-p1.zip` (owner upload, 14 October 2026) |
| **Scope** | Documentation only; establish the approved mode architecture and linear implementation plan |
| **Code permission** | **Not granted.** Do not change runtime code or UI until the owner explicitly commands the next stage. |
| **Next after D0** | MP2 — shared prompt core and Simple/information contract, only on owner command |
| **Plan** | `docs/MASTER_IMPLEMENTATION_PLAN.md` |

## Confirmed decisions

- The user chooses Simple, Expert or Project on the start screen.
- The selected product mode is not silently overridden by automatic routing.
- Simple targets general information and consultation; Expert targets deep analysis and non-obvious solutions; Project targets software/scientific/engineering project work.
- Use a small shared core plus specialised mode contracts. Preserve Expert and Project strictness while removing unnecessary decision scaffolding from Simple/information.
- MP1–MP3 are documented in the master plan. MP1 exists as preliminary file separation but does not prove the behaviour problem is solved.
- Documentation must be ready before coding. Coding begins only after a separate owner command.

## Baseline facts from `bf-v27-p1.zip`

- Prompt/router code exists in `server/promptPacks.ts`, `server/conversationMode.ts`, `server/intentFlags.ts`, and `server.ts`.
- Project Mode has its own instruction in `server/contextBuilder.ts`.
- `scripts/measure-prompt.mjs` exists.
- The shared core, information-specific audit/retry behaviour, new mode-selection UI, new regression fixtures, and successful manual Graubünden retest are **not confirmed as completed** by this documentation pass.

## Active sequence

1. **D0** — documentation package (current).
2. **MP2** — shared core + Simple/information prompt and routing behaviour.
3. **MP3** — information-mode output quality guard, soft retry and mode regression fixtures.
4. **UI1** — explicit Simple / Expert / Project start selection and selected-mode propagation.
5. **QA1** — integrated automated checks across modes, UI, schemas and retries.
6. **MANUAL1** — owner acceptance, including the original Graubünden dialogue.

Detailed scope and closure criteria: `docs/MASTER_IMPLEMENTATION_PLAN.md`. Do not advance without owner command and recorded evidence.

## Deferred, not marked done

The previous `docs/NEXT.md` queue for P27+ workspace work and the owner RM-* gates are paused as the active sequence while the mode initiative is underway. This pause does not mean those tasks are implemented or cancelled. After MANUAL1, the owner decides which remaining work becomes the next plan.
