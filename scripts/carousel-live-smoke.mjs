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

  const registry = registryForGeminiCascade('LIGHT', process.env);
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

  const result = await executeModelCall(
    {
      requestId: `carousel-live-${Date.now()}`,
      system: 'Reply with a single JSON object only.',
      prompt: 'Return {"pong":true,"n":1} and nothing else.',
      json: true,
      metadata: { role: 'carousel_live_smoke' },
      maxOutputTokens: 64,
    },
    {
      registry,
      adapters: { gemini: createGeminiAdapter(client) },
      state: newRouterState(),
      required: ['json_output'],
      timeoutMs: Number(process.env.LLM_CALL_TIMEOUT_MS) || 25_000,
      maxCalls: 4,
    },
    {
      sourceId: 'gemini-free-pool',
      keySlots: slots,
      keyPoolState: pool,
      buildGeminiAdapter: build,
    }
  );

  const ok = result.status === 'ok';
  const report = {
    ok,
    status: result.status,
    registryModels: registry.map((r) => r.modelId),
    poolSlotsConfigured: slots.length,
    reason: result.decision?.reason ?? null,
    rejected: (result.decision?.rejected || []).slice(0, 8),
    attempts: (result.decision?.attempts || []).map((a) => ({
      model: a.model,
      status: a.status,
      errorClass: a.errorClass,
    })),
    lineage: result.lineage
      ? {
          sourceId: result.lineage.sourceId,
          model: result.lineage.model,
          keySlot: result.lineage.keySlot,
          status: result.lineage.status,
          latencyMs: result.lineage.latencyMs,
          errorClass: result.lineage.errorClass ?? null,
          attempts: result.lineage.attempts?.length,
        }
      : null,
    // never include secret material
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
