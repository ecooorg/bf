const VALID = new Set(['PASS', 'FAIL', 'TIMEOUT', 'BLOCKED', 'UNKNOWN', 'PARTIAL', 'NOT_RUN']);
export function resolveInjectedFault(scenario) {
  const rows = {
    timeout: ['TIMEOUT', 'check exceeded its declared time limit'],
    cancellation: ['UNKNOWN', 'runner cancellation interrupted execution'],
    'missing-log': ['FAIL', 'PASS evidence rejected because its log is missing'],
    'partial-artifact': ['PARTIAL', 'artifact completeness is not established'],
    'runner-interruption': ['UNKNOWN', 'runner stopped before final status'],
    'handoff-generator-failure': ['UNVERIFIED', 'fallback handoff emitted after generator failure'],
    'corrupted-record': ['UNVERIFIED', 'evidence record failed schema validation'],
  };
  const found = rows[scenario];
  if (!found) throw new Error(`unknown fault scenario: ${scenario}`);
  return { scenario, status: found[0], reason: found[1], handoff: { schemaVersion: 1, status: found[0], reason: found[1] } };
}
export function validateFaultOutcome(outcome) {
  if (!outcome || typeof outcome !== 'object' || !outcome.handoff || !outcome.reason) return ['missing handoff or reason'];
  if (outcome.status !== 'UNVERIFIED' && !VALID.has(outcome.status)) return ['invalid status'];
  if (outcome.handoff.status !== outcome.status || outcome.handoff.reason !== outcome.reason) return ['handoff contradicts outcome'];
  if (outcome.status === 'PASS') return ['fault injection cannot pass'];
  return [];
}
