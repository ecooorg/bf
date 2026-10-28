# Runtime and Automation Context

Canonical operational context for future AI patch sessions. Read `AGENTS.md`, `docs/AI-OPERATING-RULES.md`, the current task, and this file when touching deployment or live tests.

## Current deployment facts (Navigator, 2026-10-28)

- The current public Render service is `https://biforge.onrender.com/`. The owner describes it as their personal test environment; there is no separately provisioned staging service. Treat it as the live shared environment for this project, not as an isolated disposable deployment.
- The owner manually applies assistant-delivered ZIP patches: replace/add files in the GitHub repository and remove files only when the handoff explicitly lists deletions. Render then builds/deploys from the repository according to its existing configuration. Do not assume the assistant has direct repository or Render access.
- The owner is the only intended user. This does NOT make a public URL private. Keep authentication enabled unless the Navigator explicitly authorizes a security change. Prefer authenticated automation using GitHub Actions secrets over disabling app authentication.
- No separate staging service is known to exist. Do not instruct the owner to find a staging service in Render unless a separate service has first been created and confirmed.
- The owner prioritizes high automation. Prefer repeatable GitHub Actions workflows, machine-readable evidence, and downloadable transcripts, while keeping secrets out of repository files and logs.

## Existing configuration and safety invariants

- Runtime uses Render and the app URL above. The environment includes Project Mode, model providers, Serper web search, PostgreSQL, and a GitHub App integration. Never copy secret values into repository documentation, patches, transcripts, or assistant messages.
- Relevant variables include `ENABLE_APP_AUTH`, `APP_PASSWORD`, `ENABLE_PROJECT_MODE`, `SESSION_SECRET`, `DATABASE_URL`, `SERVICE_URL`, and GitHub Actions secrets used by workflows. Record names and purpose only, never values.
- In the current source, `APP_AUTH_ENABLED` is derived from a non-empty `APP_PASSWORD` and `ENABLE_APP_AUTH !== 'false'`. `server.ts` rejects startup when Project Mode is enabled without password authentication. Therefore, simply clearing `APP_PASSWORD` or setting `ENABLE_APP_AUTH=false` while `ENABLE_PROJECT_MODE=true` is not a valid password-removal procedure.
- Do not disable authentication on the public Render URL as a convenience for automation. It could expose model/search spend, project data, database-backed features, and GitHub-integrated actions to unauthenticated internet traffic.
- For live automation, use `STAGING_SERVICE_URL=https://biforge.onrender.com` only after verifying that the target branch/version is deployed and the workflow's authentication flow matches the app. Despite the variable name, this URL currently points to the owner's existing service, not a separate staging service.
- `STAGING_APP_PASSWORD` should be set to the same app password used for login only if the workflow is explicitly designed to authenticate using `/api/login`. Never ask the owner to send the password in chat. Add it in GitHub repository Settings → Secrets and variables → Actions.
- Before enabling any live workflow, inspect its exact requests and ensure it cannot mutate project state unexpectedly. Bound request counts and provider costs; save redacted transcripts as workflow artifacts. Never print cookies, session tokens, passwords, API keys, database URLs, private keys, or full authorization headers.

## Credential hygiene

The owner pasted a partially redacted environment-variable listing in chat. Treat any value that was not fully replaced by a placeholder as potentially exposed. If a real API key, database credential, session secret, GitHub App private key, or webhook secret was included in any unredacted form, rotate that credential in its provider and update Render/GitHub secrets. Do not repeat values in documentation. Public identifiers such as app IDs are not equivalent to private keys, but should still be stored only where operationally needed.

## Live test protocol

1. Verify CI/build is green for the exact commit deployed to Render.
2. Confirm target URL and authentication mechanism; do not infer a staging environment from the URL.
3. Store credentials as GitHub Actions repository secrets, never as workflow literals.
4. Run a bounded, manually dispatched workflow initially; inspect its redacted transcript and provider usage.
5. Only then consider scheduled/automatic execution.
6. Live results are evidence, not acceptance by themselves. P116 acceptance remains a Navigator decision; P117 remains unaccepted until its gate passes; P121 must not start without explicit authorization.
7. The P118 Architect workflow mutates the live service: it creates two projects named `p118-evidence-*` and, unless dispatched with cleanup off, deletes exactly the project ids it created. It reuses `STAGING_SERVICE_URL` and `STAGING_APP_PASSWORD`; the generated ZIP is only parsed, never executed or extracted.
