# P117 — Navigator handoff

**Outcome:** Expert problem-solving instructions strengthened; Gemini cascade standardized across Simple, Expert and Project; hourly live checks for three requested reserve models; opt-in Groq Cloud and Cloudflare Workers AI fallback.
**Patch type:** bounded runtime/provider-routing change plus tests and current-document updates.
**Version:** 117 (`package.json`, `package-lock.json`, `src/config.ts`, `CHANGELOG.md`).
**Manifest:** intentionally omitted; Navigator updates repository bookkeeping manually.
**Sequencing note:** P116 has not been applied per the Navigator. P117 is prepared against the P115-corrected baseline and does not include P116 changes; this is an explicit deviation from the roadmap, not evidence that P116 passed.

## Changed files

- `server/modelAvailability.ts` — hourly, minimal live probes; only successful candidates become eligible.
- `server/modelRegistry.ts` — standard primary order, candidate registry, Cloudflare Workers AI registry entry.
- `server.ts` — hourly probe scheduler and opt-in Groq/Cloudflare fallback for conversation and code-author routes.
- `server/projectRoutes.ts`, `server/analysisService.ts`, `server/appBuilderAdapter.ts` — provider adapters and opt-in routing for Project analysis/App Builder.
- `server/promptPacks.ts` — Expert investigation contract.
- `.env.example` — probe and provider configuration.
- `tests/model-availability-p117.test.mjs`, `package.json`, `package-lock.json`, `src/config.ts`.
- `CHANGELOG.md`, `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, `docs/AI-USER-VALUE-SPEC.md`, `docs/AI-USER-VALUE-REPORT.md`.

## Configuration

- Primary cascade defaults: `gemini-3.5-flash-lite,gemini-3.1-flash-lite` for LIGHT and STRONG.
- Candidate probes: enabled by default when `GEMINI_API_KEY` exists; disable with `ENABLE_GEMINI_CANDIDATE_PROBES=false`.
- External fallback is disabled by default. To opt in, set `ENABLE_EXTERNAL_MODEL_FALLBACK=true` and configure `GROQ_API_KEY` and/or `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`. Optional model overrides: `GROQ_FALLBACK_MODEL`, `CLOUDFLARE_WORKERS_AI_MODEL`.
- External provider fallback may transmit prompt content to a different provider and may incur costs. Explicit opt-in is required.

## Verification and limitations

- Static source and document edits made locally.
- Runtime tests, typecheck/build, full CI, browser E2E, live provider reachability: NOT_RUN in this patch environment.
- Probe calls are per process/replica; multiple replicas can make duplicate hourly probes. The exact `gemma-4` ID is tested as requested and may remain unavailable.
- External conversation fallback is text/JSON-only; it is not used when native attachment parts are present.
- Expert prompt changes do not yet prove a fully independent Expert state machine or E2E success.
- No files need deleting.

## Navigator actions

1. Apply patch and run CI.
2. If CI is green, test Simple, Expert, and Project mode with external fallback disabled first.
3. Only then opt in to Groq/Cloudflare if their data and billing terms are acceptable; test both provider success and failure paths.
4. Before P118, decide whether P116 will be applied and accepted, or formally superseded; do not silently treat it as complete.
5. Do not apply P118 until P117's CI and representative scenarios are reviewed.

Rollback: restore changed files from the local pre-patch backup. No deletion required.
