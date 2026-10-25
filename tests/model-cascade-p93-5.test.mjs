import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredGeminiCascade, registryForGeminiCascade } from '../server/modelRegistry.ts';

test('Gemini cascade is an explicit allowlist and preserves Render order', () => {
  const env = {
    MODEL_CASCADE_LIGHT: 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.8-flash,groq/model',
    MODEL_CASCADE_STRONG: 'gemini-3.5-flash-lite,gemini-3.1-flash-lite',
  };
  assert.deepEqual(configuredGeminiCascade('LIGHT', env), ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
  assert.deepEqual(registryForGeminiCascade('LIGHT', env).map((x) => x.modelId), ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
  assert.deepEqual(registryForGeminiCascade('STRONG', env).map((x) => x.modelId), ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
});

test('empty or unsupported configured cascade fails closed without historical fallbacks', () => {
  assert.deepEqual(configuredGeminiCascade('LIGHT', { MODEL_CASCADE_LIGHT: 'gemini-3.8-flash,gemini-3.6-flash' }), []);
  assert.deepEqual(registryForGeminiCascade('LIGHT', { MODEL_CASCADE_LIGHT: '' }), []);
});
