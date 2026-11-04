/** Conversation-oriented diagnostic log for Simple and Expert modes (P124.24). Project Mode keeps its own log. */
import { buildCommit, recentApplicationLogs, releaseLabel, systemDiagnostics } from './projectDiagnostics.ts';
import { processSnapshot } from './processLifecycle.ts';
import { buildStampStatus, configSnapshot, formatConfigLines, loadSourceText, unusedEnvNames } from './diagnosticsConfig.ts';

const j = (v: unknown, max = 1500) => { try { return JSON.stringify(v ?? {}).slice(0, max); } catch { return '{}'; } };

export async function conversationSessionLog(): Promise<string> {
  const commit = buildCommit();
  const logs = (await recentApplicationLogs(1500));
  const rows = logs.logs as any[];
  const runtime = (await systemDiagnostics()).runtime;
  const stamp = buildStampStatus(commit);
  const cfg = configSnapshot();
  const src = loadSourceText();
  const unused = src.files ? unusedEnvNames(cfg.map((c) => c.name), src.text) : null;
  const snap = processSnapshot();
  const boots = rows.filter((r) => r.event === 'process_boot').slice(-20);
  const searches = rows.filter((r) => r.event === 'web_search' || r.event === 'simple_direct_search' || r.event === 'direct_web_search').slice(-40);
  const planner = rows.filter((r) => r.event === 'search_planner_timing').slice(-40);
  const convo = rows.filter((r) => r.component === 'conversation'
    && (/pipeline|passthrough/.test(String(r.event)) || String(r.event).startsWith('conversation_') || String(r.event).startsWith('simple_direct_'))).slice(-80);
  const problems = rows.filter((r) => (r.component === 'conversation' || r.event === 'number_validator_error') && (r.level === 'warn' || r.level === 'error')).slice(-40);
  const http = rows.filter((r) => r.component === 'http' && /\/api\/(agent\/conversational|conversation|agent\/expert)/.test(String(r.details?.path || ''))).slice(-40);
  const line = (r: any) => `${r.timestamp} ${String(r.level).toUpperCase()} ${r.event} request=${r.requestId ?? '-'} message=${String(r.message ?? '').slice(0, 300)} details=${j(r.details)}`;
  // P125.4 item 8: header states whether running release equals repository package.json patch.
  const pkgPatch = releaseLabel();
  const stampPatch = stamp.stampPatch ?? null;
  const releaseMatchesRepo = Boolean(pkgPatch && stampPatch && String(pkgPatch) === String(stampPatch));
  const lines = [
    'BIFORGE CONVERSATION DIAGNOSTIC LOG (Simple and Expert)',
    `exportedAt=${new Date().toISOString()}`,
    `appVersion=${runtime.appVersion} patch=${pkgPatch ?? 'unknown'} runtimeCommit=${commit}`,
    `buildStamp=${stamp.status} stampCommit=${stamp.stampCommit ?? '-'} builtAt=${stamp.builtAt ?? '-'} stampPatch=${stampPatch ?? '-'}`,
    `releaseMatchesRepoPackagePatch=${releaseMatchesRepo ? 'yes' : 'no'}`,
    `applicationLogSource=${logs.source} databaseLogWriteFailures=${logs.dbWriteFailures}`,
    'PROCESS:',
    `pid=${snap.pid} uptimeSec=${snap.uptimeSec} rssMb=${snap.rssMb} heapUsedMb=${snap.heapUsedMb} memoryLimitMb=${snap.memoryLimitMb ?? 'unknown'} node=${process.version}`,
    'BOOT_HISTORY (last 20 process_boot records; previousShutdown explains why the earlier process stopped):',
    ...(boots.length ? boots.map(line) : ['NO_PROCESS_BOOT_RECORDS']),
    'CONFIG_SNAPSHOT (non-secret values in full; secrets only as set/length/short SHA-256 fingerprint):',
    ...formatConfigLines(cfg),
    unused === null ? 'ENV_SET_BUT_UNUSED: NOT_VERIFIED (application source files are not present at runtime)' : `ENV_SET_BUT_UNUSED (names only; scanned ${src.files} source files): ${unused.length ? unused.join(', ') : 'none'}`,
    'SEARCH_DECISIONS (last 40; expect gate reason, planSource, place, country, sourceCountry, dictated, queries, hosts — never secrets):',
    ...(searches.length ? searches.map(line) : ['NO_SEARCH_DECISION_RECORDS']),
    'SEARCH_PLANNER_TIMING (last 40):',
    ...(planner.length ? planner.map(line) : ['NO_SEARCH_PLANNER_TIMING_RECORDS']),
    'CONVERSATION_RESPONSES_AND_RELIABILITY_METRICS (last 80; separates generation from HTTP completion; client rendering is not inferred):',
    ...(convo.length ? convo.map((r) => `${r.timestamp} ${r.event} request=${r.requestId ?? '-'}\nDETAILS=${JSON.stringify(r.details ?? {}, null, 2)}`) : ['NO_CONVERSATION_EVENTS_CAPTURED']),
    'WARNINGS_AND_ERRORS (conversation, last 40):',
    ...(problems.length ? problems.map(line) : ['NONE']),
    'CONVERSATION_HTTP_REQUESTS (last 40):',
    ...(http.length ? http.map((r) => `${r.timestamp} request=${r.requestId ?? '-'} details=${j(r.details, 400)}`) : ['NO_CONVERSATION_HTTP_REQUESTS_CAPTURED']),
    'CAPTURE POLICY: conversation history, model prompts and outputs are captured for this single-user test environment. Secrets appear only as set/length/fingerprint. Project Mode operations are not part of this log.',
  ];
  return lines.join('\n').slice(0, 240000) + '\n';
}
