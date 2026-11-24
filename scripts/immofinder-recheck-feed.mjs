#!/usr/bin/env node
/** P130.11: single Recheck feed — merge filters into recheck-list job + UI one button. Idempotent. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- routes: chain recheckStored after runRefreshJob ---
{
  const path = join(root, 'server/immofinderRoutes.ts');
  let t = readFileSync(path, 'utf8');
  if (!t.includes('immofinder_recheck_filters_after_refresh')) {
    const needle = `      }, refreshStatus).catch((e) => {
        refreshStatus.running = false; refreshStatus.phase = 'done'; refreshStatus.finishedAt = Date.now();
        refreshStatus.errors++; refreshStatus.message = \`Recheck failed: \${String((e as Error)?.message || e).slice(0, 120)}\`;
        console.error(JSON.stringify({ type: 'immofinder_recheck_list_fatal', error: refreshStatus.message }));
      });`;
    const repl = `      }, refreshStatus).then(async () => {
        refreshStatus.running = true;
        refreshStatus.phase = 'searching';
        refreshStatus.message = \`\${String(refreshStatus.message || '').trim()} · applying quality filters…\`;
        try {
          const fr = await recheckStored();
          const base = String(refreshStatus.message || '').replace(/\\s· applying quality filters…$/, '').trim();
          refreshStatus.message = \`\${base}\${base ? ' · ' : ''}filters: hid \${fr.hidden}, price fixed \${fr.priceFixed}\`;
          immoLog('info', 'immofinder_recheck_filters_after_refresh', { checked: fr.checked, hidden: fr.hidden, priceFixed: fr.priceFixed });
        } catch (fe) {
          const detail = String((fe as Error)?.message || fe).slice(0, 120);
          refreshStatus.message = \`\${String(refreshStatus.message || '').trim()} · filters error: \${detail}\`;
          immoLog('warn', 'immofinder_recheck_filters_after_refresh_failed', { error: detail });
        } finally {
          refreshStatus.running = false;
          refreshStatus.phase = 'done';
          refreshStatus.finishedAt = Date.now();
        }
      }).catch((e) => {
        refreshStatus.running = false; refreshStatus.phase = 'done'; refreshStatus.finishedAt = Date.now();
        refreshStatus.errors++; refreshStatus.message = \`Recheck failed: \${String((e as Error)?.message || e).slice(0, 120)}\`;
        console.error(JSON.stringify({ type: 'immofinder_recheck_list_fatal', error: refreshStatus.message }));
      });`;
    if (!t.includes(needle)) {
      console.error('routes needle not found');
      process.exit(1);
    }
    t = t.replace(needle, repl);
    t = t.replace(
      '/** Recheck dates and contact details on every stored listing, including hidden rows. */',
      '/** Recheck feed: re-fetch pages, hide delisted, refresh dates/contacts, then apply local quality filters. */',
    );
    writeFileSync(path, t);
    console.log('patched server/immofinderRoutes.ts');
  } else {
    console.log('routes already has filter chain');
  }
}

