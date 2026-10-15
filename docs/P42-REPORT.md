# P42 — QA1 cross-mode automated checks

## Status
`PARTIAL` — offline suite authored and source-checked in isolation; full `npm run check` / build / live MANUAL1 remain for the target environment and owner.

## Summary
- **Step:** QA1
- **Base archive:** `bf-v40.zip`
- **Goal:** Reproducible offline proof that mode selection, prompt packs, classification, soft-fail/retry, UI start cards and key contracts work together without live providers.

## Files
- Replaced: `CHANGELOG.md`, `docs/NEXT.md`, `docs/PATCH_JOURNAL.md`, `docs/STATUS.md`, `package.json`
- Added: `docs/P42-SPEC.md`, `docs/P42-REPORT.md`, `tests/qa1.test.mjs`

## Acceptance status
- Simple classification fixtures (information / decision / research / engineering): covered.
- No-methodology / direct / evasion soft-fail and information-mode retry hint: covered.
- Expert prefix isolation and open-dialogue wording: covered.
- Project analyst instruction operational constraints: covered.
- Shared honesty/core (no fake search claims): covered.
- UI1 start cards + disabled Project + session persistence: covered (source-level).
- STATUS sequence UI1 → QA1 → MANUAL1: covered.
- Triage/support wiring and integrity of MP2/MP3/P41 files: covered.
- Product runtime behaviour: unchanged.

## Checks
- `node --test tests/qa1.test.mjs`: intended PASS once dependencies resolve in the target tree (suite is pure node:test + existing server modules).
- Full `npm run check` / `npm run build` / UI browser checks: `NOT_RUN` in this session.
- Live MANUAL1 scenarios: out of scope for P42.

## Not done
MANUAL1 live owner acceptance. Any provider-backed end-to-end runs. Deployment.
