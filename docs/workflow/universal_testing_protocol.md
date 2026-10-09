# UNIVERSAL EXHAUSTIVE TESTING PROTOCOL
### Virtual Test Harness • External Service Emulation • Fault Injection • Real Smoke Testing

*Internal instruction for establishing deep testing methodologies for new software systems.*

---

## 0. Core Principle
The goal is not to prove that the software works in a single happy path scenario, but to validate and guarantee its behavior under normal, edge-case, erroneous, network, concurrent, and disaster recovery conditions.

| Classification | Verification Scope | What It Proves | Core Limitation |
| :--- | :--- | :--- | :--- |
| **A. Fully Virtualized** | Code, APIs, errors, timeouts, models, files, state, concurrency | System behavior under predefined, controlled conditions | Does not guarantee the actual live behavior of external providers |
| **B. Virtualized Infrastructure** | Fake HTTP, proxies, latency, rate-limiting, fault injection | Resilience of integration boundaries | The external system is still a simulated model |
| **C. Real Smoke Testing** | Live APIs, CI/CD pipelines, deployment, browser/cloud environments | Actual production compatibility | Must be constrained by cost and request quotas |

> **Rule:** Always execute thousands of virtualized scenarios first. Use real services only to validate assumptions that cannot be mathematically or logically proven in a virtual environment.

---

## 1. New Project Bootstrapping
* **Snapshot the codebase:** Lock down the archive/repository, commit/branch hash, version tag, and timestamp.
* **Map the system architecture:** Document the runtime environment, frontend, backend, APIs, databases, file systems, message queues, AI/LLM models, OAuth providers, storage solutions, and deployment targets.
* **Audit configuration artifacts:** Read manifests, lockfiles, READMEs, CI workflows, configuration files, environment variables, and pre-existing test suites.
* **Define execution commands:** Standardize workflows for install, build, typecheck, lint, unit, integration, and E2E testing.
* **Map external dependencies:** Decide the test double strategy for each dependency: real smoke, mock, fake server, or simulator.
* **Establish a baseline:** Run the existing test suite without modifications and archive the baseline results.
* **Code-test alignment:** Never modify production code solely to satisfy a legacy or deprecated test. First, determine if the test is obsolete or if the production logic is genuinely broken.

---

## 2. Virtual Test Harness Architecture

```
Application Under Test
 ├─ Virtual HTTP / AI Provider
 ├─ Virtual Storage / Drive
 ├─ Virtual Auth / OAuth
 ├─ Virtual DB / Cache
 ├─ Fault Injector
 ├─ Network Simulator
 └─ Test Orchestrator
      ├─ assertions
      ├─ token/latency metrics
      └─ evidence/artifacts
```

* The test harness must be strictly isolated from production environments.
* Mocks and stubs represent temporary testing infrastructure and must not leak into production code.
* For HTTP communication paths, a true local fake server is highly preferred over basic mocking frameworks to thoroughly test real serialization and deserialization layers.
* For third-party packages or environments where dependencies cannot be installed, implement temporary stubs while running the authentic business logic.
* Reset and purge the application state after every single test run, except for specific test cases designed to validate data persistence or cooldown behaviors.

---

## 3. Tooling and Techniques

| Approach | Intended Purpose |
| :--- | :--- |
| **Unit Mocks / Stubs** | Isolation of individual functions, modules, and classes. |
| **Fake Server** | Validates the authentic HTTP request/response pipeline and networking stack. |
| **Request Interception** | Intercepts and mutates outbound requests at runtime. |
| **Temporary Dependency Stubs** | Executes core application logic in the absence of external packages. |
| **Transpilation / Syntax Sweep** | Validates TS/TSX integrity when npm dependencies are unavailable. |
| **Property-Based Testing** | Feeds a large matrix of generated inputs to validate system invariants. |
| **Fuzzing** | Delivers malformed, unexpected, or randomized inputs to uncover crashes. |
| **Concurrency Harness** | Simulates parallel requests to detect race conditions and deadlocks. |
| **Fault Injection** | Deliberately introduces specific system failures to test recovery paths. |
| **Golden / Snapshot Testing** | Validates strict request/response data contracts over time. |
| **Static / Security Scans** | Automates the discovery of hardcoded secrets and dangerous code constructs. |
| **Browser Automation** | Validates end-to-end user interfaces and client-side interactions. |
| **CI Simulation** | Locally reproduces and stress-tests CI/CD workflow pipelines. |
| **Production-Like Runtime** | Mimics startup, shutdown, environment configurations, and proxy behaviors. |

