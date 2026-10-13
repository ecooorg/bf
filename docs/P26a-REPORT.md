# P26a REPORT

**Date:** 2026-10-13  
**Result:** CORE GREEN (unit + fixture). Early real-model experiment: NOT_RUN (no live key in this environment).

## What landed

- ADR-12 + doc updates (SPEC_ENGINE, SPEC_PRODUCT, SECURITY_POLICY, THREAT_MODEL).
- `src/workspace/*` core (paths, classify, hash, ingest zip, memory store).
- `server/files.ts` fixes (TEXT_EXT, openZip, content-based text).
- `npm run test:p26a` green.
- AC-01 on `bf-v24.zip`: **345 files accepted**, 0 skipped, rootPrefix `bf-main`, stable `manifestHash` on re-ingest.

## Confirmed owner decisions

- Q-1: limits from TZ §4 (25/30/60 MB, 1500/2000 entries, semaphore 1–2).
- Q-3: CI/lock require separate confirmation (enforced in P26b ChangeSet UI).
- Q-5: explicit privacyAck per workspace (field on Workspace; UI in a.2/B).

## Early model experiment (protocol for owner)

Run on staging with real Gemini:

1. Task A: «создай Тетрис» (empty context) — measure whether model emits structured multi-file plan.
2. Task B: load `bf-v24.zip` via ingest (or attach summary), ask for a small edit with `edits[{find,replace}]`.
3. Task C: «добавь функцию X» to a known file.

Record: % of `find` that match exactly once; needFiles usage; round count. Do **not** freeze `workspaceChangeSet` contract until metrics exist.

## Follow-ups

- P26a.2: tar, folders, IndexedDB, WORKSPACE block, needFiles.
- Hostile zip fixtures with raw central-directory `../` (JSZip rewrites on create).
- Include `src/workspace/**` in `tsconfig.server.json` when server worker lands (P26c).

## Risk notes

- JSZip loads full archive into memory; streaming (`fflate.Unzip`) remains preferred for production server worker (NF-01).
- windows-1251 files are read-only for edits until round-trip encoder is available (FW-16).
