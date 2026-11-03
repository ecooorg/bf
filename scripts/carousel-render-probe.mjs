#!/usr/bin/env node
/**
 * Public, read-only Render health probe. Never reads or prints credentials.
 *
 * Contract checks (static config) fail the process (exit 1).
 * Live health signals (cooldown, quotaHit, circuit open, source unhealthy)
 * are advisories only and do not fail the process.
 *
 * Env → runtime-key mapping is the single source of truth shared with the
 * unit-workflow test (P0 / P124.33).
 */
export const RENDER_ENV_RUNTIME_KEYS = [
  { env: 'LLM_CALL_TIMEOUT_MS', key: 'llm.callTimeoutMs', expected: 12000 },
  { env: 'LLM_TOTAL_DEADLINE_MS', key: 'llm.totalDeadlineMs', expected: 30000 },
  { env: 'MAX_MODEL_CALLS', key: 'llm.maxModelCalls', expected: 3 },
  { env: 'WEB_SEARCH_MAX_QUERIES', key: 'search.maxQueries', expected: 2 },
  { env: 'WORKER_POLL_MS', key: 'workerPollMs', expected: 5000 },
  { env: 'WEB_SEARCH_TIMEOUT_MS', key: 'search.timeoutMs', expected: 15000 },
  { env: 'WEB_SEARCH_MAX_PAGES', key: 'search.configuredMaxPages', expected: 2 },
  { env: 'WEB_SEARCH_DEFAULT_COUNTRY', key: 'search.defaultCountry', expected: 'CH' },
  { env: 'SEARCH_CAROUSEL', key: 'search.carousel', expected: ['connector', 'serper', 'gemini'] },
  // Light cascade prefers the faster 3.5-flash-lite first (P0 / defect B).
  { env: 'MODEL_CASCADE_LIGHT', key: 'models.light', expected: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] },
  { env: 'MODEL_CASCADE_STRONG', key: 'models.strong', expected: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] },
];

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

const base = String(process.env.CAROUSEL_RENDER_URL || process.env.SERVICE_URL || '').trim().replace(/\/+$/, '');
if (!base) {
  console.log(JSON.stringify({ type: 'render_health_probe', status: 'NOT_CONFIGURED', reason: 'CAROUSEL_RENDER_URL is empty' }, null, 2));
  process.exit(2);
}
let parsedBase;
try { parsedBase = new URL(base); } catch {
  console.log(JSON.stringify({ type: 'render_health_probe', status: 'INVALID_URL', reason: 'Render URL must be a valid HTTPS URL' }, null, 2));
  process.exit(2);
}
if (parsedBase.protocol !== 'https:') {
  console.log(JSON.stringify({ type: 'render_health_probe', status: 'INVALID_URL', reason: 'Render URL must use HTTPS' }, null, 2));
  process.exit(2);
}

