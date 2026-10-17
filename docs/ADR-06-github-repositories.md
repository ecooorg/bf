# ADR-06 — GitHub repository visibility, organization, and Actions budget

**Status:** Accepted (2026-10-13) — read-only App rights by default; merge forbidden; any write permission requires a separate owner decision.

## Context

TZv3.0 sections 11.2 and 3.2 (A-07) require a separate repository for each generated project. The repository must contain no secrets, protect `main`, require CI checks, and prevent direct pushes to `main` including from the application. GitHub Actions minutes may be constrained, especially for private repositories.

## Options considered

1. **Private repositories in `ecooorg`.** Strong default confidentiality; Actions usage must be monitored and bounded. Recommended for real project data.
2. **Public repositories in `ecooorg`.** May reduce Actions-minute constraints, but exposes all committed source and history. Only acceptable for explicitly public/synthetic projects after human confirmation.
3. **Repositories in a user-owned organization/account.** Keeps ownership closer to the project owner but complicates installation, policy consistency, and support.

## Decision

1. GitHub App permissions remain **read-only by default**: metadata, contents, checks, and pull requests, as applicable to the installed app. No administration, secrets, workflows, or merge permission.
2. **Merge is never delegated to the app or automated agent.** A human reviews and merges.
3. Any optional write permission is a separate owner decision, enabled only for the specific approved test repository / task and only when required by `CODE_EXECUTOR=model_patch` plus `GITHUB_DIFF_UPLOAD=true`. It must not allow writes to `main`; branch writes stay within `biforge/*` and repository rulesets remain enabled.
4. Default visibility is private for real project data. Public repositories require explicit human confirmation and synthetic/public data.
5. Actions-minute limits are monitored; this ADR does not assert an unverified numerical cap.

## Consequences

- Existing read-only behaviour remains the safe default.
- No permission is granted by this documentation change. Actual GitHub App installation and permission changes remain Tier 3 owner actions.
- Repository creation / Code Delivery must not be enabled on the basis of this ADR alone; follow `docs/NEXT.md` and the current gate requirements.

## Review trigger

Revisit after A-07 is checked against the actual GitHub plan, or if private-repository Actions limits become a measured blocker.

## Amendment 1 (2026-10-17) — Project scope «analysis + ZIP»; GitHub stays read-only

**Status:** Accepted on the owner's instruction. Implemented by `docs/P53-SPEC.md`; the interface for it is `docs/P54-SPEC.md`.

**Why.** The decision above (read-only by default) was not fully enforced: `CODE_EXECUTOR=model_patch`, which the ZIP path needs, also switched on the GitHub write mode in code. The owner chose to keep Project as «analysis + ZIP» until MANUAL1 and to decide on GitHub write afterwards.

**Decision.**
1. In this release Project means: (a) analysis with human-confirmed proposals; (b) plan, approvals and tasks as text artifacts under budgets; (c) a small program as a validated **ZIP download**, never executed on the BiForge server; (d) **manual Code Delivery, read-only** — BiForge prepares the Task Package, the human works in any tool and opens a PR from `biforge/<task_id>`, BiForge reads the PR and checks, evaluates gates, runs the reviewer and records the human decision.
2. The GitHub App stays **read-only**. The only GitHub write switch is `GITHUB_DIFF_UPLOAD=true`. `CODE_EXECUTOR=model_patch` means ZIP generation and implies no GitHub write.
3. The write paths (`commit-package`, diff upload, `model_patch` delivery to a branch or PR) remain implemented but off, and are hidden in the interface while the switch is off.
4. BiForge never merges and never writes to `main` (unchanged).

**Reopen trigger.** The owner decides after MANUAL1 whether to enable write for one named test repository; that needs its own owner decision and a new amendment. Changing the GitHub App permissions remains a Tier 3 owner action.

