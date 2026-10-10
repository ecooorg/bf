# ADR-07 — Budget units, quota-first routing and cost formulas

- **Status:** Proposed for P08 (BX-13.a). Owner approves before implementation (step is marked ★).
- **Context:** BiForge is built by a non-profit that shares knowledge freely. Money is not the scarce resource: free-tier quotas (requests and tokens per minute and per day) are. The owner wants maximum use of free, open and self-hosted capacity and minimum dependence on any single commercial vendor. TZ 7.3 requires a deterministic Router with a budget check before every call; TZ 7.8 requires versioned unit formulas.
- **Options:**
  1. Budget in money (USD). Simple, but meaningless for free tiers (always 0) and blind to quota exhaustion.
  2. Budget in provider-specific units. Precise, but not comparable across providers.
  3. Budget in provider-neutral **units derived from tokens**, plus per-model **quota windows** from the registry, plus a separate **shadow cost** in USD for reporting.
- **Decision:** option 3.
  - **Unit.** `units = ceil((input_tokens + output_tokens) / 1000)`, minimum 1 per call. Cached tokens are part of input. Policy id `units-v1`; the formula and the defaults live in `server/budget.ts` and change only through a new policy version.
  - **Defaults (owner may change in config):** 30 units per task run; the day cap (300 units per project) is recorded here but enforced from P09, when the full ledger exists.
  - **Quota windows.** Registry entries may carry `limits {rpm, rpd, tpm, tpd}`. Router tracks requests and tokens in rolling 60 s and 24 h windows (in memory in P08) and rejects a model **before** the call when the estimated call would exceed a limit (`quota:rpm|rpd|tpm|tpd`). A 429 then becomes the exception, not the routine.
  - **Cost tier.** Each entry has `costTier`: `self_hosted` (rank 0), `free` (1), `paid` (2). Order of candidates: quality class, then cost tier, then registry order. (Latency is the third key in TZ 7.3; without `model_health` (P09) registry order stands in for it.)
  - **Paid is off by default.** A `paid` model is a candidate only if its provider is listed in `paidApproved` of the call. The default list is empty. Without approval Router rejects with `paid_not_approved`; if nothing else is left the result is `blocked`, never a silent spend.
  - **Data sensitivity.** Call input `sensitivity: normal | high` (default `normal`). `high` admits only `dataPolicy` `paid` or `self_hosted`. Free tiers may use data for training, so they are for open or non-sensitive material. `unknown` is never admitted for `high` (A-02, A-08).
  - **Shadow cost.** Registry entries may carry `pricing {inputPerMTok, outputPerMTok}` (USD, as published by the provider). Each ledger row stores `units` and `cost_estimate` = what the call would cost at that price; free and self-hosted calls therefore show "avoided cost" for reports to funders. Missing pricing → `null`, never a guess.
  - **Vendor neutrality.** No vendor or model name appears in Router or budget logic; only registry data.
- **Consequences:** Router cannot silently overspend or burn a free quota. High-sensitivity work has no model until a paid or self-hosted provider exists; this is an honest refusal (TZ 7.3), not a bug. A `self_hosted` model joins later by a registry entry through the existing `openai-compatible` adapter, no code change.
- **Out of scope for P08:** ToS-evading tactics (many free accounts, key rotation). Capacity grows only through additional independent providers, non-profit/research programmes, open-weight models and self-hosting, each checked by A-08 / E.2.
- **Revisit when:** a self-hosted model is connected; `model_health` arrives (P09, latency ordering); real usage shows the 30-unit default is wrong.
