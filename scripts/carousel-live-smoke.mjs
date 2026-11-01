#!/usr/bin/env node
/**
 * Live smoke for carousel (needs GEMINI_API_KEY). One short JSON call via official SDK path.
 * Optional second key: if GEMINI_API_KEY_1 set, reports pool size only (does not burn both unless ROTATE_PROBE=true).
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error(JSON.stringify({ ok: false, error: 'GEMINI_API_KEY required' }));
    process.exit(2);
  }

  const { resolveGeminiKeySlots } = await import(pathToFileURL(path.join(root, 'server/keyPool.ts')).href);
  const slots = resolveGeminiKeySlots(process.env);
  const { GoogleGenAI } = await import('@google/genai');
  const { createGeminiAdapter } = await import(pathToFileURL(path.join(root, 'server/geminiAdapter.ts')).href);
  const { executeModelCall } = await import(pathToFileURL(path.join(root, 'server/modelCarousel.ts')).href);
  const { newRouterState } = await import(pathToFileURL(path.join(root, 'server/router.ts')).href);
  const { registryForGeminiCascade } = await import(pathToFileURL(path.join(root, 'server/modelRegistry.ts')).href);
  const { KeyPoolState } = await import(pathToFileURL(path.join(root, 'server/keyPool.ts')).href);

  const client = new GoogleGenAI({ apiKey: key });
  const build = (k) => createGeminiAdapter(new GoogleGenAI({ apiKey: k }));
  const registry = registryForGeminiCascade('LIGHT');
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
      timeoutMs: 25_000,
      maxCalls: 3,
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
    lineage: result.lineage
      ? {
          sourceId: result.lineage.sourceId,
          model: result.lineage.model,
          keySlot: result.lineage.keySlot,
          status: result.lineage.status,
          latencyMs: result.lineage.latencyMs,
          attempts: result.lineage.attempts?.length,
        }
      : null,
    poolSlotsConfigured: slots.length,
    reason: result.decision?.reason,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e).slice(0, 300) }));
  process.exit(1);
});
