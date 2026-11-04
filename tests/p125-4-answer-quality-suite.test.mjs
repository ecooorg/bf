/**
 * P125.4 — C125 close-out: language-neutral answer-quality patterns, dictated query,
 * live-task state, sourceCountry, national authorities, status honesty.
 * Locale rule: no privileged language or home country; suite always sets place/country explicitly.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  searchPlannerGate,
  isSearchFollowup,
  extractDictatedQuery,
  extractSourceCountryConstraint,
  extractPlaceCandidate,
  resolveLiveTaskState,
  planFromLiveTask,
  formatSearchStatusBlock,
  skippedWebSearch,
  preClassifyLiveDataIntent,
  needsFreshWebInfo,
  buildSearchDecision,
} from '../server/webSearch.ts';
import { authorityHostsFor, authorityRank, loadNationalAuthorities } from '../server/nationalAuthorities.ts';

const gateBase = {
  enabled: true,
  mode: 'auto',
  userText: '',
  userAskedSearch: false,
  distress: false,
  hasAttachments: false,
  priorLiveThread: false,
  recentSearchIntent: false,
};

/** Language-neutral failure patterns × languages × places (no privileged language). */
const TEMP_TURNS = [
  { lang: 'en', text: 'What is the current air temperature in Oslo?', place: /Oslo/i, countryHint: 'NO' },
  { lang: 'de', text: 'Wie hoch ist die aktuelle Lufttemperatur in München?', place: /München|Munich/i, countryHint: 'DE' },
  { lang: 'fr', text: 'Quelle est la température de l\'air actuelle à Lyon?', place: /Lyon/i, countryHint: 'FR' },
  { lang: 'ja', text: '東京の現在の気温は何度ですか？', place: /東京|Tokyo/i, countryHint: 'JP' },
];

describe('P125.4 pattern: temperature question admits search gate (multi-language)', () => {
  for (const s of TEMP_TURNS) {
    it(`${s.lang}: gate opens and place extracted when possible`, () => {
      const o = { ...gateBase, userText: s.text };
      assert.equal(searchPlannerGate(o), true, s.lang);
      // Japanese may not yield Latin place via regex; gate must still open via LIVE_TOPIC / freshness.
      if (s.lang !== 'ja') {
        const place = extractPlaceCandidate(s.text);
        assert.ok(place, s.text);
        assert.match(String(place), s.place);
      }
    });
  }
});

describe('P125.4 pattern: lost place recovered from dialogue (live-task state)', () => {
  it('follow-up without place keeps Oslo from prior turns', () => {
    const live = resolveLiveTaskState({
      userText: 'search again and give a reliable temperature from a reliable source',
      prior: null,
      recentUserTexts: ['What is the current air temperature in Oslo?'],
    });
    assert.match(String(live.place), /Oslo/i);
    const plan = planFromLiveTask(live, 'live_task_followup');
    assert.match(plan.query + ' ' + (plan.place || ''), /Oslo/i);
  });

  it('meta search complaint does not become the query wording', () => {
    const live = resolveLiveTaskState({
      userText: 'why these sites? run one more query',
      prior: { place: 'Lyon', topic: 'weather', query: 'temperature Lyon France', freshness: 'now' },
      recentUserTexts: ['Quelle est la température de l\'air actuelle à Lyon?'],
    });
    assert.match(String(live.place), /Lyon/i);
    assert.doesNotMatch(String(live.query || ''), /why these sites/i);
  });
});

describe('P125.4 item 3: dictated query', () => {
  it('extracts quoted query after search request', () => {
    const q = extractDictatedQuery('Please run exactly this query: "temperature Munich Germany now"');
    assert.equal(q, 'temperature Munich Germany now');
  });

  it('extracts after build-query intent', () => {
    const q = extractDictatedQuery('build the query and search «air temperature Osaka today»');
    assert.ok(q);
    assert.match(q, /Osaka/i);
  });

  it('buildSearchDecision uses dictated text as plan query', async () => {
    const d = await buildSearchDecision({
      userText: 'search using this query: "current temperature in Warsaw Poland"',
      recentTurns: [],
      heuristic: () => false,
    });
    assert.equal(d.search, true);
    assert.equal(d.decisionNote, 'dictated_query');
    assert.ok(d.plan?.dictated);
    assert.match(String(d.plan?.query), /Warsaw|temperature/i);
  });
});

describe('P125.4 item 4: sourceCountry + national authorities', () => {
  it('extracts source-country constraint from English', () => {
    assert.equal(extractSourceCountryConstraint('prefer sources of Norway for this weather answer'), 'NO');
    assert.equal(extractSourceCountryConstraint('only from German sources please'), 'DE');
  });

  it('authority seed has multiple regions and no code-level default country', () => {
    const list = loadNationalAuthorities();
    assert.ok(list.length >= 8);
    const countries = new Set(list.map((e) => e.country));
    assert.ok(countries.has('JP'));
    assert.ok(countries.has('BR'));
    assert.ok(countries.has('NO'));
    // CH may exist as data seed entry but must not be required
    assert.ok(countries.size >= 8);
  });

  it('authorityHostsFor returns hosts for a requested country only', () => {
    const no = authorityHostsFor('NO', 'weather');
    assert.ok(no.some((h) => h.includes('met.no') || h.includes('yr.no')));
    assert.equal(authorityHostsFor('ZZ').length, 0);
  });

  it('authorityRank prefers matching hosts', () => {
    const pref = authorityHostsFor('JP', 'weather');
    assert.ok(authorityRank('jma.go.jp', pref) < authorityRank('random-blog.example', pref));
  });
});

