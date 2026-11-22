#!/usr/bin/env node
/**
 * P130.8 — seeker false positive, rent cap, portal query detail bias.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, fn) {
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) console.log('unchanged', path);
  else { writeFileSync(path, after); console.log('patched', path); }
}

// 1) isSeekerPost: title "zu vermieten" without gesucht is offer
patch('server/immofinderCore.ts', (s) => {
  const needle = `export function isSeekerPost(title: string, text: string): boolean {
  const h = \`${title}\\n${String(text).slice(0, 1500)}\`.toLowerCase();
  // CH market: "Nachmieter gesucht" = current tenant / landlord seeking a successor = OFFER, not seeker.
  if (/\\bnachmieter\\s+gesucht\\b/i.test(h) && !/\\b(suche\\s+wohnung|wohnung\\s+gesucht|ich\\s+suche)\\b/i.test(h)) return false;`;
  // Use real template carefully - the script file uses normal backticks in source
  return s; // placeholder - will write proper file below
});

console.log('stub');
