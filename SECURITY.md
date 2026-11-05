# Security

**Canonical security and privacy rules** for this repository live in:

**[`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md)**

That document is binding. This root file is only a pointer so GitHub’s Security tab and casual clones still find the policy.

## Reporting

Report vulnerabilities privately to the repository owner (Navigator). Do not open public issues with exploit details or secrets.

Do not commit API keys, tokens, private keys, or production credentials. Use the host secret manager and `.env` locally (see `.env.example`); never put secret values in docs, workflows, or CI logs.
