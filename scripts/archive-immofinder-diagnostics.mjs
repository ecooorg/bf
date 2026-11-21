#!/usr/bin/env node
/**
 * Archive a polled ImmoFinder report as latest.json + immutable per-run JSON.
 * Large traces are split into Contents-API-safe event parts.
 */
import fs from 'node:fs';
import path from 'node:path';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/archive-immofinder-diagnostics.mjs INPUT.json OUTPUT_DIRECTORY');
  process.exit(2);
}
const envelope = JSON.parse(fs.readFileSync(input, 'utf8'));
const report = envelope.report && typeof envelope.report === 'object' ? envelope.report : envelope;
const runId = String(report.runId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
if (!runId) throw new Error('diagnostics_run_id_missing');
fs.mkdirSync(output, { recursive: true });
const runPath = path.join(output, 'runs', runId + '.json');
const latestPath = path.join(output, 'latest.json');
const full = JSON.stringify(report, null, 2);
if (Buffer.byteLength(full, 'utf8') <= 800_000) {
  fs.mkdirSync(path.dirname(runPath), { recursive: true });
  fs.writeFileSync(runPath, full + '\n');
  fs.writeFileSync(latestPath, full + '\n');
} else {
  const events = Array.isArray(report.events) ? report.events : [];
  const chunks = [];
  let current = [];
  for (const event of events) {
    const next = [...current, event];
    const size = Buffer.byteLength(JSON.stringify({ runId, traceId: report.traceId || null, events: next }), 'utf8');
    if (size > 700_000 && current.length) {
      chunks.push(current);
      current = [event];
    } else current = next;
    if (Buffer.byteLength(JSON.stringify({ runId, traceId: report.traceId || null, events: current }), 'utf8') > 700_000) {
      throw new Error('single_diagnostics_event_exceeds_archive_part_limit');
    }
  }
  if (current.length) chunks.push(current);
  const partsDir = path.join(output, 'runs', runId);
  fs.rmSync(partsDir, { recursive: true, force: true });
  fs.mkdirSync(partsDir, { recursive: true });
  const eventFiles = [];
  chunks.forEach((chunk, index) => {
    const part = String(index + 1).padStart(3, '0');
    const relative = 'runs/' + runId + '/events-' + part + '.json';
    eventFiles.push(relative);
    fs.writeFileSync(path.join(output, relative), JSON.stringify({
      schemaVersion: report.schemaVersion || 1, runId, traceId: report.traceId || null,
      part: index + 1, partCount: chunks.length, eventCount: chunk.length, events: chunk,
    }, null, 2) + '\n');
  });
  const manifest = { ...report, events: undefined, eventFiles, eventsStoredInParts: true, eventCount: events.length };
  const text = JSON.stringify(manifest, null, 2) + '\n';
  fs.mkdirSync(path.dirname(runPath), { recursive: true });
  fs.writeFileSync(runPath, text);
  fs.writeFileSync(latestPath, text);
}
console.log(JSON.stringify({ runId, latestPath, runPath, eventCount: Array.isArray(report.events) ? report.events.length : 0 }));
