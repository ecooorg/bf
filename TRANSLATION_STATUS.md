# English engineering language — translation status (part 2)

## Policy
- **Canonical in-repo language for specs, process and concepts: English.**
- Owner may keep Russian copies offline.
- **D-17:** English is the engineering language of the repository.

## Part 1 (already delivered)
`BiForge_TZ_v3.md`, `SPEC_PRODUCT.md`, `SPEC_DEV_PROCESS.md`, `PATCH_PROMPT.md`, CONCEPTS (Uncertainty, Hallucination), `PI-03-README.md`, `AGENTS.md` (RU bullets cleaned).

## Part 2 (this archive)

| Path | Notes |
|------|--------|
| `docs/SPEC_ENGINE.md` | Full English: resources, architecture, State, multi-model, executor, profiles, artifacts, Code Delivery, quality, security, budgets, ops, risks |
| `docs/SPEC_CONNECTIONS.md` | Full English: Appendices D–E, cards E.0–E.9, verify:connections |
| `docs/BiForge_TZ_P26.md` | Full English: goals, baseline, decisions, parity, FR/NFR, architecture, P26a–d, acceptance, risks |

## Intentionally not translated
Russian **runtime** detectors and test fixtures (`intentFlags`, `conversationMode`, `tests/pi0*`, golden tasks) — user-language matching.

## Apply

```bash
cd bf-main
unzip -o docs-english-part2.zip
git add docs/SPEC_ENGINE.md docs/SPEC_CONNECTIONS.md docs/BiForge_TZ_P26.md
git commit -m "docs: English SPEC_ENGINE, SPEC_CONNECTIONS, BiForge_TZ_P26 (part 2)"
git push
```

After part 1 + part 2, primary TZ/spec surface in `docs/` and `CONCEPTS/` is English.
