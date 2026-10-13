# P26a — apply onto bf-v24 / current main

Paths inside this archive match the repository layout.

```bash
# from repo root
cp -r path/to/p26a-structured/src/workspace ./src/
cp path/to/p26a-structured/server/files.ts ./server/files.ts
cp path/to/p26a-structured/tests/workspace-*.test.mjs ./tests/
cp path/to/p26a-structured/docs/* ./docs/
# merge package.json script "test:p26a" and CHANGELOG entry if not replacing wholesale
npm run test:p26a
```

Expected: AC-01 bf-v24.zip → 345 files, stable manifestHash.
