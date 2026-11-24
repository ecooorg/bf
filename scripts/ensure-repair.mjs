#!/usr/bin/env node
/** Loader: decode ensure-repair.mjs.b64.p0+p1 then re-exec full restore logic. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p0 = join(root, 'server/ensure-repair.mjs.b64.p0');
const p1 = join(root, 'server/ensure-repair.mjs.b64.p1');
const fullPath = join(root, 'server/ensure-repair-full.mjs');
if (existsSync(p0) && existsSync(p1)) {
  const b64 = (readFileSync(p0, 'utf8') + readFileSync(p1, 'utf8')).replace(/\s+/g, '');
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(fullPath, buf);
  const r = spawnSync(process.execPath, [fullPath], { encoding: 'utf8', cwd: root, stdio: 'inherit' });
  process.exit(r.status || 0);
} else {
  console.error('ensure-repair.mjs.b64.p0/p1 missing');
  process.exit(1);
}
