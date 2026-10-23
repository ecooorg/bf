# Permanent AI Operating Rules

Status: proposed for Navigator approval. Language: English for code and repository documentation; speak to the Navigator in the language of the conversation.

## Authority and precedence
1. Explicit Navigator decisions and non-waivable security constraints.
2. These permanent rules and the entry-point instructions.
3. Owner-approved product and integration contracts.
4. Code, tests and migrations as evidence of implemented behavior.
5. Historical documents as non-normative background.
Disagreements between requirements and implementation must be reported, not silently resolved.

## Authorization tiers
- Tier 0: implement routine work within explicitly authorized scope.
- Tier 1: make local design choices and disclose material trade-offs.
- Tier 2: request Navigator approval for product, security and integration decisions.
- Tier 3: never act without explicit authorization for production deployment, merge, GitHub write access, secrets, billing, host execution of generated code or formal acceptance.
Silence never means approval.

## Code rules
- Optimize for AI local reasoning, explicit boundaries and minimal change surface.
- Use meaningful semantic names and cohesive modules; avoid artificial fragmentation.
- Prefer straightforward code, explicit dependencies, deterministic decisions and controlled effects.
- Validate untrusted inputs at runtime. TypeScript types do not validate external JSON.
- Use one authoritative contract definition where feasible; avoid duplicated schemas.
- Avoid hidden global mutable state, dynamic registration, reflection and unnecessary abstractions.
- Separate state transitions and decisions from network, filesystem and database effects.
- Remove redundant explanatory comments, but preserve mandatory notices, safety constraints and irreducible rationale.
- Keep folder nesting shallow where practical, without sacrificing cohesion.
- Preserve security, authorization, privacy and existing external behavior by default.
- Do not delete tests simply because types or architecture become stricter.

## Patch protocol
1. Identify affected capability, real dependencies, invariants and allowed scope.
2. Make one logically atomic change. Separate mechanical refactoring from behavior changes.
3. Run focused checks, then full `npm run check` when possible; record exact commands and outcomes.
4. For UI changes inspect 1200px and 390px views where browser tools exist.
5. Report modified/renamed/deleted paths, compatibility, risk, rollback and blocked verification.
6. Deliver a changed/new-files ZIP. List deletions explicitly.
7. Update `AGENTS.md` current status and prepend a `CHANGELOG.md` entry.
8. On rename or deletion search all code, tests, scripts and docs for stale references.

## UI policy preserved from baseline
- One screen, one clear job and primary action; secondary actions are quieter.
- Keep hints short; detailed help belongs behind contextual help controls.
- Never expose internal mechanisms or identifiers in user-facing copy.
- Use established UI terminology rather than inventing synonyms.
- Do not show actions with no meaningful effect; explain disabled actions.
- Inputs require visible labels and boundaries; avoid duplicate explanations.
- Existing copy-lint allowances must not increase.
- Check responsive layout and labels at 1200px and 390px before shipping UI changes.

## Verification integrity
Only executed successful checks are PASSED. A missing dependency, unavailable database or browser, skipped live integration or unrun test is BLOCKED or NOT RUN, never PASSED. Static inspection does not prove runtime equivalence.
