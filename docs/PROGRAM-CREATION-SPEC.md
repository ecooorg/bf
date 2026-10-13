# Project Mode: small-program creation

**Status:** implementation prepared in the owner patch; live use remains gated by the project passport and `CODE_EXECUTOR=model_patch`.

## Goal

Let a user explicitly ask Project Mode to create a small program or browser game, receive validated source files as a downloadable ZIP, and preserve the source bundle as a project artifact. The user-facing program flow must not commit user code into BiForge’s own repository. Ordinary analysis requests must remain analysis requests.

## Flow

1. The user enters a natural-language software goal in **Create a small program**.
2. The API requires an existing project with a confirmed passport and explicit `model_patch` selection, plus the owner-configured `CODE_EXECUTOR=model_patch` flag. It does not silently enable the executor.
3. The server creates a durable Task and builds a Task Package with limits of 10 files and 400 changed lines.
4. The code-author request uses the existing Router and confirmed `json_output` capability. It asks for complete files under `generated-projects/<task_id>/**`. Browser apps should be self-contained `index.html` files when practical.
5. Deterministic validation checks the response schema, allowed paths, protected paths, file/line limits, secret-looking strings, a basic HTML shell for browser/game requests, and parse-only JavaScript syntax checks where supported.
6. A validated source ZIP is saved as a project artifact. The user can download it even if GitHub delivery is blocked.
7. The product-facing program flow is source-only. It deliberately does not write generated user code into BiForge’s repository. The separate Code Delivery workflow continues to use GitHub branches and PRs for tasks intended to modify a configured project repository.

## Security and truthful status

- Generated code is untrusted and is never executed on the BiForge server.
- A ZIP means source generation and structural/static validation succeeded; it does not mean runtime tests passed.
- GitHub delivery failure must not erase a validated source artifact. It must be reported as `BLOCKED`, not as a successful PR or passing CI.
- The current Gemini adapter confirms `json_output`, not a separately verified native `code_patch` capability; no stronger capability is claimed.
- The `manual` executor remains the default. No delegation rules, credentials, GitHub permissions, merge or deployment rights are changed.

## Acceptance criteria

- With automatic coding disabled, the endpoint returns a clear `EXECUTOR_UNAVAILABLE` and does not create a code task.
- With the gate configured, a small request creates a code task and calls the configured model caller after the durable task row exists.
- A valid patch is confined to the current task's generated-project directory and produces a downloadable ZIP.
- Invalid schemas, path escapes, protected paths, over-limit output, secret-looking generated content, missing browser entrypoints and detectable JavaScript syntax errors are rejected without a source ZIP or GitHub write.
- The source-only flow reports that the ZIP is ready while keeping Code Delivery status blocked because no repository delivery was requested; it is not represented as CI-passed.
- No generated code executes in the application server.
- `manual` behaviour, Simple Mode, human review, merge and deployment boundaries remain unchanged.

## Known boundary

Automated runtime execution, browser preview hosting and repair based on actual runtime failures require a separately approved isolated runner. They are intentionally not implemented by running untrusted code in the BiForge/Railway server.
