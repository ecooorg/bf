# C125 WP3 Step 1 — Workflow audit (updated P125.6)

## Active inventory (owner decision, post C125)

| Path | Role | Disposition |
|------|------|-------------|
| `ci.yml` | Core CI — verification DAG, unit/contract, UI smoke | **keep** |
| `answer-quality-verify.yml` | Answer quality: search routing, fidelity, policy, carousel offline, opt-in live | **keep** |
| `.github/dependabot.yml` | Platform dependency updates | **keep** (platform) |
| CodeQL (org/repo scanning, if enabled) | SAST | **keep** (platform) |

## Retired product workflows (absent; do not restore)

| Former path | Why retired |
|-------------|-------------|
| `architect-compare.yml` | One-time Lab vs Legacy mode selection; mode already chosen |
| `acceptance.yml` | Stale browser journeys risk false green/red vs current UI |
| `expert-verify.yml` | Stale Expert-specific surface; rewrite if needed later |
| `ops.yml` | Stale ops/governance assumptions; rewrite if needed later |
| `carousel-verify.yml` | Offline coverage folded into `answer-quality-verify.yml` |
| `information-quality.yml` | Folded into answer-quality path |

Using retired YAML is treated as harmful: it encodes past product assumptions. When a capability is needed again, write a **new** workflow against the current contracts.

## Verification-DAG

Check classes still apply inside Core CI and Answer Quality. Source-text regex contracts continue to migrate to behaviour tests (WP3 step 2, incremental). Live production multi-turn evidence remains a Navigator/release concern (`AGENTS.md` G5), not a substitute for deleted workflows.
