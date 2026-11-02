import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync(new URL('../src/AppHeader.tsx', import.meta.url), 'utf8');

test('Simple and Expert diagnostic log renders outside the sticky header stacking context', () => {
  assert.match(header, /import\s*\{\s*createPortal\s*\}\s*from\s*'react-dom'/);
  assert.match(header, /diagnosticsOpen\s*&&\s*typeof document !== 'undefined'\s*&&\s*createPortal\(/);
  assert.match(header, /document\.body/);
  assert.match(header, /data-testid="diagnostic-log-dialog"[^>]*style=\{\{[^}]*zIndex:\s*4000/s);
  assert.match(header, /aria-modal="true"/);
  assert.match(header, /height: 'min\(88dvh, 760px\)'/);
  assert.match(header, /data-testid="diagnostic-log-content"/);
});
