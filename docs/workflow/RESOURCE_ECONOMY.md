# BiForge Resource Economy Principles

## Objective
Achieve the maximum useful result with the minimum necessary consumption of tokens, time, compute, network, storage, and external API calls, without compromising correctness, safety, or required quality.

## Rules
- Prefer deterministic local tools for deterministic tasks; use an AI model when reasoning or generation adds real value.
- Send only the context relevant to the current task: assigned specification section, current project state, relevant artifacts, and concise prior reports.
- Avoid repeatedly sending full conversation history when a compact state or artifact reference is sufficient.
- Reuse valid outputs and caches when safe; invalidate them when their inputs or assumptions change.
- Route tasks to the least expensive suitable model; use stronger models for genuinely difficult, high-risk, or review-critical work.
- Batch independent low-risk operations when this reduces overhead, but do not combine BF steps in a way that obscures acceptance or rollback.
- Avoid duplicate file copies; prefer stable artifact identifiers, hashes, manifests, and version references where supported.
- Respect provider quotas, rate limits, timeouts, and retry guidance. Avoid uncontrolled retry loops.
- Measure resource use where telemetry is available; do not fabricate measurements.

## Trade-off
Economy is not an excuse to skip necessary tests, security checks, or independent review of high-risk changes. Optimize total cost of achieving a verified result, not merely the number of model calls.
