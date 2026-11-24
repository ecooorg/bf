#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'server');
let b64 = '';
for (let i = 0; i < 16; i++) {
  const p = join(dir, 'immofinderCore.ts.p13016.b64.' + i);
  if (!existsSync(p)) break;
  b64 += readFileSync(p, 'utf8').trim();
}
if (!b64) { console.log('core payload absent — skip'); process.exit(0); }
const buf = inflateSync(Buffer.from(b64.replace(/\s+/g, ''), 'base64'));
writeFileSync(join(dir, 'immofinderCore.ts'), buf);
console.log('P130.16 restored core', buf.length);
