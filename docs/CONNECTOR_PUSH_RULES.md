# Connector push integrity (G6)

**Binding.** See `AGENTS.md` §0 G6.

## Why

On 2026-11-26 a truncated connector payload replaced production `server/immofinder/live.ts` with a stub. Core CI went red and the live search path was offline until the file was restored from known-good SHA `80d5995b`.

## Rules

1. **Verify after every write.** After `push_files` or `create_or_update_file`, confirm remote `size` and a content fingerprint (unique symbol + `wc -c` via Contents API or commit raw URL) match the intended local file.
2. **No placeholders.** Never commit `PLACEHOLDER`, `RESTORE_FROM_LOCAL`, incomplete `throw new Error(...)`, or empty bodies as a path to “fix later”.
3. **Prefer small modules.** For files ≳15 KB, extract the change into a new small module and a minimal import edit instead of rewriting the whole large file in one connector call.
4. **Restore before stacking.** If verification fails, restore the last known-good blob by SHA before any further feature work.
5. **Report.** Session evidence must record OBSERVED remote size/SHA after each connector write of a production path.

## ImmoFinder note

`server/immofinder/liveFilters.ts` holds locality pre-filter and HTTP 410 demotion helpers so `live.ts` edits stay small and push-safe.
