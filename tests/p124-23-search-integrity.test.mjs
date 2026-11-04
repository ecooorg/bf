/** P124.23 — number gate never crashes; search decisions are recorded with non-secret diagnostics. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateNumbers, safeValidateNumbers } from '../src/numberValidator.ts';
import { mergeWebSearchResults, searchDecisionDetails, skippedWebSearch } from '../server/webSearch.ts';

test('V-1: signed numbers such as +8 do not throw', () => {
  assert.doesNotThrow(() => validateNumbers('Temperature +8 °C, humidity 6%', 'weather digest 6% 8'));
  assert.doesNotThrow(() => validateNumbers('Weather: +6 and -3 degrees', 'digest'));
  assert.deepEqual(validateNumbers('Temperature +8 °C, humidity 6%', 'weather digest 6% 8'), ['+8']);
});

test('V-1: a percentage supplied by the user is still recognised', () => {
  assert.deepEqual(validateNumbers('Growth is 6% per year', 'growth 6%'), []);
});

test('safeValidateNumbers swallows exceptions, reports them, and returns no rejected tokens', () => {
  let reported = 0;
  const bad = safeValidateNumbers(/** @type {any} */ (null), 'x', [], [], () => { reported++; });
  assert.deepEqual(bad, []);
  assert.equal(reported, 1);
  assert.doesNotThrow(() => safeValidateNumbers(/** @type {any} */ (null), 'x', [], [], () => { throw new Error('logger'); }));
});

test('merge records characters per sub-query and budget drops', () => {
  const part = (n, tag) => ({ status: 'used', digest: tag.repeat(n), sources: [{ title: tag, url: `https://www.${tag}.example/p` }], queries: [tag], model: 'serper' });
  const merged = mergeWebSearchResults([part(4400, 'a'), part(4400, 'b'), part(4400, 'c')], 'q');
  assert.deepEqual(merged.diagnostics.digestCharsPerQuery, [4400, 4400, 4400]);
  assert.ok(merged.diagnostics.droppedByBudget > 0);
  assert.equal(merged.diagnostics.digestCharsBeforeBudget - merged.diagnostics.droppedByBudget, merged.digest.length);
});

test('searchDecisionDetails exposes hosts and counts, never full URLs or digest text', () => {
  const merged = mergeWebSearchResults([{ status: 'used', digest: 'secret-looking digest text '.repeat(10), sources: [{ title: 't', url: 'https://www.meteoswiss.admin.ch/x?token=abc' }], queries: ['zurich weather'], model: 'serper' }], 'q');
  const d = searchDecisionDetails(merged, { provider: 'serper', gate: 'conversation' });
  const json = JSON.stringify(d);
  assert.deepEqual(d.sourceHosts, ['meteoswiss.admin.ch']);
  assert.equal(d.provider, 'serper');
  assert.ok(!json.includes('token=abc') && !json.includes('secret-looking'));
  const skipped = searchDecisionDetails(skippedWebSearch('skipped', 'trigger_not_matched'), { provider: 'serper', gate: 'conversation' });
  assert.equal(skipped.reason, 'trigger_not_matched');
});

test('server wires the guarded validator and persistent search events (structure)', () => {
  const src = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const diagnostics = readFileSync(new URL('../server/conversationDiagnostics.ts', import.meta.url), 'utf8');
  assert.ok(!/\bvalidateNumbers\(/.test(src), 'server.ts must call safeValidateNumbers only');
  for (const ev of ["event: 'web_search'", "event: 'simple_direct_search'", "event: 'number_validator_error'"]) assert.ok(src.includes(ev), ev);
  assert.ok(diagnostics.includes("r.event === 'simple_direct_search'"), 'conversation diagnostics must include the Simple Direct search event');
});
