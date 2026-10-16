# P48 — Epistemic layer: uncertainty contract + anti-hallucination verifier (variant A)

**Goal.** Before external tester freeze: (1) make unavailable-ideal answers produce a useful typed fallback instead of limitation-only lectures; (2) add an optional independent **verifier** pass (Groq small when available) that marks claims as fact / hypothesis / unknown and suggests checks — without changing mode UX or adding web search.

**Base.** Production build **v47**, commit **`2bdd6ae96ce3`** (`https://e-production-5cc8.up.railway.app`), archive `bf-v47.zip`. Product freeze for external testers = this base **plus** P48 when PASS.

**Variant A (locked).** Primary reply: existing Gemini cascade (unchanged selection rules). Verifier: **Groq** OpenAI-compatible adapter when `GROQ_API_KEY` is set; prefer a **small** registry model with `json_output` (activate `openai/gpt-oss-20b` or keep a short-budget call on active Groq entry). If Groq missing or fails → **skip verifier** (degrade gracefully; still apply uncertainty prompt rules).

---

## May change

- `server/promptCore.ts` / `server/promptPacks.ts` — compact **WHEN THE IDEAL ANSWER IS UNAVAILABLE** block (≤12 lines) on shared core or Simple/information path only as specified below.
- `server/intentFlags.ts` — reuse existing flags; optional small helpers for “numeric/URL-heavy” triggers if not already covered.
- `server.ts` — after primary `out` + existing soft-fail/retry: optional verifier call; merge **non-breaking** meta for client (see contract).
- `server/modelRegistry.ts` — mark/activate a **small** Groq model for `roleHint: 'verifier'` + `json_output` if needed; do not remove Gemini primary.
- `server/openaiCompatAdapter.ts` / generate path — only if required for a one-shot JSON verifier call with tight `maxOutputTokens`.
- Tests: `tests/p48-epistemic.test.mjs` (offline); extend `tests/qa1.test.mjs` only with **source/string** contracts (no live keys).
- Docs: `docs/STATUS.md`, `docs/PATCH_JOURNAL.md`, `docs/P48-REPORT.md`, `CHANGELOG_AGENT_BEHAVIOR.md` (`## v48`), version bump surfaces per AGENTS (**48**).

## Must not change

- UI1 / mode cards / More menu behaviour (`src/App.tsx` mode selection).
- Authentication, session, Drive, Project Mode gates, `CODE_EXECUTOR`, GitHub write.
- Live web search / tool-calling / grounding APIs (**out of scope** for P48).
- Weakening or deleting existing QA1 / soft-fail / MP2 / MP3 / p41–p43 tests.
- Forcing verifier on every turn (quota burn).

---

## Behaviour

### #2 Uncertainty contract (prompt)

Add a short English block (canonical runtime language for system layers) on the **shared** prompt core so Simple information/decision and Expert analysis share one rule:

1. If the ideal answer is unavailable, **one sentence** what is missing and why.
2. Then give the **best available** of: grounded data; scenario under **explicit** assumptions; qualitative or range estimate; comparison of alternatives — and **mark the type**.
3. Do **not** replace (2) with repeated methodology / AI-limitation lectures.
4. Do **not** invent numbers, percentages, named forecasts, or URLs not supported by context.

This complements existing `informationSoftFail` / `isLimitationOnlyReply` / retry hints; it does not replace them.

### #3 Verifier (runtime, optional)

**When to run** (all must hold unless noted):

1. `GROQ_API_KEY` present and Groq adapter constructible.
2. Primary triage is not crisis / not pure document-handoff exempt path.
3. At least one trigger:
   - conversation mode is `research` or `decision`, **or**
   - `userAskedSearch` / `userAskedApproximate` / `userCriticizedEvasion` / `userDemandedDirectAnswer`, **or**
   - primary reply text/options contain likely factual surface (numbers, `%`, years, `http`, proper-name heavy heuristics — keep simple).
4. Global cap: **at most one** verifier call per user turn; on verifier timeout/429 → log and continue with primary only.

**Verifier input:** last user text + primary assistant-visible answer text (and short option list if any). **No** full history dump beyond last user turn unless already cheaply available.

**Verifier output (JSON only):**

```json
{
  "claims": [{ "text": "string", "kind": "fact" | "hypothesis" | "unknown" }],
  "issues": ["string"],
  "check_suggestions": ["string"]
}
```

Max ~8 claims, ~5 suggestions. Verifier **must not** rewrite the user-facing answer; server may append a **short** honesty footer or structured meta only.

**Client/API contract (backward compatible):**

- Existing JSON fields unchanged.
- Optional additive fields on the conversation response object, e.g. `epistemic: { claims, issues, check_suggestions, verifier: "groq"|"skipped"|"error" }` — omit or `verifier: "skipped"` when not run so old clients ignore safely.

### Failure policy

| Case | Behaviour |
|------|-----------|
| No Groq key | Uncertainty prompt only; `verifier: skipped` |
| Groq 429/timeout/parse fail | Keep primary; no user-visible error spam; log `epistemic_verifier` |
| Verifier marks many `hypothesis` | Do not auto-delete primary content; optional one-line “mark assumptions” if issues non-empty |

---

## PASS criteria

1. Offline `tests/p48-epistemic.test.mjs` (and/or qa1 extensions) prove:
   - uncertainty block exists in prompt assembly source;
   - triggers and skip-without-key paths are unit-tested with fakes;
   - JSON schema parse accepts valid verifier payload and rejects garbage safely.
2. Existing `npm run test:qa1` (or documented subset) still **PASS**; no deletion of soft-fail tests.
3. Version **48** synced: `APP_VERSION`, `package.json`, README, DEPLOY_RAILWAY, `CHANGELOG_AGENT_BEHAVIOR` `## v48`.
4. `check-docs` / `check-version` PASS.
5. Manual smoke (owner, optional before external wave): one research-style question with Groq key → meta or footer shows claim kinds; with key removed → primary still works.

## Tests to add

- `tests/p48-epistemic.test.mjs` — pure + source contracts + fake verifier parse.
- Do **not** require live Groq/Gemini in CI independent checks.

## Not done / postponed

- Google Search grounding / web tool (#6).
- Verifier on every message; multi-agent debate; UI redesign for epistemic panel (meta-only is enough for P48).
- MANUAL1 / external tester execution (owner).
- Changing free-tier provider catalogue beyond enabling one small Groq verifier model.

## Owner ops

- Confirm `GROQ_API_KEY` on Railway for production verifier; without it P48 still ships uncertainty rules.
- After P48 green CI + deploy: re-run **short** owner smoke (not full MANUAL1) then freeze SHA for external testers.

*P48-SPEC*
