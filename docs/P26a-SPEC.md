# P26a SPEC — Core ingest (zip) + files.ts fixes

**Status:** Implemented in tree (2026-10-13)  
**Gate:** AC-01, AC-02 (partial), AC-03 (TEXT_EXT), paths/classify unit tests; early model experiment deferred to owner environment.

## Scope

1. ADR-12 Accepted; `SPEC_ENGINE` §10.4, `SPEC_PRODUCT`, `SECURITY_POLICY`, `THREAT_MODEL` updated.
2. `src/workspace/`: `types`, `paths`, `classify`, `hash`, `ingest` (zip only), `memoryStore`.
3. `server/files.ts`: expanded text extensions + content fallback; openZip segment `..` check (not `includes('..')`); clearer archive message.
4. Tests: `test:p26a` (`workspace-paths`, `workspace-ingest`); included in `npm run check`.
5. Q-1 limits confirmed; Q-3/Q-5 recorded in updated TZ (implementation of CI confirmation and privacyAck UI in later patches).

## Out of scope (P26a.2 / B)

- tar reader, folder pick, IndexedDB, WORKSPACE block, needFiles, ChangeSet, UI panel.
- Real-model experiment metrics (requires live Gemini key; protocol in P26a-REPORT).

## Acceptance mapping

| AC | Coverage in a |
| --- | --- |
| AC-01 | `bf-v24.zip` → 345 files, stable manifestHash, root `bf-main` |
| AC-02 | path rules unit + skip table; full hostile binary fixtures → a.2 |
| AC-03 | TEXT_EXT + content-based text acceptance |
| AC-05/06 | deferred (secrets flags classified; injection corpus later) |

## Commands

```bash
npm run test:p26a
npm run check   # includes test:p26a
```
