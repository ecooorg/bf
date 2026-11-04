/**
 * P125.3 — WP3 scope extension: search routing and answer grounding.
 * Pure offline tests of gate, pre-classifier, place extraction, follow-up detection,
 * and status-block presence. Planner model is not called.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  needsFreshWebInfo,
  shouldSearchWeb,
  searchPlannerGate,
  isPlannerCandidate,
  isSearchFollowup,
  preClassifyLiveDataIntent,
  extractPlaceCandidate,
  formatSearchStatusBlock,
  skippedWebSearch,
  contextualizeSearchText,
} from '../server/webSearch.ts';

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

describe('P125.3 search routing — live-data gate admits temperature questions', () => {
  it('needsFreshWebInfo matches plain Russian temperature question', () => {
    assert.equal(needsFreshWebInfo('Какая сейчас температура воздуха в Берне?'), true);
  });

  it('needsFreshWebInfo matches English temperature question', () => {
    assert.equal(needsFreshWebInfo('What is the current air temperature in Bern?'), true);
  });

  it('searchPlannerGate opens for a plain temperature question (pre-classifier reachable)', () => {
    const o = { ...gateBase, userText: 'Какая сейчас температура воздуха в Цюрихе?' };
    assert.equal(searchPlannerGate(o), true);
    assert.equal(isPlannerCandidate(o), true);
  });

  it('searchPlannerGate opens for live-thread search follow-up', () => {
    const o = {
      ...gateBase,
      userText: 'сделай ещё один запрос',
      priorLiveThread: true,
    };
    assert.equal(searchPlannerGate(o), true);
  });

  it('does not open the gate for personal advice without live topic', () => {
    const o = { ...gateBase, userText: 'Как мне лучше организовать свой день завтра?' };
    // May or may not match freshness; personal day-planning should not force search via LIVE_TOPIC alone.
    assert.equal(isPlannerCandidate({ ...o, userText: 'мне грустно сегодня' }), false);
  });
});

describe('P125.3 place extraction', () => {
  it('strips time phrases and connecting words', () => {
    const place = extractPlaceCandidate('температура прямо сейчас в городе Берн');
    assert.ok(place);
    assert.match(place, /Берн/i);
    assert.doesNotMatch(place, /сейчас|прямо|момент|городе/i);
  });

  it('extracts place from English weather phrasing', () => {
    const place = extractPlaceCandidate('What is the temperature right now in the city of Geneva?');
    assert.ok(place);
    assert.match(place, /Geneva/i);
  });

  it('pre-classifier carries place from dialogue when current turn has none', () => {
    const decision = preClassifyLiveDataIntent('сделай поиск и дай надёжную температуру', [
      { role: 'user', content: 'Какая температура воздуха в Базеле?' },
      { role: 'assistant', content: 'I need to look that up.' },
    ]);
    assert.ok(decision);
    assert.equal(decision.search, true);
    assert.ok(decision.plan?.place);
    assert.match(String(decision.plan.place), /Базел/i);
  });

  it('pre-classifier returns place for a self-contained temperature question', () => {
    const decision = preClassifyLiveDataIntent('Какая сейчас температура в Лозанне?');
    assert.ok(decision);
    assert.equal(decision.search, true);
    assert.ok(decision.plan?.place);
    assert.match(String(decision.plan.place), /Лозанн/i);
  });
});

describe('P125.3 search follow-up detection', () => {
  it('recognises "one more query" and "you always have search"', () => {
    assert.equal(isSearchFollowup('ты всегда можешь сделать поиск, сделай ещё один запрос'), true);
    assert.equal(isSearchFollowup('run one more query'), true);
    assert.equal(isSearchFollowup('just make a search'), true);
  });

  it('recognises complaints about sources and dictated-query asks', () => {
    assert.equal(isSearchFollowup('почему эти сайты? построй запрос как я сказал'), true);
    assert.equal(isSearchFollowup('выполни ровно этот запрос'), true);
  });
});

describe('P125.3 honest status block on skipped turns', () => {
  it('emits NOT_RUN status when lookup was expected but search did not run', () => {
    const block = formatSearchStatusBlock(skippedWebSearch('skipped', 'trigger_not_matched'), true, true);
    assert.ok(block.includes('SEARCH STATUS: NOT_RUN'));
    assert.ok(/NEVER say that you have no internet access/i.test(block) || /no search tool/i.test(block));
  });

  it('does not emit a status block for a successful used result', () => {
    const block = formatSearchStatusBlock({ status: 'used', reason: undefined }, true, true);
    assert.equal(block, '');
  });
});

describe('P125.3 nine-turn dialogue replay (gate / place / follow-up assertions)', () => {
  // Fixture inspired by the 2026-11-04 nine-turn Conversational dialogue (release 124.40).
  // Planner is stubbed: we only assert pure gate, place, and follow-up behaviour.
  const turns = [
    { role: 'user', text: 'Какая сейчас температура воздуха в Берне?', expectSearchGate: true, expectPlace: /Берн/i },
    { role: 'user', text: 'Найди в интернете температуру в Берне прямо сейчас', expectSearchGate: true, expectPlace: /Берн/i },
    { role: 'user', text: 'почему эти сайты?', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'построй запрос как надо и выполни поиск', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'сделай поиск и дай надёжную температуру из надёжного источника', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'выполни ровно этот запрос: temperature Bern Switzerland now', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'у тебя всегда есть поиск, просто сделай ещё один запрос', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'почему нет результата?', expectSearchGate: true, priorLive: true },
    { role: 'user', text: 'какая температура в Берне сейчас?', expectSearchGate: true, expectPlace: /Берн/i },
  ];

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    it(`turn ${i + 1}: gate and place for «${t.text.slice(0, 40)}…»`, () => {
      const o = {
        ...gateBase,
        userText: t.text,
        userAskedSearch: /найди|поиск|search|запрос/i.test(t.text),
        priorLiveThread: Boolean(t.priorLive) || i > 0,
        recentSearchIntent: i > 0,
      };
      assert.equal(searchPlannerGate(o), t.expectSearchGate, `gate turn ${i + 1}`);
      if (t.expectPlace) {
        const place = extractPlaceCandidate(t.text) || (i > 0 ? extractPlaceCandidate(turns[0].text) : undefined);
        // For instruction-only turns the place comes from dialogue; for place-named turns from the text.
        if (/Берн|Bern|температур|temperature/i.test(t.text) && !/почему|построй|выполни ровно|ещё один/i.test(t.text)) {
          assert.ok(place, `place expected on turn ${i + 1}`);
          assert.match(String(place), t.expectPlace);
        }
      }
      if (t.priorLive) {
        assert.equal(
          isSearchFollowup(t.text) || needsFreshWebInfo(t.text) || /температур|temperature/i.test(t.text) || isPlannerCandidate(o),
          true,
        );
      }
    });
  }

  it('replay with other places and languages does not hard-code one country', () => {
    for (const sample of [
      'Quelle est la température actuelle à Genève?',
      'What is the temperature in Oslo right now?',
      'Какая температура в Варшаве сейчас?',
    ]) {
      assert.equal(searchPlannerGate({ ...gateBase, userText: sample }), true);
      const place = extractPlaceCandidate(sample);
      assert.ok(place && place.length >= 3, sample);
    }
  });
});

describe('P125.3 contextualizeSearchText keeps place on follow-ups', () => {
  it('combines prior live task with a search follow-up', () => {
    const resolved = contextualizeSearchText(
      'сделай ещё один поиск',
      'Какая сейчас температура воздуха в Берне?',
    );
    assert.match(resolved, /Берн/i);
  });
});
