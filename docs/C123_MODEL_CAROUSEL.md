# C123 — Model Carousel (API source rotation)

**Document ID:** BF-C123-CAROUSEL-001  
**Status:** APPROVED — documentation baseline (P123.0.1); implementation not started  
**Product version:** 123  
**Cycle name (informal):** «Карусель» / Model Carousel  
**Authority:** Navigator-approved 2026-11-01 (closes C122 as sufficiently successful; starts C123)  
**Related:** `docs/MODEL_SOURCES_CATALOG.md`, `docs/MODEL_ALLOWLIST.md`, `docs/DECISIONS.md` (C123 entries), historical research in session archive `c125` (P121 browser providers / C125 discovery proposals)

---

## 1. Purpose

BiForge agents (Conversational, Expert, Architect) must not depend on a single free-tier API key or a single model id for continuous work. C123 builds a **shared, catalog-driven model access layer** that:

1. Routes each model call through one gateway (agents do not hard-code providers).
2. Fails over automatically on rate limits, quota, timeouts, and provider errors (**carousel**).
3. Records exact `source_id`, `model`, `channel`, and time on every result (scientific reproducibility).
4. Treats **multiple legitimate API key sets** (organisation participants) as a first-class capacity tool, not as an afterthought.
5. Prefers **official HTTP APIs** over browser automation; browser channels remain optional and later.

**Product success for C123:** a long Expert or Architect session can continue across exhausted per-key or per-model limits by rotating to the next healthy source, without manual redeploy of cascade strings for every incident.

Tests and CI support this outcome; a green unit suite alone does not prove carousel behaviour under live multi-key load.

---

## 2. Non-goals (this cycle)

| Out of scope | Rationale |
|--------------|-----------|
| Polishing Conversational / Expert / Architect UX to “ideal” | Explicitly deferred until carousel exists |
| Browser-based chat automation as the primary channel | Fragile; optional Phase 4 only |
| Mandatory external legal sign-off or “written vendor permission” gates before coding | Project rule: *what is not forbidden is permitted*; engineering starts from catalog + official APIs |
| Local GPU / self-hosted large models | No expensive hardware assumption |
| Unbounded internet crawling for “all free models” | Noise; catalog is curated + probed |
| Changing Architect freeze into a feature programme | Architect may *consume* the carousel; Lab/product feature work stays frozen unless Navigator reopens it |

---

## 3. Project policy (Navigator-approved)

### 3.1 Permission rule

**What is not forbidden is permitted.**  
Design and implementation are not blocked by speculative compliance rituals. Operators remain responsible for how keys and services are used. The codebase encodes **project policy** (what is in the catalog, rate-limit honesty, logging), not a law firm memo.

### 3.2 Organisation key capacity (legal operational tool)

The project is run by a **non-commercial public-interest scientific organisation** with **participants (key pool ≤10 per vendor)**.

**Approved capacity model:**

- Up to **10 independent, legitimate API credential sets** may be configured for any given provider/model family that issues keys per person or per account under that provider’s normal signup rules.
- The carousel **must** be able to treat these sets as **rotating capacity** (key pool), not as a single shared secret.
- Using up to 10 key sets per vendor for throughput and continuity is an **explicit design input** for C123, not an edge case.
- Keys remain secrets (GitHub Actions secrets, Render env, or a secrets manager). They are never committed. Logs must never print raw key material.
- Pool size is configuration (`KEY_POOL_SIZE` / listed secret names), defaulting to 1 for solo deploy and scaling to 10 when configured.

This does **not** require the code to assume illegal shared accounts or ToS evasion. It assumes **thirteen ordinary accounts/keys** operated by thirteen participants.

### 3.3 Channel preference

1. Official provider **API** (primary).  
2. Aggregator APIs that expose free or tiered models (e.g. OpenRouter free endpoints), when listed in the catalog.  
3. Browser web UI automation — **not** required for C123 MVP; only if Navigator later enables a catalog entry with `channel: browser`.

---

## 4. Relationship to existing code (baseline at C122 close)

Already present (reuse, do not rewrite blindly):

| Area | Location (indicative) | C123 use |
|------|----------------------|----------|
| Gemini cascade allowlist | `server/modelRegistry.ts`, `MODEL_CASCADE_*` | Seed entries for free-key flash-lite only |
| Free-key model lock | `docs/MODEL_ALLOWLIST.md`, `GEMINI_ALLOWED_MODELS` | Remains for Gemini family until catalog supersedes hard-coded probes |
| Provider adapter | `server/geminiAdapter.ts`, `server/adapter.ts` | Pattern for additional adapters |
| Router / health | `server/router.ts`, `server/modelHealth.ts`, `server/modelAvailability.ts` | Extend to multi-source + multi-key |
| Expert / conversation routes | `server.ts` | Call carousel gateway only |

**Gap:** agents and server paths still assume a thin Gemini-centric cascade rather than a **source catalog + key pool + unified failover**.

---

## 5. Target architecture

```
Agent (Conversational | Expert | Architect)
        │
        ▼
┌───────────────────────────┐
│  Model Carousel Gateway   │  executeModelCall(req) → Result + Lineage
│  - policy / data_class    │
│  - rank sources           │
│  - key pool pick          │
│  - failover + cooldown    │
└───────────┬───────────────┘
            │
     ┌──────┴──────┬─────────────┐
     ▼             ▼             ▼
 Source A       Source B      Source C
 (Gemini        (OpenRouter   (…catalog)
  key pool)      free API)
     │             │
  adapters      adapters
```

