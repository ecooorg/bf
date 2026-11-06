/**
 * P127.1 eval-harness behavioural suite (Appendix B).
 * Pure functions only; no live network.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuestionSet,
  questionSetHash,
  normalizeNumber,
  numbersMatch,
  detectAbstention,
  provisionalLabel,
  wilsonUpper,
  rateWithInterval,
  blindAnswers,
  unblind,
  buildReportSkeleton,
} from '../scripts/baseline-eval.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('eval-harness schema', () => {
  it('accepts the shipped question set', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/eval-questions.json'), 'utf8'));
    const errs = validateQuestionSet(doc);
    assert.equal(errs.length, 0, errs.join('; '));
    assert.ok(doc.questions.length >= 12);
  });

  it('rejects duplicate ids', () => {
    const errs = validateQuestionSet({
      questions: [
        { id: 'X', category: 'chat', lang: 'en', turns: ['hi'], expect: { search: 'forbidden' }, reference: null },
        { id: 'X', category: 'chat', lang: 'en', turns: ['hi'], expect: { search: 'forbidden' }, reference: null },
      ],
    });
    assert.ok(errs.some(e => /duplicate/.test(e)));
  });

  it('rejects ambiguous without acceptableBehaviours', () => {
    const errs = validateQuestionSet({
      questions: [{ id: 'A', category: 'ambiguous', lang: 'en', turns: ['?'], expect: { search: 'either' }, reference: null }],
    });
    assert.ok(errs.some(e => /acceptableBehaviours/.test(e)));
  });

  it('rejects burned-question terms', () => {
    const errs = validateQuestionSet({
      questions: [{
        id: 'B', category: 'lookup', lang: 'en', turns: ['larch in Graubünden'],
        expect: { search: 'required' }, reference: null,
      }],
    });
    assert.ok(errs.some(e => /burned/.test(e)));
  });

  it('hash is stable', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/eval-questions.json'), 'utf8'));
    assert.equal(questionSetHash(doc), questionSetHash(doc));
  });
});

describe('numeric equivalence', () => {
  it('decimal comma vs point', () => {
    assert.equal(normalizeNumber('1,7'), 1.7);
    assert.equal(normalizeNumber('8 962 300'), 8962300);
    assert.ok(numbersMatch('1,7', 1.7));
    assert.ok(numbersMatch(8962300, '8.962.300'));
  });

  it('percent / fraction tolerance', () => {
    assert.ok(numbersMatch(1.7, 1.71, { relTol: 0.02 }));
    assert.ok(!numbersMatch(1.7, 3.0, { relTol: 0.02 }));
  });
});

describe('abstention detection (multilingual)', () => {
  it('EN / RU / DE / FR', () => {
    assert.ok(detectAbstention("I don't know the exact figure."));
    assert.ok(detectAbstention('Не могу подтвердить это число.'));
    assert.ok(detectAbstention('Ich weiss es nicht genau.'));
    assert.ok(detectAbstention('Je ne peux pas confirmer.'));
    assert.ok(!detectAbstention('The population is 8 962 300.'));
  });
});

describe('W / G labelling', () => {
  it('specific figure without source is W; with source is G', () => {
    const q = {
      id: 'T', category: 'statistic', reference: { value: 8962300, sourceUrl: 'https://example.org', retrievedOn: '2026-01-01', asOf: '2023-12-31' },
    };
    assert.equal(provisionalLabel('The number is 8962300.', q, []), 'W');
    assert.equal(provisionalLabel('The number is 8962300.', q, ['https://example.org']), 'G');
  });
});

describe('interval maths', () => {
  it('0 of 20 upper bound ≈ 0.139', () => {
    const u = wilsonUpper(0, 20);
    assert.ok(u > 0.12 && u < 0.18, `got ${u}`);
  });

  it('rateWithInterval shape', () => {
    const r = rateWithInterval(0, 12);
    assert.equal(r.count, 0);
    assert.equal(r.n, 12);
    assert.ok(r.upper > 0.2);
  });
});

describe('blinding', () => {
  it('deterministic with seed and recoverable mapping', () => {
    const records = [
      { configId: 'A', questionId: 'Q1', answer: 'aa', sources: [] },
      { configId: 'B', questionId: 'Q1', answer: 'bb', sources: [] },
      { configId: 'C', questionId: 'Q1', answer: 'cc', sources: [] },
    ];
    const a = blindAnswers(records, 7);
    const b = blindAnswers(records, 7);
    assert.deepEqual(a.blinded, b.blinded);
    const labels = a.blinded[0].slots.map(s => s.label);
    assert.ok(labels.includes('X1'));
    const recovered = a.blinded[0].slots.map(s => unblind(a.mapping, 'Q1', s.label)).sort();
    assert.deepEqual(recovered, ['A', 'B', 'C']);
  });
});

describe('report skeleton', () => {
  it('carries commit, set hash, model ids, slot count', () => {
    const r = buildReportSkeleton({
      commit: 'abc', setHash: 'deadbeef', modelIds: { primary: 'm' }, slotCount: 3,
    });
    assert.equal(r.commit, 'abc');
    assert.equal(r.questionSetHash, 'deadbeef');
    assert.equal(r.modelIds.primary, 'm');
    assert.equal(r.slotCount, 3);
    assert.ok(Array.isArray(r.notRun));
  });
});

describe('negative-control fixture idea', () => {
  it('no-search answer set scores worse on lookup than with-search', () => {
    const q = {
      id: 'L', category: 'lookup',
      reference: { value: 42, sourceUrl: 'https://ex', retrievedOn: '2026-01-01', asOf: '2020' },
    };
    const withSearch = provisionalLabel('The answer is 42.', q, ['https://ex']);
    const noSearch = provisionalLabel('The answer is 42.', q, []);
    assert.equal(withSearch, 'G');
    assert.equal(noSearch, 'W');
  });
});