---

## 4. Testing in Offline / Air-Gapped Environments
* Audit pre-installed dependencies and evaluate available global runtime developer tools.
* Analyze source files statically and perform a comprehensive syntax/transpilation sweep.
* Generate temporary stubs for any unavailable external libraries or packages.
* Spin up local fake HTTP services to mimic external network targets.
* Run the actual production business logic against these local fake services.
* Perform rigorous fault injection and concurrency harness testing.
* Mark every single unavailable live test explicitly as `BLOCKED/NOT RUN` along with a documented justification.
* **Absolute Rule: Never state that "everything is fully tested" if live installation, production compilation, or full E2E execution was bypassed.** However, a lack of internet connectivity must never halt a rigorous virtualized audit.

---

## 5. Required AI/LLM Integration Test Matrix
* Model selection criteria and automated fallback routing.
* Request serialization formats and required request headers.
* System and developer instruction formatting.
* Conversation history management and context compaction algorithms.
* Multi-modal attachments processing.
* Structured outputs validation against strict JSON schemas.
* Token accounting metrics (input, output, and cached tokens).
* Retry policies, individual timeouts, and total request deadlines.
* HTTP 429 Rate Limit mitigation.
* Circuit breaker activation and cooldown states.
* Content safety guarding and input triage workflows.
* Handling of empty or malformed model responses.
* Mitigation workflows for unknown or completely unavailable models.
* Highly concurrent user operations.

### AI Provider Response Matrix

| Scenario | Simulated Simulation | Expected System Behavior |
| :--- | :--- | :--- |
| **200 OK** | Standard compliant JSON payload | Correctly parsed and processed result |
| **Invalid JSON** | HTTP 200 with corrupted body payload | Graceful retry or fallback invocation per policy |
| **429 Rate Limited** | HTTP 429 with standard headers | Rate-limit handling with exponential backoff |
| **401/403 Unauthorized** | Authentication / Permission failures | Explicit, clean error propagation without exposing API keys |
| **404 Not Found** | Target model is completely unavailable | Automated model fallback or structured error response |
| **408 / Timeout** | Delay exceeding client-side deadline | Request abortion followed by fallback invocation |
| **500/502/503/504** | Upstream provider infrastructure failure | Automated fallback routing or managed retry execution |
| **Connection Reset** | TCP reset before or during streaming | Immediate resource cleanup without freezing execution threads |
| **Empty Body** | Content-Length is 0 or empty payload | Explicit rejection; never treat as a successful completion |
| **Wrong Schema** | Payload with unexpected types/fields | Strict validation trigger followed by retry or fallback |
| **Huge Response** | Excessive token output payload | Safe token truncation or controlled buffer capping |
| **All Models Fail** | Complete outage of all configured providers | Controlled, graceful terminal failure state |
| **Usage Missing** | `usageMetadata` object is completely absent | Resilient telemetry handling; system must not crash |
| **Cached Tokens** | Active cache telemetry fields present | Precise accumulation and tracking of token usage |
| **No Cache Tokens** | Cache telemetry fields are absent or zero | Safe, defensive parsing without mathematical errors |

---

