#!/usr/bin/env node
/**
 * C131 WP2/WP3 source-first pilot — HappyHoliday index → detail → new-engine classify.
 * Zero Serper. Bounded: 1 index page, ≤8 detail fetches, polite delay.
 * Usage: node --import tsx scripts/immofinder-source-pilot.mjs
 * Exit 0 when ≥1 L1+ result; exit 2 on infra failure; exit 1 when zero L1+.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'artifacts', 'immofinder-pilot');
fs.mkdirSync(outDir, { recursive: true });

const INDEX_URL = 'https://happyholiday.ch/area/graubuenden/';
const MAX_DETAILS = 8;
const DELAY_MS = 1200;
const FETCH_MS = 12_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'BiForge-ImmoFinder-pilot/131.8g (polite; source-first; no Serper)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, finalUrl: res.url || url, text };
  } finally {
    clearTimeout(t);
  }
}

function plainText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const started = Date.now();
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/immofinder.json'), 'utf8'));
  const classifyConfig = {
    municipalities: cfg.municipalities,
    minRooms: cfg.minRooms ?? 3,
    stopAgencies: cfg.stopAgencies ?? [],
  };

  const { discover, extract } = await import(
    pathToFileURL(path.join(root, 'server/immofinder/sources/happyholiday.ts')).href
  );
  const { processSnapshot } = await import(
    pathToFileURL(path.join(root, 'server/immofinder/pipeline.ts')).href
  );

  const index = await fetchText(INDEX_URL);
  if (!index.ok || index.text.length < 500) {
    const report = {
      ok: false,
      error: 'index_fetch_failed',
      status: index.status,
      bytes: index.text?.length ?? 0,
      durationMs: Date.now() - started,
    };
    console.error(JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, 'pilot.json'), JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const candidates = discover(index.text, INDEX_URL).slice(0, MAX_DETAILS);
  const results = [];
  for (const c of candidates) {
    await sleep(DELAY_MS);
    const page = await fetchText(c.url);
    const title =
      extract(page.text, page.finalUrl).title ||
      (page.text.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ?? '').trim() ||
      c.url;
    const pageText = plainText(page.text).slice(0, 12000);
    const snapshot = {
      requestedUrl: c.url,
      finalUrl: page.ok ? page.finalUrl : null,
      title,
      pageText,
      fetchTimeIso: new Date().toISOString(),
      provisional: !page.ok,
    };
    const out = processSnapshot({ snapshot, config: classifyConfig, sourceId: 'happyholiday' });
    results.push({
      url: c.url,
      finalUrl: page.finalUrl,
      status: page.status,
      level: out.level,
      rejectCode: out.rejectCode,
      rooms: out.classify.rooms?.value ?? null,
      locality: out.classify.locality?.value ?? null,
      private: out.owner?.isPrivateOwner ?? false,
      contactRoute: out.owner?.contactRoute ?? 'none',
      title: String(title).slice(0, 120),
    });
  }

  const byLevel = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const byReject = {};
  for (const r of results) {
    byLevel[r.level] = (byLevel[r.level] || 0) + 1;
    if (r.rejectCode) byReject[r.rejectCode] = (byReject[r.rejectCode] || 0) + 1;
  }
  const kept = results.filter((r) => r.level === 'L1' || r.level === 'L2' || r.level === 'L3');
  const report = {
    ok: kept.length > 0,
    policy: 'C131-source-first-pilot',
    engine: 'server/immofinder (WP3 pure stages)',
    indexUrl: INDEX_URL,
    indexBytes: index.text.length,
    candidatesDiscovered: candidates.length,
    detailsFetched: results.length,
    byLevel,
    byReject,
    keptCount: kept.length,
    kept,
    rejects: results.filter((r) => r.level === 'L0'),
    durationMs: Date.now() - started,
    finishedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'pilot.json'), JSON.stringify(report, null, 2));
  process.exit(kept.length > 0 ? 0 : 1);
}

import { pathToFileURL } from 'node:url';
main().catch((e) => {
  const msg = { ok: false, error: String(e?.message || e).slice(0, 400) };
  console.error(JSON.stringify(msg, null, 2));
  try {
    fs.writeFileSync(path.join(outDir, 'pilot.json'), JSON.stringify(msg, null, 2));
  } catch { /* ignore */ }
  process.exit(2);
});