describe('P125.4 pattern: search complaint / status honesty', () => {
  it('isSearchFollowup recognises cross-language complaint styles', () => {
    assert.equal(isSearchFollowup('run one more query'), true);
    assert.equal(isSearchFollowup('why these sites?'), true);
  });

  it('skipped turn always exposes honest status when search enabled', () => {
    const block = formatSearchStatusBlock(skippedWebSearch('skipped', 'trigger_not_matched'), false, true);
    assert.match(block, /SEARCH STATUS: NOT_RUN/);
    assert.match(block, /NEVER say that you have no internet access|no search tool/i);
  });
});

describe('P125.4 multi-turn structural replay (gate + live-task, planner stubbed)', () => {
  const scenarios = [
    {
      name: 'Oslo EN',
      turns: [
        { text: 'What is the air temperature in Oslo right now?', expectGate: true },
        { text: 'search the web for a reliable number', expectGate: true, expectPlace: /Oslo/i },
        { text: 'why these sites?', expectGate: true, priorLive: true },
        { text: 'run exactly this query: "temperature Oslo Norway now"', expectGate: true, dictated: true },
      ],
    },
    {
      name: 'Munich DE/EN mix',
      turns: [
        { text: 'Wie hoch ist die Temperatur in München?', expectGate: true },
        { text: 'please search again from German sources', expectGate: true, expectPlace: /München|Munich/i },
      ],
    },
    {
      name: 'Lyon FR',
      turns: [
        { text: 'Quelle est la température actuelle à Lyon?', expectGate: true },
        { text: 'fais une autre recherche', expectGate: true, priorLive: true },
      ],
    },
  ];

  for (const sc of scenarios) {
    it(`scenario ${sc.name}`, async () => {
      let prior = null;
      const recent = [];
      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i];
        const o = {
          ...gateBase,
          userText: t.text,
          userAskedSearch: /search|query|recherche|поиск/i.test(t.text),
          priorLiveThread: Boolean(t.priorLive) || i > 0,
          recentSearchIntent: i > 0,
        };
        assert.equal(searchPlannerGate(o), t.expectGate, `${sc.name} turn ${i + 1} gate`);
        if (t.dictated) {
          const d = await buildSearchDecision({
            userText: t.text,
            recentTurns: recent.map((c) => ({ role: 'user', content: c })),
            priorLiveTaskState: prior,
            heuristic: () => true,
          });
          assert.equal(d.decisionNote, 'dictated_query');
          assert.ok(d.plan?.dictated);
        }
        const live = resolveLiveTaskState({
          userText: t.text,
          prior,
          recentUserTexts: recent,
        });
        if (t.expectPlace) assert.match(String(live.place || ''), t.expectPlace);
        prior = live;
        recent.push(t.text);
      }
    });
  }
});

describe('P125.4 behaviour over source-text regex (WP3 step 2 sample)', () => {
  it('live temperature intent is recognised by behaviour functions, not a fixed prompt string pin', () => {
    assert.equal(needsFreshWebInfo('What is the current air temperature in Ottawa?'), true);
    assert.ok(preClassifyLiveDataIntent('What is the current air temperature in Ottawa?'));
  });
});


describe('P125.9 live-task: prior substantive query retained across domains', () => {
  const samples = [
    { prior: 'What is the latest stable Node.js LTS version?', followup: 'Run another search and verify the exact release.', tokens: ['node', 'lts'] },
    { prior: 'Find the current direct train schedule from Zurich to Milan for Friday.', followup: 'Check another source.', tokens: ['zurich', 'milan'] },
    { prior: 'What is the current weather in Oslo?', followup: 'Search again from a reliable source.', tokens: ['oslo'] },
  ];
  for (const s of samples) {
    it(`retains entities for: ${s.prior.slice(0, 40)}`, async () => {
      const d = await buildSearchDecision({
        userText: s.followup,
        recentTurns: [
          { role: 'user', content: s.prior },
          { role: 'assistant', content: 'Here is a result.' },
        ],
        heuristic: () => false,
      });
      assert.equal(d.search, true);
      assert.ok(d.plan?.query, 'plan.query required');
      const q = d.plan.query.toLowerCase();
      for (const tok of s.tokens) assert.ok(q.includes(tok), `${tok} in ${q}`);
      assert.doesNotMatch(d.plan.query, /here is a result/i);
    });
  }
});

describe('P125.5 item 4: authority ranking on sources', () => {
  it('sortSourcesByPreferredHosts puts authority hosts first', async () => {
    const { sortSourcesByPreferredHosts } = await import('../server/webSearch.ts');
    const ranked = sortSourcesByPreferredHosts(
      [
        { title: 'Blog', url: 'https://random-blog.example/x' },
        { title: 'JMA', url: 'https://www.jma.go.jp/forecast' },
        { title: 'Other', url: 'https://news.example/y' },
      ],
      authorityHostsFor('JP', 'weather'),
    );
    assert.match(ranked[0].url, /jma\.go\.jp/i);
  });
});
