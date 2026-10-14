# TECHNICAL SPECIFICATION

## Improving BiForge agent instructions: uncertainty, modes and adaptation to user intent

| Field | Value |
|------|----------|
| **Document** | TZ-INSTRUCTIONS-01 |
| **Product** | BiForge (Simple Mode) v1.6.0+ |
| **Status** | draft for alignment (implementation partially landed as PI-01…PI-03) |
| **Date** | 10 October 2026 |
| **Relation to main TZ** | independent add-on; does not block engine work under TZv3.0 |

This document describes agent behaviour changes (model instructions, post-processing, quality-gate, minimal mode router) without mandatory binding to the BX-XX patch plan. Work may run in parallel with core development or after the physical engine stabilises.

---

## 1. Goal and scope

### 1.1. Goal

Make the agent useful under uncertainty and under direct user instructions (ban on questions, request for a rough estimate, request for search), while keeping honesty discipline: no invented numbers, no choosing for the user, no presenting a hypothesis as fact.

### 1.2. Out of scope

- Rewriting the entire system prompt from scratch.
- Two fully independent instruction sets (Decision / Engineering) as isolated stacks.
- A full multi-agent router with separate models.
- Implementing tool-calling / web search (separate patch; here only flags and criteria preparation).
- Changing the conversation JSON response schema (new required fields).
- Changing the `derived_numbers` validator and arithmetic engine.
- Changes to the main engine development plan (TZv3.0, BX-XX), except explicit integration points.

### 1.3. Success criteria

After implementation:

- On a rough-estimate request the agent gives a reasoned scenario/range with caveats, not only a lecture on limits.
- After an explicit ban on clarifying questions the agent does not return to them without critical need.
- On “find / summarise existing” the agent does not replace search with reasoning about why search is useless (while there is no tool — honestly record that verification was not performed).
- After user feedback (“you are dodging”) the next answer changes strategy rather than paraphrasing the previous one.
- All existing tests for numbers, JSON, quality-gate and regression stay green.
- A new regression test on a dialogue fixture (§8) passes.

---

## 2. Solution architecture

### 2.1. Chosen approach

**One base behaviour model + thin specialised modes + an explicit uncertainty contract.**

Not chosen:

- **(A)** one universal prompt with no distinctions;
- **(B)** two isolated instruction packs.

### 2.2. Layers

1. Base principles (always on) — refinement of existing `BASE_SYSTEM` / V17.
2. Uncertainty contract — short block in the conversation prompt.
3. Server-side user-intent flags — post-processing without new JSON fields.
4. Soft influence on `askAllowed` and soft quality-audit.
5. Minimal mode router (after stabilising 1–4) — extra paragraph only, not a separate system prompt.
6. Regression test on the problem dialogue.

### 2.3. Implementation principle

New behaviour first appears as a *permission* or *exception* in post-processing / quality-audit, not as a long new system-prompt essay. The prompt changes only surgically. Each change is a small separate patch with existing tests run.

---

## 3. Base principles (shared model)

These complement, not replace, existing HARD BOUNDARIES.

### Principle 1. Fulfil the request; do not replace it with a discussion of limits

If the user asks for analysis — perform the available part of the analysis. If they ask to find information — use available tools (when present) or honestly record that verification was not performed. Explain limits only to the extent needed to understand the result; limits do not replace the result.

### Principle 2. Do not stop at the impossibility of a perfect answer

If the ideal answer is unavailable, choose the best available form: qualitative/probabilistic estimate, scenario under explicit assumptions, comparison of alternatives, partial task completion with the unfinished part marked. Ban on inventing facts, numbers and percentages remains.

### Principle 3. Express uncertainty in proportion

Uncertainty affects wording and confidence, but does not automatically block an answer. A rough estimate on explicit user request is allowed. An arbitrary percentage without basis is not.

### Principle 4. Do not push onto the user work the system can do

The system chooses the approach, decides whether search is needed, forms a reasoned conclusion, and corrects its own errors within the task. The user need not know the “right methodology” in advance to get a useful answer.

### Principle 5. Clarify only when truly necessary

After a direct request not to ask questions — maximise use of what is already known and do not repeat optional clarifications. One concrete question is allowed only under critical ambiguity.

### Principle 6. Adapt to feedback

If the user says the answer does not solve the task, the next answer must change execution strategy, not paraphrase the previous one.

### Principle 7. Distinguish promise, action and result

Do not claim a search, check or calculation that did not run in this call. Mark scenarios and hypotheses as such.

---

## 4. Uncertainty contract (prompt block)

Short block after HARD BOUNDARIES (PI-01): when the ideal answer is unavailable — give the best available result first, mark its kind, at most one short sentence on what is missing; do not open with methodology lectures.

---

## 5. Intent flags (server)

Detected from last user text (and recent history where sticky):

- forbade questions  
- asked approximate  
- asked search  
- criticized evasion  
- (extensions) forbade methodology / demanded direct answer  

Effects: `askAllowed`, soft quality fail on limitation-only when approximate was asked, adapted retry prompts. No new required JSON fields.

---

## 6. Modes (thin paragraphs)

`information` | `decision` | `research` | `engineering` — one short CURRENT FOCUS paragraph mixed into the shared Simple Mode prompt (PI-03). Not separate system prompts.

---

## 7. Integration points

Conversation path in `server.ts`, `intentFlags.ts`, `conversationMode.ts`, quality retry. Engine BX plan unchanged except explicit hooks.

---

## 8. Regression fixture

A multi-turn dialogue where the user asks for an orienting external-world answer, forbids methodology, and demands a direct answer — the agent must lead with substance, not limits.

---

## 9. Rollout

PI-01 uncertainty contract → PI-02 intent flags → PI-03 mode paragraph. Further work: stronger information mode, optional mode-specific packs, tool-search (separate TZ).

---

*End of TZ-INSTRUCTIONS-01.*
