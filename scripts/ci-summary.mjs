// CI result for the owner: one line in the job summary, an error annotation when red, and a per-stage
// table built from artifacts/ci-checks/results.json plus the explicit reason for every missing log. No secrets, no network.
import fs from 'node:fs';
import path from 'node:path';
import { ciSummary } from './patch-tools.mjs';

export const EXPECTED_LOGS = ['ci-install.log', 'ci-migrate.log', 'ci-diagnostic-gate.log', 'ci-secondary-diagnostic.log', 'ci-check.log', 'ci-live.log', 'ci-api.log', 'ci-build.log'];

/** Pure: describes which logs exist in `dir` and why the others are missing. */
export function inspectLogs(dir) {
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
  const present = []; const missing = [];
  for (const f of EXPECTED_LOGS) {
    const t = read(f);
    if (t === null) missing.push({ file: f, reason: 'not created: the step did not run (an earlier step failed or was cancelled) or the job timed out before it' });
    else if (!t.trim()) missing.push({ file: f, reason: 'created but empty: the step produced no output' });
    else present.push({ file: f, bytes: Buffer.byteLength(t) });
  }
  let stages = null; let stagesError = null;
  const raw = read('results.json');
  if (raw === null) stagesError = 'results.json missing: run-independent-checks did not finish';
  else { try { stages = JSON.parse(raw).results ?? []; } catch (e) { stagesError = `results.json unreadable: ${e.message}`; } }
  return { present, missing, stages, stagesError, logs: [...EXPECTED_LOGS.map(read), ...(stages ?? []).map((s) => (s.log ? read(path.basename(s.log)) : null))].filter((x) => x) };
}

export function renderStageTable(info) {
  const out = [];
  if (info.stages) {
    const bad = info.stages.filter((s) => s.status !== 'PASS');
    out.push(`Stages: ${info.stages.length - bad.length} PASS, ${bad.length} not PASS`);
    for (const s of bad) out.push(`- ${s.status} ${s.id} (exit ${s.exitCode ?? 'n/a'}) log ${s.log}`);
  } else out.push(`Stages: ${info.stagesError}`);
  for (const m of info.missing) out.push(`- missing ${m.file}: ${m.reason}`);
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  // Explicit file arguments keep the old contract; without arguments every log in the CI log directory is read.
  const info = inspectLogs(process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
  const files = process.argv.slice(2).filter((f) => fs.existsSync(f));
  const logs = files.length ? files.map((f) => fs.readFileSync(f, 'utf8')) : info.logs;
  const r = ciSummary(process.env.CI_STATUS ?? 'unknown', logs);
  const detail = renderStageTable(info);
  console.log(r.ok ? r.text : `::error title=BiForge CI::${r.text}`);
  console.log(detail);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${r.text}\n\n${detail}\n`);
}
