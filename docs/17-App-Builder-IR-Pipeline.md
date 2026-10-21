# 17. App Builder IR pipeline (P59)

## Machine middle, human edge

```
goal / wizard answers
        ↓
   App IR (JSON)
        ↓
 resolve_stack (no model)
        ↓
 materialize_scaffold (verified templates)
        ↓
 optional narrow model slice (APP_BUILDER_MODEL_SLICE=true)
        ↓
 assemble ZIP + BIFORGE-IR.json + DEPLOY-MANUAL
        ↓
 human → GitHub → Render/Railway
```

## Stacks

| Id | Use |
|----|-----|
| `static_site` | HTML/CSS/JS, localStorage demo notes |
| `node_api` | HTTP API + `/health` + notes API |
| `node_express_static` | Static UI + same API in one Node process |

## API

`POST /api/projects/:id/code/build` with `engine: "pipeline"` (default).

Body may include IR fields: `kind`, `needsAuth`, `needsDb`, `language`, `stack`, `constraints`, `features`, `name`, or full `ir`.

Legacy: `engine: "model_patch"` keeps the previous model-writes-all-files path.

## Env

- Pipeline works **without** `CODE_EXECUTOR` (scaffold only).
- `APP_BUILDER_MODEL_SLICE=true` + `CODE_EXECUTOR=model_patch` enables optional model edits on top of scaffold.
- No automatic GitHub/Render integration.

## Debug

Response includes `steps`, `log`, `stack`, `fileCount`. ZIP contains `BIFORGE-IR.json`.
