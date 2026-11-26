## P131.9a — locality pre-filter + 410 demotion + G6 push integrity (2026-11-26)
- **Problem:** last live run 0 kept (82 locality prefilter, 19 outside_target, UrbanHome 410s); connector truncation took live.ts offline.
- **Change:** `liveFilters.ts` (titleHint locality gate, tourist skip, 410 weight/block); wire in `live.ts`; AGENTS G6 + `docs/CONNECTOR_PUSH_RULES.md`.
- **Scope:** ImmoFinder source-first path only; hard gates unchanged.