## 6. Token Economy and Context Management
* Perform a structural comparison between baseline and optimized request shapes.
* Audit the exact number of messages transmitted to the model during complex operations.
* Validate system limits against maximum individual message lengths.
* Stress-test extensive conversation lengths: verify history with 0, 1, 8, 9, 20, and 100+ messages.
* Ensure that context compaction algorithms do not wipe out critical system state or core application variables.
* Track and parse `inputTokens`, `outputTokens`, and `cachedTokens` as distinct financial and performance metrics.
* Verify precise aggregation of total token usage across multiple automated retries.
* Confirm that internal telemetry wrappers or debugging keys never leak into the final user-facing output payload.
* Assert the complete absence of `NaN`, negative numbers, or extreme mathematical anomalies in usage counters.
* Validate code resilience when `usageMetadata` fields are omitted by the provider.
* Run tests with complex Unicode sets and exceptionally dense text inputs.
* Guarantee that context optimization scripts never bypass or break security, privacy, or content safety logic.

---

## 7. Network Fault Injection
Inject the following synthetic network degradations at the adapter layer:
* **Latency profiles:** Validate behaviors under zero, minor, nominal, and severe latency conditions.
* **Jitter:** Apply unpredictable, randomized packet and payload delays.
* **Timeout emulation:** Exceed individual connection and read deadlines.
* **Pre-response TCP resets:** Cut connections prior to receiving downstream headers.
* **Mid-stream TCP resets:** Cut connections halfway through payload delivery.
* **HTTP Status Codes:** Trigger artificial 4xx and 5xx response conditions.
* **Payload corruption:** Deliver malformed HTTP headers or structurally broken body payloads.
* **Truncated data:** Terminate the payload stream prematurely.
* **Replay vectors:** Duplicate or resend valid response packets.
* **Outages:** Emulate both short-lived temporary blips and persistent environment outages.
* **Rate-limiting blocks:** Simulate strict upstream quota caps.
* **Burst traffic spikes:** Flood network layers with simultaneous inputs.
* **Slowloris-style degradation:** Maintain open, exceptionally slow-moving server responses.
* **DNS failures:** Emulate domain resolution dropouts directly at the adapter level.

> **Evaluation Metric:** For every injected network failure, confirm the complete absence of infinite retry loops, memory or resource leaks, unhandled promises, hanging requests, false-positive success flags, or the unsafe re-transmission of non-idempotent operations.

---

## 8. HTTP/API Contract Testing
* Validate minimal structurally valid requests.
* Test with critical fields completely missing.
* Inject `null`, empty strings, and explicit type mismatches.
* Induce array and object structure mismatches.
* Append completely unrecognized or undocumented payload fields.
* Deliver payloads exceeding defined body size limits.
* Set invalid or inappropriate `Content-Type` headers.
* Execute concurrent duplicate and replayed request payloads.
* Validate highly concurrent processing boundaries.
* Assert exact status codes, body payloads, and defined JSON schemas.
* **Verify the absolute exclusion of system stack traces, application secrets, or internal server paths from all error responses.**

---

## 9. File and Attachment Handling
* Test with empty, nominal, and exceptionally large files.
* Validate multiple text encodings and complex Unicode characters.
* Inject raw binary and executable payloads.
* Mismatch the declared MIME type against actual contents.
* Alter file extensions so they contradict the internal file signature.
* Upload intentionally corrupted or partial file structures.
* Input exceptionally long, non-standard file names.
* Inject path traversal vectors within file naming fields.
* Trigger multiple highly concurrent file upload operations.
* Execute rapid duplicate uploads of identical files.
* Test application behavior when a referenced file is missing.
* Attempt processing on files that cannot be safely parsed or read by the system.

> **Evaluation Metric:** Verify strict memory boundaries, file system path limits, and guarantee that the application can never be forced to read or expose arbitrary local system files.

---

## 10. Security Auditing
* **Automated secret scanning:** Scan for hardcoded API keys, bearer tokens, private keys, and user credentials.
* **Environment audits:** Review `.env`, `.gitignore`, and application logs for data leakage.
* **Path traversal vectors:** Check input sanitation against directory traversal attempts.
* **Command injection:** Ensure raw inputs are never evaluated in shell execution contexts.
* **Dynamic APIs:** Restrict or ban the use of `eval()`, `new Function()`, and other hazardous dynamic runtimes.
* **SSRF validation:** Enforce strict allowlists if the application fetches user-defined URLs.
* **XSS mitigation:** Audit all user-controlled data rendering layers.
* **Auth boundaries:** Verify session, CSRF, and tenant isolation perimeters where applicable.
* **Payload sizing limits:** Enforce strict size caps on all incoming request bodies.
* **Rate-limiting policies:** Validate API protection against high-frequency flooding.
* **Error path security:** Prevent internal architecture disclosures on error paths.
* **Secure defaults configuration:** Ensure out-of-the-box configurations adopt a zero-trust model.

