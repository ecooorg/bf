# Mini-patch: mode packs on bf-v27

Base: bf-v27 (CI green; version/typecheck already OK).

## What
Separate instruction packs so Simple Mode is human/substance-first without weakening Expert/Project.

| Mode | Files |
|------|--------|
| Simple | `server/promptPacks.ts` + wrapper in `server.ts` |
| Expert | `EXPERT_STEP_PREFIX` in `generate()` for non-conversation stages |
| Project | `ANALYST_INSTRUCTION` identity line in `contextBuilder.ts` |

Also: intent flags for no-methodology / direct answer + retry; stronger `information` mode paragraph.

## Apply
```bash
cd bf-main
unzip -o mode-packs-v27.zip
bash APPLY.sh
git add server.ts server/promptPacks.ts server/conversationMode.ts server/intentFlags.ts server/contextBuilder.ts
git commit -m "mode packs: Simple substance-first; Expert/Project separate (v27)"
git push
```

## Manual test
Graubünden-style factual question → orienting answer first, not methodology lecture.
