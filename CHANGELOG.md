# Changelog

Format: newest first. Behavior changes must update tests and this file in the same step (TZ 16.3).

## Unreleased
- P00: documentation only. Added `docs/START_HERE.md`, `docs/REPO_MAP.md`, `docs/CURRENT_STATE.md`, `docs/PATCH_TEMPLATE.md`, `docs/BX-07-REPORT.md`; one specification name `docs/BiForge_TZ_v3.md`; TZ status approved, section "How to read" and 16.3.1 (actual process); `AGENTS.md` aligned with the real process; `scripts/check-docs.mjs` also checks backticked paths; environment variables documented; removed root clutter files and `BIFORGE-STATE.json`.
- P00b: deleted historical step specs, reports and audits (BX-01…BX-05, BF-01, QA diagnostic of 9 October 2026, `AUDIT_REPORT_RU.md`); references updated.
- Patch A: `/health`, `/ready`, `/api/health` return `commit` (RAILWAY_GIT_COMMIT_SHA).
- Patch B: TZ updated (language rule 6.1.1, step rules in 16.3, BX-07 narrowed); CHANGELOG.md added.
- BX-07.a: `updateProjectState` requires a non-empty `sourceRef`; `project.created` event records `source_ref`; live test checks provenance on versions and events.
- BX-07.b: live test that Project State and history survive a service restart and the version counter continues.
- BX-07.c (part 1): `/project` UI (src/ProjectMode.tsx) is English; test text updated. Simple Mode (src/ui.ts, src/App.tsx) is still Russian — next part.
- BX-07.c: UI is English only (TZ 6.1.1). Removed the Russian UI dictionary and DOM translation from `src/ui.ts` (`installUiLanguage` is now a no-op), Russian variants of error/status messages (`src/errors.ts`, `attachments.ts`, `ConversationFiles.tsx`, `App.tsx`, `libraryExport.ts`), and the Russian model-unavailable fallback reply (`server.ts`). Kept on purpose: Russian number words and keyword lists (recognition logic), crisis phrases, transliteration table, language detection, and Russian test inputs. Generated document labels still follow the dialogue language.
- TZ: section 16.4 reworked into a patch-based delivery plan (P01-P25); UI shows only 'BiForge' (6.1.1 rule 4); 16.3 rule 6 and 16.5 updated.
