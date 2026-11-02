# BiForge — Full Audit Report (Patch Audit)

| Field | Value |
|---|---|
| Audit date | 2026-11-02 |
| Audited baseline | `bf-124-8.zip` (patch `124.8`) plus the delivered fix `P124.9` (crisis-turn question safety) |
| CI evidence reviewed | Hosted run `41412782921`, commit `bb4980a262c16835773b2d65215a818c6a3dcc84` (`ci-diagnostics.zip`) |
| Governing rules | `AGENTS.md` (hard gates G1–G5, obligation map `BIO-001…009`, priority cascade P0–P6) |
| Report type | Read-only audit. No product source was changed by this report. |

---

## 1. Executive summary

BiForge is in a structurally healthy state: the architecture ratchet holds (0 cycles, 0 boundary violations), generated inventories are current, authentication and webhook verification use constant-time comparison, and the hosted CI run passed 1517 of 1520 tests before the one evidenced defect was fixed in P124.9.

The audit nevertheless found **31 findings**. The most material ones are:

1. **Outbound page fetching has no SSRF guard** (`SEC-01`), **no HTTP security headers are set anywhere** (`SEC-02`), and **`npm audit` reports 3 vulnerabilities in production dependencies, 2 of them high** (`SEC-03`).
2. **A stale test for the emergency-diagnostics UI is wired into no script or workflow and currently fails** (`DEF-02`), which means that user-facing crash-recovery surface has no effective CI coverage.
3. **The CI diagnostics summary mislabels passing suites as `BLOCKED`** because it matches the word "BLOCKED" anywhere in log text (`DEF-03`). In the supplied run, 13 passing logs were reported as blocked.
4. **Type checking is weaker than it appears**: `strict` is off in both TypeScript configs and the code contains 389 `any` usages (`DEF-04`).
5. **`docs/API_CONTRACTS.md`, the declared sole authority for API behavior, documents 1 of 84 routes** (`DOC-01`).
6. Several documents contain **stale or contradictory statements** (retired workflows, a retired handoff file, references to files that do not exist, a "roadmap alone determines the next patch" sentence that conflicts with `AGENTS.md`), and a few maintained artifacts violate the **English-only** repository language policy.

| Severity | Count |
|---|---:|
| High | 4 |
| Medium | 13 |
| Low | 11 |
| Info | 3 |
| **Total** | **31** |

One finding (`DEF-01`) was already fixed in P124.9 and is listed for completeness. Severity here is an engineering judgment; the mapping to the `AGENTS.md` priority cascade is given per finding.

---

## 2. Scope, method, and evidence limits

### 2.1 What was examined

- Repository layout, size metrics, and `package.json` scripts, dependencies, and engines.
- Import graph of `server/`, `src/`, `appBuilder/`, `scripts/`, `tests/` (dead modules, broken relative imports).
- Wiring of tests, scripts, and npm scripts into `package.json`, `.github/workflows/`, and the DAG manifests.
- All seven workflows in `.github/workflows/`.
- Security-relevant code: `server/security.ts`, `server/authRoutes.ts`, `server.ts` bootstrap, `server/webSearch.ts`, `server/redact.ts`, BYOK handling.
- Markdown documents: link and path integrity, cross-document consistency, language policy, governance statements.
- `.env.example` against environment variables read by code.
- Migrations `001`–`019`.
- CI diagnostics (`ASSISTANT_SUMMARY.md`, `failures.log`, `02-verification-dag.log`, individual suite logs).

### 2.2 Checks actually executed (Node 22.22, local, scripted fake provider where relevant)

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `tests/pipeline.test.mjs` (Stage 2, after P124.9) | PASS (22 pass, 0 fail) |
| `npm run test:core` (after P124.9) | PASS |
| `tests/c124-output-fidelity.test.mjs`, `tests/c124-prompt-quality.test.mjs` | PASS (10/10) |
| `docs:check`, `architecture:check`, `lint:copy`, `version:check`, `docs:integrity` | PASS |
| `test:p121-governance`, `test:diagnostics-summary`, `test:intent-contract`, `test:capability-graph`, `test:context-select` | PASS |
| `tests/diagnostics-report.test.mjs` | PASS (but unwired, see `DEF-05`) |
| `tests/p121-emergency-screen.test.mjs` | **FAIL** (stale assertion, see `DEF-02`) |
| `npm audit --omit=dev` | 3 vulnerabilities (1 moderate, 2 high) |

### 2.3 NOT_RUN / BLOCKED / limits (per G5)

