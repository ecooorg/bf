# Model sources catalog (C123)

**Status:** Design baseline for implementation (P123.0.1)  
**Normative cycle doc:** `docs/C123_MODEL_CAROUSEL.md`

The catalog is **data**, not agent code. Adding a source should mean editing configuration and secrets, not patching three agents.

---

## 1. File placement (planned)

| Path | Role |
|------|------|
| `config/model-sources.yaml` (or `.json`) | Checked-in catalog: public metadata only |
| Env / secrets | API keys and pool slots |
| Runtime merge | Catalog + env → live `SourceRuntime[]` |

No secrets in the catalog file.

---

## 2. Schema (draft)

```yaml
schema_version: 1
sources:
  - id: gemini-free-pool
    channel: api          # api | browser (browser not in MVP)
    provider: gemini
    adapter: gemini       # maps to code adapter
    enabled: true
    priority: 100         # higher tried first (MVP static rank)
    data_classes: [public, restricted]
    models:
      - id: gemini-3.5-flash-lite
        role: strong
      - id: gemini-3.1-flash-lite
        role: light
    limits:
      rpm: 15
      rpd: 1500
    key_pool:
      # Env names; up to 13 organisational slots
      env_names:
        - GEMINI_API_KEY      # slot 0 / solo deploy alias
        - GEMINI_API_KEY_1
        - GEMINI_API_KEY_2
        # … through GEMINI_API_KEY_13 as configured
      max_slots: 13
    health:
      probe: true
      cooldown_ms_on_quota: 300000
      breaker_failures: 5
      breaker_window_ms: 600000

  - id: example-second-api
    channel: api
    provider: openrouter   # example only — enable when Navigator adds keys
    adapter: openai-compatible
    enabled: false
    priority: 50
    data_classes: [public]
    base_url_env: OPENROUTER_BASE_URL
    models:
      - id: meta-llama/example-free
        role: light
    key_pool:
      env_names: [OPENROUTER_API_KEY]
      max_slots: 13
```

### Field notes

| Field | Rule |
|-------|------|
| `id` | Stable lineage id |
| `channel` | MVP: `api` only |
| `models[].id` | Must pass provider-specific allow rules (Gemini → free-key allowlist until catalog fully owns validation) |
| `key_pool.max_slots` | ≤ 13 for org capacity model |
| `enabled: false` | Present in file but never selected |

---

## 3. Selection algorithm (normative for implementers)

```
candidates = sources where enabled
             and data_class allowed
             and not breaker_open
             and has at least one non-cooled key slot with non-empty secret
sort candidates by priority desc, then recent latency asc
for source in candidates:
  for slot in rotate(source.key_slots):
    for model in source.model_cascade:
      result = adapter.call(model, slot)
      if success → return result + lineage
      if quota/transient → cool slot or source; continue
return failure lineage
```

---

## 4. Gemini free-key constraint

Until the catalog validator fully replaces hard-coded lists:

- Gemini model ids in catalog **must** be subset of `GEMINI_ALLOWED_MODELS`
  (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
- See `docs/MODEL_ALLOWLIST.md`.

Other providers define their own model ids in-catalog without forcing them into the Gemini allowlist.

---

## 5. Organisational pool of 13

| Slot | Typical env | Who |
|------|-------------|-----|
| 0 | `GEMINI_API_KEY` | Solo / primary deploy (backward compatible) |
| 1..13 | `GEMINI_API_KEY_n` | Participant keys |

Runtime skips missing or empty env values. Effective pool size can be 1..13 without code change.

---

## 6. Versioning

- `schema_version` integer; loaders reject unknown major versions.
- Catalog changes that only reorder `priority` or disable a source do not require a product version bump; new adapters do.
