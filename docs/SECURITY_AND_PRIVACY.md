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


## Diagnostics export and planned data flows (approved 2026-11-03; not yet implemented)

- Diagnostics export non-secret configuration values in full. Secrets (API keys, session secret, passwords, private keys, database credentials) are exported only as set/length/short SHA-256 fingerprint; no value or partial value.
- Planned new outbound recipients, to be listed in the third-party inventory when each ships: a place geocoder, weather data APIs (non-commercial deployments only, disabled by default), currency and crypto rate APIs, and an optional second web-search provider. A search planner must not place personal data in queries and must keep the distress, crisis, document, and attachment no-search rules.
- The Groq verifier sends user and answer text to a third party; it becomes opt-in.
- Detail: `docs/WEB_SEARCH_REMEDIATION.md`.

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

## Browser-supplied provider keys (BYOK)

- The optional user Gemini key is stored in the browser's `localStorage` under `bifurcation_gemini_key_v15`; the selected model is stored separately. This is browser-local storage, not server-side account storage. Anyone able to execute script in the BiForge origin can potentially read it, so operators should keep the origin trusted, avoid shared browser profiles, and clear the key when the device is no longer trusted.
- When a user supplies a key, the client sends it to the BiForge server in the `x-byok-key` request header for the model call. The server must not persist or log the raw header value. BYOK is still disclosed to the selected model provider as the credential used to authenticate the request; provider-side processing and retention terms apply.
- Environment-backed provider credentials include Gemini key slots, Groq, Serper, Cloudflare Workers AI, GitHub tokens/private keys, webhook secrets, database URLs, and application/session secrets. Diagnostic redaction covers known environment values, common Google/GitHub/OpenAI-style key shapes, and `x-byok-key` header values. This is defense in depth, not a guarantee for arbitrary custom credential formats; new providers must add their environment names and patterns to `server/redact.ts` and regression tests.

## Session model and revocation limits

- The current session cookie is `be_session`, marked `HttpOnly` and `SameSite=Lax`, and `Secure` in production. Its signed payload contains an expiry timestamp; the HMAC prevents modification. The default lifetime is seven days.
- Sessions are stateless: the server does not keep a per-session record or revocation list. Logout clears the browser cookie but cannot invalidate a copied cookie already held elsewhere; that copy remains valid until expiry. Rotating `SESSION_SECRET` invalidates all existing sessions. This single shared-password model is suitable only for a controlled single-owner deployment and is not per-user identity or multi-user session management.
- Do not interpret logout as remote revocation. Keep `SESSION_SECRET` private and rotate it if a session cookie may have been exposed. A server-side revocation mechanism requires a separate design decision and migration.

## Third-party processing inventory

- From P124.26 the search-plan model call (query, place, ISO country, topic) is made for every message that triggers a search, not only for non-Latin text; it uses the same Gemini key as the conversation and the prompt forbids personal data in the query. The hard no-search rules (distress, CRISIS, DOCUMENT, attachments) are unchanged, so those turns never reach it.
- `JINA_API_KEY` (optional) is sent only as an `Authorization` header to the Jina Reader endpoint and is a redacted secret name; `JINA_READER_BASE_URL` is used only if it is https.
- Web research can disclose the target URL (including path and query string) to Jina Reader when that extraction path is selected.
- Serper receives search queries when the Serper provider is selected.
- The selected model provider receives the prompt/context needed for the request and any BYOK credential required for authentication.
- These disclosures are provider-specific. Do not send secrets, private URLs, or confidential content to web research or model providers unless the operator and user have authorized that processing.

## Response security headers

The global Express middleware applies `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=()`, and `X-Frame-Options: DENY` to all responses. `Strict-Transport-Security: max-age=31536000; includeSubDomains` is emitted only when `NODE_ENV=production`; the deployment must terminate public HTTPS correctly for browsers to honor it. `X-Powered-By` is disabled. A Content-Security-Policy is not enabled yet: report-only policy and compatibility checks for the Vite bundle, PWA and Drive integration remain open.
