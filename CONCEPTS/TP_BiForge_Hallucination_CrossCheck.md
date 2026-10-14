# TECHNICAL PROPOSAL

## Reducing hallucinations: cross-model checks and an extended anti-hallucination loop

| Field | Value |
|------|----------|
| **Document** | TP-HALLUC-01 |
| **Product** | BiForge (Simple Mode / Project Mode) |
| **Status** | proposal for the phase **after** a stable launch; **not** in the current implementation plan |
| **Date** | 10 October 2026 |
| **Related** | complements TZ-INSTRUCTIONS-01 and the light/strong cascade; **does not** replace tool-search for external facts |

This document records a **ready solution on the shelf**: what to do if hallucinations become a visible problem after launch. HARD BOUNDARIES, `derived_numbers` and soft quality retry are enough for now. Do not implement until the owner explicitly requests it.

---

## 1. Goal and scope

### 1.1. Goal

Reduce the frequency and harm of hallucinations in visible replies by:

1. tightening existing server-side checks;
2. targeted cross-checks with a second model;
3. clearly separating “agent contract check” from “world-fact check”.

### 1.2. Non-goals

- Guarantee truth of every claim about the world.
- Always run two full generations per turn (costly and slow).
- Replace tool-search with “model voting”.
- Implement anything from this document before an owner command after launch.

### 1.3. Success criteria (when enabled)

- Numeric and structural hallucinations reach reply/state less often.
- On model disagreement, disputed content is not presented as a confident fact.
- Full dual-pass only on triggers; cost is controlled.
- Existing `derived_numbers` / JSON / quality tests stay green; verifier has its own tests.

---

## 2. Assumptions

- **The product does not own a complete world knowledge base** — it cannot by itself “know” whether an external claim is true.
- **A second model is not an oracle.** It catches contract breaks, inconsistency and some fabrications; two models may agree on the same error.
- **Light/strong cascade and quality retry** are the extension point, not a greenfield subsystem.
- **External facts** are checked with tools; models do not confirm what a tool did not return.

---

## 3. Classification and methods

| Class | Example | Primary method |
|-------|--------|----------------|
| **Numeric** | “68% probability” without input | `derived_numbers` + prose-number ban (already present) |
| **User fact** | invented biography detail | `mergeModelState`; verifier: unsupported vs user_input |
| **Fake search / source** | “I found a report…” without a tool | ban search imitation; `claims_search_was_done` |
| **Forecast as fact** | future without “scenario” type | statement types + critic |
| **World semantics** | wrong claim about a region | tool-search; on model dispute — lower confidence |
| **Empty / looping** | only a lecture on limits | quality-audit + retry (TZ-INSTRUCTIONS-01) |

---

## 4. Future loop architecture

Three (+1) levels. Enable as needed.

### Level 0 — already in the product

HARD BOUNDARIES, JSON+repair, `derived_numbers`, scrub/buildVisibleReply, `mergeModelState`, soft quality retry on cascade.

### Level 1 — stronger quality retry (low cost)

On fail, the retry prompt explicitly requires:

- remove numbers not derived from input;
- mark disputed content as scenario / pattern / hypothesis;
- do not claim search without a tool;
- on approximate — give the best available result, not another lecture.

Implementation: retry text + preferably another cascade model. No new endpoint.

### Level 2 — Light Verifier (cross-check)

A short **light** model call after the main answer. Not a second full reply — an audit.

**Input:** `reply` (and if needed `nextStep` / `factsToCheck`), truncated user input, flags (tool used?, approximate?…).

**Output (JSON):**

- `claims[]`: `{ text, label: grounded_in_user_input | general_pattern | scenario | hypothesis | unsupported }`
- `has_ungrounded_number`: boolean
- `claims_search_was_done`: boolean
- `risk`: low | medium | high
- `suggested_action`: accept | soften | regenerate

**Server actions:**

| action | Behaviour |
|--------|-----------|
| **accept** | return as-is |
| **soften** | soften wording / remove “I found” / do not write unsupported into `state.facts` |
| **regenerate** | one full retry with the unsupported list |

The verifier **must not** add world facts from its own “knowledge”.

### Level 3 — Dual agreement (rare, trigger-based)

Two full generations on different cascade models.

- Strong agreement → internal meta `stable_across_models` (**do not** tell the user “confirmed by two AIs”).
- Strong disagreement → do not pick a winner; lower confidence; disputed items → `factsToCheck` / hypotheses.

Only high-stakes / repeated complaints — not by default.

### Level 4 — External truth

Tool-search / API: only what the tool returned goes into the reply. Adjacent loop; responsibility boundary is fixed here.

---

## 5. Triggers (when levels 2–3 fire)

Examples: repeated user complaint about invention; `claims_search_was_done`; ungrounded numbers after retry; high-stakes decision language without support. Exact thresholds are set when implementing; default is off behind a feature flag.

---

## 6. End-to-end flow (when enabled)

1. Main generation (as today).  
2. Level 0 checks.  
3. Soft quality-audit.  
4. Fail → retry, other model on cascade (level 1).  
5. §5 trigger + flag → light verifier (level 2) → accept | soften | regenerate.  
6. Rare dual-trigger → second generation + compare (level 3).  
7. Reply to the user; meta for telemetry.

---

## 7. Telemetry: when to introduce

At launch it is useful to collect (without verifier):

- share of quality-retries;
- share of discarded `derived_numbers`;
- complaints about “invention” / “untruth”;
- “found online” without a tool.

**Enable level 2** if sample dialogues or complaints show factual inventions slipping past levels 0–1. Do not enable “just in case”.

---

## 8. Implementation stages (when decided)

| Stage | Content | Risk |
|------|------------|------|
| **H1** | Stronger retry prompt + other model on cascade | Low |
| **H2** | Light Verifier behind `ENABLE_HALLUC_VERIFIER` + token ledger | Medium; rollback = disable flag |
| **H3** | Dual agreement on narrow triggers + N/hour limit | Cost |
| **H4** | Link to tool-search (separate TZ) | Separate track |

---

## 9. Risks

| Risk | Mitigation |
|------|------|
| “Two models confirmed” in the UI | Ban that wording; internal meta only |
| Correlated A+B error | Agreement ≠ proof; facts → tool |
| Latency / cost | Triggers + feature-flag + budget |
| Verifier itself errs | soften/regenerate, not silent drop; monitoring |
| Development complexity | Post-launch only; H1→H2→H3; rollback by flag |

---

## 10. What not to do

- Dual full generate on every turn by default.
- Tell the user the answer was “checked by a second network” as a truth guarantee.
- Let the verifier add world facts.
- Mix into current launch work and TZ-INSTRUCTIONS-01 without a separate decision.

---

## 11. Related documents

| Document | Role |
|----------|------|
| Code v1.6.0 | Level 0 already works |
| TZ-INSTRUCTIONS-01 | Uncertainty and intent flags (adjacent focus) |
| **TP-HALLUC-01** | Post-launch reserve against hallucinations |
| Future tool-search | Only reliable path for external facts |

---

## 12. Decision for the owner

1. **Now** — do not implement; do not block launch.  
2. **After launch** — watch §7 metrics.  
3. **If there is a problem** — H1, then H2 behind a feature flag.  
4. **H3/H4** — only by a separate priority and cost decision.

---

*End of TP-HALLUC-01. Shelf solution: stronger retry → light verifier → rare dual-pass; external facts via tools, not model voting.*
