#!/usr/bin/env node
/**
 * C123 P123.5 — Ops probe for model carousel sources (no secrets in output).
 * Usage: node scripts/carousel-ops-probe.mjs
 * Exit 0 always for missing keys (reports NOT_CONFIGURED); exit 1 only on unexpected errors.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const { loadModelSourcesCatalog, enabledSources, sourceHasCredentials, runnableSources } =
    await import(pathToFileURL(path.join(root, 'server/modelSourcesCatalog.ts')).href);
  const { resolveGeminiKeySlots, MAX_ORG_KEY_SLOTS } = await import(
    pathToFileURL(path.join(root, 'server/keyPool.ts')).href
  );
  const { globalSourceHealth } = await import(pathToFileURL(path.join(root, 'server/sourceHealth.ts')).href);
  const { parseSearchCarousel } = await import(pathToFileURL(path.join(root, 'server/searchCarousel.ts')).href);
  const { readLlmLatencyConfig } = await import(pathToFileURL(path.join(root, 'server/llmLatencyConfig.ts')).href);
  const { minModelIntervalMs } = await import(pathToFileURL(path.join(root, 'server/modelRateLimit.ts')).href);
  const { isWebSearchEnabled, isSearchPlannerEnabled } = await import(pathToFileURL(path.join(root, 'server/webSearch.ts')).href);
  const { isVerifierEnabled } = await import(pathToFileURL(path.join(root, 'server/epistemicVerifier.ts')).href);

  const catalog = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
  const enabled = enabledSources(catalog, 'public');
  const runnable = runnableSources(catalog, process.env, 'public');
  const geminiSlots = resolveGeminiKeySlots(process.env);
  const search = parseSearchCarousel(process.env);
  const integer = (name, fallback) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  const latency = readLlmLatencyConfig(process.env);
  const configured = {
    llm_call_timeout_ms: latency.configured.callTimeoutMs ?? 12_000,
    llm_total_deadline_ms: latency.configured.totalDeadlineMs ?? 30_000,
    max_model_calls: latency.configured.maxModelCalls ?? 3,
    web_search_timeout_ms: integer('WEB_SEARCH_TIMEOUT_MS', 15_000),
    web_search_max_queries: integer('WEB_SEARCH_MAX_QUERIES', 2),
    web_search_max_pages_configured: integer('WEB_SEARCH_MAX_PAGES', 2),
    web_search_max_pages_per_query_effective: Math.min(2, integer('WEB_SEARCH_MAX_PAGES', 2)),
    worker_poll_ms: integer('WORKER_POLL_MS', 1_500),
    model_min_interval_ms_configured: process.env.MODEL_MIN_INTERVAL_MS ?? null,
    model_start_interval_ms: { flash_lite: minModelIntervalMs('gemini-3.5-flash-lite'), other_flash: minModelIntervalMs('gemini-3.5-flash') },
    model_cascade_light: String(process.env.MODEL_CASCADE_LIGHT || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite').split(',').map(x => x.trim()).filter(Boolean),
    model_cascade_strong: String(process.env.MODEL_CASCADE_STRONG || 'gemini-3.5-flash-lite,gemini-3.1-flash-lite').split(',').map(x => x.trim()).filter(Boolean),
    search_carousel: search.order,
    search_carousel_source: search.source,
    search_carousel_unknown: search.unknown,
    web_search_enabled: isWebSearchEnabled(process.env),
    web_search_planner_enabled: isSearchPlannerEnabled(process.env),
    web_search_fetch_pages: process.env.WEB_SEARCH_FETCH_PAGES !== 'false',
    direct_mode_enabled: process.env.BIFORGE_GEMINI_DIRECT_MODE === 'true',
    external_model_fallback_enabled: process.env.ENABLE_EXTERNAL_MODEL_FALLBACK === 'true',
    epistemic_verifier_enabled: isVerifierEnabled(),
    groq_plan: process.env.GROQ_PLAN || 'unspecified',
    credentials: {
      gemini: geminiSlots.length > 0,
      serper: Boolean(process.env.SERPER_API_KEY),
      jina: Boolean(process.env.JINA_API_KEY),
      serp2: Boolean(process.env.SERP2_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
    },
  };
  const effective = {
    llm_call_timeout_ms: latency.callTimeoutMs,
    llm_total_deadline_ms: latency.totalDeadlineMs,
    max_model_calls: latency.maxModelCalls,
    model_retry_passes: 1,
  };
  const warnings = [...latency.warnings];
  if (search.unknown.length) warnings.push('SEARCH_CAROUSEL contains unknown provider identifiers.');
  if (configured.search_carousel.includes('serp2')) warnings.push('serp2 is in the carousel but the provider adapter is not implemented in this repository snapshot; remove it until supported.');

  const report = {
    type: 'carousel_ops_probe',
    schema_version: catalog.schema_version,
    max_key_slots_per_vendor: MAX_ORG_KEY_SLOTS,
    gemini_key_slots_configured: geminiSlots.length,
    runtime_config: { configured, effective, warnings },
    enabled_sources: enabled.map((s) => s.id),
    runnable_sources: runnable.map((s) => s.id),
    sources: catalog.sources.map((s) => {
      const hasCreds = sourceHasCredentials(s, process.env);
      const health = globalSourceHealth.snapshot(s.id);
      return {
        id: s.id,
        enabled: s.enabled,
        priority: s.priority,
        provider: s.provider,
        has_credentials: hasCreds,
        status: !s.enabled ? 'DISABLED' : !hasCreds ? 'NOT_CONFIGURED' : health.available ? 'READY' : 'UNHEALTHY',
        health: {
          available: health.available,
          breakerOpen: health.breakerOpen,
          recentFailures: health.recentFailures,
        },
      };
    }),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ type: 'carousel_ops_probe_error', message: String(e).slice(0, 200) }));
  process.exit(1);
});
