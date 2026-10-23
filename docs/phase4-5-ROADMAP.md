# Phase 4 & 5 — instructions for the next session (p77 / p78)

Use this file when starting a **new chat session**. Do not restart Phase 0–3.

## Current baseline (do not redo)

| Patch | Content |
|-------|---------|
| p71 | Phase 0 forensic audit → `docs/phase0/` |
| p72 | Phase 1 guardrails → `scripts/architecture/`, `docs/phase1/` |
| p73 | Phase 2a `server.ts` → `authRoutes` / `projectRoutes` / `opsRoutes` |
| p74 | Phase 2b App split + cycle break |
| p75–p75.7 | Phase 3 start + CI green fixes (imports, tests, gitleaks, lease-loss) |
| **p76** | **Phase 3 closed** + this roadmap |

**CI must stay green.** Prefer small patches; after each: `npm run check` (and live/API on GitHub Actions).

---

## p77 — Phase 4: documentation generators

**Status: done in p77.** See `docs/phase4/PHASE4-GENERATORS.md`.

### Goal (from `docs/AI-TRANSFORMATION-SPEC.md`)

Keep AI entry docs short; generate route / module / env / schema inventories from source; detect broken links and map↔docs drift; do not invent product facts.

### Concrete work

1. **Generators** under `scripts/architecture/` or `scripts/docs/` (reuse `lib.mjs` patterns from p72):
   - **Routes** → `docs/phase1/generated/route-inventory.json` (scan `server.ts` + `server/*Routes.ts` for `app.get/post/...`)
   - **Env** → `docs/phase1/generated/env-inventory.json` (scan `process.env.*` with optional allowlist from Phase 0 CSV)
   - **Migrations** → list files in `migrations/` → `docs/phase1/generated/migration-inventory.json`
   - Optional: refresh **module-map** (already `npm run architecture:map`)
2. **npm scripts**, e.g.:
   - `docs:generate` — run all generators
   - `docs:check` — extend or call `check:docs` + fail on stale generated files if desired
3. **Wire into CI** only if fast and deterministic (prefer as part of `verify:change` or a lightweight `check:docs` step).
4. **Update** `docs/DOCUMENTATION-INDEX.md` to point at generated paths.
5. **Do not** rewrite product TZ/ADR content; only indexes and generated inventories.
6. **Do not** delete human-written Phase 0 audit without Navigator approval.

### Acceptance for p77

- [ ] Generators run on clean tree without network
- [ ] Output is deterministic (stable sort)
- [ ] `npm run check` still green
- [ ] INDEX / AGENTS mention how to regenerate
- [ ] Patch zip = changed files only

### Out of scope for p77

- Full `strict: true`
- Product feature changes
- Phase 5 formal sign-off

---

## p78 — Phase 5: acceptance package

### Goal

Prove behavioural / security equivalence vs pre-transformation baseline; record evidence; list residual risks. Navigator accepts or rejects.

### Concrete work

1. **Evidence checklist** document: `docs/phase5/ACCEPTANCE.md` with sections:
   - Commands run (`npm run check`, live, API, UI if available)
   - PASS / FAIL / NOT_RUN / BLOCKED per suite
   - Route count / critical paths smoke (session, conversation, project CRUD if Project Mode on)
   - Security: CSRF, auth gates, rate limit still present (static + prior API tests)
   - Architecture: `architecture:check` 0 new cycles
2. **Equivalence notes**: what changed structurally (module split) vs behaviour (should be none intentional).
3. **Residual risks**: deferred `strict`, any known flakes, env-only tests.
4. **Rollback**: git tag / prior release zip reference.
5. Optional: script `scripts/acceptance-report.mjs` that runs check and writes a JSON summary under `docs/phase5/generated/`.

### Acceptance for p78

- [ ] `ACCEPTANCE.md` filled from a real green CI run (link commit SHA)
- [ ] No open P0 regressions
- [ ] Navigator can approve Phase 5 without reading the whole history
- [ ] AGENTS.md status → transformation track complete (or “maintenance only”)

### Out of scope for p78

- New product features
- Mass renames
- Enabling full strict (optional follow-up patch after acceptance)

---

## Session bootstrap prompt (copy-paste)

```
Базовый архив: текущий зелёный bf после p76.
План: docs/phase4-5-ROADMAP.md и docs/AI-TRANSFORMATION-SPEC.md.
Сделай p77 (Phase 4 — генераторы документации).
Не трогай Phase 0–3 заново. CI должен остаться зелёным.
Результат: zip только с изменёнными файлами.
```

После p77:

```
Сделай p78 (Phase 5 — acceptance package) по docs/phase4-5-ROADMAP.md.
Зафиксируй evidence с зелёного CI. Zip только изменённые файлы.
```

---

## File map (AI)

| Path | Role |
|------|------|
| `AGENTS.md` | Entry; current status |
| `docs/AI-TRANSFORMATION-SPEC.md` | Contract for all phases |
| `docs/phase3/PHASE3-COMPLETE.md` | Phase 3 closed |
| `docs/phase3/TYPING-AND-NAMING.md` | Ongoing typing rules |
| `docs/phase4-5-ROADMAP.md` | **This file** — p77/p78 |
| `docs/phase1/` | Guardrails + generated maps |
| `docs/phase0/` | Forensic baseline (read-only) |
| `scripts/architecture/` | Map, boundaries, verify:change |
