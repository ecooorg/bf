# BiForge v70 — Phase 0 static source audit

**Status:** static audit and architectural inventory; NOT a completed runtime equivalence baseline.
**Source:** original owner archive `bf-v70.zip`; existing documentation patch is not considered source behavior.
**Archive SHA-256:** `70a4444bbc72a36a821d7de7cb4c602f784877b69ea8878f5b6c545847e1e298`

## Scope and methodology
- Examined 243 extracted files and indexed 184 source/style/SQL/script files.
- Collected module sizes, relative imports, candidate cycles, HTTP registrations, package commands, test suites, CI configuration, TS configuration and documentation.
- Regex-derived relationships and route lists are **candidates**, not AST-confirmed semantic facts. Dynamic imports, indirect registrations and generated routes can be missed.
- No dependencies installed in the audit workspace. No build, full test suite, database, browser or live provider execution was performed.

## High-confidence findings
1. `server.ts` is a ~2993-line application entry and contains many route registrations; split by cohesive route groups only after mapping middleware ordering and authorization.
2. `src/App.tsx` is a ~2947-line UI component; split behavior-preservingly after mapping state ownership, persistence, focus and responsive UI behavior.
3. `server/codeTaskService.ts` is ~949 lines; inspect interactions with existing executor/reviewer/repair modules before decomposing.
4. `tsconfig.server.json` explicitly uses `strict: false`; gradual strictness migration should be a separate checked phase.
5. `package.json` version is `57`, although archive is labeled v70; this is not necessarily a defect (release labels can differ) and requires owner confirmation.
6. GitHub CI provisions PostgreSQL 16, installs with `npm ci`, runs independent checks, live database tests, Project Mode API security tests, build and secret scanning.
7. Documentation check and version check both passed in the available workspace; these do not prove runtime functionality.
8. Existing docs include historical snapshots/inventories; their truth status must be checked against code before retirement.

## Audit verification ledger
| Check | Result | Evidence |
|---|---|---|
| Source archive inventory | passed | ZIP extracted and inspected |
| Documentation references | passed | `node scripts/check-docs.mjs` → check:docs OK (22 Markdown files) |
| Package version guard | passed | `node scripts/check-version.mjs` → Version check OK: 57 |
| Typecheck | not_run | `node_modules` absent |
| Full regression | not_run | dependencies/services absent |
| Build | not_run | dependencies absent |
| PostgreSQL live tests | blocked | no configured DB in audit environment |
| Browser viewport checks | not_run | no running application |
| Live provider integrations | blocked | no authorized credentials |

## File inventory statistics
- Extracted files: **243**.
- File extensions: `.ts` 115, `.mjs` 38, `.md` 23, `.tsx` 16, `.sql` 14, `.json` 10, `.yml` 6, `.png` 4, `.txt` 4, `.toml` 3, `(none)` 2, `.html` 1, `.example` 1, `.yaml` 1, `.svg` 1, `.webmanifest` 1, `.css` 1, `.ttf` 1, `.csv` 1.
- HTTP method registrations directly matched in `server.ts`: **72** (not guaranteed exhaustive).
- Candidate relative-import edges: **276**.
- Candidate cycles: **3** (verify with TS-aware resolver).

