import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJs, validateModuleContracts } from '../appBuilder/validator-static-site.ts';

test('ES module syntax is parsed as a module, not rejected as classic script', () => {
  const files = new Map([
    ['index.html', '<!doctype html><html><body><script type="module" src="app.js"></script></body></html>'],
    ['app.js', "import { value } from './data.js'; console.log(value);"],
    ['data.js', 'export const value = 42;'],
  ]);
  assert.equal(validateJs(files).ok, true);
  assert.equal(validateModuleContracts(files).ok, true);
});

test('module contract rejects unresolved paths and missing named exports', () => {
  const files = new Map([
    ['app.js', "import { fetchWeatherData } from './weatherService.js';"],
    ['weatherService.js', 'export async function fetchWeatherFromSources() { return []; }'],
  ]);
  const result = validateModuleContracts(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((x) => x.message.includes("does not export 'fetchWeatherData'")));
});

test('module contract rejects imports with no generated target', () => {
  const files = new Map([['app.js', "import { x } from './missing.js';"]]);
  assert.equal(validateModuleContracts(files).ok, false);
});

test('module file must be loaded with type=module', () => {
  const files = new Map([
    ['index.html', '<!doctype html><html><body><script src="app.js"></script></body></html>'],
    ['app.js', "import { value } from './data.js';"],
    ['data.js', 'export const value = 1;'],
  ]);
  const result = validateModuleContracts(files);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((x) => x.message.includes('type="module"')));
});
