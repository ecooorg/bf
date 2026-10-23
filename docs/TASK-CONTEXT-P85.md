# P85 — Task-aware context planning

P85 adds a deterministic, read-only task entry point on top of P81 `context:plan`.

```sh
npm run context:task -- --task "Fix Project Mode ZIP download"
npm run context:task -- --task "Fix Project Mode ZIP download" --json
npm run test:task-context
```

The output lists **heuristic** change candidates, one-hop **static** supporting evidence from P81, review-required invariants, draft acceptance criteria, relevant tests, and explicit uncertainties. The task description is not sent to any model or network endpoint. No new user form, runtime API, database, or product UI is introduced.

Keyword matching is intentionally limited: a missing match returns `UNKNOWN` with a request to identify a relevant file, never a fabricated confident plan. A matching feature still reports `PARTIAL`. Suggested tests and files are navigation aids, not a verified coverage guarantee. Review contracts and integration points before editing.

For Project Mode, missing runtime evidence about source generation, ZIP validation, persistence, HTTP transfer and client receipt is explicitly noted. P85 does not collect logs or validate an actual download; those belong to later focused diagnostics work.

## Human-effort and safety gate

- **Work removed:** repeated manual identification of likely entry points and existing checks for common task types.
- **Evidence added:** deterministic mapping, P81 static dependency hints, and explicit unknowns.
- **Complexity cost:** one small CLI, one mapping library, and focused tests; feature mappings require maintenance when files move.
- **Measure:** review task-target recall, false positives and time to find relevant files on P84 benchmark scenarios before asserting an improvement. No benchmark delta is claimed in this patch.

## Limitations

P85 recognizes a bounded vocabulary of UI, API, persistence, configuration and Project Mode/artifact tasks. It is not a semantic intent parser, full dependency graph, security audit, runtime test or formal proof. Its draft acceptance criterion is a prompt for review, not an automatically validated test.