## Largest source and test files
| Path | Lines | Bytes |
|---|---:|---:|
| `server.ts` | 2993 | 176096 |
| `src/App.tsx` | 2947 | 128421 |
| `tests/database.test.mjs` | 1703 | 128211 |
| `tests/pipeline.test.mjs` | 1364 | 104054 |
| `tests/models.test.mjs` | 1467 | 89694 |
| `tests/project-mode.test.mjs` | 1410 | 78112 |
| `tests/core.test.mjs` | 1239 | 68505 |
| `server/codeTaskService.ts` | 949 | 59062 |
| `src/index.css` | 833 | 58087 |
| `src/ProjectMode.tsx` | 540 | 52849 |
| `tests/files.test.mjs` | 755 | 44985 |
| `tests/workspace.test.mjs` | 1054 | 41071 |
| `server/promptPacks.ts` | 273 | 34094 |
| `tests/integrations.test.mjs` | 550 | 32678 |
| `server/webSearch.ts` | 700 | 32577 |
| `server/codeExecutor.ts` | 513 | 30832 |
| `src/ProjectDelivery.tsx` | 347 | 29444 |
| `src/ConversationFiles.tsx` | 623 | 28156 |
| `tests/gates.test.mjs` | 488 | 28064 |
| `server/githubIntegration.ts` | 370 | 25854 |
| `server/planService.ts` | 340 | 24892 |
| `src/WorkspacePanel.tsx` | 563 | 22772 |
| `tests/web-and-epistemics.test.mjs` | 405 | 21214 |
| `server/files.ts` | 420 | 21016 |
| `src/workspace/extract.ts` | 556 | 18391 |
| `src/workspace/changeset.ts` | 519 | 17822 |
| `server/taskService.ts` | 284 | 17112 |
| `tests/security.test.mjs` | 340 | 14586 |
| `src/driveMirror.ts` | 325 | 14547 |
| `server/documents.ts` | 292 | 14530 |
| `server/gateService.ts` | 180 | 13631 |
| `src/workspace/ingest.ts` | 332 | 13274 |
| `server/reasoningState.ts` | 253 | 12831 |
| `scripts/gate-eval.mjs` | 213 | 12676 |
| `src/decision.ts` | 521 | 12291 |

## Candidate import cycles
- `server/router.ts` → `server/modelHealth.ts` → `server/router.ts`
- `server/taskService.ts` → `server/gateService.ts` → `server/codeTaskService.ts` → `server/taskService.ts`
- `server/gateService.ts` → `server/codeTaskService.ts` → `server/gateService.ts`

## HTTP routes detected directly in server.ts
| Method | Path |
|---|---|
| POST | `/api/webhooks/github` |
| GET | `/api/session` |
| POST | `/api/login` |
| POST | `/api/logout` |
| GET | `/api/projects` |
| POST | `/api/projects` |
| DELETE | `/api/projects/:projectId` |
| GET | `/api/projects/:projectId` |
| GET | `/api/projects/:projectId/versions` |
| PUT | `/api/projects/:projectId/state` |
| POST | `/api/projects/:projectId/analyze` |
| POST | `/api/projects/:projectId/items/review` |
| POST | `/api/projects/:projectId/decisions` |
| GET | `/api/projects/:projectId/plans` |
| POST | `/api/projects/:projectId/plans` |
| GET | `/api/projects/:projectId/plans/:planId/tasks` |
| GET | `/api/projects/:projectId/approvals` |
| POST | `/api/projects/:projectId/approvals/:approvalId/decision` |
| GET | `/api/projects/:projectId/tasks` |
| GET | `/api/projects/:projectId/budgets/:scope/:scopeId` |
| PUT | `/api/projects/:projectId/budgets/:scope/:scopeId` |
| GET | `/api/projects/:projectId/settings` |
| PUT | `/api/projects/:projectId/settings` |
| POST | `/api/projects/:projectId/tasks/:taskId/queue` |
| GET | `/api/projects/:projectId/tasks/:taskId` |
| POST | `/api/projects/:projectId/tasks/:taskId/validate` |
| GET | `/api/projects/:projectId/tasks/:taskId/gates` |
| POST | `/api/projects/:projectId/tasks/:taskId/gates/:gate/waive` |
| POST | `/api/projects/:projectId/tasks/:taskId/gates/:gate/approve` |
| GET | `/api/projects/:projectId/tasks/:taskId/code` |
| POST | `/api/projects/:projectId/code/build` |
| GET | `/api/projects/:projectId/artifacts/:artifactId/download` |
| GET | `/api/projects/:projectId/code` |
| POST | `/api/projects/:projectId/code/manual` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/start` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/brief` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/approve` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/commit-package` |
| GET | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId` |
| GET | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/download` |
| GET | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/package` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/result` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/refresh` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/cancel` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/review` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/decide` |
| POST | `/api/projects/:projectId/tasks/:taskId/code/:codeTaskId/repair` |
| GET | `/api/projects/:projectId/artifacts` |
| GET | `/api/projects/:projectId/artifacts/:artifactId` |
| GET | `/api/projects/:projectId/ledger` |
| GET | `/api/ops` |
| GET | `/ops` |
| POST | `/api/conversation` |
| POST | `/api/neutralize` |
| POST | `/api/radar` |
| POST | `/api/understand` |
| POST | `/api/knowledge-map` |
| POST | `/api/expand` |
| POST | `/api/redteam-pair` |
| POST | `/api/redteam` |
| POST | `/api/premortem` |
| POST | `/api/experiment-draft` |
| POST | `/api/forecast-wording` |
| POST | `/api/synthesis` |
| POST | `/api/review` |
| POST | `/api/analyze-full` |
| POST | `/api/radar-legacy` |
| POST | `/api/evpi` |
| POST | `/api/revise-document` |
| POST | `/api/attach` |
| POST | `/api/export-document` |
| GET | `*` |

