import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { contentDisposition } from '../server/projectDiagnostics.ts';
import { preflight } from '../scripts/patch-tools.mjs';

test('Cyrillic filename gives ASCII-safe header Node accepts', async () => {
  const h = contentDisposition('Тетрис игра.zip');
  assert.match(h, /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
  assert.ok(h.includes('%D0%A2'));
  const srv = http.createServer((q, r) => { r.setHeader('Content-Disposition', h); r.end('ok'); });
  await new Promise((r) => srv.listen(0, r));
  const res = await fetch(`http://127.0.0.1:${srv.address().port}/`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-disposition'), h);
  srv.close();
});

test('control chars, quotes and empty names are neutralised', () => {
  for (const n of ['a"b\r\nX: y.zip', '', '\u0000', '../x.zip']) {
    const h = contentDisposition(n);
    assert.ok(!/[\r\n\u0000]/.test(h));
    assert.match(h, /filename="[\x20-\x7e]+"/);
  }
});

test('preflight allows flat appBuilder files, rejects appBuilder subfolders', () => {
  const ok = preflight({ files: new Map([['appBuilder/core-types.ts', Buffer.from('x')]]) });
  assert.ok(!ok.some((v) => /appBuilder/.test(v)), JSON.stringify(ok));
  const bad = preflight({ files: new Map([['appBuilder/x/y.ts', Buffer.from('x')]]) });
  assert.ok(bad.length > 0);
});