- **NOT_RUN:** complete DAG (`npm run check`), `npm run build`, browser e2e (`test:ui`, Playwright), DB-backed and live-provider suites (`test:database:live`, `test:bx06:api`, live smoke), hosted Actions on any new commit.
- The tree is a **reconstructed archive without git history**; remote HEAD, branch protection, repository settings, secrets, and deployed environment were not inspected.
- Static analysis used heuristics (regex import graph, text search). Heuristic results were re-verified manually where they drive a finding; some candidates were discarded as false positives (for example, environment variables read through destructuring were first misreported as unused).
- `server.ts` (2236 lines) and `src/` (≈16 k lines) were **not read exhaustively**; only security-relevant, governance-relevant, and failure-relevant areas were examined. Test semantics were not reviewed beyond the specific suites named.
- Line numbers refer to the audited baseline with P124.9 applied (`server.ts` lines after 1288 are shifted by one).
- No claim in this report is evidence of real-model answer quality or user value.

### 2.4 Positive observations (verified)

- Startup refuses to run Project Mode without `APP_PASSWORD`, `SESSION_SECRET`, and authentication enabled (`server.ts` ~L2147–2157).
- Password and webhook-signature comparisons use `crypto.timingSafeEqual`; session cookie is `HttpOnly; SameSite=Lax` and `Secure` in production; trusted-proxy hop count is bounded.
- Same-origin check on state-changing `/api` requests; GitHub webhook uses raw-body HMAC and writes an append-only audit record on rejection.
- Generated code is documented and implemented as never executed by BiForge.
- Migrations are contiguous (`001`–`019`); only two bounded retention `DELETE` statements exist (diagnostics tables, 7 days).
- `docs:check` generated inventories (84 routes, 68 env variables, 19 migrations, capability graph) are current.

---

## 3. Findings

Legend — **Basis:** `OBSERVED` (verified in source/logs/commands), `INFERRED` (reasoned from observed facts). **AGENTS priority** uses the cascade in `AGENTS.md` §4.

### 3.1 Security

#### SEC-01 — No SSRF guard on server-side page fetching — **Medium** — AGENTS P0/P2 — OBSERVED (absence), INFERRED (exploitability)
- **Where:** `server/webSearch.ts` `isFetchableContentUrl` (~L499) and `fetchPageText` (~L545–600).
- **Evidence:** URLs come from search-engine results. The filter only checks `http(s)`, a social-media host list, and file extensions. It does not reject loopback, private (RFC 1918), link-local (`169.254.0.0/16`, cloud metadata), or internal hostnames, and the direct fetch uses `redirect: 'follow'`, so a public URL can redirect to an internal one. No `isPrivate`/`loopback`/DNS-resolution check exists anywhere in `server/` (searched).
- **Impact:** A poisoned or attacker-influenced search result could make the server request internal services; the response text is fed into the model prompt (`digestFromPageExtracts`), so internal content could reach the model and possibly the user.
- **Related privacy note:** the first strategy sends every target URL to the third-party `r.jina.ai` proxy. This is not described in `docs/SECURITY_AND_PRIVACY.md`.