### 5.1 Lineage (mandatory on success and on final failure)

Every call records at least:

```json
{
  "request_id": "…",
  "source_id": "gemini-org-pool",
  "model": "gemini-3.5-flash-lite",
  "channel": "api",
  "key_slot": 3,
  "data_class": "public",
  "started_at": "ISO-8601",
  "latency_ms": 0,
  "status": "ok | failover | failed",
  "error_class": null
}
```

`key_slot` is an index or opaque slot id (1–10), **never** the secret value.

### 5.2 Failover order (default policy)

1. Filter catalog by `enabled`, `data_class`, capability needs.  
2. Drop sources in **cooldown** or open **breaker**.  
3. Within a source, rotate **key slots** that still have budget.  
4. Within a key, try **model cascade** for that source (e.g. 3.5-lite then 3.1-lite).  
5. On `PROVIDER_QUOTA` / `PROVIDER_TRANSIENT` / timeout → mark slot or source cool, try next.  
6. If all exhaust → structured error to the agent (no silent empty answer).

### 5.3 Ranking (after MVP)

Prefer: control-set quality score → latency → remaining budget → lower cost tier.  
MVP may use **static priority** in the catalog file.

---

## 6. Implementation phases (patches after P123.0.1)

| Phase | Patch theme (indicative) | Deliverable | Acceptance sketch |
|-------|--------------------------|-------------|-------------------|
| **D0** | P123.0.1 Documentation | This mandate + catalog schema + C122 closure | Docs only; version 123 |
| **P1** | Gateway + lineage | `executeModelCall`, lineage on responses, single-source behaviour = today’s Gemini | **DONE P123.1** — `server/modelCarousel.ts`; analysisService wired |
| **P2** | Key pool | 1..N slots for Gemini (N≤10), rotation on 429/quota | **DONE P123.2** — `server/keyPool.ts` + carousel rotation |
| **P3** | Multi-source catalog | YAML/JSON catalog + second API source adapter (Navigator picks which) | Failover integration test |
| **P4** | Health + cooldown + breaker | Per source and per key_slot | Simulated 429/503 |
| **P5** | Ops | Probe workflow, dashboard-friendly logs, Render/GitHub secret naming convention | **DONE P123.5** — `carousel:probe` + `docs/C123_OPS.md` |
| **P6** | Optional browser channel | Only if Navigator enables | Explicit opt-in |

Phases may be merged or split; order P1→P2→P3 is normative.

---

## 7. Secret and env conventions (design)

Illustrative naming (final names in P2/P5):

```text
# Single-key deploy (today)
GEMINI_API_KEY=

# Pool deploy (up to 10)
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
…
GEMINI_API_KEY_10=
MODEL_KEY_POOL_PROVIDER=gemini
MODEL_KEY_POOL_SIZE=10

# Cascades remain allowlisted model ids only for Gemini family
MODEL_CASCADE_LIGHT=gemini-3.5-flash-lite,gemini-3.1-flash-lite
MODEL_CASCADE_STRONG=gemini-3.5-flash-lite,gemini-3.1-flash-lite
```

Empty slots are skipped. Size 1 preserves current solo deploy.

---

## 8. Data classes (lightweight)

| Class | Meaning | Default routing |
|-------|---------|-----------------|
| `public` | Non-sensitive prompts | Any enabled catalog source |
| `restricted` | Heightened care | Sources flagged `allows_restricted` only (may be Gemini-only pool initially) |

MVP may treat all traffic as `public` if no classifier exists yet.

---

## 9. Testing strategy

| Layer | What |
|-------|------|
| Unit | Failover matrix, cooldown, pool skip empty keys, lineage shape |
| Contract | Catalog schema validation; banned retired Gemini ids remain locked unless catalog explicitly replaces allowlist |
| Integration | Fake providers returning 429 then 200 on next source/slot |
| Live (opt-in) | `REAL_MODEL_EVAL` / carousel probe with real keys — never mandatory in default CI |
| Expert-verify | Must stay green; carousel changes must not break Expert e2e spawn PATH fixes |

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Provider bans a key | Cool slot; continue with remaining ≤12; alert in logs |
| Cascade points at dead model ids | Keep `MODEL_ALLOWLIST` / catalog validation |
| Agents bypass gateway | Boundary tests; only gateway imports adapters |
| Secret leakage in TAP/artifacts | Existing redaction patterns; forbid keys in scenario JSON |
| Over-scoping into browser P121 | Explicit Phase 6 only |

---

## 11. Success criteria for cycle C123

1. Catalog-driven source list loadable without code change for priority/order tweaks.  
2. Automatic failover across models and, when configured, across **up to 10 key slots**.  
3. Lineage on every model result used by agents.  
4. Expert and Conversational still function with `GEMINI_API_KEY` alone (pool size 1).  
5. Documentation and tests describe carousel behaviour without requiring live multi-key CI.  
6. Navigator can enable a second API provider via config + secrets.

---

## 12. Immediate next step after P123.0.1

**P123.1 — Carousel gateway skeleton + lineage** (implementation), preserving single-key Gemini behaviour as the first catalog source.
