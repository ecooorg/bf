## C131 ImmoFinder current verification contract (2026-11-26)

- Production entry is `server/immofinder/live.ts`; pure admission is `server/immofinder/classify.ts` + `owner.ts` + `pipeline.ts`. Current category suites are `immofinder-live.test.mjs`, `immofinder-quality.test.mjs`, `immofinder-verify.test.mjs` and `agents-contract.test.mjs`; assertions must match the production C131 path.
- Index fixtures must meet the production 300-character minimum; detail fixtures must include substantive fetched-page evidence and matching final URLs. Do not weaken production thresholds to accommodate short mocks.
- Last red Core CI #45862026277 on d8aa670: 15 ImmoFinder failures, including short index fixtures, superseded locality/scope assumptions and legacy P128/P130 assertions. Post-change CI is NOT_RUN until Actions reports the exact commit.
- No automatic legacy-search payload restoration workflow or backup scripts are retained. PostgreSQL worker/store, route, delivery and repair utilities remain operational dependencies, not an alternate search engine. The P128/P130 pipeline must never be selected as a production fallback.
- Technical acceptance: Core CI and full verification DAG green on exact commit. Live acceptance: deployed commit health-verified, live search completed, at least 3 unique L1/L2 records reviewed for locality, rooms, fetched detail evidence and owner/contact provenance, and actual provider spend recorded. Zero accepted leads is not a successful product outcome.
- Search is manual; schedule and all delivery channels remain off. Letters remain drafts and are never sent automatically.

