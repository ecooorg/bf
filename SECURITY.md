> **Property-search status — owner decision 2026-11-27:** ImmoFinder is permanently retired and must not be run, developed, or used. Any ImmoFinder material below is historical archive only: it is not a current requirement, roadmap, technical instruction, or source of decisions. ImmoGR is the sole active property-search project; its current authority is the docs/IMMOGR_*.md document set.

# Security

**Canonical security and privacy rules** for this repository live in:

**[`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md)**

That document is binding. This root file is only a pointer so GitHub’s Security tab and casual clones still find the policy.

## Reporting

Report vulnerabilities privately to the repository owner (Navigator). Do not open public issues with exploit details or secrets.

Do not commit API keys, tokens, private keys, or production credentials. Use the host secret manager and `.env` locally (see `.env.example`); never put secret values in docs, workflows, or CI logs.
