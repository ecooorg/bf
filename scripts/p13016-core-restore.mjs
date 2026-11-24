#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'server');
const parts = readdirSync(dir).filter((f) => /^immofinderCore\.ts\.p13016\.b64\.p\d+$/.test(f)).sort();
if (!parts.length) { console.error('no p13016 core parts'); process.exit(1); }
const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8').trim()).join('').replace(/\s+/g, '');
const buf = inflateSync(Buffer.from(b64, 'base64'));
writeFileSync(join(dir, 'immofinderCore.ts'), buf);
console.log('P130.16 restored immofinderCore.ts', buf.length, 'from', parts.length, 'parts');
