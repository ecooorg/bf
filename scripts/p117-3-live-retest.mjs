import { writeFile } from 'node:fs/promises';

const base = String(process.env.STAGING_SERVICE_URL || '').replace(/\/+$/, '');
const password = process.env.STAGING_APP_PASSWORD || '';
if (!base || !/^https:\/\//i.test(base)) throw new Error('STAGING_SERVICE_URL must be an HTTPS URL');
if (!password) throw new Error('STAGING_APP_PASSWORD is required');

const PER_CALL_MS = Math.max(30_000, Math.min(180_000, Number(process.env.LIVE_RETEST_TIMEOUT_MS) || 120_000));
const PAUSE_MS = Math.max(0, Math.min(5_000, Number(process.env.LIVE_RETEST_PAUSE_MS) || 500));
const startedAt = new Date().toISOString();

const scenarios = [
  ['A1', 'Почему у хвойных деревьев нет листьев и почему они не сбрасывают хвою на зиму?'],
  ['A2', 'In plain language, what is the difference between RAM and disk storage?'],
  ['A3', 'Объясни, как работает протокол Хельмгольца–Ривера в P2P-сетях.'],
  ['A4', 'Сколько примерно минут варить яйцо вкрутую? Коротко.'],
  ['B1', 'Какие важные новости по климату были за последнюю неделю? Кратко и только то, что произошло сейчас.'],
  ['B2', 'Найди в сети, какая сейчас примерно цена на нефть Brent, и напиши, откуда это взято.'],
  ['B3', 'Какая сейчас актуальная LTS-версия Node.js?'],
  ['B3b', 'Какая сейчас актуальная LTS-версия Ubuntu?'],
  ['B3c', 'What is the current stable Python version?'],
  ['B4', 'Какая столица Австралии?'],
  ['B6', 'В последнее время я стал хуже спать. Как наладить режим?'],
  ['C1', 'Я выбираю между переездом в Берлин и остаться в Варшаве. Главное для меня — работа в IT и доступность жилья.'],
  ['C2', 'Кто такой Менделеев? Два предложения.'],
  ['D1', 'Без вопросов и без вступлений: какой язык программирования посоветуешь школьнику первым?'],
  ['D2', 'Сколько это будет стоить?'],
];

const transcript = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const call = async (path, body, cookie = '') => {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PER_CALL_MS),
  });
  const text = await r.text();
  const setCookie = r.headers.get('set-cookie') || '';
  return { status: r.status, text, cookie: setCookie.split(';')[0] };
};

const writeTranscript = async (extra = {}) => {
  const out = {
    base,
    startedAt,
    finishedAt: new Date().toISOString(),
    scenarioCount: transcript.length,
    perCallTimeoutMs: PER_CALL_MS,
    transcript,
    ...extra,
  };
  await writeFile(process.env.TRANSCRIPT_PATH || 'p1173-live-transcript.json', JSON.stringify(out, null, 2));
};

const login = await call('/api/login', { password });
if (login.status < 200 || login.status >= 300) throw new Error(`Login failed: HTTP ${login.status}`);
let cookie = login.cookie;
try {
  const j = JSON.parse(login.text);
  if (j.success === false || j.authenticated === false) throw new Error('Login rejected');
} catch (e) {
  if (e.message === 'Login rejected') throw e;
}

const runPrompt = async (id, prompt, history) => {
  try {
    const result = await call(
      '/api/conversation',
      { brief: { decision: prompt }, history: [...history, { role: 'user', content: prompt }] },
      cookie,
    );
    if (result.cookie) cookie = result.cookie;
    let body;
    try {
      body = JSON.parse(result.text);
    } catch {
      body = { raw: result.text.slice(0, 4000) };
    }
    transcript.push({ id, prompt, httpStatus: result.status, response: body });
    const data = body?.data && typeof body.data === 'object' ? body.data : body;
    const reply = String(data?.reply || body?.reply || body?.response || body?.answer || '');
    if (PAUSE_MS) await sleep(PAUSE_MS);
    return [...history, { role: 'user', content: prompt }, { role: 'assistant', content: reply }];
  } catch (err) {
    const message = String(err?.message || err).slice(0, 500);
    const name = err?.name || 'Error';
    transcript.push({
      id,
      prompt,
      httpStatus: 0,
      error: { name, message, timeout: /timeout|aborted/i.test(name + message) },
    });
    console.error(`Scenario ${id} failed: ${name}: ${message}`);
    if (PAUSE_MS) await sleep(PAUSE_MS);
    return history;
  }
};

try {
  for (const [id, prompt] of scenarios) {
    if (id === 'C1') {
      let h = await runPrompt('C1-turn1', prompt, []);
      h = await runPrompt('C1-turn2', 'А если учесть ещё и школы для ребёнка?', h);
      await runPrompt('C1-turn3', 'Забудь про школы. А что с климатом и языком? И напомни, какие города сравниваем.', h);
    } else if (id === 'C2') {
      let h = await runPrompt('C2-turn1', prompt, []);
      h = await runPrompt('C2-turn2', 'А чем он ещё увлекался, кроме химии?', h);
      await runPrompt('C2-turn3', 'В каком году он умер?', h);
    } else if (id === 'B4') {
      for (let n = 1; n <= 3; n++) await runPrompt(`B4-run${n}`, prompt, []);
    } else {
      await runPrompt(id, prompt, []);
    }
  }
} finally {
  await writeTranscript();
}

const ok = transcript.filter((t) => t.httpStatus >= 200 && t.httpStatus < 300).length;
const failed = transcript.length - ok;
console.log(
  `Captured ${transcript.length} entries (${ok} HTTP 2xx, ${failed} failed/timeout); inspect transcript artifact. This is raw evidence, not an acceptance verdict.`,
);
if (ok === 0) process.exit(1);
if (failed > 0) {
  console.error(`Partial run: ${failed} scenario(s) did not return HTTP 2xx. Artifact still uploaded.`);
  process.exit(1);
}
