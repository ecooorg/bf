# BiForge AI-Native Transformation — Technical Specification

**Status: ACCEPTED (Navigator, 2026-10-23, commit 2232cb9).** Transformation Phases 0–5 closed. **p80:** flat docs/scripts; phase trees in `archive/`. Further work is maintenance/product, not reopening Phase 0.

## 1. Mission
Optimize the repository for an AI Assistant and a Navigator rather than a human-maintained engineering team. Minimize context needed per task, cross-file change surface, implicit dependencies, error recurrence and verification time without sacrificing functional quality, security or traceability.

## 2. Invariants
- Preserve Simple, Expert and Project user workflows and documented capabilities.
- Preserve API compatibility, persistence, SQL migration semantics, generated artifact formats and external integrations unless individually approved.
- Preserve authentication, authorization, project isolation, safety gates, budget controls, audit behavior and operational rollback.
- Preserve the feature manifest and regression coverage; do not equate type safety with behavioral correctness.
- Preserve deployment configuration and environment contract unless migration is approved.
- No implicit permission for GitHub write, production deployment or host execution of generated code.
- Any intended feature removal or contract change requires explicit decision and test/manifest updates.

## 3. Phase 0: forensic source and documentation audit
1. Hash and inventory the baseline archive; identify toolchain and dependency availability.
2. Attempt baseline `npm run check`, `npm run build`, UI verification and authorized live checks; report blocked cases separately.
3. Inventory every module, exports, imports, dependency cycles, side effects, dynamic registration and mutable globals.
4. Inventory HTTP routes, middleware ordering, auth guards, DTOs, provider adapters, configuration keys, SQL tables, migrations, state transitions, prompts, generated ZIP layouts and UI capabilities.
5. Link capabilities to code, contracts and tests; identify duplicated schemas, stale documents, ambiguous names and oversized responsibilities.
6. Measure baseline module size, dependency fan-in/fan-out, cycle count, estimated context cost, files per representative change and verification runtime.
Deliver: evidence report, module graph, capability/contract/test map, prioritized risk register.
**Gate:** Navigator reviews gaps and confirms the baseline before source edits.

## 4. Phase 1: mechanical guardrails
1. Create a machine-readable module map with generated imports/exports and explicitly annotated semantic relationships.
2. Enforce allowed import boundaries and detect cycles; ratchet existing violations without expanding them.
3. Add change-impact analysis covering imports, HTTP contracts, database, state machines, security and test relationships.
4. Introduce `verify:change` (or an equivalent command) producing machine-readable PASSED/FAILED/BLOCKED/NOT_RUN statuses.
5. Define canonical boundary-validation and error-handling conventions; use existing libraries when appropriate.
6. Keep complete regression and security checks available regardless of targeted test selection.
**Gate:** new checks execute on unchanged code; existing violations are inventoried, not hidden.

## 5. Phase 2: modularization without behavior change
1. Split the large `server.ts` by route responsibility while preserving middleware order, security guards, startup and error handling.
2. Split `src/App.tsx` into cohesive components and state operations without changing user workflows or responsive behavior.
3. Audit `server/codeTaskService.ts`, `src/ProjectMode.tsx`, `src/index.css` and other large files; divide only at stable responsibilities.
4. Reuse existing executor, reviewer, repair and provider services; prohibit parallel duplicate implementations.
5. Prefer explicit dependencies at meaningful module boundaries; avoid interface-per-function and pass-through layers.
6. Separate pure decisions from external side effects; make critical state transitions explicit.
**Gate per patch:** affected contract/security tests, full checks where feasible and viewport checks for UI changes.

## 6. Phase 3: typing, contracts and semantic names
1. Gradually enable strict server-side TypeScript and useful compiler checks; resolve real errors rather than mass casting.
2. Replace unsafe `any` at trust boundaries with `unknown` and runtime schema validation.
3. Consolidate duplicated DTOs and schemas around one source of truth where feasible.
4. Use exhaustive discriminated states and distinct identifier types where confusion creates risk.
5. Standardize verb semantics: get, load, create, validate, parse, normalize, calculate, build, save, execute, transition, delete, resolve.
6. Rename ambiguous files and functions only after examining actual responsibility and references.
7. Remove stale/redundant comments; retain required notices and irreducible safety rationale.
8. Avoid unnecessary metaprogramming, reflection, magic frameworks and implicit globals.
**Gate:** compile, contract, behavioral and security equivalence; no accidental API/DB drift.

## 7. Phase 4: documentation and context architecture
1. Maintain a short `AGENTS.md` entry point and permanent rules in `AI-OPERATING-RULES.md`.
2. Keep this specification as the staged acceptance contract and a concise domain index for selective reading.
3. Generate route, module, environment and schema inventories from source instead of hand-maintaining snapshots.
4. Preserve domain requirements, security rationale and unresolved owner decisions while consolidating redundant references.
5. Detect broken links, stale paths and machine-map divergence automatically.
6. Retire legacy documents only after requirement-by-requirement migration and explicit approval.
**Gate:** every live requirement has one discoverable canonical source; historical snapshots cannot override code evidence.

## 8. Phase 5: equivalence and acceptance
1. Compare baseline and result for routes, middleware, schema, migrations, state transitions, feature manifest, generated artifacts and security behavior.
2. Run full test suites, builds, responsive browser checks and available authorized live integration tests.
3. Record missing evidence explicitly; do not claim unexecuted tests pass.
4. Document rollbacks, remaining risks, deliberate compatibility changes and owner decisions.
5. Measure post-change context cost, dependency complexity, files per change and check time against Phase 0.
**Gate:** Navigator approves the final result with an explicit exception list if needed.

## 9. Design and measurement rules
- Aim for cohesive, locally understandable modules; ~100–300 lines is guidance, not a hard limit.
- Use semantic filename prefixes for related areas without deep folder hierarchies.
- Prefer one authoritative schema over multiple manually synchronized types.
- Minimize the number of modules required to understand a single modification.
- Change-impact maps must include semantic dependencies beyond imports.
- Report token estimates with a stated method; never present guesses as exact measurements.
- Treat no cycles, no duplicate contracts and no architectural boundary violations as goals, not assumed baseline facts.
- Optimize total reasoning/change/verification cost, not line count alone.

## 10. Required patch acceptance report
Every implementation patch records: authorized scope; changed, renamed and deleted files; affected contracts; expected behavior; tests actually executed with exit codes; blocked checks; security implications; rollback; unresolved decisions; relevant before/after metrics.

## 11. Owner decision register
- **D01:** approve this transformation specification and permanent rules.
- **D02:** approve staged behavior-preserving source refactoring after Phase 0 review.
- **D03:** approve gradual strict typing, generated maps and verification infrastructure.
- **D04:** require separate explicit approval for intentional API, database, security or product changes.
- **D05:** retain legacy domain references until validated migration and separate deletion authorization.

## 12. Definition of done
All approved work is implemented in atomic patches; behavior and security are preserved or exceptions are approved; verification evidence is reproducible; the Navigator formally accepts the result. Blocked tests remain disclosed.
