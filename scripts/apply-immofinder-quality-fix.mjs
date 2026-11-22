#!/usr/bin/env node
/**
 * One-shot: restore immofinderCore/Discovery/Fetcher from good SHA e11157b3,
 * apply quality filters, update config skipHosts + quality tests, commit.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const GOOD = 'e11157b353c0c95bc5da3d3d657df317293a6e19';

function sh(cmd) {
  console.log('+ ' + cmd);
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function restore(path) {
  sh(`git show ${GOOD}:${path} > ${path}`);
  console.log('restored', path);
}

for (const p of [
  'server/immofinderCore.ts',
  'server/immofinderDiscovery.ts',
  'server/immofinderFetcher.ts',
]) {
  restore(p);
}

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const disc0 = readFileSync('server/immofinderDiscovery.ts', 'utf8');
let fetch = readFileSync('server/immofinderFetcher.ts', 'utf8');

// LIST_URL_MORE + seite
core = core.replace(
  'const LIST_URL_MORE = /\\/zimmer-\\d+(\\.\\d)?(-\\d+(\\.\\d)?)?\\/?$|\\/(mieten|kaufen)\\/(wohnung|immobilien)\\/in-[^/]+|\\/unterkategorie-[^/]+|\\/in-[a-z0-9äöü-]{2,}\\/?$|\\/immobilier\\/[^/]*immobilier[^/]*\\.html|[?&]nrf=\\d|\\/kaufen\\/|\\/preise\\.html|\\/liste(\\/|$)|gruppenhaus\\.ch|\\/_join_/i;',
  'const LIST_URL_MORE = /\\/zimmer-\\d+(\\.\\d)?(-\\d+(\\.\\d)?)?\\/?$|\\/(mieten|kaufen)\\/(wohnung|immobilien)\\/in-[^/]+|\\/unterkategorie-[^/]+|\\/in-[a-z0-9äöü-]{2,}\\/?$|\\/immobilier\\/[^/]*immobilier[^/]*\\.html|[?&]nrf=\\d|\\/kaufen\\/|\\/preise\\.html|\\/liste(\\/|$)|\\/seite-\\d+|\\/page\\/\\d+|gruppenhaus\\.ch|\\/_join_/i;',
);

console.log('LIST_URL_MORE changed', core.includes('/seite-\\d+') || core.includes('seite-'));
writeFileSync('server/immofinderCore.ts', core);
console.log('partial write for debug', core.length);
