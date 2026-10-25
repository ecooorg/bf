# P89 — Lightweight Intent Contract

> **P103:** the automated tests for this tool (`test:*` script and test file) were removed in the test audit. The tool itself is unchanged and is now a candidate for removal; see `docs/test-audit-p103.md`.

## Purpose

P89 turns a task request into a small, reviewable draft before implementation. It is a deterministic helper over existing P85 context, P86 impact and P87 verification tools—not a separate VIX subsystem, an LLM call, an approval workflow, or a mandatory user-authored form.

## Usage

```bash
npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts
```

Add explicit acceptance criteria, constraints, and scope when they are known:

```bash
npm run intent:contract -- \
  --task "Fix Project Mode ZIP download" \
  --file server/projectRoutes.ts \
  --acceptance "Empty or malformed ZIP is rejected." \
  --acceptance "Saved and read-back artifact bytes have matching size and SHA-256." \
  --invariant "Preserve authentication and project ownership checks." \
  --out-of-scope "Redesign the Project Mode interface." \
  --json
```

Save a new report without overwriting an existing file:

```bash
npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts --output /tmp/intent-contract.json --json
```

The CLI uses `--output` with exclusive-create semantics: if the target exists, it fails rather than silently replacing evidence. Reports should be kept outside generated inventories and should not include secrets or sensitive prompts.

## Contract fields and evidence semantics

- `goal.source` is `user_request`; the builder preserves the supplied task text.
- `scope.allowedAreas` contains candidate paths supplied by the caller. These are not absolute boundaries: a necessary dependency may be discovered and explained.
- Explicit out-of-scope items and invariants are labelled `explicit_user_input`.
- Heuristic invariants are labelled `inferred_repository_risk`; inferred acceptance criteria are labelled `inferred_draft` and require review.
- `contextEvidence` summarizes P85 candidate areas and uncertainties when that planner is available. `impactEvidence` summarizes P86 impact evidence when changed paths are provided and P86 is available. If either tool cannot run, the contract reports `UNAVAILABLE`/`UNKNOWN`; it does not pretend evidence exists.
- `requiredVerification` reuses P87 suggestions and required gates. Suggested commands are never executed and remain `SUGGESTED_NOT_RUN` or `NOT_RUN`.
- `intentDiff` maps each acceptance criterion to `UNVERIFIED` by default. A status supplied as evidence is only a record; the CLI does not run a check or validate external evidence artifacts. Do not mark an item `PASS` without a real, reviewable execution record.
- `status` is always a draft state. P89 cannot approve the contract or accept a patch on the Navigator's behalf.

## Validation

The validator reports missing goal/criteria, overlapping explicit scope, contradictory compatibility invariants, and unknown npm script names. It warns when inferred criteria need review or a verification item claims `PASS` without an execution-evidence source. It fails closed on malformed contracts. This is deterministic linting, not semantic proof: it will not detect every natural-language contradiction.

High-impact task language (for example, security, authorization, migration, destructive data changes or external integrations) without explicit acceptance criteria creates a review flag. The tool does not invent a specific policy decision; the human must resolve material ambiguity before accepting implementation.

## Human-simplicity gate

- **Human work removed:** repeatedly restating task intent, copying verification commands, and manually connecting request → context → impact → checks.
- **Safety/evidence added:** explicit versus inferred intent is separated; unknown evidence remains visible; unsupported success is not inferred; high-impact ambiguity is surfaced.
- **Complexity cost:** one schema/validator, a CLI, a compact report, and maintenance of heuristic risk mappings.
- **Value measurement:** P88 matched-task review/rework minutes, missed-criteria rate, unverified-claim rate, and human review effort. No savings are claimed before measured runs.
- **Net result:** hypothesis pending reviewed P88 task runs; the tool remains optional and read-only.

## Tests and limitations

`tests/intent-contract.test.mjs` covers explicit/inferred criteria, empty goal, high-impact review flags, unknown commands, conflicting scope/invariants, unsupported PASS claims, intent-diff defaults, available/partial/unavailable P85/P86 summaries, path normalization and malformed input. P89 does not execute verification commands, inspect actual run evidence, enforce a policy approval, modify source files, or make the inferred text user-approved.

## Commands

```bash
npm run test:intent-contract
npm run intent:contract -- --task "Fix Project Mode ZIP download" --file server/projectRoutes.ts --json
npm run check:docs
npm run lint:copy
npm run docs:check
```

## Rollback

Remove `intent:contract` and `test:intent-contract` from `package.json` and remove `npm run test:intent-contract` from `check`. Delete `scripts/intentContract.mjs`, `scripts/intentContractLib.mjs`, `tests/intent-contract.test.mjs`, and this document. Revert P89 entries in `AGENTS.md`, `CHANGELOG.md`, `docs/DOCUMENTATION-INDEX.md`, and `docs/AI-NATIVE-ROADMAP-P85-P91.md`. No runtime, UI, API, database, migration or persisted product format changes are introduced.
