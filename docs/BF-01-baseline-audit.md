# BiForge — BF-01: Read-Only Baseline Audit

> **Document:** BF-01 baseline audit · **Status:** historical record (read-only audit, commit `f1db1ad`) · **Current specification:** TZv3.0 (`docs/BiForge_TZ_v3.md`, 9 October 2026)
>
> **Identifier mapping.** `BF-01` belongs to the plan of TZv1.x. Identifiers `BF-01`…`BF-44` are frozen and are not reused (D-12); the current plan is `BX-01`…`BX-26` (TZv3.0, section 16.4). The findings of this audit continue in **BX-01.a** (baseline: test scripts and environment), **BX-02** (health checks, section 15.1), and **BX-01.b** (documents). The audit text (sections 1–9) is unchanged and was written against TZv1.2–TZv1.3; section 10 was added to map it to TZv3.0.

**Repository:** `ecooorg/bf`  
**Target branch:** `main`  
**Inspected baseline commit:** `f1db1ad357080075475c80668f592cf38271a455`  
**Audit mode:** Read-only  
**Audit result:** **PASS** — audit only; no implementation was performed.

## Scope and safety constraints

The task was to inspect the repository and report its baseline state without modifying repository files, installing or upgrading dependencies, creating commits or branches, creating or merging pull requests, changing GitHub/Railway/production settings, exposing secrets, or calling production endpoints.

Findings are classified as:

- **VERIFIED FROM REPOSITORY** — stated as verified by the audit from repository contents or commands.
- **INFERRED** — a conclusion drawn from verified findings.
- **NOT VERIFIED** — a proposal or point that was not established as an existing implementation.

## 1. Exact baseline commit

**VERIFIED FROM REPOSITORY**

The inspected baseline commit SHA was reported as:

`f1db1ad357080075475c80668f592cf38271a455`

The audit states that this was verified using:

```bash
git rev-parse HEAD
```

## 2. Repository structure and application entry points

**VERIFIED FROM REPOSITORY**

The repository was reported to follow a monorepo structure separating the frontend from backend and tooling:

- `src/` — frontend source.
- `public/` — public frontend assets.
- `server/`, `scripts/`, `tests/` — backend/tooling and tests.
- `server.ts` — main backend entry point; Express server.
- `src/main.tsx` and `index.html` — main frontend entry points for the Vite build.

## 3. Languages, frameworks, libraries, and package manager

**VERIFIED FROM REPOSITORY**

- **Languages:** TypeScript, JavaScript, HTML, CSS.
- **Frameworks/libraries:** React, Express, Vite, TailwindCSS, Google GenAI SDK.
- **Package manager:** npm, evidenced in the audit by `package.json` and `package-lock.json`.

## 4. Build, test, lint, and type-check commands

**VERIFIED FROM REPOSITORY**

The audit reported these scripts as configured in `package.json`:

| Purpose | Command | Reported behavior |
|---|---|---|
| Build | `npm run build` | Runs `vite build`. |
| Full test/check suite | `npm run check` | Runs all configured test suites. |
| Core tests | `npm run test:core` | Individual test suite. |
| Merge tests | `npm run test:merge` | Individual test suite. |
| Security tests | `npm run test:security` | Individual test suite. |
| Reasoning tests | `npm run test:reasoning` | Individual test suite. |
| Version tests | `npm run test:version` | Individual test suite. |
| Lint | `npm run lint` | Runs `tsc --noEmit`. |
| Copy lint | `npm run lint:copy` | Runs `node scripts/lint-copy.mjs`. |
| Type check | `npm run typecheck` | Runs `tsc --noEmit`. |

The audit also mentions `npm run test:ui` and `npm run test:virtual`.

## 5. Tests reported as executable without repository modifications or credentials

**VERIFIED FROM REPOSITORY — as reported by the audit**

The following test suites were reported to run successfully without modifying tracked files, requiring credentials, or requiring external system setup:

```bash
npm run test:version
npm run test:core
npm run test:merge
npm run test:security
npm run test:reasoning
```

The audit records these caveats:

- `npm run test:ui` requires Playwright browsers to be installed.
- `npm run test:virtual` initially failed because a global `tsx` command was missing.

These are reported findings from the audit; this Markdown document does not independently rerun those commands.

## 6. `GET /health` implementation

**VERIFIED FROM REPOSITORY — as reported by the audit**

- `GET /health` is **not implemented at the root level**.
- `GET /api/health` is implemented in `server.ts`, reported at lines 720–724.
- Expected unauthenticated response:

```json
{
  "status": "ok",
  "version": "1.6.0"
}
```

- The audit reports that an authenticated response includes additional properties: `hasKey`, `authRequired`, `lightModels`, and `strongModels`.

The audit did not call the production service.

## 7. Current application version

**VERIFIED FROM REPOSITORY — as reported by the audit**

The application version is reported as `1.6.0`, defined in:

- `package.json` — `"version": "1.6.0"`.
- `src/config.ts` — `export const APP_VERSION = '1.6.0';`.

## 8. Potential blockers for BF-01 / TZv1.2–TZv1.3 compliance

**INFERRED**

1. The root-level `GET /health` endpoint is missing. This could block infrastructure health checks if they specifically require the root path.
2. Running the complete `npm run check` suite may depend on `tsx` and TypeScript tools being installed or available in the execution environment. If they are not provided by the project dependencies or CI environment, this could block CI execution.

These points were identified as potential blockers, not as proof that a deployment is currently failing.

## 9. Proposed BF-01 plan — not implemented

**NOT VERIFIED — PROPOSAL ONLY**

The audit proposed the following work but explicitly did not implement it:

1. Add a direct `GET /health` route in `server.ts`, either as an alias for `/api/health` or returning a response such as:

   ```json
   {
     "status": "ok",
     "version": APP_VERSION
   }
   ```

2. Add a test verifying that `GET /health` returns HTTP `200 OK`.
3. Fix test scripts/environments (for example, use a project-local `tsx` through `npx` rather than depending on a global installation) so commands such as `npm run test:virtual` work consistently without global tools.
4. Run the relevant checks and verify that they pass after any future implementation.

**Important:** These are proposed implementation tasks only. This audit did not establish that they have been implemented.

## 10. Follow-up under TZv3.0

| Audit item | Where it continues | Note |
|---|---|---|
| Missing root `GET /health` (section 6, blocker 1) | BX-02, TZv3.0 section 15.1 (and section 4.4) | The route is added by `BF-01.diff` (removed in P00) (in the repository root), together with a test. TZv3.0 requires `/health` as liveness without outside calls and a separate `/ready` (database and migrations) once PostgreSQL exists (BX-04); `Healthcheck Path = /health` is set in Railway and unknown `/api/*` routes must return a JSON 404. Confirming this is part of BX-02 |
| `tsx` and test environment (section 5, blocker 2; proposal 3) | BX-01.a | Target: `npm ci && npm run check` green as a whole, locally and in CI; each exception is `REAL_ONLY` with a reason and the owner's confirmation |
| Documents and paths | BX-01.b | One canonical path for the specification: `docs/BiForge_TZ_v3.md` |

Re-verify the current state of the archive before relying on this table: the owner checks the actual state first, because part of the fixes may already be applied (BX-01.a).

## Final status

**PASS — READ-ONLY AUDIT ONLY**

The baseline audit was reported as complete. This PASS applies only to completion of the read-only audit; it does **not** mean the proposed `/health` route or test-environment changes have been implemented, nor does it certify a production deployment.

---

## Source and evidence note

This document was prepared from the supplied `BF-01` audit report. Statements labelled “VERIFIED FROM REPOSITORY” reproduce the audit's reported findings; they have not been independently re-executed as part of creating this Markdown file.