#### SEC-02 — No HTTP security headers; `X-Powered-By` not disabled — **Medium** — P0 — OBSERVED
- **Evidence:** repository-wide search of `server.ts`, `server/*.ts`, and `index.html` finds no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`, or `Permissions-Policy`; `x-powered-by` is not disabled.
- **Impact:** clickjacking and MIME-sniffing exposure; no CSP defense-in-depth for an app that renders model-generated text and stores a user API key in the browser (see `SEC-05`).
- **Note:** a reverse proxy may add some headers in production; this is `NOT_VERIFIED` and must not be assumed.

#### SEC-03 — Vulnerable production dependencies — **High** — P0 — OBSERVED (`npm audit --omit=dev`, 2026-11-02)
| Package | Severity | Advisory | Path | Fix |
|---|---|---|---|---|
| `body-parser` `<1.20.9` | high | GHSA-27r3-jxmh-p828 (DoS via trailing bytes after a compressed body) | transitive via `express` | non-breaking (`npm audit fix`) |
| `qs` `6.7.0–6.16.0` | moderate | GHSA-6pq8-jhm2-2vcw (uncaught `TypeError` DoS) | transitive | non-breaking |
| `zod` `<4.6.6` | high | GHSA-mrhx-c7xc-m3w5 (memory exhaustion on oversized constrained collections) | direct (`^3.24.2`) | `zod@4.6.7` (major bump) |
- **Exploitability (INFERRED):** the server applies body-size limits (`MAX_BODY`, 8 MB and 1200 kb parsers), which narrows but does not remove the DoS surface. `zod` is used in `server/gateService.ts`, `analysisService.ts`, `appBuilderIr.ts`, `planService.ts`, `codeExecutor.ts`.

#### SEC-04 — Stateless session with no server-side revocation — **Medium** — P2 — OBSERVED
- **Evidence:** `createSessionSigner` signs only the expiry timestamp (`be_session.<expires>`); the token has no subject, no nonce, and no server-side record. `POST /api/logout` (`server/authRoutes.ts` ~L100–104) only clears the cookie. A captured cookie remains valid until expiry; the only global revocation is rotating `SESSION_SECRET`. There is one shared password and no per-user identity.
- **Impact:** acceptable for a single-owner deployment, but it is not documented as a limitation and cannot support multi-user growth.

#### SEC-05 — BYOK key handling and secret redaction are incomplete and undocumented — **Medium** — P0/P2 — OBSERVED
- **Evidence:**
  - The client stores a user Gemini key in `localStorage` (`bifurcation_gemini_key_v15`, `src/App.tsx` ~L172–199) and the server accepts it in the `x-byok-key` header (`server.ts` `byokFromRequest`, ~L691). `docs/SECURITY_AND_PRIVACY.md` contains no mention of BYOK or browser-stored keys.
  - `server/redact.ts` `SECRET_ENV_NAMES` lists only `GEMINI_API_KEY`, `GEMINI_API_KEY_FREE`, `GROQ_API_KEY`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `SESSION_SECRET`, `APP_PASSWORD`, `DATABASE_URL`. `SERPER_API_KEY` and `CLOUDFLARE_API_TOKEN`, both read by the server, are absent. BYOK values are never in the environment, so value-based redaction cannot cover them.
  - A comment in `redactSecrets` promises to "catch common key-shaped substrings", but no such code exists (misleading comment).

#### SEC-06 — Minor hardening gaps — **Low** — P5 — OBSERVED
- `TRUST_PROXY_HOPS` is converted with `Number(...)` without validation (`server.ts` ~L114); an invalid value yields `NaN`.
- Non-Project-Mode login limiting (`LoginLimiter`) is in-memory per process; it resets on restart and is not shared across replicas.
- The CSRF origin check deliberately accepts a missing `Origin` (documented in code); `SameSite=Lax` is the compensating control.

#### SEC-07 — Permissive CORS in generated project templates — **Info** — OBSERVED
- `server/appBuilderScaffolds.ts` ~L185/194 emits `Access-Control-Allow-Origin: *` into scaffolds for generated projects. This is template output, not BiForge's own server, but the delivery documentation should say so.

### 3.2 Defects and engineering hygiene

#### DEF-01 — Crisis turns could carry a question — **High** — P0 — OBSERVED — **RESOLVED in P124.9**
- Cause: since P124.7, `buildVisibleReply` preserves model-authored questions, so crisis replies could contain `?`. Fixed by `stripQuestionSentences` applied only when `crisisNow`. Evidence: `test:pipeline` 22/22, `test:core` PASS.
- Residual risk (INFERRED): the fix is verified only against a scripted fake provider; real-model crisis behavior is `NOT_RUN`.

#### DEF-02 — Stale, unwired, failing test for emergency diagnostics — **High** — P2 — OBSERVED
- **Where:** `tests/p121-emergency-screen.test.mjs`.
- **Evidence:** it is referenced by no npm script, workflow, or manifest. Running it fails: it asserts `MAX_ENTRIES = 120`, while `src/emergencyDiagnostics.ts` L2 defines `MAX_ENTRIES = 40`.
- **Impact:** the pre-mount error handler, error boundary, and "Download emergency logs" fallback (`src/main.tsx`, `src/ErrorBoundary.tsx`, `src/emergencyDiagnostics.ts`) have no working CI protection. This violates `AGENTS.md` §6 ("tests must protect current requirements") and G4 intent for UI entry/completion surfaces.

#### DEF-03 — CI diagnostics summary mislabels passing suites as `BLOCKED` — **Medium** — P2 — OBSERVED
- **Where:** `scripts/diagnostics-summary.mjs` L64: the state is `BLOCKED` whenever `/\bBLOCKED\b/i` matches anywhere in a log, evaluated before `PASS`.
- **Evidence:** in `ASSISTANT_SUMMARY.md` of run `41412782921`, `test_core.log (108/108; failed 0)`, `test_models.log (156/156)`, `test_project.log (63/63)`, `test_app-builder.log (94/94)`, and others are listed as `BLOCKED` although the DAG reports them PASS. The header reports "blocked: 13".
- **Impact:** the handoff artifact the Navigator and assistants rely on overstates blockage, which contradicts the evidence-honesty intent of G5 and can mislead diagnosis.

#### DEF-04 — Weak type checking and no linter — **Medium** — P4 — OBSERVED
- `tsconfig.json` has no `strict`; `tsconfig.server.json` sets `"strict": false` and `"noImplicitReturns": false`. The production server is compiled with the latter (`build:server`).
- 389 occurrences of `: any` / `as any` / `<any>` in `server/`, `server.ts`, `src/`, `appBuilder/`.
- `lint` and `typecheck` are identical commands; no ESLint (or equivalent) exists, so unused variables/imports, floating promises, and unreachable code are not detected by any gate.

#### DEF-05 — Legacy diagnostics collector and its orphan test — **Low** — P6 — OBSERVED
- `scripts/diagnostics-report.mjs` is referenced only by `tests/diagnostics-report.test.mjs`, which is itself unwired. It asserts a five-file contract (`summary.md`, `summary.json`, `tests.log`, …) that was replaced in P124.5 by a single `ASSISTANT_SUMMARY.md` per workflow.

#### DEF-06 — Scripts with no inbound references — **Low** — P6 — OBSERVED
- No npm script, workflow, test, or document (outside history files) references: `scripts/bounded-repair-p108.mjs`, `scripts/p117-3-live-retest.mjs`, `scripts/p119-live-smoke.mjs`, `scripts/p119-regression-preflight.mjs`, `scripts/p119-release-evidence.mjs`. The specification still describes a `p117-3-live-retest` workflow that does not exist.

#### DEF-07 — Unused duplicate model-sources file — **Low** — P6 — OBSERVED
- `config/model-sources.yaml` is read by no code or test; the loader uses only `config/model-sources.json`. The two differ in shape (18 `id:` lines vs 8 `sources`), so they have already drifted or were never equivalent.

#### DEF-08 — Dependency hygiene — **Low** — P6 — OBSERVED
- `autoprefixer` (devDependency) is referenced nowhere and there is no PostCSS config (Tailwind 4 uses the Vite plugin).
- `tsx` is a runtime `dependency`, but `start` runs compiled `node dist-server/server.js`; `tsx` is needed only for dev, tests, and some scripts.
- `dejavu-fonts-ttf` is used (resolved by `server/documents.ts` L203) and is correctly retained; listed only because import-based tools flag it.

#### DEF-09 — Monolithic handler and documented shared-path debt — **Medium** — P1/P2 (`BIO-001`, `BIO-004`) — OBSERVED
- `server.ts` is 2236 lines and hosts the shared Conversational/Expert handler, many Expert step routes, and bootstrap. `src/ExpertStepScreens.tsx` is 1755 lines; several test files exceed 1500 lines.
- `TECHNICAL_SPECIFICATION.md` L569/L603 states that Conversational and Expert still share one HTTP handler and prompt-pack text blocks and are "not yet fully separate pipelines"; internal keys `Simple` / `Expert` / `Project` and the legacy IR pipeline (`engine=legacy`, `ALLOW_LEGACY_APP_BUILDER`, default off, deployment status UNKNOWN) are acknowledged debt.
- This is known and test-locked, not a regression; it remains an open gap against `BIO-001`/`BIO-004` evidence.

#### DEF-10 — Silent exception swallowing — **Info** — OBSERVED
- 13 empty `catch {}` blocks in non-test code; the sampled ones in `src/App.tsx` guard `sessionStorage`/`localStorage` access and are benign. No security-relevant swallow was identified, but there is no lint rule to keep it that way.

#### DEF-11 — Test-suite lifecycle risks — **Low** — P4 — OBSERVED
- `test:pipeline` took ≈116 s in CI and its failure produced an "asynchronous activity after the test ended" error, matching the teardown problem already patched in P124.6/P124.7.
- 8 test files call `process.exit`; one test uses `t.skip` conditioned on `EXPERT_COVERAGE_ONLY`. Both patterns can hide results or cause secondary errors.

### 3.3 Documentation

#### DOC-01 — `docs/API_CONTRACTS.md` is nearly empty — **High** — P1 (authority map) — OBSERVED
- `AGENTS.md` §2 names it the sole authority for API behavior. It has 25 lines and documents one endpoint (`GET /api/projects/diagnostics/session-log`). `docs/generated-route-inventory.json` lists **84 routes**; 83 are not described there. Request/response shapes, auth, and error codes are scattered in `TECHNICAL_SPECIFICATION.md` and code.

#### DOC-02 — Language-policy violations in maintained artifacts — **Medium** — P5/P6 — OBSERVED
- Policy: English-only repository artifacts; user-language handling is a separate contract.
- Violations (prose or tool output, not user-language fixtures): `docs/INFORMATION_QUALITY_WORKFLOW.md` (≈538 Cyrillic characters, e.g. from L162); `scripts/patch-pack.mjs` L38–40 (default Navigator owner steps) and `scripts/patch-tools.mjs` L45–46, L136 (report text). Minor: informal «Карусель» labels in `ROADMAP.md` L63 and `docs/C123_MODEL_CAROUSEL.md` L6.
- Not violations (user-language contract): Cyrillic regexes in `server/intentFlags.ts`, `server/webSearch.ts`, `src/support.ts`, RU labels in `src/libraryExport.ts`, and test fixtures.

#### DOC-03 — Retired handoff file still documented — **Medium** — OBSERVED
- `docs/INFORMATION_QUALITY_WORKFLOW.md` L162–166 describes an `assistant-handoff` output named `ASSISTANT_PASTE.txt`. Since P124.5 every workflow (including `information-quality.yml` L171/178/184) emits `ASSISTANT_SUMMARY.md`.

#### DOC-04 — Normative specification lists workflows that no longer exist — **Medium** — OBSERVED
- `TECHNICAL_SPECIFICATION.md` L606 (labelled "P119.0.2, OBSERVED") names `ui-check.yml`, `p118-architect-live`, `p117-3-live-retest`, `staging-drills`, `evidence`, `verify-groq`, `monitor-connections`. The repository contains seven workflows: `acceptance`, `architect-compare`, `carousel-verify`, `ci`, `expert-verify`, `information-quality`, `ops`. The sentence "No `p119-*` workflow exists" is also historical. The reference to `p118-architect-live` recurs at L563 and L719 and in `docs/USER_VALUE_EVALUATION.md` L53/L131.

#### DOC-05 — Dangling references and a governance conflict — **Medium** — OBSERVED
- `docs/USER_VALUE_EVALUATION.md` L173, L263, L268 reference `docs/AI-NATIVE-RENOVATION-TASK.md`, `docs/AI-NATIVE-RENOVATION-ROADMAP.md`, and `docs/AI-USER-VALUE-SPEC.md`, none of which exist. L263 states "the roadmap alone determines the next patch", which conflicts with `AGENTS.md` (`BIO-009`), `docs/DECISIONS.md` L82, and `ROADMAP.md` L204 (no binding next-session assignment).
- `docs/USER_VALUE_EXPERT_C122.md` L23 references `tests/p122.5-expert-journey-e2e.test.mjs`, which does not exist (`tests/expert-journey-e2e.test.mjs` does).

#### DOC-06 — Historical statement contradicts current rule — **Low** — OBSERVED
- `ROADMAP.md` L553 says every patch carries `NEXT_PATCH.md`; `AGENTS.md` §2/§5 forbids that file. It is attributed to the Navigator's earlier plan but is not marked as superseded at that line.

#### DOC-07 — Line-number references that drift — **Low** — OBSERVED
- `docs/C124_INSTRUCTION_INVENTORY.md` contains 14 `server.ts:L…` references tied to the P124.0.2 baseline, while its header cites identity `124.0.6`. The document caveats this, but the references are already unreliable.

#### DOC-08 — Legacy product name persists — **Low** — OBSERVED
- `package.json` name `bifurcation-engine`; `index.html` `apple-mobile-web-app-title="Bifurcation"`; browser storage keys `bifurcation_*` (`src/storage.ts` L9–11, `src/App.tsx` L172–199); cookie `be_session`. Storage keys carry user data, so a rename needs a migration, not a find-and-replace.

#### DOC-09 — `.env.example` omits runtime-read variables — **Low** — OBSERVED
- Read by code but absent from `.env.example` and from prose documents (present only in the generated inventory): `APP_BUILDER_MODEL_ID`, `APP_BUILDER_MODEL_SLICE`, `EPISTEMIC_VERIFIER_MODEL`, `KEEP_ALIVE`, `OPS_RSS_LIMIT_MB`, `WEB_SEARCH_SEED_PAGES`, `WORKER_LEASE_MS`, `WORKER_POLL_MS`, `WORKER_HEARTBEAT_MS`, `ENABLE_BOUNDED_REPAIR`, `RENDER_EXTERNAL_URL`, `RAILWAY_REPLICA_ID`.

#### DOC-10 — Security documentation gaps — **Medium** — OBSERVED
- `docs/SECURITY_AND_PRIVACY.md` does not cover BYOK, the third-party Jina Reader proxy for page fetching, the stateless-session limitation, or the absence of response security headers (see `SEC-01`, `SEC-02`, `SEC-04`, `SEC-05`).

### 3.4 CI and workflows

#### CI-01 — Actions pinned to mutable tags — **Medium** — P0/P4 — OBSERVED
- All seven workflows use `actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, etc., and `ci.yml` uses `gitleaks/gitleaks-action@v2`; none is pinned to a commit SHA. Each workflow declares a `permissions:` block (good).

