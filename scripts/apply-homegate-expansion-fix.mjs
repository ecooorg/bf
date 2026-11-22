#!/usr/bin/env node
/**
 * P130.10d product fixes from Chur run 6b3eeecb:
 * 1) Homegate trefferliste expansion: also scan raw /mieten|/rent ids (SPA often lacks <a href>)
 * 2) Rooms fallback from SERP title/snippet when page title is site brand (iCasa)
 * 3) isListingUnavailable: "Inserat nicht mehr verfügbar" without "ist"
 */
import { readFileSync, writeFileSync } from 'node:fs';

function must(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }

let pipe = readFileSync('server/immofinderPipeline.ts', 'utf8');
const oldExpand = `        const detailRe = /homegate\\.ch|immoscout24\\.ch/i.test(it.url)
          ? /\\/(mieten|rent)\\/\\d{5,}|\\/(de|en|fr)\\/flat\\/[^"'\\s]+\\/\\d{5,}/i
          : /\\/\\d{6,}(?:\\/|$)|\\/(mieten|rent)\\/\\d{5,}/i;
        const links = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);
        const uniq = [...new Set(links)].slice(0, 6);`;

const newExpand = `        const detailRe = /homegate\\.ch|immoscout24\\.ch/i.test(it.url)
          ? /\\/(mieten|rent)\\/\\d{5,}|\\/(de|en|fr)\\/flat\\/[^"'\\s]+\\/\\d{5,}/i
          : /\\/\\d{6,}(?:\\/|$)|\\/(mieten|rent)\\/\\d{5,}/i;
        // SPA list pages often omit classic <a href>; also harvest bare path ids from HTML/JSON.
        const fromAnchors = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);
        const bareRe = /(?:https?:\\/\\/(?:www\\.)?(?:homegate|immoscout24)\\.ch)?(\\/(?:mieten|rent)\\/\\d{5,})/gi;
        const fromBare: string[] = [];
        let bm: RegExpExecArray | null;
        const baseHost = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();
        while ((bm = bareRe.exec(listPg.body)) !== null) {
          const path = bm[1];
          const abs = path.startsWith('http') ? path : baseHost + path;
          fromBare.push(abs);
        }
        const uniq = [...new Set([...fromAnchors, ...fromBare])].slice(0, 6);`;

must(pipe.includes('const links = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);'), 'expandable links line not found');
must(pipe.includes('const uniq = [...new Set(links)].slice(0, 6);'), 'uniq line not found');

pipe = pipe.replace(
  `        const links = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);
        const uniq = [...new Set(links)].slice(0, 6);`,
  `        // SPA list pages often omit classic <a href>; also harvest bare path ids from HTML/JSON.
        const fromAnchors = candidateLinks(listPg.body, listPg.finalUrl || it.url, 40, detailRe);
        const bareRe = /(?:https?:\\/\\/(?:www\\.)?(?:homegate|immoscout24)\\.ch)?(\\/(?:mieten|rent)\\/\\d{5,})/gi;
        const fromBare: string[] = [];
        let bm: RegExpExecArray | null;
        const baseHost = (() => { try { return new URL(listPg.finalUrl || it.url).origin; } catch { return 'https://www.homegate.ch'; } })();
        while ((bm = bareRe.exec(listPg.body)) !== null) {
          const path = bm[1];
          const abs = path.startsWith('http') ? path : baseHost + path;
          fromBare.push(abs);
        }
        const uniq = [...new Set([...fromAnchors, ...fromBare])].slice(0, 6);`
);

const oldRooms = `      if (snippetEvidence && !ex.rooms) {
        // Leave rooms null — inventing 0 previously bypassed minRooms and produced garbage cards.
        ex.signals.push('rooms_unverified');
      }`;
const newRooms = `      if (snippetEvidence && !ex.rooms) {
        // Leave rooms null — inventing 0 previously bypassed minRooms and produced garbage cards.
        ex.signals.push('rooms_unverified');
      }
      // SERP title/snippet often carries "3.5 Zimmer" when the fetched page title is a brand (iCasa.ch).
      if (!ex.rooms && it.hit) {
        const serpRooms = parseRooms(\`\${it.hit.title || ''}\\n\${it.hit.snippet || ''}\`);
        if (serpRooms) {
          ex.rooms = { rooms: serpRooms.rooms, basis: serpRooms.basis || 'serp_title', quote: '' };
          ex.signals.push('rooms_from_serp_title');
        }
      }`;
must(pipe.includes("ex.signals.push('rooms_unverified');"), 'rooms_unverified not found');
if (!pipe.includes('rooms_from_serp_title')) {
  pipe = pipe.replace(oldRooms, newRooms);
}
writeFileSync('server/immofinderPipeline.ts', pipe);
console.log('pipeline patched');

let core = readFileSync('server/immofinderCore.ts', 'utf8');
const oldUnav = "  if (/inserat ist nicht mehr verfügbar/.test(h)) return true;";
const newUnav = "  if (/inserat (ist )?nicht mehr verfügbar/.test(h)) return true;";
must(core.includes(oldUnav), 'unavailable pattern not found');
core = core.replace(oldUnav, newUnav);
writeFileSync('server/immofinderCore.ts', core);
console.log('core patched');

const pj = JSON.parse(readFileSync('package.json', 'utf8'));
pj.patch = '130.10d';
writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
let lock = readFileSync('package-lock.json', 'utf8');
lock = lock.replaceAll('"patch": "130.10c"', '"patch": "130.10d"');
writeFileSync('package-lock.json', lock);
let repair = readFileSync('server/immofinderRepair.ts', 'utf8');
if (repair.includes("REPAIR_RULES_VERSION = '130.10c.5'")) {
  repair = repair.replace("REPAIR_RULES_VERSION = '130.10c.5'", "REPAIR_RULES_VERSION = '130.10d.5'");
  writeFileSync('server/immofinderRepair.ts', repair);
}
const cl = readFileSync('CHANGELOG.md', 'utf8');
if (!cl.startsWith('## P130.10d')) {
  writeFileSync('CHANGELOG.md', `## P130.10d — Homegate list expansion + SERP rooms + unavailable title\n\n- **PROBLEM:** Chur run 6b3eeecb kept=0. Homegate trefferliste expanded to 0 detail URLs. iCasa dropped rooms_unknown after LLM timeout. UrbanHome unavailable title missed.\n- **CHANGE:** harvest bare /mieten|/rent ids from list HTML; rooms fallback from SERP title/snippet; broaden unavailable regex. BUGFIX.\n\n` + cl);
}
console.log('P130.10d applied');
