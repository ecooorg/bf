# ImmoGR — limited research probe readiness (2026-11-27)

> This is a repository-policy readiness assessment, **not a live network-probe result**. No requests were sent by ChatGPT. The owner-local batch runner is the only execution path for variant B.

## Summary

- Registered sources: **29**
- Explicitly prohibited for scripted/bulk/crawling access in the current registry: **6**
- No limited-probe authorization recorded: **23**
- Authorized for limited research probes: **0**
- Network requests performed in this assessment: **0**

The current batch template contains one homepage URL per source. Running it now will produce a per-source report and send zero network requests because no source has an explicit `authorized_for_limited_probe` record. This is intentional fail-closed behavior.

## Source-by-source readiness

| Source | Registry ID | Acquisition status | Probe readiness | Current reason |
|---|---|---|---|---|
| HappyHoliday | `happyholiday` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Ferienhausmiete | `ferienhausmiete` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Flatfox | `flatfox` | `excluded_pending_written_permission` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Tutti | `tutti` | `excluded_pending_written_permission` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| Anibis | `anibis` | `excluded_pending_written_permission` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| Homegate | `homegate` | `excluded_pending_written_permission` | `not_reviewed` | The terms restrict systematic selection/scraping; whether a narrowly bounded diagnostic is permitted is not established. |
| Newhome | `newhome` | `permission_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Womilo | `womilo` | `excluded_pending_written_permission` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| Comparis | `comparis` | `excluded_pending_written_permission` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| Housenet | `housenet` | `excluded_pending_written_permission` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| immobilier.ch | `immobilier` | `low_priority` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Lookmove API Listing Feed | `lookmove_api` | `permission_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| discover.swiss | `discover_swiss` | `permission_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| STnet OpenBooking e-Marketplace | `stnet_openbooking` | `not_a_feasible_source` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| e-domizil | `edomizil` | `permission_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Flatradar Switzerland | `flatradar_ch` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| aptari | `aptari` | `discovery_only` | `prohibited` | The current source review records an explicit restriction on scripted/crawling/bulk automated requests. No local probe may run unless the source operator provides a new permission that supersedes this restriction. |
| Lookmove portal | `lookmove_portal` | `excluded_pending_written_permission` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Flatli | `flatli` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| UrbanHome | `urbanhome` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Apartments Zurich | `apartmentszurich` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| RealAdvisor | `realadvisor` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Homematch | `homematch` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| WGzimmer.ch | `wgzimmer` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| students.ch | `students` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Nachmieter.ch | `nachmieter` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Graubünden Tourism / regional destination listings | `graubuenden_tourism` | `research_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |
| Apartments Switzerland | `apartments_switzerland` | `discovery_only` | `not_reviewed` | Terms restrict crawling and automated detail-page extraction; limited probe permission has not been established. Do not probe until the exact permitted scope is confirmed. |
| Alpine Market Public Data API v1 | `alpine_market_api` | `permission_required` | `not_reviewed` | No explicit source-specific authorization for limited automated research probes is recorded. Do not send requests until current terms/access rules and robots have been reviewed and an authorization reference is recorded. |

## What is required to run variant B

For each source that may be probed, update its `probePolicy` in `config/immogr/sources.json` only after reviewing the current operator terms and the intended research method. The record must include:

- `status: "authorized_for_limited_probe"`
- `reviewedAt`, `termsReviewedAt`, `robotsReviewedAt` and `authorizationReference` identifying the current permission basis
- exact `allowedHosts`
- `maxRequests: 2` or `3`

A source explicitly marked `prohibited` remains blocked unless a new operator permission supersedes the recorded restriction. A user's selection in search settings does not grant automated access permission.

The owner-local batch command is:

```sh
npm run immogr:probe-batch -- config/immogr/source-probe-batch.template.json
```

It checks all 29 registry entries, records blocked/ready/failed outcomes, and runs eligible sources sequentially. The request cap includes `robots.txt`; therefore a two-request probe is one robots request plus one page request, and a three-request probe is one robots request plus at most two page requests.

## Scope and limits

- Variant B only. No manual page-by-page review was performed by the Assistant.
- No recurring collection, pagination, retries, proxying, CAPTCHA/paywall bypass or credential capture.
- Current local runner supports anonymous HTTPS GET only; authenticated APIs and feeds require a separate approved integration.
- The owner can later review the batch report and decide source-by-source what interaction method to approve.
