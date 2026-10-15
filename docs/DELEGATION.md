# Delegation of decisions

> **Status: ACCEPTED** by the Navigator in chat on 13 October 2026 ("политику утверждаю"). Binding together with `AGENTS.md` (section 12) and `docs/START_HERE.md`. Revocable at any time by a one-line command from the Navigator.
> Purpose: apply BiForge's own principle (evidence first, human decides gates) to the process of finishing BiForge, and remove per-patch commands for work that carries no gate risk.

## Principle

The AI Assistant prepares decisions; the Navigator makes only those decisions that the specification reserves for a human. Everything else is decided by the AI Assistant and disclosed (extension of `AGENTS.md` section 3.1).

## Tiers

| Tier | Meaning | Condition | Examples |
| --- | --- | --- | --- |
| Tier 0 | AI Assistant acts and reports | Reversible; synthetic data only; bounded cost; no gate or permission effect | Patch SPEC drafts, tests, docs, version sync, evidence scripts |
| Tier 1 | Decide and disclose | As Tier 0, but a real choice exists. The choice goes to "Defaults chosen" in the SPEC and one line in the report; the Navigator may change it later | Pilot tool candidate, interim ADR defaults, variable values from `docs/NEXT.md` Reference 1 |
| Tier 2 | Decision card | Effect on a gate, a permission, spend or a product mode. Evidence is collected and the rule of the TZ is applied by `scripts/gate-eval.mjs`; the Navigator answers yes or no (`docs/DECISION_CARD_TEMPLATE.md`) | ADR-10, G2, G3, G4, enabling `model_patch`, SPEC approval of P19x and P25 |
| Tier 3 | Human only | Reserved by the specification; never delegated, never defaulted | Merge (TZ 11.5, 19), GitHub App write rights, `WAIVED`, billing and paid tier, creating secrets, approving acceptance tests of a starred step |

Silence never means consent in Tier 2 and Tier 3.

## Standing authorization

1. Tier 0 and Tier 1 work needed for patches P19x (SPEC, implementation, tests; `CODE_EXECUTOR` stays `manual`) and P25 (code and documents) may be prepared without a separate command per step. Merge into `main` and deployment stay with the Navigator.
2. P19x may be prepared in parallel with E-01. If the E-01 branch is negative, its SPEC moves to `ARCHIVE/` and nothing is enabled.
3. Process-automation patches `PA-NN` are started by an explicit command per patch. Recorded: PA-01 started 13 October 2026; PA-04 (E-01 lab runner) started 13 October 2026; PA-02 (E-01 harness) started 13 October 2026; P19x started 13 October 2026; a Railway **staging** environment is allowed for PA-03 (separate environment and database, synthetic data only). A test GitHub repository for PA-02 is **approved** (Navigator, 13 October 2026).

## Limits that do not change

- `AGENTS.md` sections 2, 4, 6, 7; `tests/acceptance/**` is never touched.
- A step is closed only by a record in the repository with date, commit SHA and CI link (`docs/NEXT.md`, rule 2).
- Fake providers and model statements are not evidence (D-08). Scripted "human" steps are marked `SCRIPTED_HUMAN_STEP` in evidence and shown as a deviation on the card.
- Code written by one model family is reviewed by another family when a second provider exists.
- No secrets in reports; variable names only.

## Software creation automation (13 October 2026)

The owner has established **maximum automation** as one of the project's primary priorities. For software creation, the assistant should automate bounded and reversible work by default: build the Task Package, invoke the configured code author, validate generated paths and contents, preserve a downloadable source bundle, and collect test/CI evidence where available. This priority does not override the tier model. The `manual` executor remains the default when `CODE_EXECUTOR` is unset. **RM-C3 closed (P43, 2026-10-15):** owner authorized `CODE_EXECUTOR=model_patch` after E-01 / ADR-10; runtime still requires that environment variable. GitHub App write rights stay Tier 3. No merge, deployment, secrets creation, GitHub permission change, or claim of passing tests is delegated. If automation requires changing a delegation rule, the assistant must first name the exact rule, explain why it is insufficient, and ask the owner to decide; it must not change that rule unilaterally.
