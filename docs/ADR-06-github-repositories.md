# ADR-06 — GitHub repository visibility, organization, and Actions budget

**Status:** Proposed; owner decision required before Code Delivery creates repositories.

## Context

TZv3.0 sections 11.2 and 3.2 (A-07) require a separate repository for each generated project. The repository must contain no secrets, protect `main`, require CI checks, and prevent direct pushes to `main` including from the application. GitHub Actions minutes may be constrained, especially for private repositories.

## Options

1. **Private repositories in `ecooorg`.** Strong default confidentiality; Actions usage must be monitored and bounded. This is the recommended default for real project data.
2. **Public repositories in `ecooorg`.** May reduce Actions-minute constraints, but exposes all committed source and history. Only acceptable for explicitly public/synthetic projects after human confirmation.
3. **Repositories in a user-owned organization/account.** Keeps ownership closer to the project owner but complicates installation, policy consistency, and support.

## Interim safeguards

- P16 does not create repositories or modify settings.
- GitHub App permissions are read-only by default: metadata, contents, checks, and pull requests. No administration, secrets, workflows, or merge permission.
- Optional write permissions are only considered when `CODE_EXECUTOR=model_patch`; they remain constrained to `biforge/*` by GitHub rulesets and do not permit writes to `main`.
- Do not enable model-driven Code Delivery until the owner records a decision and confirms the real App installation and repository protections.

## Decision required

Owner to select the default visibility/ownership policy and define an Actions-minute cap or run-frequency limit after checking A-07. This decision must be recorded here before BX-19 repository creation is enabled.