> **Absolute Rule: Real production secrets must never be utilized within any test environment; use explicitly fake, structured test tokens only.**

---

## 11. State Machines, Retries, and Circuit Breakers
* For independent test execution, always spawn isolated, fresh runtime processes.
* Isolate and explicitly test persistent system health states and cooldown variables.
* Validate the lifecycle transition matrix: `Healthy` → `Failed` → `Cooldown` → `Recovered`.
* Ensure a failure in a single upstream provider does not cascade or permanently lock out remaining healthy providers.
* Verify that maximum retry caps are strictly bounded.
* Enforce a global request deadline that encompasses all individual retry attempts.
* Assert that an explicit `AbortSignal` immediately kills downstream execution and frees up resources.

---

## 12. Concurrency and Load Testing
* Single baseline isolated request execution.
* 2 to 5 overlapping parallel requests.
* 10 to 50 simulated concurrent virtual users.
* High-frequency rapid replay of an identical request payload.
* Parallel execution across distinct user accounts with segregated states.
* Mixing exceptionally slow requests with rapid, low-latency requests in parallel.
* Inducing a single upstream provider failure amid dozens of concurrent successful requests.

> **Evaluation Metric:** Guarantee the total isolation of user sessions and the absolute absence of cross-user state leakage or race conditions. Constantly measure success vs. error rates, p50/p95/p99 latencies, retries per request, fallback trigger rates, memory consumption growth curves, total token allocation profiles, and check for unhandled or dangling asynchronous operations.

---

## 13. Property-Based and Fuzz Testing

| Target Object | Generation Logic | Invariant Metric |
| :--- | :--- | :--- |
| **Text Inputs** | Empty, Unicode, long, randomized character structures | Absolute absence of uncontrolled application crashes or data leaks |
| **Conversation State** | Streams spanning 0 to 200 consecutive messages | Compaction must successfully cap model context while maintaining application state |
| **JSON Structures** | Valid, structurally invalid, and randomized key-value pairs | The parsing layer must catch and handle errors cleanly without crashing the runtime |
| **HTTP Request Bodies** | Mutated data types, random payload sizes, broken structures | Expected 4xx/2xx HTTP responses instead of generic, unhandled 500 errors |
| **Usage Telemetry** | Omitted data fields, zero values, nominal and extreme counts | Telemetry values must be parsed safely without mathematical overruns |
| **Provider Error Objects** | Mutated shapes, alternative statuses, broken error payloads | System retry and fallback policies must remain unbroken and act predictably |

---

## 14. Client-Side Browser Automation
* Build and package a production-grade application bundle (do not test solely against dev servers).
* Validate the core end-to-end happy path scenario.
* Test interactive elements: menus, modals, text areas, and upload zones.
* Verify conditional UI rendering states tied to file attachments.
* Audit layout responsiveness against mobile viewport dimensions.
* Inject backend API failures via browser network interception to verify frontend error states.
* Test hard page reloads to ensure robust application state recovery.
* Validate accessibility: labels, focus ring management, keyboard navigation, and disabled states.

> **Absolute Rule: UI testing suites must align with the actual state of the product. Never modify or bend product requirements simply to make an obsolete UI test pass.**

---

## 15. CI/CD Pipeline Automation
* Enforce project and package version checks.
* Assert strict manifest and lockfile consistency.
* Execute pristine dependencies installation (`npm ci` / clean install equivalents).
* Run automated static analysis and code linters.
* Validate types via comprehensive typechecking tools.
* Run all unit, integration, and fully virtualized test workflows.
* Execute the standard production compilation build process.
* Initiate client-side UI and automated E2E suites.
* Verify artifact packaging and archive integrity rules.
* Run static security analysis and credential discovery scans.

