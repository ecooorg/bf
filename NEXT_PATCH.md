# P117.1 — Navigator handoff

**Outcome:** documentation-only planning patch defining the future Universal Model Resilience Layer for P121. No runtime behavior or provider integration is changed by P117.1.
**Patch type:** documentation/specification only.
**Product version:** unchanged; this patch does not modify package or runtime version metadata.
**Manifest:** intentionally omitted; Navigator updates repository bookkeeping manually.
**Sequencing:** P117.1 records a future task after the current P116–P120 user-facing-agent line. P121 is not authorization to begin before P120 acceptance and the unresolved CI baseline are addressed.

## Changed files

- `docs/AI-USER-VALUE-SPEC.md` — adds the model resilience system contract, requirements, safety boundaries, and acceptance criteria.
- `docs/AI-NATIVE-RENOVATION-ROADMAP.md` — adds P121 after P120 with explicit prerequisite gates.
- `docs/AI-NATIVE-RENOVATION-TASK.md` — records this documentation-only task and its future implementation boundary.
- `docs/AI-USER-VALUE-REPORT.md` — adds a newest-first record stating that no runtime behavior was changed or tested.
- `CHANGELOG.md` — records the documentation-only planning decision.

## Included design decisions

- A provider/model registry with exact IDs, capabilities, credentials/configuration state, quota/cost notes, health history, and timestamps.
- Health monitoring that separates provider/model metadata checks from minimal generation probes; probes are staggered, budgeted, throttled, and configurable.
- Routing based on task capability, health, quota, latency, cost, provider independence, and output quality—not a single flat priority list.
- Bounded retries, error classification, circuit breakers, recovery probes, context preservation, and truthful failure states.
- Output validation distinct from API availability; independent model critique is selective and supplemented by deterministic tools where possible.
- Initial provider candidates include Gemini, Groq, Cloudflare Workers AI, OpenRouter, Hugging Face Inference Providers, and potentially local/open-weight deployment. Exact IDs, live access, pricing, terms, and task quality must be revalidated at implementation time.
- Automatic discovery may create a candidate list, but must not silently enable an unreviewed model for production traffic.

## Open questions deliberately deferred until before P121 launch

1. Per-provider and global spend/quota budgets, including protected emergency reserves.
2. Whether health probes may consume provider quota, and their frequency/budget per provider.
3. Which providers may receive user prompts and what data-transfer consent/configuration is required.
4. Which models/tasks require independent critique, and the latency/cost thresholds.
5. Whether a local inference route is feasible for the deployment environment.
6. What telemetry may be retained, for how long, and how user data is redacted.
7. Which candidate models from the Navigator's list have valid IDs, supported endpoints, and acceptable current terms.

These questions are intentionally not answered in P117.1. They must be resolved before enabling the system, not used to delay the current P116–P120 line.

## Verification and limitations

- Documentation-only edits. Runtime tests, typecheck/build, provider probes, E2E, and CI were NOT_RUN for P117.1.
- No model availability, model quality, free-tier quota, or provider compatibility is asserted as verified by this patch.
- This patch does not certify P117 or resolve the previously reported P115 CI/version mismatch.

## Navigator actions

1. Apply this documentation patch independently; no files need deleting.
2. Continue resolving the current P116–P120 sequence and the CI baseline before starting P121.
3. Before P121 implementation or launch, answer the deferred questions and revalidate provider catalogs, exact model IDs, pricing, and terms.

Rollback: restore the five changed documentation files from the local pre-patch backup.
