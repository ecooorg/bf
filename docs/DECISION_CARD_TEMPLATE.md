# Decision card template (Tier 2)

> Produced by `scripts/gate-eval.mjs` (`npm run gate:eval`) or written by hand. One card, one decision, one screen on a phone. Policy: `docs/DELEGATION.md`.

```
CARD: <ADR-10 | G1a | G1 | G2 | G3 | G4 | ENABLE_MODEL_PATCH | SPEC-P19x | SPEC-P25>
DATE: <YYYY-MM-DD>   COMMIT: <sha>   CI: <link>
RULE: <section of the TZ applied, one line>
EVIDENCE:
  <step id> | <PASS|FAIL|BLOCKED|NOT_RUN|REAL_ONLY|PARTIAL|OWNER_ATTESTED|SCRIPTED_HUMAN_STEP|WAIVED> | <record path or link>
RULE RESULT: <POSITIVE | NEGATIVE | BOTH_FAILED | INSUFFICIENT_EVIDENCE | NEEDS_HUMAN>
RECOMMENDATION: <ACCEPT | REJECT | COLLECT_MORE | NO_RECOMMENDATION> - <one-sentence reason>
DEVIATIONS FROM THE TZ: <none | list; each must be accepted explicitly>
IF ACCEPTED, THE AI ASSISTANT WILL: <exact file changes>
IF REJECTED: <what happens next>
REPLY: "ok <CARD>" or "no <CARD>: <reason>"
```

Rules:
- A step counts as satisfied only with a status `PASS` and a record. `NOT_RUN`, `BLOCKED`, `REAL_ONLY` and `PARTIAL` never give `ACCEPT`.
- `OWNER_ATTESTED` is accepted only for owner-judgement steps (`RM-A2`, `RM-B1`); `WAIVED` needs `by: owner` and a reason; both appear under DEVIATIONS.
- `NO_RECOMMENDATION` is used when the TZ leaves the judgement to the owner (E-01: `model_patch` passed but is worse in human time).
- A card never contains secrets (output is scrubbed). The Navigator's reply is recorded in the matching document with the date.
