# P114 — Navigator handoff

**Decision requested:** accept the source/log audit as the current evidence baseline and authorize P115 Conversational Agent recovery.  
**Patch type:** audit / normative control artifacts / version metadata only.  
**Runtime changes:** none. The existing workflows remain unchanged.

## What changed
- Added `docs/AI-USER-VALUE-AUDIT-P114.md`, a source/log root-cause map across Simple, Expert, Project novice and Project professional.
- Confirmed one real App Builder failure (`invalid_spec`, zero files, ~73 seconds), opt-in web search with logged skips, shared Simple/Expert conversation orchestration, Expert stage/client-state constraints, and multiple Project build branches.
- Separated observed facts from user-reported symptoms and causal hypotheses; identified exact user-outcome acceptance gaps and recommended per-component dispositions.
- Updated active task, roadmap, documentation index, status, changelog and version metadata.
- Recorded the standing stop rule: if a future patch improves internal structure without demonstrated user-outcome improvement, stop and ask the Navigator before proceeding.

## Evidence status
- Source baseline: P112 / `b32357d23efceb5d02e193c5175f45a95a5e5316`, with accepted P113 overlay.
- Production diagnostics timestamp: `2026-10-27T11:55:15.442Z`, app v112, commit `b32357d`.
- Build report: `invalid_spec`, `goalImplemented=false`, `files=[]`, `units=[]`, one model call, 73,059 ms.
- Web search: code is opt-in unless `ENABLE_WEB_SEARCH=true`; production logs show both `used` and `skipped`.
- Verifier: logged `INVALID_OUTPUT` twice and `INVALID_REQUEST` once; impact on final answer is NOT_PROVEN.
- User reports all four workflows fail, but interactive live/browser reproduction of those failures is NOT_RUN due missing session, prompts and provider credentials in the supplied archives.
- Local audit/document/source-reference/version checks: PASS. Runtime tests, browser E2E, live-provider tests, full CI and hosted CI: NOT_RUN. Navigator reports prior CI green; this is not product acceptance.

## Next bounded action
P115: isolate/repair the Conversational Agent with scenario-based acceptance: direct stable-knowledge answers, freshness/current-events with search, search/provider failure, multi-turn context and truthful error handling. Before changing instruction rules, capture baseline prompts/outputs and use paired evaluations. Do not add internal architecture work unless its user-outcome benefit is explicit and testable.

## Rollback
Revert the P114 audit/control documents, handoff, changelog and version metadata as one unit. No runtime state or user data changed.

Charter conflicts: none
