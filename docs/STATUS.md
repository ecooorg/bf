# BiForge — STATUS

> The single authoritative progress file. Updated: 2026-10-16 · **v48 P48 epistemic**

## 1. Current status

| Workstream | Status |
| --- | --- |
| **Version** | **48** |
| **UI1** | Simple / Expert / Project cards; mode controls via **More** |
| **QA1** | Offline suite; path to **MANUAL1** |
| **Code Delivery** | **RM-C3** closed (**P43**); `model_patch`; runtime env-gated |
| **P48** | Uncertainty core + optional Groq verifier (variant A); never blocks primary reply |
| **offrepo** | Group B path tests relaxed — ARCHIVE/CONCEPTS bulk may leave main after local zip |
| **P50** | Optional web search for fresh facts (Gemini + Google Search); **off** unless `ENABLE_WEB_SEARCH=true` (`docs/P50-SPEC.md`) |
| **P49** | Multi-provider cascade SPEC **deferred** (`docs/P49-SPEC.md`) — Gemini+Groq+CF primary intent; NIM+OpenRouter spare |
| **CI / Deploy** | Owner: apply patch → CI → deploy v48 → short smoke → external testers |

## 2. Next

| # | ID | Item | Owner |
| --- | --- | --- | --- |
| 1 | **CI** | Confirm green on P48 | Owner (log) |
| 2 | **Deploy** | v48 production | Owner |
| 3 | **Smoke** | Simple plain / research+numbers / Expert; with and without Groq | Owner |
| 4 | **MANUAL1** | Full acceptance (OWNER_OPS) | Owner |
| — | **P49** | Cascade expansion — only when Gemini+Groq insufficient | Deferred |
| — | GitHub write | **Deferred** (ADR-06) | Owner |

## 3. Requires explicit authorization

Server execution; silent GitHub main; GitHub App write.

## 4. Open questions

1. UX1 has been approved.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