#### CI-02 — Workflow duplication — **Low** — P6 — OBSERVED
- `expert-verify.yml` (291 lines) repeats checkout/setup-node/artifact steps seven times; `information-quality.yml` and `carousel-verify.yml` repeat them three times each.

#### CI-03 — Browser e2e and live evidence not confirmable from this audit — **Info** — NOT_RUN
- Playwright suites and live-provider checks were not executed here; `G4` completion-surface coverage for Architect/Expert flows was therefore not independently re-verified.

---

## 4. Findings index

| ID | Title | Severity | Area |
|---|---|---|---|
| SEC-01 | No SSRF guard on page fetching | Medium | Security |
| SEC-02 | No HTTP security headers | Medium | Security |
| SEC-03 | Vulnerable production dependencies | **High** | Security |
| SEC-04 | Stateless session, no revocation | Medium | Security |
| SEC-05 | BYOK/redaction incomplete and undocumented | Medium | Security |
| SEC-06 | Minor hardening gaps | Low | Security |
| SEC-07 | Permissive CORS in generated templates | Info | Security |
| DEF-01 | Crisis turns could carry a question (resolved P124.9) | **High** | Defect |
| DEF-02 | Stale, unwired, failing emergency-screen test | **High** | Defect |
| DEF-03 | Summary mislabels passing suites `BLOCKED` | Medium | Defect |
| DEF-04 | Weak type checking, no linter | Medium | Quality |
| DEF-05 | Legacy diagnostics collector + orphan test | Low | Rudiment |
| DEF-06 | Scripts with no inbound references | Low | Rudiment |
| DEF-07 | Unused `model-sources.yaml` | Low | Rudiment |
| DEF-08 | Dependency hygiene | Low | Quality |
| DEF-09 | Monolithic handler / shared-path debt | Medium | Architecture |
| DEF-10 | Silent exception swallowing | Info | Quality |
| DEF-11 | Test-suite lifecycle risks | Low | Quality |
| DOC-01 | `API_CONTRACTS.md` nearly empty | **High** | Docs |
| DOC-02 | Language-policy violations | Medium | Docs |
| DOC-03 | Retired handoff file documented | Medium | Docs |
| DOC-04 | Spec lists non-existent workflows | Medium | Docs |
| DOC-05 | Dangling references, governance conflict | Medium | Docs |
| DOC-06 | `NEXT_PATCH.md` statement in roadmap | Low | Docs |
| DOC-07 | Drifting line-number references | Low | Docs |
| DOC-08 | Legacy product name | Low | Docs/Rudiment |
| DOC-09 | `.env.example` incomplete | Low | Docs |
| DOC-10 | Security documentation gaps | Medium | Docs |
| CI-01 | Actions pinned to mutable tags | Medium | CI |
| CI-02 | Workflow duplication | Low | CI |
| CI-03 | Browser/live evidence not confirmable | Info | CI |

