#!/usr/bin/env node
/** Loader: decode ensure-repair.mjs.b64.c0..c3 then re-exec. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const parts = [0,1,2,3].map(i => join(root, `server/ensure-repair.mjs.b64.c${i}`));
const fullPath = join(root, 'server/ensure-repair-full.mjs');
if (parts.every(p => existsSync(p))) {
  const b64 = parts.map(p => readFileSync(p, 'utf8')).join('').replace(/\s+/g, '');
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(fullPath, buf);
  const r = spawnSync(process.execPath, [fullPath], { encoding: 'utf8', cwd: root, stdio: 'inherit' });
  process.exit(r.status || 0);
} else {
  console.error('ensure-repair.mjs.b64.c* missing');
  process.exit(1);
}