// --- UI: single Recheck feed button ---
{
  const path = join(root, 'src/ImmoFinder.tsx');
  let t = readFileSync(path, 'utf8');
  if (t.includes('data-testid="immofinder-recheck-filters"')) {
    const recheckStart = t.indexOf('const recheck = async');
    if (recheckStart >= 0) {
      let depth = 0, j = t.indexOf('{', recheckStart), k = j;
      for (; k < t.length; k++) {
        if (t[k] === '{') depth++;
        else if (t[k] === '}') { depth--; if (depth === 0) { k++; if (t[k] === ';') k++; break; } }
      }
      const lineStart = t.lastIndexOf('\n', recheckStart) + 1;
      t = t.slice(0, lineStart) + t.slice(k).replace(/^\n/, '');
    }
    t = t.replace('  const [recheckBusy, setRecheckBusy] = useState(false);\n', '');
    t = t.replace("  const [recheckInfo, setRecheckInfo] = useState('');\n", '');

    t = t.replace(
      "setListRefreshInfo('Rechecking dates and contacts for all saved listings…');",
      "setListRefreshInfo('Rechecking feed… verifying active listings, dates and contacts…');\n    setMsg('');",
    );
    t = t.replace(
      'setListRefreshInfo(`Queued ${start.queued} listings. Refreshing dates and contacts…`);',
      'setListRefreshInfo(`Queued ${start.queued} listings. Checking pages…`);',
    );
    t = t.replace(
      "if (finished) setListRefreshInfo(job.message || 'Recheck list complete.');",
      "if (finished) setListRefreshInfo(job.message || 'Recheck feed complete.');",
    );
    t = t.replace(
      'setListRefreshInfo(`Recheck list failed: ${(e as Error).message}`);',
      'const err = (e as Error).message;\n      setListRefreshInfo(`Recheck feed failed: ${err}`);\n      setMsg(err);',
    );

    const fs = t.indexOf('data-testid="immofinder-recheck-filters"');
    if (fs < 0) { console.error('filters button missing unexpectedly'); process.exit(1); }
    const btnStart = t.lastIndexOf('<button', fs);
    const rs = t.indexOf('data-testid="immofinder-recheck-status"');
    const end = t.indexOf(')}', rs) + 2;
    const newBtns = `<button
          type="button"
          className="immo-btn small"
          data-testid="immofinder-recheck-list"
          onClick={() => void recheckList()}
          style={{ fontSize: 13 }}
          disabled={busy || listRefreshBusy}
          title="Re-fetch each listing page, hide delisted ads, refresh dates/contacts, then apply quality filters"
        >
          {listRefreshBusy ? 'Rechecking feed…' : 'Recheck feed'}
        </button>
        {listRefreshInfo && (
          <span data-testid="immofinder-recheck-list-status" style={{ fontSize: 13, color: listRefreshBusy ? '#8ec8ff' : '#8fa6c2', alignSelf: 'center', maxWidth: 520 }}>
            {listRefreshInfo}
          </span>
        )}`;
    t = t.slice(0, btnStart) + newBtns + t.slice(end);
    writeFileSync(path, t);
    console.log('patched src/ImmoFinder.tsx');
  } else if (t.includes('Recheck feed')) {
    console.log('UI already single Recheck feed');
  } else {
    console.error('UI patch target not found');
    process.exit(1);
  }
}

// CHANGELOG + TECHNICAL_REPORT (append-only top entry)
{
  const entry = `## P130.11 — Single Recheck feed button (delist + enrich + filters)

- **PROBLEM:** Two buttons (Recheck filters / Recheck list) split offline rules from page re-fetch; delisted ads (e.g. urbanhome «Inserat gelöscht») stayed in the agent feed unless the user knew to press Recheck list.
- **CHANGE:** One **Recheck feed** control. Job re-fetches each listing page, hides \`listing_unavailable\`, refreshes dates/contacts, then runs local quality filters (junk hide, price re-parse). Removed the separate filters button from the UI; \`POST /api/immofinder/recheck\` remains for API compatibility.
- **SCOPE:** USER_VALUE. \`src/ImmoFinder.tsx\`, \`server/immofinderRoutes.ts\`.

`;
  const clPath = join(root, 'CHANGELOG.md');
  if (existsSync(clPath)) {
    const cl = readFileSync(clPath, 'utf8');
    if (!cl.startsWith('## P130.11')) {
      writeFileSync(clPath, entry + cl);
      console.log('CHANGELOG.md prepended P130.11');
    }
  }
  const trPath = join(root, 'TECHNICAL_REPORT.md');
  const trEntry = `## P130.11 — Single Recheck feed (2026-11-24)

- **CHANGE:** UI exposes one **Recheck feed** button. \`POST /api/immofinder/recheck-list\` still runs page refresh + \`listing_unavailable\` hide, then chains \`recheckStored()\` (local filters / price fix) before the job is marked finished.
- **NOT_RUN:** production click-through after deploy; delist patterns for every portal beyond existing \`isListingUnavailable\`.

`;
  if (existsSync(trPath)) {
    const tr = readFileSync(trPath, 'utf8');
    if (!tr.startsWith('## P130.11')) {
      writeFileSync(trPath, trEntry + tr);
      console.log('TECHNICAL_REPORT.md prepended P130.11');
    }
  }
}
