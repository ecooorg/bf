#!/usr/bin/env node
/** Loader: decode ensure-repair.mjs.b64 then re-exec full restore logic. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64Path = join(root, 'server/ensure-repair.mjs.b64');
const fullPath = join(root, 'server/ensure-repair-full.mjs');
if (existsSync(b64Path)) {
  const buf = Buffer.from(readFileSync(b64Path, 'utf8').replace(/\s+/g, ''), 'base64');
  writeFileSync(fullPath, buf);
  const r = spawnSync(process.execPath, [fullPath], { encoding: 'utf8', cwd: root, stdio: 'inherit' });
  process.exit(r.status || 0);
} else {
  console.error('ensure-repair.mjs.b64 missing');
  process.exit(1);
}
