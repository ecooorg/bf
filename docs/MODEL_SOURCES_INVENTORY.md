# Model sources inventory (C123) — snapshot 2026-11-01

**Status:** Preliminary candidate list for the carousel, **not** a guarantee of production fitness.  
**Runtime catalog:** `config/model-sources.json` (only `enabled: true` + credentials participate).  
**Method:** Cross-check of aggregator sites that re-read provider docs (freellm.today, gravity.fast, byoklist, KDnuggets Nov 2026), DEV/Reddit practitioner threads (AgentZero, LocalLLM, openrouter, hermesagent), and known BiForge deployment constraints.  
**Caveat:** Free tiers churn weekly. Treat every row as a **snapshot**. Prefer catalog + health probes over hard-coded model ids.

Statuses:

| Status | Meaning |
|--------|---------|
| `approved` | Wired or ready with org keys (Gemini free pool) |
| `candidate` | Appears to offer recurring free/API access; not enabled in runtime until keys + adapter path |
| `retired` | Confirmed gone or no longer free for free accounts |
| `uncertain` | Marketing free / trial / card-gated / conflicting reports |

---

## 1. Standing free / low-friction API tiers (priority candidates)

| # | Provider | Region / HQ (approx.) | Free shape (reported Oct–Nov 2026) | OpenAI-compatible | User / operator notes | Status |
|---|----------|----------------------|-----------------------------------|-------------------|----------------------|--------|
| 1 | **Google Gemini API** (AI Studio) | US | Flash / Flash-Lite class free; limits **per project in console** (not one public number) | Yes (also native SDK) | Org already uses **flash-lite only** allowlist; free tier may train outside EEA/UK/CH | **approved** (runtime) |
| 2 | **OpenRouter** `:free` | US aggregator | ~14–25 rotating `:free` models; **20 RPM / 50 RPD** (→ **1000 RPD** after $10 lifetime credits) | Yes | Practitioners: great variety, **do not hard-code** free model ids; use `openrouter/free`; negative balance can block free too | candidate |
| 3 | **Groq** | US | e.g. gpt-oss-120b/20b, qwen3.8-27b: **~30 RPM, 1k RPD, 200k tokens/day** per model | Yes | Users praise **speed**; limits are **org-level**; models retire often | candidate |
| 4 | **Cloudflare Workers AI** | US/global edge | **10 000 Neurons/day** (resets 00:00 UTC) | Partial (own run URL + OpenAI-style paths) | Good for batch; big models burn Neurons fast; some models need billing | candidate |
| 5 | **Mistral** (La Plateforme free mode) | EU (FR) | Free-mode / ~$10 monthly credit class (reports vary) | Yes | **EU option**; free mode may train unless opt-out | candidate |
| 6 | **NVIDIA NIM** / build.nvidia.com | US | Wide open-model catalog; rate limits often **unpublished** | Yes | Reddit: “underrated” wide catalog; **prototype / non-production** terms common | candidate |
| 7 | **SambaNova Cloud** | US | Low free caps reported (**~20 RPD** class) | Yes | Useful overflow only | candidate |
| 8 | **Cohere** trial | CA/US | Trial key; **~1 000 calls/month** class | Yes | Often **non-commercial**; not for production agents | candidate |
| 9 | **Cerebras** | US | Was generous free; **2026 reports: trial / card / $5 credit** more often than permanent free | Yes | Speed excellent when available; treat as **uncertain** until org verifies current plan | uncertain |
| 10 | **Z.ai / Z AI (GLM Flash $0)** | CN-linked | Flash-class models at $0 in some listings | Yes | Good regional diversity candidate; verify ToS and export | candidate |
| 11 | **OVHcloud AI Endpoints** | EU (FR) | Listed on freellm.today free survey Oct 2026 | Varies | **EU hosting** candidate | candidate |
| 12 | **Ollama Cloud** | — | Appears on freellm.today free survey | Varies | Confirm account terms | candidate |
| 13 | **Aion Labs** | — | Permanent free niche (roleplay) in “awesome free” lists | Yes | Niche quality; low priority for Expert | candidate |
| 14 | **Kilo Code** gateway | US | Free model routes / hourly quotas in community lists | Yes | Coding-oriented free routes; stability varies | candidate |
| 15 | **Typhoon** | TH (regional) | Listed in freellm.today free survey | Varies | Regional SEA option | candidate |
| 16 | **LLM7.io** | — | Listed free survey Oct 2026 | Varies | Verify independently before keys | candidate |
| 17 | **Pollinations** | — | Text (and media) over HTTP; **no key** anonymous rate ~1/15s | Custom | Best-effort; not for sensitive Expert data | candidate |
| 18 | **DeepSeek** platform | CN | Often **one-time** token grant, not recurring free | Yes | Prefer as paid/overflow after grant; trains with opt-out | uncertain |
| 19 | **Together AI** | US | Credits / promotions more than permanent free | Yes | Keep as paid fallback candidate | uncertain |
| 20 | **Fireworks / DeepInfra** | US | Occasional free credits, not stable free tier | Yes | Paid-oriented | uncertain |
| 21 | **Hugging Face Inference Providers** | US/EU | **Free accounts: no monthly credits** (2026 pricing); PRO ~$2/mo | Yes | **Not free** for free accounts anymore | retired (as free) |
| 22 | **GitHub Models** | US | **Fully retired 30 Jul 2026** | — | Remove from all plans | **retired** |
| 23 | **OpenAI API** | US | No general free chat tier | Yes | Paid only | retired (as free) |
| 24 | **Anthropic API** | US | Signup credit only, not permanent free | Yes | Paid | retired (as free) |
| 25 | **xAI API** | US | No free tier in surveyed lists | Yes | Paid | retired (as free) |

---

## 2. Practitioner consensus (not marketing)

Repeated themes from Reddit / DEV (2026):

1. **Chain providers** (Gemini + Groq + OpenRouter) — single free tier always hits a wall mid-session.  
2. **OpenRouter free list rotates** — hard-coded DeepSeek/Llama `:free` ids die without notice; prefer `openrouter/free` + fallback.  
3. **Groq is fast but org-capped**; good for classification / short steps, not only long Expert synthesis.  
4. **GitHub Models is dead** — any tutorial still listing it is stale.  
5. **HF “free inference” is misleading** for free accounts in 2026.  
6. **Cerebras** flipped between generous free and trial/card — verify before depending on it.  
7. **$10 once on OpenRouter** is a common community tip to raise free RPD from 50 → 1000 (credits remain yours for paid models).

---

## 3. BiForge wiring priority (suggested)

| Order | Source | Why |
|-------|--------|-----|
| 1 | `gemini-free-pool` | Already approved; 13 org keys |
| 2 | `openrouter-free` | One adapter, many models, easy OpenAI-compatible |
| 3 | `groq-free` | Speed + already partial registry seed in repo |
| 4 | `cloudflare-workers-ai` | Daily Neurons; edge |
| 5 | `mistral-free` | EU |
| 6 | NVIDIA / SambaNova / others | After keys exist |

Enabling a candidate = set `enabled: true` in `config/model-sources.json` + secret env + ensure adapter path (openai-compatible already exists for Groq/CF patterns).

---

## 4. What this inventory is not

- Not legal advice.  
- Not a promise that every `candidate` answers with your org’s accounts.  
- Not auto-discovery; refresh this document when free tiers move.

**Refresh cadence:** when enabling a new source, or at least each C123 ops patch.
