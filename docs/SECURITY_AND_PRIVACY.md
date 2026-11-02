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


## Web research and outbound requests

- Search-result page extraction first rejects non-HTTP(S) URLs, URL credentials, localhost and internal/local hostnames, and private, loopback, link-local, CGNAT, reserved, and non-global IP literals. Hostnames are resolved before outbound requests; every resolved address must be public. Redirects on direct page fetches are handled manually, with each destination revalidated and a four-hop ceiling. Responses are restricted to HTML/XHTML/JSON or text from the reader proxy and capped at 1 MB before parsing.
- When enabled, BiForge sends the selected target URL to the third-party Jina Reader service (`r.jina.ai`) to extract readable page content. The target URL, including its path and query string, is therefore disclosed to Jina Reader. Operators should account for this third-party processing when deciding whether to enable web research. The application validates the target before forwarding it, but cannot control Jina Reader's own DNS resolution or internal redirect behavior.
- Serper search requests disclose the search query to Serper when that provider is selected. Model-provider requests disclose the prompt/context required by the selected provider; provider-specific retention and processing terms remain applicable.

## HTTP response headers

The application disables Express's `X-Powered-By` header and sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=()`, and `X-Frame-Options: DENY`. Production responses additionally receive HSTS (`max-age=31536000; includeSubDomains`). A Content-Security-Policy is not yet enforced; it requires report-only validation against the deployed Vite/PWA and integration flows before enforcement.

## Authorization boundaries

Production deployment, repository writes, billing, destructive data changes, disabling authentication, and running generated code require explicit owner authorization. Do not infer authorization from general project approval.

## Security acceptance

Verify unauthorized access, cross-user/project access, invalid paths, expired/missing artifacts, malformed inputs, rate/budget exhaustion, and failure handling as applicable. Record what was actually tested; do not equate static review with a live penetration test.
