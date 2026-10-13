# P26a hotfix — CI green

Fixes from failed check-and-build (2026-10-13):

1. `src/workspace/ingest.ts` — TS narrowing on `normalizePath` result; JSZip gets a plain `Uint8Array` copy (not `ArrayBufferLike`).
2. `server/codeTaskService.ts:604` — `data: new Uint8Array(bundle)` because `z.instanceof(Uint8Array)` rejects Node `Buffer<ArrayBufferLike>` under current `@types/node`.

```bash
cp -r src/workspace ./src/
cp server/files.ts ./server/files.ts
cp server/codeTaskService.ts ./server/codeTaskService.ts
cp tests/workspace-*.test.mjs ./tests/
# docs + package.json scripts as before
npm run typecheck
npm run build:server
npm run test:p26a
```

Verified locally: `tsc --noEmit` and `tsc -p tsconfig.server.json --noEmit` exit 0.