const paths = ['/health', '/api/health', '/ready', '/health/runtime-config'];
const results = [];
for (const path of paths) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${base}${path}`, { method: 'GET', redirect: 'manual', signal: controller.signal, headers: { accept: 'application/json' } });
    const bodyText = await response.text();
    let body = null;
    try { body = JSON.parse(bodyText); } catch { body = { nonJson: true }; }
    results.push({ path, httpStatus: response.status, latencyMs: Date.now() - started, ok: response.ok, body: body && typeof body === 'object' ? {
      status: body.status ?? null,
      version: body.version ?? null,
      commit: body.commit ?? null,
      code: body.code ?? null,
      reason: body.reason ?? null,
      runtimeConfig: body.runtimeConfig ?? null,
      nonJson: body.nonJson ?? false,
    } : null });
  } catch (error) {
    results.push({ path, httpStatus: null, latencyMs: Date.now() - started, ok: false, error: error?.name === 'AbortError' ? 'TIMEOUT_8000MS' : String(error?.message || error).slice(0, 160) });
  } finally {
    clearTimeout(timer);
  }
}
const configResponse = results.find((item) => item.path === '/health/runtime-config');
const runtime = configResponse?.body?.runtimeConfig ?? null;
const contractWarnings = [];
const liveHealthWarnings = [];
const advisories = [];

if (!runtime) {
  contractWarnings.push('Runtime config endpoint is missing or returned no runtimeConfig; deploy the current patch or inspect the endpoint response.');
} else {
  const expect = (label, actual, expected, bucket = contractWarnings) => {
    const equal = Array.isArray(expected)
      ? Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;
    if (!equal) bucket.push(`Render contract mismatch: ${label} should be ${JSON.stringify(expected)}, received ${JSON.stringify(actual ?? null)}.`);
  };

  // Shared env→runtime-key table (also asserted by unit-workflow test).
  for (const row of RENDER_ENV_RUNTIME_KEYS) {
    expect(row.key, getByPath(runtime, row.key), row.expected, contractWarnings);
  }

  expect('features.directGeminiMode', runtime.features?.directGeminiMode, false);
  expect('features.externalModelFallback', runtime.features?.externalModelFallback, true);
  expect('features.weatherConnector', runtime.features?.weatherConnector, true);
  expect('features.projectMode', runtime.features?.projectMode, true);
  expect('features.appAuth', runtime.features?.appAuth, true);
  expect('search.enabled', runtime.search?.enabled, true);
  expect('search.planner', runtime.search?.planner, true);
  expect('search.fetchPages', runtime.search?.fetchPages, true);
  expect('appBuilder.engine', runtime.appBuilder?.engine, 'staged');
  expect('appBuilder.modelSlice', runtime.appBuilder?.modelSlice, true);
  expect('appBuilder.maxFiles', runtime.appBuilder?.maxFiles, 80);
  expect('appBuilder.maxLines', runtime.appBuilder?.maxLines, 8000);
  expect('appBuilder.executor', runtime.appBuilder?.executor, 'model_patch');
  expect('limits.dailyCallCap', runtime.limits?.dailyCallCap, 1000);
  expect('limits.rateLimitPerHour', runtime.limits?.rateLimitPerHour, 200);
  expect('limits.projectRateLimitPerMinute', runtime.limits?.projectRateLimitPerMinute, 300);
  expect('limits.maxBodyBytes', runtime.limits?.maxBodyBytes, 262144);
  expect('limits.trustProxyHops', runtime.limits?.trustProxyHops, 1);
  expect('hosting.pgSslMode', runtime.hosting?.pgSslMode, 'require');
  expect('hosting.serviceUrlConfigured', runtime.hosting?.serviceUrlConfigured, true);
  expect('hosting.jinaReaderBaseConfigured', runtime.hosting?.jinaReaderBaseConfigured, true);
  expect('hosting.githubDiffUpload', runtime.hosting?.githubDiffUpload, true);
  expect('runtime.nodeEnv', runtime.runtime?.nodeEnv, 'production');

  if ((runtime.credentials?.geminiKeySlots ?? 0) < 2) contractWarnings.push(`Render contract mismatch: at least 2 Gemini key slots are recommended/configured; received ${runtime.credentials?.geminiKeySlots ?? 0}.`);
  for (const credential of ['gemini', 'serper', 'jina', 'groq']) {
    if (runtime.credentials?.[credential] !== true) contractWarnings.push(`Render credential missing: ${credential} provider key is not configured.`);
  }
  if (!Number.isFinite(runtime.llm?.callTimeoutMs) || runtime.llm.callTimeoutMs > 12_000) contractWarnings.push(`Effective llm.callTimeoutMs must be <=12000, received ${runtime.llm?.callTimeoutMs ?? 'missing'}.`);
  if (!Number.isFinite(runtime.llm?.totalDeadlineMs) || runtime.llm.totalDeadlineMs > 30_000) contractWarnings.push(`Effective llm.totalDeadlineMs must be <=30000, received ${runtime.llm?.totalDeadlineMs ?? 'missing'}.`);
  if (!Number.isFinite(runtime.llm?.maxModelCalls) || runtime.llm.maxModelCalls > 3) contractWarnings.push(`Effective llm.maxModelCalls must be <=3, received ${runtime.llm?.maxModelCalls ?? 'missing'}.`);
  if (runtime.llm?.warnings?.length) contractWarnings.push(...runtime.llm.warnings);
  if (runtime.search?.carouselUnknown?.length) contractWarnings.push(`Unknown SEARCH_CAROUSEL entries: ${runtime.search.carouselUnknown.join(', ')}.`);
  if (runtime.search?.carousel?.includes('serp2')) contractWarnings.push('SEARCH_CAROUSEL includes serp2, but this repository snapshot has no serp2 adapter.');
  if (runtime.search?.carousel?.includes('serper') && !runtime.credentials?.serper) contractWarnings.push('Serper is in SEARCH_CAROUSEL but SERPER_API_KEY is not configured.');
  if (runtime.search?.carousel?.includes('gemini') && !runtime.credentials?.gemini) contractWarnings.push('Gemini Search is in SEARCH_CAROUSEL but no Gemini key is configured.');
  if (runtime.search?.carousel?.includes('connector') && !runtime.features?.weatherConnector) contractWarnings.push('Connector is in SEARCH_CAROUSEL but WEATHER_CONNECTOR_ENABLED is false.');
  if (runtime.features?.externalModelFallback && !runtime.credentials?.groq && !runtime.credentials?.cloudflare) contractWarnings.push('External model fallback is enabled but no Groq or Cloudflare fallback credentials are configured.');

  // Live / transient health — advisories only (do not fail the workflow).
  if (runtime.features?.weatherConnector) advisories.push('Weather connector is enabled and can add a parallel external lookup to weather requests.');
  if (runtime.features?.externalModelFallback) advisories.push('External model fallback is enabled; a slow or failed Gemini path may be followed by a Groq/Cloudflare call.');
  if ((runtime.modelStartIntervalMs?.flashLite ?? 0) >= 4_000) advisories.push(`Flash-Lite model-start spacing is ${runtime.modelStartIntervalMs.flashLite} ms; concurrent requests can queue behind this quota gate.`);
  if ((runtime.workerPollMs ?? 0) >= 5_000) advisories.push('WORKER_POLL_MS is 5000 ms or higher; this affects queued Project Mode work, not synchronous chat.');
  if (runtime.models?.strong?.length && runtime.models.strong.every((m) => /flash-lite/i.test(m))) advisories.push('MODEL_CASCADE_STRONG contains only Flash-Lite models; this is a quality-tier choice, not a direct latency fix.');
  if (runtime.search?.configuredMaxPages > runtime.search?.maxPagesPerQuery) advisories.push(`WEB_SEARCH_MAX_PAGES is configured as ${runtime.search.configuredMaxPages}, but the code caps it at ${runtime.search.maxPagesPerQuery} per query.`);
  for (const model of runtime.modelHealth || []) {
    if (model.quotaHit) liveHealthWarnings.push(`${model.model} is marked quotaHit in the live model-health registry.`);
    if (model.cooldownUntil && model.cooldownUntil > Date.now()) liveHealthWarnings.push(`${model.model} is in cooldown for approximately ${Math.ceil((model.cooldownUntil - Date.now()) / 1000)} s.`);
  }
  for (const source of runtime.sourceHealth || []) {
    if (!source.available) liveHealthWarnings.push(`Source ${source.sourceId} is unhealthy or in cooldown (${source.recentFailures} recent failures).`);
  }
  for (const [provider, state] of Object.entries(runtime.searchHealth?.circuitBreaker || {})) {
    if (state.openForMs > 0) liveHealthWarnings.push(`Search provider ${provider} circuit is open for ${state.openForMs} ms.`);
  }
  for (const [provider, state] of Object.entries(runtime.searchHealth?.dailyBudget || {})) {
    if (state.cap !== null && state.used >= state.cap) liveHealthWarnings.push(`Search provider ${provider} has exhausted its daily search budget.`);
  }
  if (runtime.groqPlan === 'free' && runtime.features?.externalModelFallback) advisories.push('Groq fallback is enabled with GROQ_PLAN=free metadata; verify the actual Groq account limits and observed fallback latency.');
}

for (const item of results.filter((x) => ['/health', '/api/health', '/ready'].includes(x.path))) {
  if (!item.ok) contractWarnings.push(`${item.path} returned ${item.httpStatus ?? item.error}.`);
}

const warnings = [...contractWarnings];
const report = {
  type: 'render_health_probe',
  status: !runtime ? 'UNAVAILABLE' : contractWarnings.length ? 'MISMATCH' : 'MATCH',
  baseHost: parsedBase.host,
  checkedAt: new Date().toISOString(),
  runtimeConfigCommit: configResponse?.body?.commit ?? null,
  warnings,
  liveHealthWarnings,
  advisories: [...advisories, ...liveHealthWarnings],
  results,
};
console.log(JSON.stringify(report, null, 2));
// Fail only on static contract mismatches. Transient live health is advisory.
if (contractWarnings.length > 0) process.exit(1);
process.exit(0);
