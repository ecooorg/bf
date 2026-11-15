import { useCallback, useEffect, useState } from 'react';

type Listing = {
  id: string; status: string; municipality: string; property_name: string; title_ru: string; rooms_estimated: string | number; description_de: string; description_ru: string;
  listing_url: string; photo_urls: string[]; source_urls: string[]; contact_status: string; contact_advice: string; direct_phone: string | null; direct_email: string | null;
  owner_name: string | null; draft_message_de: string;
};
type Run = { started_at: string; finished_at: string | null; trigger: string; dry_run: boolean; counts: Record<string, any>; errors: { code: string; source?: string; detail?: string }[]; est_cost_usd: string; delivery: Record<string, string> } | null;
const STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'REJECTED'];

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Please sign in on the home page first.' : String(body?.error || `Request failed (${r.status})`));
  return body;
}

export default function ImmoFinder() {
  const [items, setItems] = useState<Listing[]>([]);
  const [run, setRun] = useState<Run>(null);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dry, setDry] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([api(`/api/immofinder/listings${filter ? `?status=${filter}` : ''}`), api('/api/immofinder/runs/latest')]);
      setItems(l.listings || []); setRun(r.run || null); setMsg('');
    } catch (e) { setMsg((e as Error).message); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!busy) return; const t = setInterval(() => void load(), 5000); return () => clearInterval(t); }, [busy, load]);
  useEffect(() => { if (busy && run?.finished_at) setBusy(false); }, [busy, run]);

  const start = async () => {
    setBusy(true); setMsg('');
    try { await api('/api/immofinder/run', { method: 'POST', body: JSON.stringify({ dryRun: dry }) }); setMsg('Search started. Results appear here when the run finishes.'); }
    catch (e) { setBusy(false); setMsg((e as Error).message); }
  };
  const setStatus = async (id: string, status: string) => { try { await api(`/api/immofinder/listings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); } catch (e) { setMsg((e as Error).message); } };
  const driveUrl = run?.delivery?.driveUrl;

  return (
    <div className="shell" data-testid="immofinder-root" style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <p><a href="/">← BiForge home</a></p>
      <h1>ImmoFinder GR</h1>
      <p style={{ color: '#8fa6c2' }}>Private owners of holiday flats (3+ rooms) in Graubünden. Drafts are never sent automatically.</p>
      <div className="panel" style={{ padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" data-testid="immofinder-run" onClick={start} disabled={busy}>{busy ? 'Running…' : 'Run search now'}</button>
        <label><input type="checkbox" checked={dry} onChange={(e) => setDry(e.target.checked)} /> Dry run (no AI, nothing saved)</label>
        <label>Status <select data-testid="immofinder-status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        {driveUrl && <a data-testid="immofinder-drive-link" href={driveUrl} target="_blank" rel="noopener noreferrer">Google Drive folder</a>}
      </div>
      {msg && <p role="status" data-testid="immofinder-message">{msg}</p>}
      <div data-testid="immofinder-last-run" style={{ margin: '12px 0', fontSize: 14 }}>
        {run ? <>Last run: {new Date(run.started_at).toLocaleString()} ({run.trigger}{run.dry_run ? ', dry run' : ''}) — {run.finished_at ? 'finished' : 'in progress'}.
          {' '}Fetched {run.counts.fetched ?? 0}, matched {run.counts.kept ?? 0}, new {run.counts.new ?? 0}, est. cost ${run.est_cost_usd}.
          {Object.keys(run.counts.filtered || {}).length > 0 && <> Filtered: {Object.entries(run.counts.filtered).map(([k, v]) => `${k} ${v}`).join(', ')}.</>}
          {run.errors.length > 0 && <> Problems: {run.errors.slice(0, 4).map((e) => `${e.source ? `${e.source}: ` : ''}${e.code}`).join('; ')}.</>}
          {run.delivery?.telegram && <> Telegram: {run.delivery.telegram}.</>}{run.delivery?.drive && <> Drive: {run.delivery.drive}.</>}</> : 'No run yet.'}
      </div>
      {items.length === 0 && !msg && <p>No listings yet. Press “Run search now”.</p>}
      {items.map((l) => (
        <article key={l.id} className="panel" data-testid="immofinder-card" style={{ padding: 16, marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>{l.property_name} <small>· {l.municipality} · {l.rooms_estimated} rooms</small></h2>
          {l.title_ru && <p style={{ color: '#9fd8ff' }}>{l.title_ru}</p>}
          <p>{l.description_de}</p>{l.description_ru && <p style={{ color: '#9fd8ff' }}>{l.description_ru}</p>}
          <p><a href={l.listing_url} target="_blank" rel="noopener noreferrer">Listing</a>{l.source_urls.length > 1 && ` (+${l.source_urls.length - 1} more sources)`}
            {l.photo_urls.slice(0, 3).map((u, i) => <span key={u}> · <a href={u} target="_blank" rel="noopener noreferrer">Photo {i + 1}</a></span>)}</p>
          <p>Contact: {l.contact_status === 'found' ? [l.owner_name, l.direct_phone, l.direct_email].filter(Boolean).join(' · ') : <em>{l.contact_status === 'platform_only' ? 'platform only' : 'not found'}. {l.contact_advice}</em>}</p>
          <details><summary>German draft</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{l.draft_message_de}</pre>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(l.draft_message_de)}>Copy draft</button></details>
          <label>Status <select value={l.status} onChange={(e) => void setStatus(l.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        </article>
      ))}
    </div>
  );
}
