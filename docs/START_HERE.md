# START HERE

> **Progress and “what’s next”:** see only [`docs/STATUS.md`](./STATUS.md).  
> **Agent rules:** [`AGENTS.md`](../AGENTS.md).  
> If STATUS and AGENTS conflict with outdated backlogs, **STATUS + AGENTS take precedence**.

## In 30 seconds

1. BiForge is a decision and project agent (Node/Express + React + Gemini), deployed on Railway.
2. Modes: Simple `/`, Expert, Project `/project`.
3. Two specifications: product `docs/BiForge_TZ_v3.md` and files/Workspace `docs/BiForge_TZ_P26.md`. They are maintained in parallel; neither may silently roll back the other.
4. Before a patch: `docs/STATUS.md` → `AGENTS.md` → patch SPEC → code. Do not start the next patch number without the owner’s instruction.
5. Repository map: `docs/REPO_MAP.md`. Owner operations: `docs/OWNER_OPS.md`.
6. **Required deliverable for every patch:** a validated, downloadable `bf-PNN.zip` containing the actual changed/new files; a `.patch`/`.diff` does not replace the ZIP. Rules and completion criteria: `AGENTS.md`, §5.

## Don’t read everything indiscriminately

Long plans (`docs/MASTER_IMPLEMENTATION_PLAN.md`, the old `docs/NEXT.md`, and numerous PNN-REPORT files) are **reference material**, not a daily checklist. Check **`docs/STATUS.md`** daily.
