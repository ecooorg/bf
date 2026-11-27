# ImmoGR owner-local page fetcher

The local page fetcher bridges a browser-origin limitation: an ordinary web app cannot read arbitrary third-party pages because of CORS. This CLI runs on the Owner's computer and saves a bounded HTML snapshot that can then be imported into the ImmoGR personal notebook.

## Prerequisites

- Node.js matching the repository engine (Node 22.12+).
- The repository dependencies installed (`npm install`), including `tsx`.
- A source-specific permission review confirming that limited scripted research requests are allowed for the intended purpose. Check current terms/operator instructions and robots rules first.
- Never use this runner for a source that explicitly prohibits scripted access. Do not guess permission from public visibility or from a successful manual browser visit.

## Create a local plan

Create a JSON file outside the repository, for example `my-source-probe.json`:

```json
{
  "source": {
    "id": "source-id",
    "scriptedProbeProhibited": false,
    "probeAuthorization": {
      "reference": "URL or precise reference to the reviewed permission",
      "reviewedAt": "2026-11-27T10:00:00.000Z",
      "researchPurposeAllowed": true,
      "robotsAllowed": true,
      "allowedHosts": ["example.ch"],
      "allowedMethods": ["GET"],
      "maxRequests": 2
    }
  },
  "urls": ["https://example.ch/listing/123"]
}
```

The values above are placeholders, not a permission grant for any real source. Replace them only after the source-specific review. Set `scriptedProbeProhibited: true` when the source expressly prohibits scripted requests. A two-request plan means one robots.txt request plus one page request. A three-request plan may include robots.txt plus at most two explicitly listed pages. The host must match exactly.

## Run

From the repository root:

```sh
node --import tsx scripts/immogr-local-page-fetch.mjs /absolute/path/to/my-source-probe.json
```

The runner:
- validates the plan against `server/immogr/probe-policy.ts`;
- fetches robots.txt first and counts it toward the request ceiling;
- checks the requested page paths against robots rules;
- sends only GET requests to credential-free HTTPS on port 443;
- rejects private/reserved DNS answers and pins the checked public IP for the request;
- applies a 10-second timeout and 256 KB robots / 2 MB HTML response limits;
- does not follow redirects, retry, paginate, crawl, or store cookies;
- accepts only HTML/XHTML page responses;
- writes `page-01.html` (and optionally `page-02.html`) plus `probe-report.json` into `.immogr-local-probe-output/` beside the plan.

Import the resulting HTML file into ImmoGR's local page inspector. The original snapshot stays on the Owner's computer. The report contains request status, response size, latency, timestamp and SHA-256 fingerprint, not listing data.

## Current limitations

- No source in the registry is pre-authorized by this runner. The plan is an owner-supplied local authorization record and must not be copied from the placeholder.
- No login, cookie, session, paywall, CAPTCHA or access-control bypass is supported.
- Authenticated APIs/feeds require a separate adapter and credential integration; never place API keys or passwords in the plan JSON.
- Redirects are stopped rather than followed because every HTTP request must be counted inside the strict cap.
- This is a diagnostic/local snapshot path, not recurring acquisition or a production crawler.
