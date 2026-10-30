# Security and Privacy

**Authority:** Security constraints are binding. This file consolidates durable security rules; endpoint-specific requirements live in `../TECHNICAL_SPECIFICATION.md` and `API_CONTRACTS.md`.

## Baseline

- A public URL is not private even if the application is intended for one user. Keep authentication enabled unless the owner explicitly authorizes a change.
- Never commit or expose API keys, provider credentials, session secrets, cookies, private keys, database URLs, or token values. Do not put secrets in artifacts, CI logs, generated ZIPs, or diagnostic bundles.
- Keep provider credentials and model calls on the server. Do not trust client-supplied ownership, paths, status, budget, or artifact metadata.
- Validate inputs and paths; prevent traversal, unsafe writes, unauthorized downloads, and execution of generated code without explicit authorization.
- Apply authentication, authorization, CSRF protection, rate limits, budget/quota controls, and feature gates to relevant routes. Fail closed for sensitive operations.
- Keep audit/evidence logs useful but minimize sensitive payloads. Redact secrets and personal data before persisting or displaying diagnostics.
- Security-sensitive changes require targeted negative tests as well as happy-path tests. Never weaken a guard merely to make a test pass.

## Authorization boundaries

Production deployment, repository writes, billing, destructive data changes, disabling authentication, and running generated code require explicit owner authorization. Do not infer authorization from general project approval.

## Security acceptance

Verify unauthorized access, cross-user/project access, invalid paths, expired/missing artifacts, malformed inputs, rate/budget exhaustion, and failure handling as applicable. Record what was actually tested; do not equate static review with a live penetration test.