## Module-by-module source index
This index is a navigational baseline, not a statement that each module has a single responsibility.
| File | Lines | Local import targets |
|---|---:|---|
| `server.ts` | 2993 | `src/support.ts`, `src/numberValidator.ts`, `src/config.ts`, `server/reasoningState.ts`, `server/promptPacks.ts`, `server/security.ts`, `server/documents.ts` … |
| `server/adapter.ts` | 90 | — |
| `server/analysisService.ts` | 113 | `server/contextBuilder.ts`, `server/stateService.ts`, `server/projectRepository.ts`, `server/artifactRepository.ts`, `server/ledger.ts`, `server/routeDecisions.ts`, `server/budget.ts` … |
| `server/appBuilderIndex.ts` | 3 | `server/appBuilderIr.ts`, `server/appBuilderScaffolds.ts`, `server/appBuilderPipeline.ts` |
| `server/appBuilderIr.ts` | 78 | — |
| `server/appBuilderPipeline.ts` | 146 | `server/appBuilderIr.ts`, `server/appBuilderScaffolds.ts` |
| `server/appBuilderScaffolds.ts` | 376 | `server/appBuilderIr.ts` |
| `server/artifactFormat.ts` | 108 | — |
| `server/artifactRepository.ts` | 191 | `server/database.ts` |
| `server/auditCatalog.ts` | 36 | — |
| `server/briefWriter.ts` | 100 | `server/codeExecutor.ts` |
| `server/budget.ts` | 51 | — |
| `server/codeExecutor.ts` | 513 | `server/gateEngine.ts` |
| `server/codeTaskService.ts` | 949 | `server/database.ts`, `server/projectRepository.ts`, `server/taskService.ts`, `server/artifactRepository.ts`, `server/briefWriter.ts`, `server/reviewer.ts`, `server/gateService.ts` … |
| `server/contextBuilder.ts` | 80 | `server/statePipeline.ts` |
| `server/contracts.ts` | 137 | `server/statePipeline.ts` |
| `server/conversationMode.ts` | 46 | — |
| `server/database.ts` | 46 | — |
| `server/documents.ts` | 292 | — |
| `server/epistemicVerifier.ts` | 149 | `server/intentFlags.ts`, `server/conversationMode.ts`, `server/adapter.ts` |
| `server/fakeProvider.ts` | 38 | `server/adapter.ts` |
| `server/files.ts` | 420 | — |
| `server/gateEngine.ts` | 180 | — |
| `server/gateService.ts` | 180 | `server/database.ts`, `server/githubIntegration.ts`, `server/codeTaskService.ts` |
| `server/geminiAdapter.ts` | 67 | — |
| `server/githubIntegration.ts` | 370 | `server/codeExecutor.ts` |
| `server/goldenEval.ts` | 167 | `server/adapter.ts`, `server/modelRegistry.ts`, `server/budget.ts`, `server/statePipeline.ts` |
| `server/healthRoutes.ts` | 42 | — |
| `server/intentFlags.ts` | 119 | — |
| `server/keepAlive.ts` | 129 | — |
| `server/latencyPolicy.ts` | 92 | — |
| `server/ledger.ts` | 27 | `server/database.ts`, `server/adapter.ts` |
| `server/modelHealth.ts` | 94 | `server/database.ts`, `server/router.ts`, `server/budget.ts` |
| `server/modelRegistry.ts` | 77 | `server/adapter.ts` |
| `server/openaiCompatAdapter.ts` | 80 | — |
| `server/opsMetrics.ts` | 189 | — |
| `server/pg.d.ts` | 8 | — |
| `server/planMachine.ts` | 136 | — |
| `server/planService.ts` | 340 | `server/database.ts`, `server/taskService.ts`, `server/taskMachine.ts` |
| `server/projectCapabilities.ts` | 28 | `server/githubIntegration.ts` |
| `server/projectRepository.ts` | 168 | `server/database.ts`, `server/contracts.ts` |
| `server/promptCore.ts` | 40 | — |
| `server/promptPacks.ts` | 273 | `server/turnFocus.ts`, `server/reasoningState.ts`, `server/promptCore.ts`, `server/conversationMode.ts` |
| `server/providerMonitor.ts` | 218 | — |
| `server/queueMachine.ts` | 38 | — |
| `server/queueService.ts` | 126 | `server/database.ts`, `server/queueMachine.ts`, `server/taskService.ts` |
| `server/reasoningState.ts` | 253 | — |
| `server/redact.ts` | 94 | — |
| `server/repairLoop.ts` | 137 | — |
| `server/reviewer.ts` | 147 | `server/gateEngine.ts` |
| `server/routeDecisions.ts` | 15 | `server/database.ts`, `server/router.ts` |
| `server/router.ts` | 143 | `server/adapter.ts`, `server/modelHealth.ts`, `server/modelRegistry.ts`, `server/budget.ts` |
| `server/security.ts` | 90 | — |
| `server/statePipeline.ts` | 144 | — |
| `server/stateService.ts` | 34 | `server/statePipeline.ts`, `server/projectRepository.ts` |
| `server/taskMachine.ts` | 102 | — |
| `server/taskService.ts` | 284 | `server/database.ts`, `server/queueMachine.ts`, `server/gateEngine.ts`, `server/gateService.ts` |
| `server/turnFocus.ts` | 55 | — |
| `server/untrustedData.ts` | 38 | — |
| `server/webSearch.ts` | 700 | `server/untrustedData.ts` |
| `server/worker.ts` | 86 | `server/queueMachine.ts`, `server/queueService.ts`, `server/taskService.ts` |
| `src/App.tsx` | 2947 | `src/storage.ts`, `src/exportZip.ts`, `src/support.ts`, `src/config.ts`, `src/exportName.ts`, `src/useDrive.ts`, `src/HistoryPanel.tsx` … |
| `src/AutoGrow.tsx` | 84 | — |
| `src/ConversationFiles.tsx` | 623 | `src/ui.ts`, `src/errors.ts`, `src/driveClient.ts`, `src/driveMirror.ts`, `src/driveExport.ts`, `src/programFiles.ts`, `src/uiStates.tsx` |
| `src/ExpertNav.tsx` | 86 | `src/decision.ts`, `src/expertNav.ts` |
| `src/HistoryPanel.tsx` | 56 | `src/decision.ts`, `src/uiStates.tsx` |
| `src/ModeMenu.tsx` | 106 | — |
| `src/OfflineIndicator.tsx` | 30 | — |
| `src/ProjectDelivery.tsx` | 347 | `src/projectCapabilities.ts`, `src/uiStates.tsx` |
| `src/ProjectMode.tsx` | 540 | `src/ProjectDelivery.tsx`, `src/projectCapabilities.ts`, `src/uiStates.tsx`, `src/projectLabels.ts`, `src/WorkspacePanel.tsx`, `src/driveMirror.ts`, `src/driveClient.ts` … |
| `src/ProjectNoviceWizard.tsx` | 338 | — |
| `src/ProjectPathChooser.tsx` | 71 | `src/projectAppBuilder.ts` |
| `src/UserGuide.tsx` | 177 | — |
| `src/WorkspaceChangeSetCard.tsx` | 190 | `src/workspace/changeset.ts`, `src/workspace/types.ts` |
| `src/WorkspacePanel.tsx` | 563 | `src/workspace/ingest.ts`, `src/driveMirror.ts`, `src/workspace/idbStore.ts`, `src/workspace/context.ts`, `src/workspace/persistIngest.ts`, `src/workspace/changeset.ts`, `src/workspace/changeSetParse.ts` … |
| `src/attachments.ts` | 223 | `src/errors.ts` |
| `src/autosave.ts` | 17 | — |
| `src/briefView.ts` | 41 | `src/decision.ts` |
| `src/brier.ts` | 21 | — |
| `src/config.ts` | 15 | — |
| `src/decision.ts` | 521 | `src/config.ts` |
| `src/decisionDocument.ts` | 42 | `src/decision.ts`, `src/attachments.ts`, `src/ui.ts` |
| `src/demo-coffee.ts` | 45 | — |
| `src/driveClient.ts` | 184 | `src/driveMerge.ts` |
| `src/driveExport.ts` | 43 | `src/driveClient.ts`, `src/attachments.ts`, `src/errors.ts` |
| `src/driveMerge.ts` | 141 | — |
| `src/driveMirror.ts` | 325 | — |
| `src/driveSync.ts` | 89 | `src/driveMerge.ts`, `src/driveClient.ts` |
| `src/en.ts` | 50 | — |
| `src/errors.ts` | 44 | — |
| `src/evpi.ts` | 75 | — |
| `src/expertContext.ts` | 41 | `src/decision.ts` |
| `src/expertHistory.ts` | 25 | — |
| `src/expertNav.ts` | 51 | `src/decision.ts`, `src/uiTerms.ts` |
| `src/exportName.ts` | 6 | `src/config.ts` |
| `src/exportZip.ts` | 100 | `src/decision.ts` |
| `src/icsBuilder.ts` | 56 | `src/config.ts` |
| `src/libraryExport.ts` | 81 | `src/decision.ts`, `src/attachments.ts`, `src/decisionDocument.ts`, `src/driveMerge.ts`, `src/ui.ts` |
| `src/main.tsx` | 35 | `src/App.tsx`, `src/index.css` |
| `src/numberValidator.ts` | 238 | — |
| `src/programFiles.ts` | 355 | `src/attachments.ts`, `src/attachments.ts`, `src/driveMirror.ts` |
| `src/projectAppBuilder.ts` | 175 | — |
| `src/projectCapabilities.ts` | 30 | — |
| `src/projectDeliveryModel.ts` | 200 | `src/projectCapabilities.ts` |
| `src/projectLabels.ts` | 38 | — |
| `src/sha256Export.ts` | 35 | — |
| `src/storage.ts` | 166 | `src/decision.ts` |
| `src/support.ts` | 63 | — |
| `src/triage.ts` | 47 | — |
| `src/ui.ts` | 15 | — |
| `src/uiStates.tsx` | 40 | — |
| `src/uiTerms.ts` | 26 | — |
| `src/useDrive.ts` | 132 | `src/config.ts`, `src/autosave.ts`, `src/driveMerge.ts`, `src/driveSync.ts`, `src/driveClient.ts`, `src/driveMirror.ts` |
| `src/usePWAInstall.ts` | 62 | — |
| `src/workspace/changeSetParse.ts` | 101 | `src/workspace/changeset.ts` |
| `src/workspace/changeset.ts` | 519 | `src/workspace/paths.ts`, `src/workspace/hash.ts`, `src/workspace/classify.ts`, `src/workspace/diff.ts`, `src/workspace/types.ts` |
| `src/workspace/classify.ts` | 317 | `src/workspace/types.ts` |
| `src/workspace/context.ts` | 198 | `src/workspace/types.ts`, `src/workspace/extract.ts` |
| `src/workspace/diff.ts` | 114 | — |
| `src/workspace/exportZip.ts` | 245 | `src/workspace/types.ts`, `src/workspace/diff.ts` |
| `src/workspace/extract.ts` | 556 | `src/workspace/types.ts` |
| `src/workspace/hash.ts` | 40 | — |
| `src/workspace/idbStore.ts` | 178 | `src/workspace/hash.ts`, `src/workspace/types.ts` |
| `src/workspace/index.ts` | 15 | `src/workspace/types.ts`, `src/workspace/paths.ts`, `src/workspace/classify.ts`, `src/workspace/hash.ts`, `src/workspace/ingest.ts`, `src/workspace/memoryStore.ts`, `src/workspace/tar.ts` … |
| `src/workspace/ingest.ts` | 332 | `src/workspace/classify.ts`, `src/workspace/hash.ts`, `src/workspace/paths.ts`, `src/workspace/types.ts`, `src/workspace/types.ts`, `src/workspace/tar.ts` |
| `src/workspace/memoryStore.ts` | 137 | `src/workspace/hash.ts`, `src/workspace/types.ts` |
| `src/workspace/paths.ts` | 135 | — |
| `src/workspace/persistIngest.ts` | 85 | `src/workspace/types.ts` |
| `src/workspace/tar.ts` | 119 | — |
| `src/workspace/types.ts` | 151 | — |
| `vite.config.ts` | 20 | — |

