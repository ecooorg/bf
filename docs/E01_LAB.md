# E-01 live lab — Navigator minimum (PA-04)

> Test repo: `ecooorg/biforge-e01-lab`. Product notes: ARCHIVE E01-NOTES (off-repo) on `ecooorg/bf`.  
> **No PAT in chat. No Railway. No schedule.** Lab runner uses `GITHUB_TOKEN` on the lab repo only.

## One-time setup

1. From **bf** open CONCEPTS e01-task.yml (off-repo) → copy all.
2. In **lab** on `main`: create `.github/workflows/e01-task.yml` with that content → commit.
3. Details: CONCEPTS e01-lab-SETUP (off-repo).

## Each pair (six times)

1. Lab → **Actions** → **E-01 task** → **Run workflow**.
2. Choose `task` + `side` → Run.
3. Wait for the workflow job and the PR **ci** check.
4. Chat one line: `t1 model done | ~8` (task, side, minutes).

Assistant updates notes on **bf** (patch). You do not edit `E01-NOTES.md` by hand.

## Progress

| Pair | Status |
| --- | --- |
| e01-t1 model | Done earlier via web (1 fix); may re-run via workflow for a clean artifact |
| e01-t1 manual | Next via workflow or finish web stage 6 |
| e01-t2 model / manual | Workflow |
| e01-t3 model / manual | Workflow |

## After six rows

Assistant delivers ARCHIVE E01-RESULTS (off-repo) + ADR-10 card.  
You answer: `ok ADR-10` or `no ADR-10: reason`.

## Decision rule (TZ 11.9)

`model_patch` ≥ 2 of 3 green with ≤ 2 fixes each, and sum(humanMinutes model) ≤ sum(manual).  
Enable product `CODE_EXECUTOR=model_patch` only after that + your Tier-3 ok.

## Related

- `docs/PA-04-SPEC.md`, `scripts/e01-notes-merge.mjs`, `docs/PA-02-SPEC.md`, `docs/P19x-SPEC.md`
