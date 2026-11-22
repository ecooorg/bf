#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const GOOD = '58ecf574fb42a14c0f825200cdaa37dc8d89192e';
const show = (path) => execSync(`git show ${GOOD}:${path}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

writeFileSync('server/immofinderCore.ts', show('server/immofinderCore.ts'));
writeFileSync('server/immofinderDiscovery.ts', show('server/immofinderDiscovery.ts'));
writeFileSync('config/immofinder.json', show('config/immofinder.json'));
writeFileSync('tests/immofinder-quality.test.mjs', show('tests/immofinder-quality.test.mjs'));
writeFileSync('.github/workflows/ci.yml', show('.github/workflows/ci.yml'));

let core = readFileSync('server/immofinderCore.ts', 'utf8');
if (core.length < 60000) throw new Error('core restore too small');
const oldTitle = 'const LIST_TITLE = /^(alle inserate|die besten|unterk[uü]nfte in|ferienunterk[uü]nfte in|ferienwohnungen in|ferienh[aä]user in|wohnungen (mit|zum|zu|in)|\\d+\\s+wohnungen|wohnung(en)? mieten|immobilien in|mieten in|suchresultate|trefferliste|immobilie mieten in|.*immobilie\\. h[aä]user zu vermieten|.*properties mieten)|mittlere(r)?\\s+mietpreis|durchschnittliche[r]?\\s+mietpreis/i;';
const newTitle = 'const LIST_TITLE = /^(alle inserate|die besten|page\\s+\\d+|tous les biens|unterk[uü]nfte in|ferienunterk[uü]nfte in|ferienwohnungen in|ferienh[aä]user in|wohnungen (mit|zum|zu|in)|\\d+\\s+wohnungen|wohnung(en)? mieten|immobilien in|mieten in|suchresultate|trefferliste|immobilie mieten in|.*immobilie\\. h[aä]user zu vermieten|.*properties mieten)|mittlere(r)?\\s+mietpreis|durchschnittliche[r]?\\s+mietpreis/i;';
const oldMore = 'const LIST_URL_MORE = /\\/zimmer-\\d+(\\.\\d)?(-\\d+(\\.\\d)?)?\\/?$|\\/(mieten|kaufen)\\/(wohnung|immobilien)\\/in-[^/]+|[?&]nrf=\\d|\\/kaufen\\/|\\/preise\\.html|\\/liste(\\/|$)|gruppenhaus\\.ch|\\/_join_/i;';
const newMore = 'const LIST_URL_MORE = /\\/zimmer-\\d+(\\.\\d)?(-\\d+(\\.\\d)?)?\\/?$|\\/(mieten|kaufen)\\/(wohnung|immobilien)\\/in-[^/]+|\\/unterkategorie-[^/]+|\\/in-[a-z0-9äöü-]{2,}\\/?$|\\/immobilier\\/[^/]*immobilier[^/]*\\.html|[?&]nrf=\\d|\\/kaufen\\/|\\/preise\\.html|\\/liste(\\/|$)|gruppenhaus\\.ch|\\/_join_/i;';
const oldPortal = `  const generic = new Set(['search','suche','results','resultate','angebote','list','listing','rent','mieten','buy','kaufen','sale','map','karte','real-estate','immobilien','wohnung-mieten','wohnungen-mieten','flat','apartment','house']);
  if (!parts[parts.length - 1] || generic.has(parts[parts.length - 1])) return false;
  if (parts.some((p) => /^(search|suche|results|resultate|map|karte)$/.test(p))) return false;
  return true;
}`;
const newPortal = `  const generic = new Set(['search','suche','results','resultate','angebote','list','listing','rent','mieten','buy','kaufen','sale','map','karte','real-estate','immobilien','wohnung-mieten','wohnungen-mieten','flat','apartment','house','suchen']);
  if (!parts[parts.length - 1] || generic.has(parts[parts.length - 1])) return false;
  // Category / commune index routes (home.ch unterkategorie…/in-chur, …/in-thusis) are not detail pages.
  if (parts.some((p) => /^(search|suche|suchen|results|resultate|map|karte|unterkategorie)/.test(p) || /^in-[a-z0-9-]{2,}$/.test(p))) return false;
  return true;
}`;
for (const [n, s] of [['title', oldTitle], ['more', oldMore], ['portal', oldPortal]]) {
  if (!core.includes(s)) throw new Error('missing ' + n);
}
core = core.replace(oldTitle, newTitle).replace(oldMore, newMore).replace(oldPortal, newPortal);
writeFileSync('server/immofinderCore.ts', core);

let disc = readFileSync('server/immofinderDiscovery.ts', 'utf8');
const needle = `    // Drop list/search/join pages early so the fetch queue is not flooded (keeps Serper budget for real ads).
    const nonListing = nonListingReason(h.title || '', h.link);
    if (nonListing) { decide(false, \`non_listing:\${nonListing}\`); continue; }
    // Social feeds may expose ads only through snippets; retain them as provisional leads.
    const snippetOnly = hostMatches(host, d.snippetOnlyHosts) && !hostMatches(host, portalHosts);
    if (!isSpecificLink(h.link) && !isPortalDetailLink(h.link, cfg)) {
      // Owner microsites without an ID are rare but valid; portals/FB roots/lists are not.
      const dropHost = hostMatches(host, portalHosts)
        || /facebook\\.com$|booking\\.com$|cozycozy\\.|rentola\\.|happyholiday\\.|ferienhausmiete\\.|airbnb\\.|vrbo\\./i.test(host);
      if (dropHost && !snippetOnly) { decide(false, 'generic_or_search_url_on_portal_social_host'); continue; }
    }`;
const repl = `    // Drop list/search/join pages early so the fetch queue is not flooded (keeps Serper budget for real ads).
    const nonListing = nonListingReason(h.title || '', h.link);
    if (nonListing) { decide(false, \`non_listing:\${nonListing}\`); continue; }
    // Social feeds may expose ads only through snippets; retain them as provisional leads.
    const snippetOnly = hostMatches(host, d.snippetOnlyHosts) && !hostMatches(host, portalHosts);
    // Bare site roots are never a single rental offer (project portals, agency landings).
    try {
      const pathParts = new URL(h.link).pathname.split('/').filter(Boolean);
      if (pathParts.length === 0 && !snippetOnly) { decide(false, 'site_root_not_listing'); continue; }
    } catch { /* invalid URL already filtered */ }
    if (!isSpecificLink(h.link) && !isPortalDetailLink(h.link, cfg)) {
      // Owner microsites without an ID are rare but valid; portals/FB roots/lists are not.
      const dropHost = hostMatches(host, portalHosts)
        || /facebook\\.com$|booking\\.com$|cozycozy\\.|rentola\\.|happyholiday\\.|ferienhausmiete\\.|airbnb\\.|vrbo\\./i.test(host);
      if (dropHost && !snippetOnly) { decide(false, 'generic_or_search_url_on_portal_social_host'); continue; }
    }`;
if (!disc.includes(needle)) throw new Error('discovery needle missing');
writeFileSync('server/immofinderDiscovery.ts', disc.replace(needle, repl));

const cfg = JSON.parse(readFileSync('config/immofinder.json', 'utf8'));
cfg.discovery.maxCandidatesPerQuery = 8;
writeFileSync('config/immofinder.json', JSON.stringify(cfg, null, 2) + '\n');

let ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const oldOn = `on:\n  push:\n    branches: [main]\n  workflow_dispatch:\n`;
const newOn = `on:\n  push:\n    branches: [main]\n    # Snapshot/diagnostics-only commits must not burn a full verification DAG.\n    paths-ignore:\n      - 'data/immofinder/**'\n  workflow_dispatch:\n`;
if (!ci.includes(oldOn)) throw new Error('ci on: block missing');
writeFileSync('.github/workflows/ci.yml', ci.replace(oldOn, newOn));

writeFileSync('.github/workflows/ci-data-minimal.yml', `name: ImmoFinder data — minimal checks\non:\n  push:\n    branches: [main]\n    paths:\n      - 'data/immofinder/**'\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\nconcurrency:\n  group: immofinder-data-\${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n  minimal:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0\n        with:\n          node-version-file: .nvmrc\n      - name: Prepare log directory\n        run: mkdir -p artifacts/ci-checks\n      - name: Preflight (workflows / package consistency)\n        shell: bash\n        run: set -o pipefail; CI_LOGS_DIR=artifacts/ci-checks node scripts/workflow-preflight.mjs\n      - name: Scan repository for leaked secrets\n        uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0\n        env:\n          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n`);

let test = readFileSync('tests/immofinder-quality.test.mjs', 'utf8');
const marker = "test('parseRooms handles Swiss half-room spellings and prefers earliest Zimmer hit'";
const insert = `\ntest('nonListingReason rejects portal list/index URLs and challenge titles', async () => {\n  const { nonListingReason, isPortalDetailUrl } = await import('../server/immofinderCore.ts');\n  assert.equal(\n    nonListingReason('Page 2 - Wohnung mieten: Chur', 'https://www.home.ch/de/mieten/wohnung/unterkategorie-wohnung/in-chur'),\n    'list_or_search_page',\n  );\n  assert.equal(\n    nonListingReason('Chur: Tous les biens immobiliers', 'https://www.acheter-louer.ch/immobilier/Chur-immobilier-maison-appartement-villa-chalet-appartement-terrain.html'),\n    'list_or_search_page',\n  );\n  assert.equal(\n    nonListingReason('Just a moment...', 'https://www.acheter-louer.ch/x'),\n    'list_or_search_page',\n  );\n  assert.equal(\n    nonListingReason('3 ½ Zimmer-Wohnung in Chur mieten | Flatfox', 'https://flatfox.ch/de/wohnung/lagerstr-9-7000-chur/1289164/'),\n    null,\n  );\n  const portals = ['home.ch', 'acheter-louer.ch', 'flatfox.ch', 'icasa.ch'];\n  assert.equal(isPortalDetailUrl('https://www.home.ch/de/mieten/wohnung/unterkategorie-wohnung/in-chur', portals), false);\n  assert.equal(isPortalDetailUrl('https://flatfox.ch/de/wohnung/lagerstr-9-7000-chur/1289164/', portals), true);\n});\n\n`;
if (!test.includes(marker)) throw new Error('test marker missing');
writeFileSync('tests/immofinder-quality.test.mjs', test.replace(marker, insert + marker));

console.log('emergency-list-url-fix applied successfully');
