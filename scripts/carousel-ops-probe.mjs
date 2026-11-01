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

  const catalog = loadModelSourcesCatalog(path.join(root, 'config/model-sources.json'));
  const enabled = enabledSources(catalog, 'public');
  const runnable = runnableSources(catalog, process.env, 'public');
  const geminiSlots = resolveGeminiKeySlots(process.env);

  const report = {
    type: 'carousel_ops_probe',
    schema_version: catalog.schema_version,
    max_key_slots_per_vendor: MAX_ORG_KEY_SLOTS,
    gemini_key_slots_configured: geminiSlots.length,
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
