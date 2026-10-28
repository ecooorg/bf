# P117.2 — Navigator handoff

**Outcome:** documentation-only patch. Records the first LIVE baseline of the Simple-mode Conversational Agent (assistant-judged) and defines the P116 recovery work order. No runtime behavior or provider integration is changed.
**Patch type:** documentation/specification only.
**Product version:** unchanged (117); this patch does not modify package or runtime version metadata.
**Manifest:** intentionally omitted; Navigator updates repository bookkeeping manually.
**Sequencing:** the P116 gate is OPEN. The implementation patch (proposed label P117.3) follows after the Navigator answers ND-1..ND-4. P121 is not authorized.

## Changed files

- `docs/AI-USER-VALUE-REPORT.md` — adds the P117.2 evidence record at the top (scenario verdicts, log observations, findings F1–F6, not-run items, discrepancies).
- `docs/AI-NATIVE-RENOVATION-TASK.md` — replaces the P117.1 task with the P116 recovery work order (WI-1..WI-7), decisions ND-1..ND-4, the live re-test protocol and rubric, and the P116 gate criteria.
- `CHANGELOG.md` — adds the P117.2 entry at the top (major 117, so `scripts/check-version.mjs` stays consistent).
- `NEXT_PATCH.md` — this handoff.

## Result of the LIVE baseline

7 PASS, 4 PARTIAL, 1 FAIL of 12 scenarios (58% PASS). Threshold (zero hard failures, at least 80% PASS) NOT met. No fabricated facts were observed; the main defect is that "Какая сейчас актуальная LTS-версия Node.js?" skipped search although search was enabled and the reply contained no version.

## Verification actually performed

- LIVE, manual: 16 requests on the stand at commit `ab35ebd`; replies from screenshots, request metadata from Render logs; current facts independently checked by web search on 2026-10-28.
- Source reading of `server.ts`, `server/webSearch.ts`, `server/conversationMode.ts`, `server/intentFlags.ts` to locate causes. Causes are labelled OBSERVED or HYPOTHESIS in the report.
- On the patched tree: `node scripts/check-version.mjs` PASS (117, release P117.2); `node scripts/docsCheckInventories.mjs` PASS; `node scripts/lint-copy.mjs` PASS.
- `node scripts/statusGraph.mjs --check` reports `docs/generated-check-graph.json` stale on BOTH the uploaded P117.1 archive and the patched tree, so this result is not caused by P117.2 (inputs untouched). Cause not investigated; it may be an artefact of the extracted copy. Hosted CI remains the authority; status UNKNOWN until a new CI result is observed.
- NOT_RUN: unit/mock tests, typecheck, build, CI, browser E2E, live failure-path tests, repeat runs.

## Limitations

- One run per scenario, one judge (the AI assistant); variance UNKNOWN. This is not production evidence and not automated E2E.
- Prompt-level causes (F2) are hypotheses until a paired comparison is run.
- The Serper time-range/date options in WI-3 are unverified and may change credit use (ND-4).

## Navigator actions

1. Apply this documentation patch; no files need deleting.
2. Answer ND-1 (freshness strategy), ND-2 (failure-path contract), ND-3 (label/version), ND-4 (search cost).
3. Hand the work order in `docs/AI-NATIVE-RENOVATION-TASK.md` to the implementing assistant for P117.3.
4. After P117.3 and a new observed CI result, run the 15-scenario LIVE re-test and record the final P116 Да/Нет.

Rollback: restore the four changed files from the local pre-patch backup.
