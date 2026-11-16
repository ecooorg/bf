import { useCallback, useEffect, useState } from 'react';

type S = {
  schedule: { mode: 'manual' | 'hours' | 'daily'; everyHours: number; dailyAt: string };
  delivery: { telegram: boolean; email: boolean; emailTo: string; emailContent: 'new' | 'all'; drive: boolean; driveFolderId: string; notifyWhenEmpty: boolean };
  search: { minRooms: number; communes: string[]; sources: Record<string, boolean>; maxAiPages: number };
};
type Channels = { telegram: boolean; email: boolean; drive: boolean; driveAccount?: string };
const SOURCES: [string, string][] = [['happyholiday', 'HappyHoliday.ch'], ['ferienhausmiete', 'Ferienhausmiete.de'], ['graubuenden', 'Graubünden.ch'], ['search', 'Web search by commune (any site, Facebook/Airbnb via search snippets)']];
const box: React.CSSProperties = { border: '1px solid #243a57', borderRadius: 12, padding: 12, marginBottom: 12 };
const chip = (on: boolean): React.CSSProperties => ({ display: 'inline-block', padding: '3px 10px', margin: '0 6px 6px 0', borderRadius: 999, border: '1px solid #2d8cff', background: on ? '#2d8cff' : 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' });

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(body?.error || `Request failed (${r.status})`));
  return body;
}

export function summarize(s: S | null): string {
  if (!s) return 'loading…';
  const sch = s.schedule.mode === 'manual' ? 'manual only' : s.schedule.mode === 'hours' ? `every ${s.schedule.everyHours} h` : `daily at ${s.schedule.dailyAt}`;
  const to = [s.delivery.telegram && 'Telegram', s.delivery.email && 'email', s.delivery.drive && 'Drive'].filter(Boolean).join(', ') || 'nowhere';
  return `Automatic search: ${sch} · Send to: ${to}`;
}

