# BiForge Testing and Evidence Policy

> **Document:** TESTING_POLICY · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3_ru.md`), sections 12, 16.3, 18 and Appendix E (E.6) · **Date:** 9 October 2026

## General rule
Test evidence must be reproducible and must describe what actually ran. Never invent, infer, or overstate results.

## Who sets PASS
`PASS` for code is set only on machine evidence: CI check runs and registered test results (D-08). A statement by a model that "the tests passed" is not evidence. An LLM judge's opinion is advisory only. GitHub Actions is the single source of `PASS` for code (TZv3.0, section 16.2).

## Statuses (TZv3.0, section 12.2)
| Status | Meaning |
| --- | --- |
| `PASS` | The check ran and passed; evidence is registered |
| `FAIL` | The check ran and failed |
| `BLOCKED` | Cannot be verified: no access, quota, or infrastructure; the reason is stated |
| `NOT_RUN` | The check was not executed; not counted as a pass |
| `REAL_ONLY` | Provable only on a real provider or environment; stays in this status until the real smoke test is executed |
| `WAIVED` | Waived by the owner with a mandatory reason; recorded in the audit log |

Moving on past a required check that is `FAIL`, `BLOCKED`, or `NOT_RUN` is forbidden; it can be bypassed only by `WAIVED`.

## Test layers
Select the layers relevant to the change:
1. Static checks, formatting, lint, and type checking;
2. Unit tests;
3. Integration/API tests, including contract tests of adapters (conformance suite, BX-10.a/BX-11);
4. Build and packaging checks;
5. UI/browser tests where applicable;
6. Security checks for security-sensitive changes (injection corpus, secret redaction, permissions);
7. Connection checks: `npm run verify:connections` (created in BX-10.b; statuses `OK`, `FAIL`, `BLOCKED`, `DRIFT`, `NOT_RUN`);
8. Deployment/health verification only when deployment is explicitly in scope and authorized.

## Baseline and regression
- The baseline is `npm ci && npm run check`, green as a whole, locally and in CI (BX-01.a). Any exception is recorded as `REAL_ONLY` with a reason and the owner's confirmation.
- Record relevant failures before or during implementation when possible.
- Distinguish pre-existing failures from regressions introduced by the task.
- After a fix, rerun the failed check and any directly affected checks.
- Do not remove or weaken a test simply to obtain a pass.
- Before refactoring monoliths (BX-03), characterization tests are written first and must pass both before and after the change.

## Expectation tests and Test Integrity
- Expectation tests are written or approved by the owner and committed before implementation. For steps marked ★ the owner reads and approves them first.
- Paths `tests/acceptance/**` are protected: a change by the implementing agent without approval makes the Test Integrity gate `FAIL`.

## Reporting
For each check, include:
- exact command;
- `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `REAL_ONLY`, or `WAIVED`;
- concise result;
- reason if not run, blocked, or real-only.

A command that was not executed is `NOT_RUN`, not `PASS`. A command that could not run because of missing prerequisites is `BLOCKED`. The evidence record includes: gate rules version, list of checks with status, time, tool and its version, exit code, links to truncated logs, and the commit SHA the evidence refers to (TZv3.0, section 12.3). A change of code after a gate invalidates the related evidence.

## Virtual testing
Mocks, stubs, simulations, fake providers, and virtual harnesses can provide useful evidence but must be identified as such. Tests on fake providers prove the handling of scenarios and errors; they do not prove availability and compatibility of a real provider. Do not present virtual results as proof of behavior against a real provider, production service, or deployed environment. The real smoke test is mandatory and is `REAL_ONLY` until executed. Development agents have no secrets; real smoke tests are run by the owner, or by CI with protected secrets (TZv3.0, section 16.3).

The detailed methodology is in `docs/universal_testing_protocol.md`.

## Acceptance
A step is not accepted solely because a build passed. Compare the actual diff and test evidence with the step's acceptance criteria (TZv3.0, section 16.4) and, at the gates, with sections 17 and 18 (18.0 for G1a, 18.1 for G2, 18.2 for the pilot, 18.3 general criteria).
