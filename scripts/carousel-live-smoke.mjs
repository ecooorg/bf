#!/usr/bin/env node
/**
 * Live smoke for carousel (needs GEMINI_API_KEY).
 * Must be run with: node --import tsx scripts/carousel-live-smoke.mjs
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts', 'carousel-verify');
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const suiteStartedAt = Date.now();
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    const msg = { ok: false, error: 'GEMINI_API_KEY required' };
    console.error(JSON.stringify(msg));
    fs.writeFileSync(path.join(outDir, 'live-smoke.json'), JSON.stringify(msg, null, 2));
    process.exit(2);
  }

  const { resolveGeminiKeySlots, KeyPoolState } = await import(
    pathToFileURL(path.join(root, 'server/keyPool.ts')).href
  );
  const slots = resolveGeminiKeySlots(process.env);
  const { GoogleGenAI } = await import('@google/genai');
  const { createGeminiAdapter } = await import(
    pathToFileURL(path.join(root, 'server/geminiAdapter.ts')).href
  );
  const { executeModelCall } = await import(
    pathToFileURL(path.join(root, 'server/modelCarousel.ts')).href
  );
  const { newRouterState } = await import(pathToFileURL(path.join(root, 'server/router.ts')).href);
  const { registryForGeminiCascade } = await import(
    pathToFileURL(path.join(root, 'server/modelRegistry.ts')).href
  );
  const { createOpenAICompatibleAdapter } = await import(pathToFileURL(path.join(root, 'server/openaiCompatAdapter.ts')).href);

  const registry = registryForGeminiCascade('LIGHT', process.env);
  const strongRegistry = registryForGeminiCascade('STRONG', process.env);
  if (!registry.length) {
    const msg = {
      ok: false,
      error: 'empty_registry',
      cascade: process.env.MODEL_CASCADE_LIGHT || null,
    };
    console.error(JSON.stringify(msg, null, 2));
    fs.writeFileSync(path.join(outDir, 'live-smoke.json'), JSON.stringify(msg, null, 2));
    process.exit(1);
  }

  const client = new GoogleGenAI({ apiKey: key });
  const build = (k) => createGeminiAdapter(new GoogleGenAI({ apiKey: k }));
  const pool = new KeyPoolState();

  const timeoutMs = Math.min(12_000, Math.max(2_000, Number(process.env.LLM_CALL_TIMEOUT_MS) || 12_000));
  const samples = [];
  // Probe each configured LIGHT model independently so the report distinguishes
  // model latency from cascade/fallback latency. Two samples expose intermittent slowness.
  for (const entry of registry.slice(0, 2)) {
    for (let sample = 1; sample <= 2; sample++) {
      const started = Date.now();
      const result = await executeModelCall(
        {
          requestId: `carousel-live-${Date.now()}-${sample}`,
          system: 'Reply with a single JSON object only.',
          prompt: 'Return {\"pong\":true,\"n\":1} and nothing else.',
          json: true,
          metadata: { role: 'carousel_live_smoke', sample },
          maxOutputTokens: 64,
        },
        {
          registry: [entry],
          adapters: { gemini: createGeminiAdapter(client) },
          state: newRouterState(),
          required: ['json_output'],
          timeoutMs,
          maxCalls: 1,
          retryTransient: false,
          retryOutput: false,
          deadlineAt: Date.now() + timeoutMs + 500,
        },
        {
          sourceId: 'gemini-free-pool',
          keySlots: [slots[0]],
          keyPoolState: pool,
          buildGeminiAdapter: build,
        }
      );
      const latencyMs = Date.now() - started;
      samples.push({
        model: entry.modelId,
        sample,
        status: result.status,
        latencyMs,
        latencyBand: latencyMs < 3_000 ? 'FAST' : latencyMs < 8_000 ? 'SLOW' : 'VERY_SLOW',
        errorClass: result.response?.errorClass ?? result.lineage?.errorClass ?? null,
        attempts: result.lineage?.attempts ?? [],
      });
    }
  }
  const ok = samples.length > 0 && samples.every((x) => x.status === 'ok');
  const latencies = samples.map((x) => x.latencyMs).sort((a, b) => a - b);
  const optionalProviders = [];
  const groqKey = String(process.env.GROQ_API_KEY || '').trim();
  if (groqKey) {
    const groqStarted = Date.now();
    const groq = createOpenAICompatibleAdapter({ providerId: 'groq', baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1', apiKey: groqKey });
    const groqResult = await groq.call({ requestId: `carousel-groq-${Date.now()}`, modelId: process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b',
      system: 'Reply with one JSON object only.', prompt: 'Return {"pong":true} and nothing else.', json: true, maxOutputTokens: 64, metadata: { role: 'carousel_live_fallback_smoke' } }, { timeoutMs });
    optionalProviders.push({ provider: 'groq', configured: true, status: groqResult.status, latencyMs: Date.now() - groqStarted, errorClass: groqResult.errorClass || null });
  } else optionalProviders.push({ provider: 'groq', configured: false, status: 'NOT_CONFIGURED' });
  const report = {
    type: 'carousel_live_latency_diagnostic',
    ok,
    startedAt: new Date(suiteStartedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    registryModels: registry.slice(0, 2).map((r) => r.modelId),
    strongCascadeModels: strongRegistry.map((r) => r.modelId),
    poolSlotsConfigured: slots.length,
    poolSlotUsedForIsolation: slots[0]?.slot ?? null,
    timeoutMs,
    samples,
    optionalProviders,
    summary: {
      sampleCount: samples.length,
      successCount: samples.filter((x) => x.status === 'ok').length,
      minLatencyMs: latencies.length ? latencies[0] : null,
      medianLatencyMs: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
      maxLatencyMs: latencies.length ? latencies.at(-1) : null,
      verySlowCount: samples.filter((x) => x.latencyBand === 'VERY_SLOW').length,
    },
    // Never include secret material, prompt contents, or generated response bodies.
  };
  const text = JSON.stringify(report, null, 2);
  console.log(text);
  fs.writeFileSync(path.join(outDir, 'live-smoke.json'), text);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  const msg = {
    ok: false,
    error: String(e?.message || e).slice(0, 400),
    stack: String(e?.stack || '').split('\n').slice(0, 6).join('\n'),
  };
  console.error(JSON.stringify(msg, null, 2));
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'live-smoke.json'), JSON.stringify(msg, null, 2));
  } catch {
    /* ignore */
  }
  process.exit(1);
});
