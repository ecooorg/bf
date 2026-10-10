# BiForge v1.6.0

> **Document:** README · **Product version:** 1.6.0 (Simple Mode) · **Aligned with:** TZv3.0 (`docs/BiForge_TZ_v3.md`, 9 October 2026)

Decision cockpit implementing the **Before You Choose** method (BiForge).

International edition: English interface, USD examples, no regional localization. People can write to the agent in any language: it answers in the language it is written to, and the interface can be translated with the browser.

The default screen is a conversation. The method (radar, expansion, critique, small tests, return) is kept by the agent and stays invisible; the step-by-step protocol is available in expert mode.

## Place in BiForge

This application is **Simple Mode** of BiForge: the BiForge (BE) v1.6.0, whose behavior is kept unchanged (TZv3.0, section 1.1). BiForge adds a server-side Project Mode, a multi-model layer, a task executor, and Code Delivery in steps `BX-01`…`BX-26`; none of that is implemented in this version. The canonical specification is `docs/BiForge_TZ_v3.md` (TZv3.0, in Russian; the Russian text is the only canonical version). Start with `docs/START_HERE.md`. Do not read this README as a description of Project Mode.

## Method loops

**UNDERSTAND → EXPAND → ATTACK → VERIFY → LEARN**

- Epistemic radar (6 categories) → knowledge map  
- User options + 3–5 from the model (hybrid / reversible / get-fact)  
- Symmetric red team + pre-mortem + 1–3 hypotheses  
- Experiment Card with lock-in, EVPI (article example = 40), forecast only from the human  
- Decision is written only by the human  

## Stack

React + TypeScript + Vite, Express, Gemini API, localStorage, zod.

## Run

```bash
cp .env.example .env
# set GEMINI_API_KEY and optionally APP_PASSWORD
npm ci        # reproducible install (npm install also works)
npm run dev
```

Production:

```bash
npm run build
npm start
```

Checks:

```bash
npm run lint:copy
npm run test:core
npm run check
npm run test:virtual   # real server.ts against a scripted fake Gemini (no key, no network)
```

The baseline for every development step is `npm ci && npm run check`, green as a whole (TZv3.0, BX-01.a). Tests on the fake Gemini prove how the code handles scenarios and errors, not the behavior of the real provider; real smoke checks need the owner's key and stay `REAL_ONLY` until they are run (see `docs/TESTING_POLICY.md`).

## Files

In the conversation the person can attach PDF, Word, Excel, PowerPoint, text files and images (the paperclip button), and download results: a document prepared by the agent, any reply, or the whole conversation, as Word or PDF. A document card also has quick edits: **Shorter**, **Add table**, and **Remove section**; each makes one model request and keeps the previous version in conversation history. Files are read in server memory and never stored on disk. With Google sign-in configured, a document can also be saved to Drive as a Google Doc. File errors use the interface language (English/Russian) with stable error codes. Expert requests limit attached file text to 20,000 characters total; chat requests allow up to 60,000. Details and limits: `DEPLOY_RAILWAY.md`.

## Crisis support

Default contacts are international (IASP, 988 where applicable). Replace in `src/support.ts` for a specific region.

Distress detection works in two layers: a multilingual marker list (`src/support.ts`, checked on every message in the conversation and on the server) and the model's own crisis triage in any language. When either fires, the server appends the contacts to the reply and the client shows them.

## Documentation

| Document | Purpose |
| --- | --- |
| `docs/START_HERE.md` | Where to start; rules, process, which TZ sections to read |
| `docs/REPO_MAP.md`, `docs/CURRENT_STATE.md` | Repository map; current state and next patch |
| `docs/BiForge_TZ_v3.md` | Canonical specification TZv3.0 (Russian) |
| `AGENTS.md` | Rules for development agents (TZv3.0, Appendix B) |
| `docs/DEVELOPMENT_PROTOCOL.md` | Step cycle and gates (TZv3.0, sections 16–17) |
| `docs/GIT_POLICY.md`, `docs/SECURITY_POLICY.md`, `docs/TESTING_POLICY.md`, `docs/RESOURCE_ECONOMY.md` | Git, security, testing, and resource policies |
| `docs/STEP_REPORT_TEMPLATE.md` | Step report template |
| `docs/universal_testing_protocol.md` | General testing methodology |
| `DEPLOY_RAILWAY.md`, `QA_DRIVE_CHECKLIST.md`, `CHANGELOG_AGENT_BEHAVIOR.md` | Deployment, manual Drive checks, changelog of this application |

## Version

One service version everywhere (it is not shown to the user in the interface; the screens show only "BiForge"), defined in `src/config.ts` (`APP_VERSION`); it is independent of the specification number (TZv3.0); `npm run check` fails if `package.json`, README, DEPLOY_RAILWAY.md or the changelog disagree. The local-storage data schema keeps its own number, `SCHEMA_VERSION`.
Highlights: conversation-first agent with invisible method discipline, memory of the next step between visits, multilingual crisis safety, soft quality checks instead of hard errors, safe Google Drive sync, password sign-in with signed cookies. See `CHANGELOG_AGENT_BEHAVIOR.md`.

## Deployment notes
Password sign-in and optional Google Drive appData storage are controlled by environment variables; see `DEPLOY_RAILWAY.md` for the full list.
Set `ENABLE_APP_AUTH=true`, `APP_PASSWORD` and `SESSION_SECRET` (16+ characters, required when sign-in is on) on Railway. For Drive, set `VITE_GOOGLE_CLIENT_ID` to a Google OAuth web client ID allowed for the Railway origin.
The PWA plugin/service worker is disabled in this build to prevent stale cached assets from masking the current frontend.

## Known limit: two devices writing at the same moment
Before each write to Google Drive the app checks again whether the file changed since it was read, and merges if so. The Drive API does not offer a conditional write for this file type, so a write from another device in the few milliseconds between that check and our write can still be overwritten. Both libraries are merged by dialog id on the next sync, and a backup is kept locally, so this is rare and recoverable, but it is not fully excluded. It needs a manual check with real Google (QA-01d).

## Cost and prompt size

Each model call is logged as `llm_usage` (prompt size in characters and, when the API returns them, token counts). The same numbers are in the response `meta` (`promptChars`, `inputTokens`, `outputTokens`); the interface does not show them. To measure the average and the maximum on the 10 control situations plus a 4-turn dialogue: `BASE_URL=... APP_PASSWORD=... BYOK_KEY=... node scripts/measure-prompt.mjs` (writes `perf-report.json`). Blind quality comparison of two builds on a live model: `scripts/acceptance-s2-06.mjs` (usage in the file header).
