import { mkdir, writeFile, appendFile } from 'node:fs/promises';

const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const password = process.env.STAGING_APP_PASSWORD || '';
const expected = String(process.env.GITHUB_SHA || '').slice(0, 7);
const kind = process.env.P119_SMOKE_KIND || 'contracts';
if (!/^https:\/\//i.test(base) || !password || !expected || !['contracts', 'ui'].includes(kind)) {
  throw new Error('HTTPS staging URL, staging password, GITHUB_SHA and valid P119_SMOKE_KIND are required');
}
const steps = [];
let cookie = '';
const request = async (method, route, body) => {
  try {
    const response = await fetch(`${base}${route}`, {
      method, headers: { ...(body ? { 'content-type': 'application/json', origin: new URL(base).origin } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000),
    });
    const cookies = response.headers.getSetCookie?.() || [];
    if (cookies.length) cookie = cookies.map(c => c.split(';')[0]).join('; ');
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    let json = null;
    try { json = JSON.parse(raw); } catch { /* HTML or non-JSON */ }
    return { status: response.status, contentType, json, length: raw.length };
  } catch (error) {
    return { status: 0, error: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR' };
  }
};
const record = (id, pass, details = {}) => { steps.push({ id, verdict: pass ? 'PASS' : 'FAIL', ...details }); };
try {
  const health = await request('GET', '/health');
  record('deployed_commit', health.status === 200 && health.json?.status === 'ok' && health.json?.commit === expected,
    { http: health.status, expectedCommit: expected, deployedCommit: health.json?.commit || 'unknown', deployedVersion: health.json?.version || 'unknown' });
  if (steps.at(-1).verdict === 'PASS') {
    const login = await request('POST', '/api/login', { password });
    record('authenticated_session', login.status >= 200 && login.status < 300 && login.json?.success !== false && login.json?.authenticated !== false && Boolean(cookie), { http: login.status });
    if (steps.at(-1).verdict === 'PASS') {
      if (kind === 'contracts') {
        for (const [agent, route, prompt] of [
          ['Conversational', '/api/agent/conversational', 'What is the capital of Australia? Answer briefly.'],
          ['Expert', '/api/agent/expert', 'I need to choose between two software architectures. What key constraints should I investigate first?'],
        ]) {
          const response = await request('POST', route, { brief: { decision: prompt }, history: [{ role: 'user', content: prompt }], productMode: agent === 'Expert' ? 'Expert' : 'Simple' });
          const reply = response.json?.data?.reply;
          record(agent, response.status === 200 && response.json?.success === true && typeof reply === 'string' && reply.trim().length > 0,
            { http: response.status, nonemptyReply: typeof reply === 'string' && reply.trim().length > 0 });
        }
        const session = await request('GET', '/api/session');
        record('Architect_session', session.status === 200 && session.json?.projectModeEnabled === true, { http: session.status, projectModeEnabled: session.json?.projectModeEnabled ?? null });
        const projectList = await request('GET', '/api/projects');
        record('Architect_route', projectList.status === 200 && projectList.json?.success !== false, { http: projectList.status });
      } else {
        const page = await request('GET', '/');
        record('UI_served', page.status === 200 && /text\/html/i.test(page.contentType) && page.length > 100, { http: page.status, contentType: page.contentType });
        for (const [name, route] of [['Conversational', '/api/agent/conversational'], ['Expert', '/api/agent/expert']]) {
          const r = await request('POST', route, { brief: { decision: 'Say hello briefly.' }, history: [{ role: 'user', content: 'Say hello briefly.' }] });
          record(`${name}_launch`, r.status === 200 && typeof r.json?.data?.reply === 'string' && r.json.data.reply.trim().length > 0, { http: r.status });
        }
        const session = await request('GET', '/api/session');
        record('Architect_launch', session.status === 200 && session.json?.projectModeEnabled === true, { http: session.status });
      }
    }
  }
} finally {
  const verdict = steps.length > 0 && steps.every(s => s.verdict === 'PASS') ? 'PASS' : 'FAIL';
  await mkdir('p119-live', { recursive: true });
  await writeFile(`p119-live/${kind}.json`, JSON.stringify({ kind, expectedCommit: expected, verdict, steps, note: 'Smoke evidence only; not full end-to-end acceptance.' }, null, 2));
  const summary = `### P119 ${kind} live smoke\n- Verdict: **${verdict}**\n- Expected deployed commit: ${expected}\n${steps.map(s => `- ${s.id}: ${s.verdict}`).join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (verdict !== 'PASS') process.exitCode = 1;
}
