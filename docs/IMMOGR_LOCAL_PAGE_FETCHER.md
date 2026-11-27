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
  "sourceId": "source-id",
  "urls": ["https://example.ch/listing/123"]
}
```

The source ID and URLs are only a request plan. Authorization is read from `config/immogr/sources.json`; the local plan cannot grant itself permission. A source must have `probePolicy.status = authorized_for_limited_probe`, dated terms and robots review dates, a dated authorization reference, an exact host allowlist, and a 2- or 3-request ceiling. A two-request plan means one robots.txt request plus one page request. A three-request plan may include robots.txt plus at most two explicitly listed pages. Sources marked `prohibited` are blocked by the local runner.

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

- No source in the registry is currently authorized for limited probes. The local JSON plan supplies only source IDs and URLs; it cannot self-authorize.
- No login, cookie, session, paywall, CAPTCHA or access-control bypass is supported.
- Authenticated APIs/feeds require a separate adapter and credential integration; never place API keys or passwords in the plan JSON.
- Redirects are stopped rather than followed because every HTTP request must be counted inside the strict cap.
- This is a diagnostic/local snapshot path, not recurring acquisition or a production crawler.


## Batch research check for all 29 registered sources

The repository includes `config/immogr/source-probe-batch.template.json` with one homepage URL for each of the 29 registered sources. The owner-local batch runner checks every registry entry and records a per-source outcome:

```sh
npm run immogr:probe-batch -- config/immogr/source-probe-batch.template.json
```

It reads authorization only from the source registry, skips sources marked `prohibited` or without explicit authorization, and runs eligible probes sequentially through the same bounded local fetcher. The report is written next to the plan as `immogr-local-probe-batch-report.json`; successful HTML snapshots and per-source reports remain in `.immogr-local-probe-batch/<source-id>/.immogr-local-probe-output/`.

Current readiness: 7 sources are explicitly marked `prohibited` for scripted/bulk/crawling access; the other 22 have no recorded authorization for limited automated probes. Therefore the current template will send **zero network requests** until source-specific authorization is documented. This is a readiness report, not evidence that a live probe has run.

The runner uses anonymous HTTPS GET requests only. It does not use personal API keys, logins, cookies or account sessions. Sources requiring authentication or licensed APIs need a separately approved integration; credentials must never be placed in the batch JSON.


## Export a probe plan from the ImmoGR tablet UI

In Personal manual research, select a source, enter the original listing URL, and optionally enter one second page URL. Tap **Download local probe plan**. The downloaded JSON contains only the registered source ID and the selected HTTPS page URLs; it contains no credentials or permission claims. Transfer that JSON to the Owner's local ImmoGR repository and run it with the local fetcher or include the URLs in the all-source batch plan. The local CLI still checks the registry and sends no request unless the source has an explicit `authorized_for_limited_probe` record.


The Search settings panel also has **Export selected sources for local probe**. It writes a batch JSON containing the currently checked source IDs and their registered homepages. Use that downloaded file with `npm run immogr:probe-batch -- <path-to-file.json>`. The batch report still includes all 29 sources; unchecked entries are reported as `not_planned`. This is a plan export only, not permission to access any source.


## Review the batch result on the Android tablet

After the local agent writes `immogr-local-probe-batch-report.json`, transfer that JSON file to the tablet (or open ImmoGR on the same device if the local agent ran there) and import it using the same local file picker. ImmoGR recognizes the report format and displays a responsive per-source result list with status, request count, skip/failure reason and local report path. The JSON is parsed in the browser and is not uploaded to the server.