## Test suites and execution entry points
| Script | Command |
|---|---|
| `dev` | `tsx server.ts` |
| `build` | `vite build && npm run build:server` |
| `start` | `if [ "$ENABLE_PROJECT_MODE" = "true" ]; then test -n "$APP_PASSWORD" && test "$ENABLE_APP_AUTH" != "false" && test -n "$SESSION_SECRET" && test -n "$DATABASE_URL" \|\| { echo "Project Mode requires APP_PASSWORD, ENABLE_APP_AUTH, SESSION_SECRET and DATABASE_URL" >&2; exit 1; }; fi; if [ -n "$DATABASE_URL" ]; then npm run db:migrate \|\| exit $?; fi; exec node dist-server/server.js` |
| `clean` | `rm -rf dist` |
| `lint` | `tsc --noEmit` |
| `lint:copy` | `node scripts/lint-copy.mjs` |
| `typecheck` | `tsc --noEmit` |
| `check:docs` | `node scripts/check-docs.mjs` |
| `verify:connections` | `tsx scripts/verify-connections.mjs` |
| `db:migrate` | `node scripts/migrate.mjs` |
| `patch:pack` | `node scripts/pack-simple.mjs` |
| `eval:golden` | `tsx scripts/golden-eval.mjs --fake` |
| `build:server` | `tsc -p tsconfig.server.json` |
| `monitor:connections` | `tsx scripts/monitor-connections.mjs` |
| `e01:harness` | `node scripts/e01-harness.mjs` |
| `evidence:collect` | `node scripts/evidence-collect.mjs` |
| `gate:eval` | `node scripts/gate-eval.mjs` |
| `ops:backup-check` | `tsx scripts/backup-restore-check.mjs` |
| `test:core` | `node --import tsx --test --test-timeout=60000 tests/core.test.mjs` |
| `test:models` | `node --import tsx --test --test-timeout=60000 tests/models.test.mjs` |
| `test:security` | `node --import tsx --test --test-timeout=60000 tests/security.test.mjs` |
| `test:files` | `node --import tsx --test --test-timeout=60000 tests/files.test.mjs` |
| `test:workspace` | `node --import tsx --test --test-timeout=60000 tests/workspace.test.mjs` |
| `test:database` | `node --import tsx --test --test-timeout=60000 tests/database.test.mjs` |
| `test:integrations` | `node --import tsx --test --test-timeout=60000 tests/integrations.test.mjs` |
| `test:project` | `node --import tsx --test --test-timeout=60000 tests/project-mode.test.mjs` |
| `test:gates` | `node --import tsx --test --test-timeout=60000 tests/gates.test.mjs` |
| `test:pipeline` | `node --import tsx --test --test-timeout=300000 tests/pipeline.test.mjs` |
| `test:web` | `node --import tsx --test --test-timeout=60000 tests/web-and-epistemics.test.mjs` |
| `test:turn` | `node --import tsx --test --test-timeout=60000 tests/conversation-turn.test.mjs` |
| `test:regression` | `node --import tsx --test --test-timeout=60000 tests/regression.test.mjs` |
| `test` | `npm run test:core && npm run test:models && npm run test:security && npm run test:files && npm run test:workspace && npm run test:database && npm run test:integrations && npm run test:project && npm run test:gates && npm run test:pipeline && npm run test:web && npm run test:turn && npm run test:regression` |
| `test:live` | `RUN_LIVE_TESTS=true node --import tsx --test --test-timeout=120000 --test-concurrency=1 tests/database.test.mjs tests/integrations.test.mjs tests/project-mode.test.mjs tests/gates.test.mjs` |
| `test:database:live` | `RUN_LIVE_TESTS=true node --import tsx --test --test-timeout=120000 --test-concurrency=1 tests/database.test.mjs` |
| `test:bx06:api` | `RUN_BX06_API=true node --import tsx --test --test-timeout=120000 --test-concurrency=1 tests/project-mode.test.mjs` |
| `test:ui` | `node --import tsx tests/ui-check.mjs` |
| `check` | `node scripts/check-version.mjs && npm run check:docs && npm run lint:copy && npm run typecheck && npm run test:core && npm run test:models && npm run test:security && npm run test:files && npm run test:workspace && npm run test:database && npm run test:integrations && npm run test:project && npm run test:gates && npm run test:pipeline && npm run test:web && npm run test:turn && npm run test:regression` |

