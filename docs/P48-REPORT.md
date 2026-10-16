# P48 — Report

## Status
`PARTIAL` until CI green on published commit (D-08). Local offline tests intended PASS.

## Summary
- **Patch:** P48
- **Base:** v47 / `2bdd6ae96ce3` / `bf-v47.zip`
- **Variant A:** Gemini primary (unchanged generate path) + optional Groq verifier

## Behaviour
- Uncertainty block in shared prompt core.
- Verifier: one optional call after visible reply built; triggers only; failures → `verifier: error|skipped`, reply unchanged.
- Both providers down: existing generate errors still surface; verifier never required for a reply.

## Files
| Path | Change |
| --- | --- |
| `server/promptCore.ts` | `CORE_UNCERTAINTY` |
| `server/epistemicVerifier.ts` | new |
| `server/modelRegistry.ts` | activate gpt-oss-20b + json_output |
| `server.ts` | wire epistemic on conversation |
| `tests/p48-epistemic.test.mjs` | new |
| version surfaces | 48 |
| docs | SPEC (prior), REPORT, STATUS, JOURNAL, CHANGELOG |

## Owner after upload
1. CI green log
2. Deploy; confirm `/health` version 48
3. Smoke: plain Simple (no epistemic required); research with numbers + Groq key; remove key → still answers
4. MANUAL1 / external testers on frozen SHA
