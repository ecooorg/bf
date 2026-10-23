# Phase 5 — Acceptance package (p78)

**Transformation track status: ready for Navigator acceptance.**

This document records structural change vs behavioural equivalence after Phases 0–4 (p71–p77). It is the sign-off surface for Phase 5.

## Baseline and endpoint

| Item | Value |
|------|--------|
| Pre-transformation baseline | BiForge **v70** (`bf-v70.zip` / Phase 0 audit) |
| Post-transformation tree | **v76** + p77 generators (`bf-v76` / green CI after p76.1) |
| Spec | `docs/AI-TRANSFORCE-SPEC.md` (phases 0–5) |
| Roadmap | `docs/phase4-5-ROADMAP.md` |

Navigator: accept or reject this package. Silence is not acceptance (Tier 3).

---

## 1. Evidence checklist

Statuses: **PASS** | **FAIL** | **NOT_RUN** | **BLOCKED**.

### Local / sandbox (p78 authoring environment)

| Check | Status | Notes |
|-------|--------|-------|
| `npm run architecture:check` | **PASS** | 0 cycles, 0 new boundary violations (ratchet holds) |
| `npm run docs:check` / inventories | **PASS** | 75 routes, 54 env names, 14 migrations |
| `npm run check:docs` | **PASS** | Markdown links OK |
| Full `npm run check` | **NOT_RUN** | Prefer GitHub Actions after p78 is applied |
| Live PostgreSQL suite | **NOT_RUN** | Requires `RUN_LIVE_TESTS` + DB (green on prior CI runs post p75.7) |
| Project Mode API security | **NOT_RUN** | Requires `RUN_BX06_API` (green 81/81 on prior CI) |
| Browser UI (`test:ui`) | **NOT_RUN** | Viewport / Playwright not available in this environment |

### Expected after apply (Navigator / CI)

| Check | Expected | Evidence source |
|-------|----------|-----------------|
| `npm run check` (all independent stages) | **PASS** | GitHub Actions `check-and-build` |
| Live PostgreSQL | **PASS** (~70 tests) | CI job after p75.7–p76.1 |
| Project Mode API | **PASS** (~81 tests) | CI job |
| Gitleaks | **PASS** | CI (CHANGELOG false positive fixed p75.5) |
| `architecture:check` | **PASS** | 0 new cycles |
| Build (`vite` + `tsc -p tsconfig.server.json`) | **PASS** | CI |

Fill commit SHA here after green CI on the p78 tip:

```text
Acceptance CI commit: ________________ (YYYY-MM-DD)
```

---

## 2. Structural changes (intentional)

Behaviour-preserving modularisation and AI-native guardrails:

| Phase | Patch | Structural change |
|-------|-------|-------------------|
| 0 | p71 | Forensic audit artifacts under `docs/phase0/` |
| 1 | p72 | `scripts/architecture/*`, boundary ratchet, `verify:change` |
| 2a | p73 | `server.ts` → `authRoutes` / `projectRoutes` / `opsRoutes` (+ health routes) |
| 2b | p74 | App split (`appApi`, `AppHeader`, `ExpertStepScreens`); dynamic import cycle break |
| 3 | p75–p76 | Branded ids, conventions, path-param parse; Phase 3 closed |
| 4 | p77 | Doc inventories generators (`docs:generate` / `docs:check`) |
| 5 | **p78** | This acceptance package |

**Not changed intentionally:** HTTP contracts, SQL migrations semantics, auth/CSRF/rate-limit policy, Simple Mode local storage path, product feature set.

---

## 3. Equivalence notes

| Area | Claim | How verified |
|------|--------|----------------|
| Routes | Same methods/paths; registration moved to route modules | Static inventories + prior API/live tests |
| Security boundary | Project Mode still auth + same-origin CSRF + rate limit | `tests/security`, `test:bx06:api` on CI |
| Queue / worker | Lease recovery semantics unchanged | Live DB tests (incl. lease-loss after p75.7 timing fix) |
| Client modes | Simple / Expert / Project entry points preserved | `test:core` P51/P52 after App split |
| Docs | AI entry stays short; inventories generated | `docs:check` |

Any **intentional** product behaviour change requires a separate Navigator-approved patch outside this track.

---

## 4. Residual risks (accepted or deferred)

| Risk | Severity | Mitigation / deferral |
|------|----------|------------------------|
| Full TypeScript `"strict": true` not enabled | Low–med | Deferred post-acceptance; conventions in `docs/phase3/` |
| Mass SQL `any` → `unknown` | Low | Reverted in p75.1 (typecheck noise); optional later |
| Live lease-loss test historically flaky | Low | Stabilised p75.7 (`heartbeatMs * 2 <= leaseMs`) |
| UI viewport not run in every CI | Med | `test:ui` / manual Navigator when shipping UX |
| Generated inventory timestamps change on regen | Low | Commit after intentional source changes only |

No open **P0** product regressions known at packaging time.

---

## 5. Rollback

1. Revert to last green tag/commit before the transformation series, or restore **`bf-v70.zip`** / pre-p71 tree.
2. Database: migrations are additive; rolling back code without migration reverse is the usual ops path (see `docs/OPERATIONS.md`).
3. Do not delete `docs/phase0/` audit without Navigator approval.

---

## 6. Navigator decision

- [ ] **Accept** — transformation track complete; maintenance / product work proceeds under `AGENTS.md` rules.
- [ ] **Reject** — list required remediations below.

```text
Decision: _______________  Date: _______________  By: _______________
Notes:
```

---

## 7. Optional machine summary

```bash
npm run acceptance:report   # writes docs/phase5/generated/acceptance-summary.json
```

Runs architecture + docs inventory checks only (fast). Full `npm run check` remains the CI gate.