export default function ImmoFinderSettings({ onChanged }: { onChanged?: (s: S) => void }) {
  const [s, setS] = useState<S | null>(null);
  const [channels, setChannels] = useState<Channels>({ telegram: false, email: false, drive: false, driveAccount: '' });
  const [communes, setCommunes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api('/api/immofinder/settings'); setS(r.settings); setChannels(r.channels); setCommunes(r.communes || []); onChanged?.(r.settings); } catch (e) { setNote((e as Error).message); }
  }, [onChanged]);
  useEffect(() => { void load(); }, [load]);

  const upd = (fn: (x: S) => S) => { setS((p) => (p ? fn(p) : p)); setDirty(true); setNote(''); };
  const save = async () => {
    if (!s) return;
    try { const r = await api('/api/immofinder/settings', { method: 'PUT', body: JSON.stringify(s) }); setS(r.settings); setChannels(r.channels); setDirty(false); setNote('Saved. Changes apply to the next search.'); onChanged?.(r.settings); }
    catch (e) { setNote((e as Error).message); }
  };
  const test = async (channel: 'telegram' | 'email' | 'drive') => {
    setNote('Sending test…');
    try { if (dirty) await save(); const r = await api('/api/immofinder/settings/test', { method: 'POST', body: JSON.stringify({ channel }) }); setNote(`Test ${channel}: ${r.result}`); } catch (e) { setNote((e as Error).message); }
  };
  if (!s) return <p>{note || 'Loading settings…'}</p>;
  const toggleCommune = (m: string) => upd((x) => ({ ...x, search: { ...x.search, communes: x.search.communes.includes(m) ? x.search.communes.filter((c) => c !== m) : [...x.search.communes, m] } }));
  const ready = (ok: boolean, name: string) => (ok ? <small style={{ color: '#7fd99a' }}> ready</small> : <small style={{ color: '#ffd28a' }}> not set up on the server ({name})</small>);

  return (
    <div data-testid="immofinder-settings">
      <div style={box}>
        <strong>1 · Automatic search</strong>
        {([['manual', 'Only when I press “New search”'], ['hours', 'On a schedule'], ['daily', 'Once a day']] as const).map(([v, label]) => (
          <label key={v} style={{ display: 'block', margin: '6px 0' }}><input type="radio" name="immo-mode" checked={s.schedule.mode === v} onChange={() => upd((x) => ({ ...x, schedule: { ...x.schedule, mode: v } }))} /> {label}</label>
        ))}
        {s.schedule.mode === 'hours' && <label style={{ display: 'block', marginLeft: 22 }}>Every <select value={s.schedule.everyHours} onChange={(e) => upd((x) => ({ ...x, schedule: { ...x.schedule, everyHours: Number(e.target.value) } }))}>{[3, 6, 12].map((h) => <option key={h} value={h}>{h} hours</option>)}</select></label>}
        {s.schedule.mode === 'daily' && <label style={{ display: 'block', marginLeft: 22 }}>At <input type="time" value={s.schedule.dailyAt} onChange={(e) => upd((x) => ({ ...x, schedule: { ...x.schedule, dailyAt: e.target.value } }))} /> Swiss time</label>}
        {s.schedule.mode !== 'manual' && <p style={{ fontSize: 12, color: '#8fa6c2', margin: '6px 0 0' }}>The server checks once an hour, so a search starts within about an hour of the chosen time.</p>}
      </div>

      <div style={box}>
        <strong>2 · Send new results to</strong>
        <label style={{ display: 'block', margin: '6px 0' }}><input type="checkbox" checked={s.delivery.telegram} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, telegram: e.target.checked } }))} /> Telegram{ready(channels.telegram, 'TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID')} {s.delivery.telegram && <button type="button" onClick={() => void test('telegram')}>Send test</button>}</label>
        <label style={{ display: 'block', margin: '6px 0' }}><input type="checkbox" checked={s.delivery.email} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, email: e.target.checked } }))} /> Email{ready(channels.email, 'RESEND_API_KEY')}</label>
        {s.delivery.email && <div style={{ marginLeft: 22 }}><input type="email" placeholder="you@example.com" value={s.delivery.emailTo} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, emailTo: e.target.value } }))} /> <button type="button" onClick={() => void test('email')}>Send test</button>
          <div data-testid="immofinder-email-content" style={{ marginTop: 6 }}>
            <label style={{ display: 'block' }}><input type="radio" name="immo-email-content" checked={s.delivery.emailContent !== 'all'} onChange={() => upd((x) => ({ ...x, delivery: { ...x.delivery, emailContent: 'new' } }))} /> Only new results of this search</label>
            <label style={{ display: 'block' }}><input type="radio" name="immo-email-content" checked={s.delivery.emailContent === 'all'} onChange={() => upd((x) => ({ ...x, delivery: { ...x.delivery, emailContent: 'all' } }))} /> All results found so far (newest first)</label>
          </div></div>}
        <label style={{ display: 'block', margin: '6px 0' }}><input type="checkbox" checked={s.delivery.drive} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, drive: e.target.checked } }))} /> Google Drive (Sheet and Doc with all listings){ready(channels.drive, 'GOOGLE_SERVICE_ACCOUNT_JSON')}</label>
        {s.delivery.drive && (
          <div style={{ marginLeft: 22, fontSize: 14 }}>
            <label>Drive folder (link or ID) <input type="text" style={{ width: '100%' }} placeholder="default from server configuration" value={s.delivery.driveFolderId} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, driveFolderId: e.target.value } }))} /></label>
            <button type="button" onClick={() => void test('drive')}>Check Drive</button>
            <details style={{ marginTop: 6 }}><summary>One-time Drive setup</summary>
              <ol style={{ paddingLeft: 18 }}>
                <li>Share the folder with {channels.driveAccount ? <code>{channels.driveAccount}</code> : 'the service account'} as Editor.</li>
                <li>In the folder create a Google Sheet “ImmoFinder listings”.</li>
                <li>In the same folder create a Google Doc “ImmoFinder drafts”.</li>
                <li>In Google Cloud enable the Google Sheets API and the Google Docs API for the project.</li>
                <li>Press “Check Drive”. Each search then refreshes the Sheet and the Doc.</li>
              </ol>
            </details>
          </div>
        )}
        <label style={{ display: 'block', margin: '6px 0' }}><input type="checkbox" checked={s.delivery.notifyWhenEmpty} onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, notifyWhenEmpty: e.target.checked } }))} /> Also message me when nothing new was found</label>
      </div>

      <div style={box}>
        <strong>3 · What to search</strong>
        <label style={{ display: 'block', margin: '6px 0' }}>Minimum rooms <select value={s.search.minRooms} onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, minRooms: Number(e.target.value) } }))}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <div style={{ margin: '6px 0' }}>Sources:</div>
        {SOURCES.map(([id, label]) => <label key={id} style={{ display: 'block', margin: '2px 0 2px 12px' }}><input type="checkbox" checked={s.search.sources[id] !== false} onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, sources: { ...x.search.sources, [id]: e.target.checked } } }))} /> {label}</label>)}
        <details style={{ marginTop: 8 }}>
          <summary>Communes ({s.search.communes.length} of {communes.length} selected)</summary>
          <p style={{ margin: '6px 0' }}><button type="button" onClick={() => upd((x) => ({ ...x, search: { ...x.search, communes: [...communes] } }))}>All</button> <button type="button" onClick={() => upd((x) => ({ ...x, search: { ...x.search, communes: [] } }))}>None</button></p>
          <div>{communes.map((m) => <span key={m} role="checkbox" aria-checked={s.search.communes.includes(m)} tabIndex={0} style={chip(s.search.communes.includes(m))} onClick={() => toggleCommune(m)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCommune(m); }}>{m}</span>)}</div>
        </details>
      </div>

      <div style={box}>
        <strong>4 · Cost guard</strong>
        <label style={{ display: 'block', margin: '6px 0' }}>Analyse at most <select value={s.search.maxAiPages} onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, maxAiPages: Number(e.target.value) } }))}>{[20, 40, 60, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select> pages with AI per search (about $0.002 each; the rest is checked with simple rules)</label>
      </div>

      <button type="button" data-testid="immofinder-settings-save" onClick={save} disabled={!dirty} className="immo-btn" style={{ padding: '10px 18px', fontSize: 16 }}>{dirty ? 'Save settings' : 'Saved'}</button>
      {note && <p role="status" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  );
}
