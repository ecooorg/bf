# BX-03.a report — partial implementation

## Done
- Added `server/healthRoutes.ts` and moved `/health`, `/ready`, and `/api/health` registration out of `server.ts`.
- `server.ts` injects configuration and the existing `authenticated()` predicate; the extracted module does not import the entrypoint.
- Existing fake-provider characterization tests remain the acceptance baseline: `tests/infra.test.mjs` and `tests/server.test.mjs`.
- No assertions were removed or relaxed. No provider credentials or network calls were added.

## Not yet verified
- `npm run check` and virtual tests were not run in this environment because dependencies are not installed (`node_modules` absent). Therefore this report does **not** claim a passing test run.
- The previously reported `virtual-stage2` J3 bad-JSON retry failures remain visible and unresolved; they were not changed as part of this extraction.
- The remainder of `server.ts` is not yet decomposed. BX-03.a is partial, not complete.

## Next
1. Run `npm ci && npm run check` in CI.
2. Resolve any regression caused by the extraction without changing existing behavior or weakening tests.
3. Continue with the next cohesive route group only after characterization tests pass.
