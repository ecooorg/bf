# P116 — Navigator handoff

**Outcome:** Conversational Agent freshness behavior improved: current-information and explicit-search requests trigger web lookup by default, and failed/unavailable lookup is disclosed instead of silently presenting memory as current fact.
**Patch type:** bounded runtime behavior and deterministic regression tests.
**Manifest:** intentionally omitted per Navigator instruction; repository bookkeeping is handled manually by the Navigator.

## Changed files

- `server/webSearch.ts` — default-on freshness lookup policy with explicit opt-out; broadened Russian/English current-version, release and status detection; truthful fallback disclosure helper.
- `server.ts` — applies the freshness policy to `/api/conversation`, adds the disclosure when current grounding was expected but not obtained, and records search expectation/status in response metadata.
- `server/promptPacks.ts` — instructs the conversational information path to prioritize supplied fresh evidence and not present remembered facts as live-verified.
- `tests/web-and-epistemics.test.mjs` — deterministic tests for default-on/opt-out, freshness detection and disclosure.
- `.env.example` — documents default-on behavior and explicit opt-out.
- `docs/AI-USER-VALUE-SPEC.md` — clarifies the freshness and disclosure contract.
- `docs/AI-NATIVE-RENOVATION-TASK.md` — records P116 scope and P117 next action.
- `docs/AI-USER-VALUE-REPORT.md` — prepends P116 evidence and limitations.
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md` — marks the current workstream and gates for P116/P117.
- `CHANGELOG.md`, `package.json`, `package-lock.json` — patch record and version 116.

## Behavior details

- Web lookup is now enabled by default for explicit search requests and detected time-sensitive questions. Set `ENABLE_WEB_SEARCH=false` (or `0`, `off`, `no`) to opt out.
- Ordinary personal-decision messages are not freshness triggers. Existing crisis, document-intent and attachment-focused exclusions remain.
- Only the latest user message is sent to the search path; conversation history, state and attachments are not sent as search text.
- If current lookup is expected but does not return grounded results, the reply gets a short language-aware note that current facts were not verified. Successful grounded results retain their source footer.
- This patch does not make every answer use web search and does not claim live-provider reliability or global answer quality has been established.

## Verification

- `node --experimental-strip-types --test tests/web-and-epistemics.test.mjs`: PASS (24/24).
- `node --experimental-strip-types --test tests/conversation-turn.test.mjs`: PASS (8/8).
- Typecheck/build/full CI: NOT_RUN. `npm ci` timed out before dependencies could be installed, so the full toolchain was unavailable.
- Live-provider and browser end-to-end scenarios: NOT_RUN; no live session or credentials were used to verify search quality, source accuracy, latency or production configuration.
- Baseline live outputs: NOT_CAPTURED because no authenticated live-provider test was available.

## Next action

P117: implement and accept the Expert Problem-Solving Agent as a separate workflow, only after P116 is applied and its available verification results are reviewed.

## Rollback

Restore the listed files from the Navigator's local pre-P116 backup. If default-on external lookup is not desired, set `ENABLE_WEB_SEARCH=false` while evaluating or roll back the patch.