(31 rows; `DEF-01` is resolved, so 30 findings remain open.)

---

## 5. Recommendations

These recommendations are **advisory input**. Under `AGENTS.md` (`BIO-009`, §4 Phase D item 20) they are not a binding assignment for any session; each session must re-derive its own task from current evidence and the priority cascade. Items that change product goals or security posture need owner approval (§4 item 14).

Audience labels follow `AGENTS.md`: `FOR_ASSISTANT` (terminal/sandbox work), `FOR_CI` (automated), `FOR_NAVIGATOR` (GitHub web UI only).

### 5.1 Priority A — security and CI integrity (P0/P2)

**R-01 — Fix dependency vulnerabilities (`SEC-03`). `FOR_ASSISTANT`, verified by `FOR_CI`.**
1. Run `npm audit fix` (non-breaking) to move `body-parser` ≥ 1.20.9 and `qs` past the affected ranges; confirm with `npm ls body-parser qs`.
2. Plan the `zod` 3 → 4 migration as its own patch: inventory `z.` usage in the five server modules, adapt breaking API changes, and extend schema tests (`test:core`, `test:gates`, `test:app-builder`).
3. Add `npm audit --omit=dev --audit-level=high` as a non-blocking-then-blocking DAG check, so regressions appear in Actions without Navigator effort (G3).

