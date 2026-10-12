# PI-03 — Mode paragraph on the shared Simple Mode prompt

**Goal.** Add a thin mode paragraph (Information / Decision support / Research / Engineering) selected by a local heuristic on the last user text, mixed into the existing conversation system prompt. No separate system prompts; no duplication of HARD BOUNDARIES. Source: CONCEPTS/TZ_BiForge_Instructions_Uncertainty.md §6, §7 P3; TZ 16.4.2 row PI-03.

**Base.** Owner archive `bf-vPI-02.zip` (version label `PI-02`).

**PI-03final cumulative scope.** Add Information mode; replace the PI-01 web limitation wording; inject server date; allow approximate general-knowledge ranges for external-world questions; make mode consider recent turns; prefer stronger models and raise per-call timeout; retain PI-02 question suppression and intent flags.

**Must not change.** Project Mode; JSON schema of the conversation answer; `derived_numbers`; PI-01 uncertainty contract text; PI-02 intent-flag behaviour; algorithms of scrub / `buildVisibleReply`; `tests/acceptance/**`; `tests/regression.json`.

## Behaviour

| Mode | When (heuristic) | Paragraph focus |
| --- | --- | --- |
| **decision** (default) | Decision language or no stronger signal | Scenarios, decisive unknown, symmetric critique; questions minimal |
| **research** | Search / compare / sources / userAskedSearch | Sources, verification; no invented web findings |
| **engineering** | Code, tests, specs, acceptance criteria | Formal requirements, tests; uncertainty as named gaps |

Placement: one short English paragraph after WHEN THE IDEAL ANSWER IS UNAVAILABLE, before BEFORE ANSWERING. Meta: `conversation_mode` in response meta.

## PASS

- Machine: test:pi03, test:pi02, test:pi01, check-version, check-docs.
- Owner: health version PI-03; research prompt wording present for research requests.

## Not done

- Tool-search (P4). Multi-step mode chain beyond per-turn heuristic. Project Mode paragraphs.


## PI-03final additions

- `information` mode handles direct factual questions before decision-support reframing.
- Research wording never treats lack of live search as a reason to withhold a useful general-knowledge answer.
- Current server date is injected; this is not a substitute for live web search.
- Default cascade and timeout are more tolerant of stronger models; Railway environment overrides remain authoritative.
- No actual Google Search tool is wired in this patch.
