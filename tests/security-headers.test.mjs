import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { securityHeadersMiddleware } from '../server/securityHeaders.ts';

function runMiddleware(production) {
  const headers = new Map();
  let continued = false;
  const res = { setHeader(name, value) { headers.set(name.toLowerCase(), value); } };
  securityHeadersMiddleware(production)({}, res, () => { continued = true; });
  return { headers, continued };
}

test('baseline browser security headers are applied on every response', () => {
  const { headers, continued } = runMiddleware(false);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), geolocation=()');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(continued, true);
  assert.equal(headers.has('strict-transport-security'), false);
});

test('HSTS is emitted only in production', () => {
  const { headers } = runMiddleware(true);
  assert.equal(headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
});

test('the global middleware and X-Powered-By disable precede route registration', () => {
  const source = fs.readFileSync('server.ts', 'utf8');
  const disableAt = source.indexOf("app.disable('x-powered-by')");
  const middlewareAt = source.indexOf('app.use(securityHeadersMiddleware(');
  const routeAt = source.search(/register(?:Health|Auth|Project|Ops|Compatibility)Routes\(/);
  assert.ok(disableAt >= 0 && middlewareAt > disableAt, 'security headers and X-Powered-By policy must be registered');
  assert.ok(routeAt > middlewareAt, 'security middleware must be registered before API routes');
});
