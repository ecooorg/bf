# P16 report — GitHub integration foundation

**Status: PARTIAL.** Base archive: `bf-main-p15.zip`. Tool/model: OpenAI GPT-6.

## Delivered
- GitHub App RS256 JWT generation; installation-token and repository access check; bounded permission validation.
- HMAC-SHA256 webhook signature verification on the raw request body. `pull_request` and `check_run` are acknowledged only; invalid signatures return 401 and trigger a best-effort append-only audit record.
- Connector manifest, connection instructions, environment-variable reference, tests, and proposed ADR-06.
- No migration was needed. Real GitHub credentials were not used. Repository creation, PR writes, event processing, and `model_patch` activation are not included.

## Checks and evidence
- `node --experimental-strip-types --test --test-timeout=60000 --test-force-exit tests/github-integration.test.mjs` — PASS, 4/4 tests.
- `node --check scripts/verify-connections.mjs` — PASS.
- `node scripts/check-docs.mjs` — PASS.
- `node scripts/check-version.mjs` — PASS.
- `npm ci` — BLOCKED: package downloads failed with `EAI_AGAIN` resolving `registry.npmjs.org`; dependency installation did not complete.
- `npm run check` — BLOCKED at TypeScript check: missing `vite/client` types because dependencies were not installed.
- `npm run build` — BLOCKED: `vite: not found`.
- `npm run test:database:live` — BLOCKED: `tsx` missing; no local PostgreSQL client/server binary was available (`pg_isready` and `postgres` absent).
- `node scripts/patch-pack.mjs --base /mnt/data/bf-main-p15.zip --patch P16 --agent "OpenAI, GPT-6"` — BLOCKED: missing `jszip` dependency. The archive was assembled manually and contains only changed/new repository files; no manifest is included.
- Real GitHub App connection check — REAL_ONLY / NOT_RUN: credentials and installed App were not provided.

## Defaults chosen
No P16 SPEC or acceptance tests were supplied. Repository identity is configured through `GITHUB_REPOSITORY_OWNER` and `GITHUB_REPOSITORY_NAME`; webhook events are authenticated and acknowledged but not processed until later Gate Engine work. ADR-06 is explicitly proposed, not accepted, because visibility/organization and Actions limits require the owner's decision.

## Navigator checklist (Railway)
1. Add the GitHub App variables listed in `docs/CONNECTIONS.md`; keep private key and webhook secret only in Railway Variables.
2. Run `npm run verify:connections -- --only github`; expect `github/installation_token_and_repo: OK` only if the installation and permissions match the configured maximum.
3. Send a valid signed `pull_request` or `check_run` webhook to `/api/webhooks/github`; expect HTTP 202. An invalid signature must return HTTP 401.
