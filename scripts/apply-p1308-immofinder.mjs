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

patch('server/immofinderCore.ts', (s) => {
  const marker = 'export function isSeekerPost(title: string, text: string): boolean {';
  const i = s.indexOf(marker);
  if (i < 0) throw new Error('isSeekerPost not found');
  const insert = `export function isSeekerPost(title: string, text: string): boolean {
  const tOnly = String(title || '').toLowerCase();
  // Clear offer title wins: "… zu vermieten" without demand language.
  if (/\\bzu\\s+vermieten\\b/i.test(tOnly) && !/\\bgesucht\\b/i.test(tOnly)) return false;
  if (/\\bvermiete\\b/i.test(tOnly) && !/\\b(suche|gesucht)\\b/i.test(tOnly)) return false;
`;
  const restStart = s.indexOf('const h = `${title}', i);
  if (restStart < 0) throw new Error('isSeekerPost body not found');
  return s.slice(0, i) + insert + s.slice(restStart);
});

patch('server/immofinderCore.ts', (s) => {
  const bad = "if (/\\bzu\\s+vermieten\\s+gesucht\\b/i.test(hay) || (/\\b(wir\\s+suchen|ich\\s+suche)\\b/i.test(hay) && /(wohnung|haus|zimmer)/i.test(hay))) {\n    return 'seeker_post';\n  }";
  const good = "if (/\\bzu\\s+vermieten\\s+gesucht\\b/i.test(hay)) return 'seeker_post';\n  if ((/\\b(wir\\s+suchen|ich\\s+suche)\\b/i.test(hay) && /(wohnung|haus|zimmer)/i.test(hay)) && !/\\b(zu\\s+vermieten|nachmieter\\s+gesucht|vermiete)\\b/i.test(hay)) {\n    return 'seeker_post';\n  }";
  if (!s.includes(bad)) {
    console.log('credibility branch not exact; skip or already patched');
    return s;
  }
  return s.replace(bad, good);
});

patch('config/immofinder.json', (s) => {
  const j = JSON.parse(s);
  if (j.quality) j.quality.maxMonthlyRentChf = 3500;
  j.discovery.portalQueries = [
    'site:homegate.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer" OR "3 ½" OR "3.5-Zimmer") mieten',
    'site:immoscout24.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") Wohnung mieten',
    'site:flatfox.ch "{commune}" ("3.5 Zimmer" OR "3 ½" OR "4 Zimmer" OR "4.5 Zimmer") (mieten OR Wohnung)',
    'site:tutti.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") Wohnung',
    'site:newhome.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten',
    'site:anibis.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten',
    'site:urbanhome.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") Wohnung',
    'site:petitesannonces.ch "{commune}" (Wohnung OR Haus) mieten',
    'site:immobilier.ch "{commune}" (appartement OR Wohnung) ("à louer" OR mieten)',
    'site:acheter-louer.ch "{commune}" (appartement OR Wohnung) ("à louer" OR mieten)',
    'site:immostreet.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten',
    'site:home.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer") Wohnung mieten',
    'site:icasa.ch "{commune}" ("3.5 Zimmer" OR "4 Zimmer" OR "4.5 Zimmer") Wohnung',
  ];
  return JSON.stringify(j, null, 2) + '\n';
});

patch('package.json', (s) => {
  const j = JSON.parse(s);
  j.patch = '130.8';
  return JSON.stringify(j, null, 2) + '\n';
});
patch('package-lock.json', (s) => s.replace(/"patch": "130\.7"/g, '"patch": "130.8"'));

patch('CHANGELOG.md', (s) => {
  if (s.startsWith('## P130.8')) return s;
  return `## P130.8 — Seeker false positive, rent cap, portal detail queries

- **PROBLEM:** Chur run kept 0: FB offer "… zu vermieten" classified seeker_post; maxMonthlyRentChf=2000 hid typical Chur 3.5+ rents; site: portal queries returned only category/list URLs (Homegate/Tutti/ImmoScout 0 candidates).
- **CHANGE:** title "zu vermieten" is never a seeker; default rent cap 3500; portalQueries prefer room-count phrases so Serper surfaces detail ads. BUGFIX.

` + s;
});

console.log('P130.8 applied');
