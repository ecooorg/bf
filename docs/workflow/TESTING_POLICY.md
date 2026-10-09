# BiForge Testing and Evidence Policy

## General rule
Test evidence must be reproducible and must describe what actually ran. Never invent, infer, or overstate results.

## Test layers
Select the layers relevant to the change:
1. Static checks, formatting, lint, and type checking;
2. Unit tests;
3. Integration/API tests;
4. Build and packaging checks;
5. UI/browser tests where applicable;
6. Security checks for security-sensitive changes;
7. Deployment/health verification only when deployment is explicitly in scope and authorized.

## Baseline and regression
- Record relevant failures before or during implementation when possible.
- Distinguish pre-existing failures from regressions introduced by the task.
- After a fix, rerun the failed check and any directly affected checks.
- Do not remove or weaken a test simply to obtain a pass.

## Reporting
For each check, include:
- exact command;
- PASS, FAIL, BLOCKED, or NOT RUN;
- concise result;
- reason if not run or blocked.

A command that was not executed is `NOT RUN`, not `PASS`. A command that could not run because of missing prerequisites is `BLOCKED`.

## Virtual testing
Mocks, stubs, simulations, and virtual harnesses can provide useful evidence but must be identified as such. Do not present virtual results as proof of behavior against a real provider, production service, or deployed environment.

## Acceptance
A step is not accepted solely because a build passed. Compare the actual diff and test evidence with the step's acceptance criteria.
