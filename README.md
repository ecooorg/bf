# BiForge Builder (v57)

Pipeline-first build of BiForge for testing:

**IR → verified scaffolds → optional model slice → downloadable ZIP**

Version: `57` (`src/config.ts` / `package.json`). Product line: **builder**.

Classic Project ceremony is not the focus of this tree. Simple and Expert modes remain available.

## Docs

| Topic | Path |
| --- | --- |
| Status | [`docs/STATUS.md`](docs/STATUS.md) |
| Deploy this app | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| Start | [`docs/START_HERE.md`](docs/START_HERE.md) |
| App Builder IR | [`docs/17-App-Builder-IR-Pipeline.md`](docs/17-App-Builder-IR-Pipeline.md) |
| Agents | [`AGENTS.md`](AGENTS.md) |

## Quick test

1. Configure env (see `docs/DEPLOY.md` and `.env.example`).
2. `npm ci && npm run build && npm start`
3. Open `/project` → Simple words → create → download ZIP.
4. Unpack ZIP, follow its README; publish to GitHub + host yourself.

Pipeline scaffolds work **without** `CODE_EXECUTOR`. Optional model slice:

```bash
CODE_EXECUTOR=model_patch
APP_BUILDER_MODEL_SLICE=true
```