**R-02 — Add an SSRF guard (`SEC-01`). `FOR_ASSISTANT`.**
1. In `server/webSearch.ts`, extend `isFetchableContentUrl` to reject non-`http(s)`, credentials in URL, IP-literal hosts in private/loopback/link-local/CGNAT ranges, `localhost`, and `*.internal`/`*.local`.
2. Resolve DNS before fetching and reject private results; fetch with `redirect: 'manual'` and re-validate each hop (cap hops at 3–5), or pin the resolved address.
3. Cap response size and content types before `res.text()`.
4. Add unit tests (private IPv4/IPv6, metadata address, redirect-to-internal) in `test:web`.
5. Document in `docs/SECURITY_AND_PRIVACY.md` that target URLs are sent to the Jina Reader proxy, and decide (owner) whether that path stays enabled by default.

**R-03 — Add security headers (`SEC-02`). `FOR_ASSISTANT`.**
1. Add a small middleware (no new dependency required) setting `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (or `X-Frame-Options: DENY`), and `Strict-Transport-Security` in production; call `app.disable('x-powered-by')`.
2. Introduce a Content-Security-Policy in report-only mode first; verify the Vite bundle, PWA manifest, and Drive integration still load, then enforce.
3. Add a contract test asserting the headers on `/`, `/health`, and an `/api` route.
4. Re-check `G4`: any CSP change can unmount UI; the browser e2e suites must still reach the completion surfaces in the same delivery.

**R-04 — Repair the unwired failing test (`DEF-02`). `FOR_ASSISTANT`.**
1. Update `tests/p121-emergency-screen.test.mjs` to the current contract (read the limit from `src/emergencyDiagnostics.ts` instead of hard-coding `120`, or assert the current value).
2. Wire it into an existing DAG check (for example `test:core` or `test:web`) so it runs in CI.
3. Add a CI guard (`tests/` meta-test or a script in `docs:check`) that fails when a `tests/*.test.mjs` file is referenced by no npm script or manifest, preventing future orphans (`G3`).

**R-05 — Fix the `BLOCKED` mislabel (`DEF-03`). `FOR_ASSISTANT`.**
1. In `scripts/diagnostics-summary.mjs`, derive per-log state from structured data first (TAP totals and DAG check results); use text matching only as a last resort and only on explicit status lines (for example `^\s*(BLOCKED|NOT_RUN)\b`), never on test names.
2. Order the logic so a log with TAP `fail = 0` and `pass > 0` is `PASS` unless a DAG status says otherwise.
3. Add a regression test in `test:diagnostics-summary` with a passing log whose test titles contain the word "BLOCKED".

**R-06 — Pin workflow actions (`CI-01`). `FOR_ASSISTANT` (edit), `FOR_CI` (verify).**
Pin every third-party action to a full commit SHA with a trailing version comment; add Dependabot (or equivalent) for the `github-actions` ecosystem so updates arrive as reviewable pull requests.

### 5.2 Priority B — authority and consistency of documents (P1/P2)

**R-07 — Rebuild `docs/API_CONTRACTS.md` (`DOC-01`). `FOR_ASSISTANT`.**
Generate the route skeleton from `docs/generated-route-inventory.json` (method, path, auth requirement, Project-Mode dependency) and add hand-written request/response/error-code sections verified against `server/*Routes.ts` and tests. Extend `docs:check` so a route in the inventory without an `API_CONTRACTS.md` entry fails CI.

**R-08 — Correct stale and contradictory statements (`DOC-03`, `DOC-04`, `DOC-05`, `DOC-06`). `FOR_ASSISTANT`.**
1. `docs/INFORMATION_QUALITY_WORKFLOW.md`: rewrite the handoff section in English and describe `ASSISTANT_SUMMARY.md`.
2. `TECHNICAL_SPECIFICATION.md` L563/L606/L719: owner approval is required for normative-spec edits; propose replacing the workflow inventory with a pointer to `.github/workflows/` and the generated check graph, or update it to the seven current workflows.
3. `docs/USER_VALUE_EVALUATION.md`: replace the three dangling paths with `ROADMAP.md`/`docs/DECISIONS.md` references or mark them "retired"; remove the "roadmap alone determines the next patch" sentence in favor of the `AGENTS.md` rule.
4. `docs/USER_VALUE_EXPERT_C122.md` L23: point to `tests/expert-journey-e2e.test.mjs`.
5. `ROADMAP.md` L553: add an in-line "superseded by `AGENTS.md` §5" marker (additive; history preserved per `BIO-008`).
6. Add a `docs-integrity` rule that every backticked repository path in non-historical documents must exist (the scan used for this audit found the four stale paths above with a ten-line script).

**R-09 — Document the security model (`DOC-10`, `SEC-04`, `SEC-05`). `FOR_ASSISTANT`.**
Extend `docs/SECURITY_AND_PRIVACY.md` with: BYOK flow and storage location, third-party processors (Jina Reader, Serper, model providers), session model and its revocation limits, header policy after `R-03`, and the scope of secret redaction.

### 5.3 Priority C — correctness hardening (P2)

**R-10 — Complete secret redaction (`SEC-05`). `FOR_ASSISTANT`.**
Add `SERPER_API_KEY`, `CLOUDFLARE_API_TOKEN`, `GITHUB_TOKEN`, and the numbered Gemini slot variables to `SECRET_ENV_NAMES` (derive the list from `resolveGeminiKeySlots` rather than hard-coding); implement pattern-based redaction for key-shaped strings (for example `AIza[0-9A-Za-z_-]{35}`, `ghp_…`, `sk-…`) and for the `x-byok-key` header value in any request log; remove or implement the misleading comment. Test with a synthetic BYOK key in a failing request.

**R-11 — Session hardening (`SEC-04`, `SEC-06`). `FOR_ASSISTANT`; owner approval for posture changes.**
Optional, proportional to deployment risk: add a random session id plus an issued-at field to the token and a server-side deny-list (or a rotating "session epoch" stored in the database) so logout and password change revoke existing cookies; validate `TRUST_PROXY_HOPS` as a non-negative integer at startup; move the non-Project-Mode login limiter to the shared store when a database is present.

**R-12 — Re-verify real-model crisis behavior (`DEF-01` residual). `FOR_NAVIGATOR` (observation only) plus `FOR_CI`.**
Run the existing live Conversational probe on a deployed URL with one crisis-phrase scenario and record the observed reply (labelled `OBSERVED`); keep the scripted-provider test as the CI guard.

### 5.4 Priority D — quality and architecture (P4/P5)

**R-13 — Strengthen the type system (`DEF-04`). `FOR_ASSISTANT`.**
Enable `strict` incrementally: first `noImplicitAny` and `strictNullChecks` per directory using TypeScript project references or a per-folder tsconfig, with a ratchet script in the style of `architecture:check` (the count of `any` may only decrease). Remove the duplicate `lint` script or replace it with ESLint (`@typescript-eslint` with `no-floating-promises`, `no-unused-vars`, `no-empty`) and add it to the DAG.

**R-14 — Reduce the `server.ts` monolith (`DEF-09`). `FOR_ASSISTANT`.**
Extract the shared conversation handler and the Expert step routes into `server/*Routes.ts` modules following the existing `projectRoutes.ts` pattern, keeping behavior and tests identical per slice. Track against `BIO-001`/`BIO-004` evidence and the `KNOWN_SHARED_PATH` tests as the specification already requires ("the same patch must update the matching test"). Decide with the owner whether the legacy `engine=legacy` App Builder path should be removed or kept.

**R-15 — Stabilize test lifecycle (`DEF-11`). `FOR_ASSISTANT`.**
Split `tests/pipeline.test.mjs` into per-stage files to cut wall time and isolate teardown; replace `process.exit` in the eight test files with awaited cleanup and ordinary assertion errors (the approach already used in P124.6/P124.7); make conditional `t.skip` explicit in the report (count skips in the diagnostics summary).

### 5.5 Priority E — rudiments and housekeeping (P6, only after A–D are clear)

**R-16 — Retire dead artifacts (`DEF-05`, `DEF-06`, `DEF-07`, `DEF-08`).** After a reference and CI check, as `AGENTS.md` §6 requires:
- Delete `scripts/diagnostics-report.mjs` and `tests/diagnostics-report.test.mjs` (superseded by `diagnostics-summary.mjs`/`assistant-run-summary.mjs`), or rewrite the test to the current single-summary contract.
- Delete or archive outside the repository the five unreferenced scripts listed in `DEF-06`, or wire each to a workflow/npm script if it is still wanted.
- Delete `config/model-sources.yaml` (or generate it from the JSON file if a human-readable view is wanted).
- Remove `autoprefixer`; move `tsx` to `devDependencies` after confirming no production path imports it.
- Deletions are listed in chat, never in the patch ZIP (G1).

**R-17 — Language policy (`DOC-02`).** Translate `docs/INFORMATION_QUALITY_WORKFLOW.md` prose and the Russian report/owner-step strings in `scripts/patch-pack.mjs` and `scripts/patch-tools.mjs` to English. Add a `lint:copy` rule that flags Cyrillic outside an allowlist of user-language modules (`server/intentFlags.ts`, `server/webSearch.ts`, `src/support.ts`, `src/libraryExport.ts`, `src/numberValidator.ts`, `server/conversationMode.ts`, `server/turnFocus.ts`, `server/documents.ts`, `src/ui.ts`, fixtures under `tests/` and `scripts/golden-tasks.json`).

**R-18 — Naming and configuration docs (`DOC-07`, `DOC-08`, `DOC-09`).**
- Add the twelve missing variables to `.env.example` (commented, with defaults) and add a `docs:check` rule that every non-CI variable in `generated-env-inventory.json` appears in `.env.example`.
- Rename `package.json` `name` to `biforge` (regenerate the lock root metadata with `version:sync`); keep `bifurcation_*` storage keys and add a one-time migration to `biforge_*` keys only if the owner wants the rename.
- Replace the `server.ts:L…` references in `docs/C124_INSTRUCTION_INVENTORY.md` with function or symbol names.

**R-19 — CI maintainability (`CI-02`).** Convert the repeated checkout/setup-node/install/upload blocks in `expert-verify.yml`, `information-quality.yml`, and `carousel-verify.yml` into one reusable workflow or composite action; keep job-level `permissions` minimal.

### 5.6 Suggested grouping for delivery (non-binding)

| Group | Items | Natural checks |
|---|---|---|
| Security patch | R-01 (step 1), R-02, R-03, R-06, R-10 | `test:web`, `test:security`, `npm audit` check, browser e2e (G4) |
| Evidence/diagnostics patch | R-04, R-05, R-15 | `test:core`, `test:diagnostics-summary` |
| Documentation patch | R-07, R-08, R-09, R-17, R-18 | `docs:check`, `docs:integrity`, `lint:copy` |
| Dependency major | R-01 (step 2 `zod`) | all schema-bearing suites |
| Architecture / quality | R-13, R-14 | `architecture:check`, `typecheck`, ratchet scripts |
| Cleanup | R-16, R-19 | reference scan, CI |

Each delivery must follow the `AGENTS.md` §7 checklist: version/patch bump, ZIP containing only changed files at exact paths, `unzip -l` in chat, deletion lists in chat only, `CHANGELOG.md` and top `TECHNICAL_REPORT.md` entries, and honest `NOT_RUN`/`BLOCKED` labelling.

---

## 6. Open uncertainties

- Whether production sits behind a proxy that already adds security headers (`SEC-02`) — `NOT_VERIFIED`.
- Whether any deployment sets `ALLOW_LEGACY_APP_BUILDER=true` (`DEF-09`) — `UNKNOWN`, as stated in the specification.
- Whether the Jina Reader path is enabled by default in production and what data-processing terms apply (`SEC-01`, `DOC-10`) — requires owner input.
- Real-model quality, live-provider behavior, browser e2e status, and hosted CI on any commit after `bb4980a` — `NOT_RUN`.
- Areas of `server.ts`, `src/`, and test semantics not read in full (Section 2.3); further defects may exist there.
