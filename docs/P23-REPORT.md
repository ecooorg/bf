# P23 — Step Report (BX-24)

> **Date:** 12 October 2026 · **Aligned with:** TZv3.0 §13, §16.4.3 BX-24

## Status

`PASS` for machine criteria of BX-24 (offline tests). Live Project Mode audit rows on Railway were not exercised in the agent environment.

## Summary

- Formal threat model (`docs/THREAT_MODEL.md`).
- Injection corpus + side-effect assertions (`tests/p23-acceptance.test.mjs`).
- Secret redaction tests; untrusted-data helper.
- Rights review agent sign-off.
- Audit catalog; login-failure audit; project delete + audit; settings-change audit.
- Product version **23**.

## Commands

| Command | Result |
| --- | --- |
| `node scripts/check-version.mjs` | PASS (23) |
| `test:p23` / redact / injection / p15a (strip-types) | PASS when run |
| `npm ci` / full `npm run check` | NOT_RUN (incomplete node_modules in agent env) |

## Owner next steps

1. Upload `bf-P23.zip` to `main`.
2. Confirm CI green.
3. Optional: Project Mode login + delete once to see audit rows.
4. E-01 remains independent of P23.
