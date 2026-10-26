// P108.2: capture current verification metrics and the four most recent CI cycles.
// Historical/API gaps are explicit; missing data is never inferred as PASS.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
let JSZip = null; try { JSZip = (await import('jszip')).default; } catch {}
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.env.CI_LOGS_DIR || 'artifacts/ci-checks');
fs.mkdirSync(dir, { recursive: true });
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { return null; } };
const now = new Date().toISOString();
const results = readJson('results.json');
let rows = Array.isArray(results?.results) ? [...results.results] : [];
const manifestProfile = results?.profile || (process.env.GITHUB_RUN_ID ? 'ci' : null);
const manifest = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'docs/verification-manifest.json'), 'utf8')); } catch { return null; } })();
if (manifestProfile && Array.isArray(manifest?.checks)) {
  const known = new Set(rows.map((r) => r.id));
  const active = results?.active && !known.has(results.active.id) ? results.active : null;
  if (active) {
    const activeLog = (() => { try { return fs.readFileSync(path.join(dir, path.basename(active.log || `${active.id}.log`)), 'utf8'); } catch { return ''; } })();
    const timedOut = /test timed out after|testTimeoutFailure|TIMEOUT|timed out/i.test(activeLog);
    const started = Date.parse(active.startedAt || '');
    rows.push({ ...active, status: timedOut ? 'TIMEOUT' : 'INTERRUPTED', durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : null, note: 'No final result row was written before the runner stopped; status inferred only as TIMEOUT/INTERRUPTED from captured active-check evidence.' });
    known.add(active.id);
  }
  for (const check of manifest.checks.filter((c) => Array.isArray(c.profiles) && c.profiles.includes(manifestProfile))) {
    if (!known.has(check.id)) rows.push({ id:check.id, phase:check.phase || manifest.defaults?.phase || null, status:'NOT_RUN', durationMs:null, critical:Boolean(check.critical ?? manifest.defaults?.critical), command:check.argv?.[0] || null, args:check.argv?.slice(1) || [], script:(check.argv || []).join(' '), timeoutMs:check.timeoutMs ?? manifest.defaults?.timeoutMs ?? null, log:null, note:'No final result recorded; the runner did not reach this check or did not persist its result.' });
  }
}
const statusNames = ['PASS','FAIL','TIMEOUT','BLOCKED','SKIPPED','SKIPPED_BY_POLICY','NOT_RUN','UNKNOWN','INTERRUPTED'];
const countsFor = (items = []) => {
  const counts = Object.fromEntries(statusNames.map((s) => [s.toLowerCase(), 0]));
  for (const row of items) { const s = String(row?.status || 'UNKNOWN').toUpperCase(); counts[statusNames.includes(s) ? s.toLowerCase() : 'unknown']++; }
  counts.total = items.length; counts.executed = counts.pass + counts.fail + counts.timeout; counts.completed = counts.executed; return counts;
};
const pkg = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { return {}; } })();
const current = {
  runId: process.env.GITHUB_RUN_ID || null, runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
  repository: process.env.GITHUB_REPOSITORY || null, workflow: process.env.GITHUB_WORKFLOW || 'ci', event: process.env.GITHUB_EVENT_NAME || null,
  ref: process.env.GITHUB_REF || null, sha: process.env.GITHUB_SHA || results?.commit || null, status: 'PENDING_FINAL_STATUS',
  startedAt: results?.startedAt || null, collectedAt: now, dagProfile: results?.profile || null,
  dagWallClockMs: Number.isFinite(results?.wallClockMs) ? results.wallClockMs : null, checks: countsFor(rows),
  checkResults: rows.map((r) => ({ id:r.id, phase:r.phase||null, status:r.status || 'UNKNOWN', command:r.command||null, args:r.args||[], script:r.script||null, durationMs:Number.isFinite(r.durationMs)?r.durationMs:null, startedAt:r.startedAt||null, finishedAt:r.finishedAt||null, critical:Boolean(r.critical), exitCode:r.exitCode??null, signal:r.signal??null, timeoutMs:r.timeoutMs??null, timeoutOrigin:r.timeoutOrigin||null, log:r.log||null, note:r.note||null, needs:r.needs||[], blockedBy:r.blockedBy||[] })),
  environment: { node:process.version, npm:(()=>{const r=spawnSync('npm',['--version'],{encoding:'utf8',timeout:1500});return r.status===0?r.stdout.trim():null;})(), platform:process.platform, arch:process.arch, osRelease:os.release(), packageVersion:pkg.version||null,
    packageLockVersion:(()=>{try{return JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')).lockfileVersion;}catch{return null;}})(), runnerOs:process.env.RUNNER_OS||null, runnerArch:process.env.RUNNER_ARCH||null }
};
const apiBase = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const repo = process.env.GITHUB_REPOSITORY;
const headers = { Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', ...(token?{Authorization:`Bearer ${token}`}:{}) };
const apiGet = async (url) => { const r=await fetch(url,{headers,signal:AbortSignal.timeout(3500)}); if(!r.ok) throw new Error(`GitHub API ${r.status} for ${url.replace(apiBase,'')}`); return r; };
const getJson = async (url) => (await apiGet(url)).json();
const duration = (a,b) => { const x=Date.parse(a||''),y=Date.parse(b||''); return Number.isFinite(x)&&Number.isFinite(y)&&y>=x?y-x:null; };
if(token&&repo&&process.env.GITHUB_RUN_ID){try{const jobs=await getJson(`${apiBase}/repos/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}/jobs?per_page=100`);const job=(jobs.jobs||[]).find(j=>j.name==='check-and-build');if(job){current.jobName=job.name;current.jobStartedAt=job.started_at||null;current.jobElapsedAtCollectionMs=duration(job.started_at,now);current.jobSteps=(job.steps||[]).map(s=>({name:s.name,number:s.number,status:s.status,conclusion:s.conclusion,startedAt:s.started_at||null,completedAt:s.completed_at||null,durationMs:duration(s.started_at,s.completed_at)}));}}catch(e){current.jobApiError=String(e?.message||e).slice(0,250);}}
async function artifactMetrics(artifactId) {
  if (!JSZip) return {checks:null,checkResults:null,source:'jszip unavailable because dependencies were not installed'};
  const response=await apiGet(`${apiBase}/repos/${repo}/actions/artifacts/${artifactId}/zip`);
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  const metric=Object.values(zip.files).find(f=>!f.dir&&f.name.endsWith('ci-metrics.json'));
  if(metric){const doc=JSON.parse(await metric.async('string'));return {checks:doc.checks||doc.run?.checks||null,checkResults:doc.checkResults||doc.run?.checkResults||null,dagWallClockMs:doc.run?.dagWallClockMs??null,source:'ci-metrics.json'};}
  const diagnostic=Object.values(zip.files).find(f=>!f.dir&&f.name.endsWith('diagnostics.zip'));
  if(diagnostic){const inner=await JSZip.loadAsync(await diagnostic.async('nodebuffer'));const file=inner.file('results.json');if(file){const doc=JSON.parse(await file.async('string'));return {checks:countsFor(doc.results||[]),checkResults:(doc.results||[]).map(r=>({id:r.id,status:r.status,durationMs:r.durationMs??null,critical:Boolean(r.critical),log:r.log||null})),dagWallClockMs:doc.wallClockMs??null,source:'legacy diagnostics.zip'};}}
  const report=Object.values(zip.files).find(f=>!f.dir&&f.name.endsWith('NEXT_PATCH.md'));
  if(report){const text=await report.async('string');const m=text.match(/DIAGNOSTIC_RESULTS=([^\r\n]+)/);if(m){const c={};for(const x of m[1].matchAll(/(\d+)\s+(PASS|FAIL|TIMEOUT|SKIPPED|BLOCKED|SKIPPED_BY_POLICY|NOT_RUN|UNKNOWN)/g))c[x[2].toLowerCase()]=Number(x[1]);c.total=Object.values(c).reduce((a,b)=>a+b,0);c.executed=(c.pass||0)+(c.fail||0)+(c.timeout||0);c.completed=c.executed;return {checks:c,checkResults:null,source:'legacy handoff summary'};}}
  return {checks:null,checkResults:null,source:'artifact has no check metrics'};
}
const previousRuns=[]; let historyStatus=token&&repo?'PARTIAL':'UNAVAILABLE_NO_GITHUB_TOKEN';let historyError=null;
if(token&&repo&&process.env.GITHUB_RUN_ID){
 try{
  const doc=await getJson(`${apiBase}/repos/${repo}/actions/workflows/ci.yml/runs?per_page=30`);
  const runs=(doc.workflow_runs||[]).filter(r=>String(r.id)!==String(process.env.GITHUB_RUN_ID)&&r.status==='completed').sort((a,b)=>Date.parse(b.run_started_at||b.created_at)-Date.parse(a.run_started_at||a.created_at)).slice(0,4);
  await Promise.all(runs.map(async (run) => {
   const item={runId:String(run.id),runAttempt:run.run_attempt||1,runUrl:run.html_url||null,sha:run.head_sha||null,ref:run.head_branch||null,event:run.event||null,conclusion:run.conclusion||'UNKNOWN',startedAt:run.run_started_at||run.created_at||null,completedAt:run.updated_at||null,workflowDurationMs:duration(run.run_started_at||run.created_at,run.updated_at),jobDurationMs:null,jobName:'check-and-build',checks:null,checkResults:null,metricsSource:'github-actions-api'};
   try{const jobs=await getJson(`${apiBase}/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`);const job=(jobs.jobs||[]).find(j=>j.name==='check-and-build')||(jobs.jobs||[])[0];if(job){item.jobName=job.name;item.jobStartedAt=job.started_at||null;item.jobCompletedAt=job.completed_at||null;item.jobDurationMs=duration(job.started_at,job.completed_at);item.jobConclusion=job.conclusion||job.status||'UNKNOWN';item.workflowSteps=(job.steps||[]).map(s=>({name:s.name,number:s.number,status:s.status,conclusion:s.conclusion,startedAt:s.started_at||null,completedAt:s.completed_at||null,durationMs:duration(s.started_at,s.completed_at)}));}}catch(e){item.jobsApiError=String(e?.message||e).slice(0,250);}
   try{const arts=await getJson(`${apiBase}/repos/${repo}/actions/runs/${run.id}/artifacts?per_page=100`);const art=(arts.artifacts||[]).find(a=>a.name==='biforge-ci-report'&&!a.expired);if(art){const m=await artifactMetrics(art.id);item.checks=m.checks;item.checkResults=m.checkResults;item.dagWallClockMs=m.dagWallClockMs;item.artifactSource=m.source;}else item.metricsUnavailableReason='No retained biforge-ci-report artifact.';}catch(e){item.artifactError=String(e?.message||e).slice(0,250);}
   previousRuns.push(item);
  }));
  previousRuns.sort((a,b)=>Date.parse(b.startedAt||'')-Date.parse(a.startedAt||''));
  historyStatus=previousRuns.length?(previousRuns.every(r=>r.checks && Array.isArray(r.checkResults))?'COMPLETE':'PARTIAL'):'NO_PRIOR_COMPLETED_RUNS';
 }catch(e){historyStatus='UNAVAILABLE_API_ERROR';historyError=String(e?.message||e).slice(0,300);}
}
const history={schemaVersion:1,generatedAt:now,requestedCycles:5,includedCycles:1+previousRuns.length,current,previousRuns,historyStatus,historyError,limitations:[
 'The current run is captured before upload finishes; its final wall-clock duration is only available to later runs via the Actions API.',
 'Older artifacts may not contain per-check results. Missing metrics remain null/unavailable and are never inferred as PASS.',
 'The history is a snapshot of the current run plus the latest four completed workflow runs, not a permanent audit database.'
]};
fs.writeFileSync(path.join(dir,'ci-metrics.json'),JSON.stringify({schemaVersion:1,generatedAt:now,run:current,checks:current.checks,checkResults:current.checkResults},null,2)+'\n');
fs.writeFileSync(path.join(dir,'ci-history.json'),JSON.stringify(history,null,2)+'\n');
console.log(`CI history captured: current + ${previousRuns.length} previous run(s); status=${historyStatus}.`);
