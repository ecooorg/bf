## P131.9a — locality pre-filter + 410 demotion + G6 push integrity (2026-11-26)
- **Problem:** last live run 0 kept (82 locality prefilter, 19 outside_target, UrbanHome 410s); connector truncation took live.ts offline.
- **Change:** `liveFilters.ts` (titleHint locality gate, tourist skip, 410 weight/block); wire in `live.ts`; docs/CONNECTOR_PUSH_RULES.md (G6).
- **Scope:** ImmoFinder source-first path only; hard gates unchanged.

## P131.9 production yield/diagnostics correction
- Correct preview kept flags after no-contact-route rejection; add authoritative accepted-level/provider availability counters; base CI threshold on persisted kept counts; poll completed diagnostics by runId.

## P131.9 live acceptance deploy identity
- Wait for the exact pushed commit to appear in production `/health` before starting the bounded live search.

## P131.9 — manual automation trigger
- Allow explicit `manualRun:true` for the existing secret-authenticated run endpoint to bypass only the schedule-due check; normal secret requests remain schedule ticks.

## P131.9 live trigger correction
- Distinguish explicit secret-authenticated manual automation from schedule ticks so CI can start a real production search while the scheduler remains disabled.

## P131.9 follow-up — CI contract migration
- Update the workflow contract test to validate the new CI-gated production live-acceptance job instead of the retired issue-comment workflow.

## P131.9 — live acceptance in Core CI
- Bound production live search to Core CI behind an explicit commit marker; report sanitized counts and provider-call evidence only.

## P131.9 owner-name chrome filter
- Stop contact-page UI labels (e.g. Kontaktformular) from being appended to extracted owner names on Flatfox detail pages.

## P131.9 half-room parser
- Accept Swiss `3 ½ Zimmer` with whitespace before the half-mark in the production room regex.

## P131.9 source-first CI alignment
- Align category tests to the C131 source-first runner; retire automated legacy-search payload restoration.
