# Documentation Patch — Baseline and Evidence

Source: Navigator-supplied `bf-v70.zip`, containing the `bf-main/` tree.

## Observations from archive inspection
- The old `AGENTS.md` combined current patch state, documentation navigation, policy and UI instructions.
- The repository has 18 numbered Markdown documents and one requirements CSV.
- Large source modules include `server.ts`, `src/App.tsx` and `server/codeTaskService.ts`.
- `tsconfig.server.json` currently specifies `strict: false`.
- `scripts/check-docs.mjs` checks Markdown links and selected path references.
- `package.json` defines build, full check and focused test commands.
- Legacy route and repository inventories may become stale.

## Patch scope
Replace the AI entry point, introduce permanent rules, full transformation specification, index and evidence note; prepend changelog. All existing domain documents remain intact. No application source, SQL, tests or runtime configuration are intentionally modified.

## Verification limitations
Documentation link validation is the only patch-specific check attempted. Runtime, browser, database and provider equivalence are not established by this documentation patch. Phase 0 must measure the actual baseline before any structural changes.

## Risks
Legacy documents may contain contradictions. Their content cannot be discarded until requirements are mapped to implementation and accepted by the Navigator.
