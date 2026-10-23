/** Shared browser API helpers for App and step screens. */
import { errorFromResponse } from './errors.ts';
import { getStoredUiLanguage } from './ui.ts';
import { STAGES, type Step } from './decision.ts';

export async function api(path: string, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const key = localStorage.getItem('bifurcation_gemini_key_v15') || '';
    const model = localStorage.getItem('bifurcation_gemini_model_v15') || '';
    if (key) headers['x-byok-key'] = key;
    if (model) headers['x-model-preference'] = model;
  } catch {}
  const r = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) {
    // Preserve the real provider/server reason. AI failures are handled by runApi
    // as a neutral status message, never by the red global error banner.
    const detail = j?.details?.upstreamMessage ? ` — ${j.details.upstreamMessage}` : '';
    const err = errorFromResponse({ ...j, error: `${j.error || `API error ${r.status}`}${detail}` }, getStoredUiLanguage(), `API error ${r.status}`);
    (err as any).code = j.code;
    (err as any).status = r.status;
    throw err;
  }
  return j;
}

export const stageIndex = (s: Step) => STAGES.findIndex((x) => x.id === s);

export async function sessionStatus(): Promise<{ authenticated: boolean; required: boolean; projectModeEnabled: boolean }> {
  const r = await fetch('/api/session', { credentials: 'same-origin' });
  const j = await r.json();
  return { authenticated: Boolean(j.authenticated), required: Boolean(j.required), projectModeEnabled: Boolean(j.projectModeEnabled) };
}

export async function loginWithPassword(password: string) {
  const r = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(j.error || 'Invalid password');
}

