# P42 — QA1 cross-mode automated checks

**Goal.** Add a reproducible offline QA1 suite that proves Simple / Expert / Project mode selection, prompt packs, classification, soft-fail/retry, UI start-screen contracts and key safety invariants work together, without live providers or network.

**Base.** `bf-v40.zip` (product state after P39/P40/P41 docs and UI1 start screen).

**May change.** `tests/qa1.test.mjs` (new), `package.json` (scripts), `docs/STATUS.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `CHANGELOG.md`, this SPEC and REPORT.

**Must not change.** Product runtime behaviour, API contracts, authentication, provider adapters, `src/App.tsx` semantics beyond already-shipped UI1, existing MP2/MP3/P41 tests (no weakening or deletion).

**PASS criteria.**
- `node --test tests/qa1.test.mjs` (or `npm run test:qa1`) passes.
- Suite covers: Simple classification + no-methodology/direct/evasion soft-fail; Expert prefix isolation and open-dialogue wording; Project analyst instruction; shared honesty/core; UI start cards and disabled Project; STATUS sequence UI1→QA1→MANUAL1; triage/support wiring; presence of prior mode regression files.
- `npm run check:docs` (or equivalent docs check) continues to pass for the added Markdown.
- No product version bump required if this remains a test/docs gate; if version is bumped, all version surfaces stay consistent.
- Live provider / MANUAL1 scenarios remain out of scope.

**Tests to add.** `tests/qa1.test.mjs`.

**Not done / postponed.** MANUAL1 live owner acceptance; any live provider integration tests; deployment.