> If an automated test conflicts with the actual production UI or API contract, identify the ultimate source of truth. An obsolete test script never proves a defect in production code.

---

## 16. Production-Like Deployment Validation
* Always validate against a final production build, not a local development server setup.
* Verify runtime mapping of system ports and environment variables.
* Stress-test startup behaviors and graceful shutdown sequences.
* Monitor dedicated `/health` or readiness endpoints if available.
* Assert immediate, graceful termination if mandatory system configuration is absent at boot.
* Verify correct handling of system termination signals like `SIGTERM`.
* Emulate reverse-proxy architecture layers (e.g., Nginx, Cloudflare behaviors).
* Validate routing for static assets and Single Page Application (SPA) fallback paths.
* Audit and parse application startup logging output.

---

## 17. Evidence and Artifact Archiving
Every execution run must output the following structured audit data:
* Test Identifier and descriptive name.
* Specific input scenario details.
* Expected Outcome vs. Actual Outcome.
* Execution Status: Explicitly flagged as `PASS`, `FAIL`, or `BLOCKED`.
* Complete, contextual system logs relevant to the test run.
* HTTP network summary details.
* Executing model identity, retry counts, and total latency duration.
* Token expenditure details and cache telemetry metrics.
* Specific error classifications and associated HTTP statuses.
* Runtime environment metadata, engine version, and precise commit hash.

> **Critical Safety Constraint: Never log, store, or archive real API keys, active session cookies, OAuth tokens, or Personally Identifiable Information (PII) within test artifacts.**

---

## 18. Criteria for PASS / FAIL Metrics
* The simple absence of an unhandled runtime exception does not constitute a `PASS`.
* A standard HTTP 200 OK status code alone does not constitute a `PASS`.
* For AI layers, rigorously check data contracts, request payload shapes, structured JSON validity, and telemetry, rather than subjective evaluation of "good text generation."
* A mock configuration must never be accepted as definitive proof of real external API compliance.
* Never mask or conceal skipped test suites within reports.
* Every test marked as `BLOCKED/NOT RUN` must explicitly state its operational bottleneck.
* Treat flaky tests as outright failures; never ignore them or assume they represent a `PASS`.
* Following any code fix, re-run the entire downstream regression test suite.

---

## 19. Standardized Comprehensive Evaluation Report Template

```text
PROJECT / VERSION / COMMIT:DATE / RUNTIME:

STATIC ANALYSIS:
  version ........ PASS/FAIL
  dependencies ... PASS/FAIL
  syntax ......... PASS/FAIL
  security ....... PASS/FAIL

BUILD COMPILATION:
  production ..... PASS/FAIL/BLOCKED

VIRTUAL HARNESS TESTING:
  HTTP Contract .. PASS/FAIL
  Network Fault .. PASS/FAIL
  AI/Model Matrix  PASS/FAIL
  Retry/Fallback . PASS/FAIL
  Timeout Limits . PASS/FAIL
  Token Economy .. PASS/FAIL
  File Systems ... PASS/FAIL
  Security Path .. PASS/FAIL
  Concurrency .... PASS/FAIL
  Property/Fuzz .. PASS/FAIL
  Client UI ...... PASS/FAIL

REAL SMOKE TESTING:
  External APIs .. PASS/NOT RUN
  Deployment ..... PASS/NOT RUN
  CI/CD Pipeline . PASS/FAIL

BLOCKERS:
RISKS:
CONCLUSION:
```

---