## Prioritized refactoring backlog
**P0 (before changes):** establish reproducible `npm ci`, `npm run check`, `npm run build`, PostgreSQL live tests, route contract inventory, state transition inventory, UI screenshot/interaction baseline.
**P1:** split `server.ts` by verified authorization/middleware boundaries; do not reorder registrations.
**P1:** split `src/App.tsx` by UI state ownership and stable component interfaces; test both desktop and mobile.
**P1:** introduce dependency/cycle verification and machine-readable change impact map; validate against manual known examples.
**P2:** isolate decision logic from I/O in code tasks, model routing, budgets, queues, project states.
**P2:** gradually enable server TS strictness; avoid suppressing errors with `as any`.
**P2:** standardize runtime validation at JSON, DB, model-provider and generated-artifact boundaries.
**P3:** rename ambiguous modules after inspecting all exports and callers; remove redundant comments without losing invariants.
**P3:** replace stale hand-maintained inventories with generated, checkable versions; preserve product intent docs.

## Concrete risks and acceptance gates
- **Route refactor:** preserve auth, CSRF/session handling, request limits, middleware registration order, status codes and response payloads. Gate: route snapshot + security and integration suites.
- **Project Mode:** preserve database isolation, state machines, approval gates, artifact lifecycle and recovery. Gate: project, database and live API suites.
- **Model routing:** preserve provider selection, fallback, timeout, budgets and redaction. Gate: model tests and controlled fake-provider tests.
- **UI:** preserve Simple/Expert/Project flows, keyboard interaction, accessibility, autosave, 1200px/390px layouts. Gate: browser evidence and UI tests.
- **Documentation:** avoid replacing existing requirements with unsupported claims. Gate: owner-approved requirement-to-code traceability.

## Questions for Navigator before Phase 1
1. Is archive label v70 independent from package version 57?
2. Which live integrations and deployment environments may be used for verification?
3. Should backwards compatibility include existing local-storage data and previously generated project ZIP artifacts?
4. Can the future audit introduce development-only tools for AST-based dependency checks?

## Limits
This is a broad static inventory, not a line-by-line proof of every function or a completed Phase 0 gate. Follow-up semantic reviews must verify actual module responsibilities, external contracts, data flows and feature-to-test coverage before code refactoring.
