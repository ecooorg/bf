# P51 — One Mode control on every screen

**Goal.** The same top-bar control on Simple, Expert and Project: a **Mode** button that shows the current mode and opens a list of the three modes. The overlapping items in the More menu are removed.

**Base.** Archive `bf-v48.zip` with the P50 patch applied (P51 edits `docs/REPO_MAP.md`, `docs/STATUS.md` and `docs/PATCH_JOURNAL.md` on top of P50).

## Problem

- More held three items doing nearly the same thing: "Mode selection (Simple / Expert / Project)", "Switch to Expert method / Simple chat" and "Project workspace (separate)".
- The Project page (`/project`) had its own header without the top bar, and showed "Back to mode selection" twice.

## Design

1. New shared component `src/ModeMenu.tsx`: button `Mode` with the current mode name and a chevron; list with **Simple chat**, **Expert method**, **Project workspace** (radio items, current one checked; Project disabled when the deployment has Project mode off) and a separator followed by **Back to mode selection** (`data-testid="change-mode"`). Closes on outside click and Escape.
2. Chat shell (`src/App.tsx`): Simple and Expert already share one `Header`; the Mode button is its first element. Choosing Simple or Expert switches in place (`chooseStartMode`), Project opens `/project`, Back to mode selection calls `resetStartMode`. The three old items are removed from More. The Simple-mode hint text now points to the Mode button.
3. Project page (`src/ProjectMode.tsx`): a toolbar row with the same Mode button (current = Project) and Sign out. Choosing Simple or Expert stores the mode in `sessionStorage` and opens `/`. The duplicated "Back to mode selection" links are gone.
4. `expertMode` in the chat shell now starts from the saved mode, so returning from `/project` as Expert, or reloading in Expert, opens Expert instead of Simple under an Expert label.
5. Styles (`src/index.css`): same dropdown look as More; on narrow screens Mode takes the first, slightly wider column of the existing five-column header grid.

## May change

`src/ModeMenu.tsx` (new), `src/App.tsx`, `src/ProjectMode.tsx`, `src/index.css`, `tests/p41-ui1.test.mjs`, `tests/bx06.test.mjs`, `tests/ui-check.mjs`, `docs/REPO_MAP.md`, `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`.

## Must not change

Server code, API contracts, prompts, Expert method steps, History/Drive/New behaviour, the mode start screen and its cards, session storage key `biforge-start-mode`.

## Defaults chosen

- Mode is a dropdown of modes (one tap to switch Simple/Expert), with the start screen kept as a fourth entry.
- Project keeps New / Drive / History out of its toolbar (they belong to chat dialogues); only Mode and Sign out.
- No version bump.

## Acceptance

1. `npm run test:p41`, `test:bx06` and `npm run check` pass; `tests/ui-check.mjs` (browser) passes on the viewports it covers.
2. Manual: on Simple, Expert and Project the first control in the top bar is Mode; More no longer lists mode items; switching works in both directions, including Project → Expert.