## 20. Direct Protocols for AI Assistants and Virtual Engineers
When onboarding a new codebase, execute tasks in this precise operational sequence:
1. Do not merely read source code—build an executable, isolated virtual test harness first.
2. Conduct an exhaustive inventory of all external system dependencies and integrations.
3. Construct a manageable mock, fake server, or simulator for every single external dependency found.
4. Execute the authentic business logic of the application directly against these virtualized services.
5. Inject 4xx/5xx status codes, timeouts, connection resets, malformed bodies, rate limits, and full outages.
6. For AI layers, simulate diverse models to stress-test cascade routing, fallbacks, and retry execution.
7. Audit the raw request payload shape, not merely the final downstream response.
8. Validate token metrics and financial cost telemetry, accounting for retries and cache hits.
9. Verify long context windows, compaction thresholds, and the absolute integrity of application state.
10. Stress-test file uploads, broken data, Unicode edge cases, sizing limits, and directory traversal vectors.
11. Audit multi-user concurrency limits and strict cross-user state isolation boundaries.
12. Embed property-based and fuzzing pipelines wherever architecturally reasonable.
13. Execute thorough static code analysis and specialized security audits.
14. Automate client-side browser testing if a user interface is packaged with the product.
15. Reproduce the production CI/CD environment workflow locally as accurately as possible.
16. If networks or dependencies are offline, push forward using stubs, code transpilation, and fake servers.
17. Explicitly decouple metrics between `VIRTUAL PROVEN` logic and `REAL-ONLY` infrastructure validation.
18. Log and archive clean, structured execution evidence data.
19. Following any codebase modification, execute the full regression testing matrix.
20. **Absolute Rule: Never substitute an unverified assumption for a concrete, reproduced test result.**

---

## 21. The Crucial Boundary of Virtualization
Virtual test harnesses can evaluate almost 100% of an application's internal reactions to external chaos. However, a fake provider double can never truly guarantee the production real-world characteristics of a live external provider.

* **Example (LLMs):** A fake Gemini server can rapidly cycle through 50 distinct combinations of 200/429/503 statuses, timeouts, invalid JSON formatting, and usage metadata to completely validate retry, fallback, and token-handling code. The real live Gemini endpoint is only required for a final smoke test to validate model ID availability, authentication keys, actual wire request formats, and authentic token usage payload tracking.
* **Example (Cloud Infrastructure):** A local production-like container simulation thoroughly validates internal application architecture; a real live smoke test on GitHub Actions or Railway is only required to confirm the integrity of the live hosting infrastructure configuration.

---

## 22. Minimal Universal Checklist Sequence
1. Secure codebase snapshots, versions, and current commit signatures.
2. Map architecture models and catalog all external third-party dependencies.
3. Capture and log baseline execution metrics.
4. Validate package manifests, lockfiles, and configuration templates.
5. Initiate static analysis and deep credential security scanning.
6. Execute a thorough syntax and transpilation code sweep.
7. Initialize all local virtualized services and fake servers.
8. Validate the core happy path via integration paths.
9. Assert strict HTTP API data contracts.
10. Run the comprehensive AI and provider failure matrix.
11. Apply network fault injection profiles at the adapter layer.
12. Stress-test retries, fallback loops, timeouts, and circuit breaker boundaries.
13. Metric check: validate token economy, compaction, and cost counters.
14. File system check: audit attachments, file parsing limits, and input security boundaries.
15. Run concurrent user stress profiles and isolation verifications.
16. Execute property-based generating sweeps and input fuzzing.
17. Compile a final production build bundle.
18. Initiate automated browser UI scripts against the production build.
19. Simulate full CI pipeline workflows.
20. Deploy real live smoke tests *exclusively* for infrastructure assertions that cannot be virtually proven.
21. Output and archive structured execution evidence data.
22. Remediate discovered code defects and system failures.
23. Run the comprehensive downstream regression testing matrix.
24. Publish the final evaluation report containing explicit `PASS/FAIL/BLOCKED` metrics and identified risks.

---

## 23. Ultimate Quality Benchmark
An engineering audit is only successful if it can cleanly and definitively declare:
1. Exactly what code modules and logical paths have been evaluated;
2. Precisely what system failures and degradations were artificially induced;
3. Which structural properties have been mathematically and logically proven via virtualization;
4. What specific integration assumptions remain that absolutely require a live, real-world smoke test.

> Every meaningful testing assertion and reported result must be backed by a concrete, reproducible, and verifiable evidence artifact.
