import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadAllLogs } from './allLogs.ts';
import ImmoFinderSettings, { summarize } from './ImmoFinderSettings.tsx';
import { ModeMenu } from './ModeMenu.tsx';
import { CommitBadge } from './CommitBadge.tsx';
import { MoreHorizontal, Plus } from 'lucide-react';

type Listing = {
  first_seen_at: string; id: string; status: string; municipality: string; property_name: string; title_ru: string; rooms_estimated: string | number; description_de: string; description_ru: string;
  listing_url: string; photo_urls: string[]; source_urls: string[]; source_ids: string[]; private_signals: string[]; contact_status: string; contact_advice: string;
  direct_phone: string | null; direct_email: string | null; owner_name: string | null; draft_message_de: string;
};
type Preview = { url: string; title: string; source: string; municipality: string | null; rooms: number | null; kept: boolean; reason?: string; detail?: string };
type Progress = { stage?: string; text?: string; current?: number; total?: number; counts?: Record<string, number>; log?: { t: number; text: string }[] };
type Run = {
  sources?: Preview[]; progress?: Progress; started_at: string; finished_at: string | null; trigger: string; dry_run: boolean; counts: Record<string, any>;
  errors: { code: string; source?: string; detail?: string }[]; est_cost_usd: string; delivery: Record<string, string>;
} | null;
const STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'REJECTED'];
const STAGES: Record<string, string> = { catalogue: 'Step 1 of 3 · Checking rental catalogues', search: 'Step 2 of 3 · Searching the web by commune', delivery: 'Step 3 of 3 · Saving and notifying', done: 'Finished' };
const REASONS: Record<string, string> = {
  not_single_listing: 'not a single property page', agency: 'agency or manager', municipality_not_whitelisted: 'outside the target communes', rooms_unknown: 'room count not stated',
  rooms_below_min: 'fewer than 3 rooms', registration_forbidden: 'permanent registration not allowed',
};
const SOURCE_LABEL: Record<string, string> = { happyholiday: 'HappyHoliday', ferienhausmiete: 'Ferienhausmiete', graubuenden: 'Graubünden.ch', search: 'Web search' };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Please sign in on the home page first.' : String(body?.error || `Request failed (${r.status})`));
  return body;
}
const fmtFound = (iso: string) => (iso ? new Date(iso).toLocaleString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
const card: React.CSSProperties = { border: '1px solid #243a57', borderRadius: 14, background: '#0b1626', padding: 16, marginBottom: 14 };
const chip: React.CSSProperties = { display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: '#13263f', color: '#cfe6ff', fontSize: 13, marginRight: 6, marginBottom: 4 };

export default function ImmoFinder() {
  const [items, setItems] = useState<Listing[]>([]);
  const [run, setRun] = useState<Run>(null);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [starting, setStarting] = useState(false);
  const [dry, setDry] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [summary, setSummary] = useState('loading…');
  const onSettings = useCallback((s: any) => setSummary(summarize(s)), []);

  const running = Boolean(run && !run.finished_at && Date.now() - new Date(run.started_at).getTime() < 30 * 60 * 1000);

  const loadList = useCallback(async () => {
    try { const l = await api(`/api/immofinder/listings${filter ? `?status=${filter}` : ''}`); setItems(l.listings || []); setMsg(''); } catch (e) { setMsg((e as Error).message); }
  }, [filter]);
  const loadRun = useCallback(async () => {
    try { const r = await api('/api/immofinder/runs/latest'); setRun(r.run || null); } catch (e) { setMsg((e as Error).message); }
  }, []);
  const load = useCallback(async () => { await Promise.all([loadList(), loadRun()]); }, [loadList, loadRun]);
  const wasRunning = useRef(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => { void load(); }, [load]);
  // While a search runs only the small status call is polled; the list reloads once when the run ends.
  useEffect(() => { if (!running && !starting) return; const t = setInterval(() => { setTick(Date.now()); void loadRun(); }, 2500); return () => clearInterval(t); }, [running, starting, loadRun]);
  useEffect(() => { if (wasRunning.current && !running) void loadList(); wasRunning.current = running; }, [running, loadList]);
  useEffect(() => {
    if (!moreOpen) return; const h = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [moreOpen]);
  useEffect(() => { if (starting && running) setStarting(false); }, [starting, running]);

  const start = async () => {
    setStarting(true); setMsg('');
    try { await api('/api/immofinder/run', { method: 'POST', body: JSON.stringify({ dryRun: dry }) }); await load(); }
    catch (e) { setStarting(false); setMsg((e as Error).message); }
  };
  const setStatus = async (id: string, status: string) => { try { await api(`/api/immofinder/listings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); } catch (e) { setMsg((e as Error).message); } };

  const pr = run?.progress || {};
  const c = (running ? pr.counts : run?.counts) || {};
  const elapsed = run ? ((run.finished_at ? new Date(run.finished_at).getTime() : tick) - new Date(run.started_at).getTime()) / 1000 : 0;
  const pct = pr.total ? Math.min(100, Math.round(((pr.current || 0) / pr.total) * 100)) : null;
  const busy = running || starting;
  const driveUrl = run?.delivery?.driveUrl;
  const filtered = Object.entries((run?.counts?.filtered as Record<string, number>) || {});

  const goHome = (mode?: string) => {
    try { if (mode) sessionStorage.setItem('biforge-start-mode', mode); else sessionStorage.removeItem('biforge-start-mode'); } catch { /* ignore */ }
    window.location.href = '/';
  };

  return (
    <>
    <header className="header project-app-header" style={{ justifyContent: 'flex-end' }} data-testid="immofinder-header">
      <div className="header-actions has-mode">
        <CommitBadge />
        <ModeMenu current="Simple" currentLabel="ImmoFinder" projectEnabled onSelect={(m) => goHome(m)} onOverview={() => goHome()} />
        <button type="button" className="ghost" data-testid="immofinder-header-new" title="Start a new search" aria-label="New search" disabled={busy} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); void start(); }}><Plus size={14} /> <span className="lbl">New search</span></button>
        <div className="hdr-more-wrap" ref={moreRef}>
          <button type="button" className="ghost hdr-more-btn" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)} title="Program logs"><MoreHorizontal size={14} /> <span className="lbl">More</span></button>
          {moreOpen && (
            <div className="hdr-secondary open" role="menu">
              <button type="button" className="ghost" role="menuitem" data-testid="all-logs-menu-item" onClick={() => { setMoreOpen(false); void downloadAllLogs().catch((e) => window.alert(String(e?.message || e))); }}>All Logs</button>
            </div>
          )}
        </div>
      </div>
    </header>
    <div className="shell" data-testid="immofinder-root" style={{ padding: 16, maxWidth: 920, margin: '0 auto' }}>
      <style>{'@keyframes immospin{to{transform:rotate(360deg)}} .immo-btn{background:#1457b8!important;color:#fff!important;border:1px solid #7db8ff!important;font-weight:700;border-radius:10px;text-decoration:none;display:inline-block;cursor:pointer} .immo-btn:disabled{background:#2a4766!important;color:#f2f7ff!important;border-color:#5a7ea6!important;opacity:1} .immo-btn.small{padding:4px 12px;font-size:13px;margin-right:6px}'}</style>
      <h1 style={{ margin: '0 0 4px' }}>ImmoFinder GR</h1>
      <p style={{ color: '#8fa6c2', marginTop: 0 }}>Finds private owners of holiday flats (3+ rooms) in Graubünden and prepares a long-term lease letter. Letters are never sent automatically.</p>

      <section style={card}>
        <button type="button" data-testid="immofinder-run" onClick={start} disabled={busy}
          className="immo-btn" style={{ width: '100%', padding: '16px 12px', fontSize: 20, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Search is running…' : '🔍 New search'}
        </button>
        <label style={{ display: 'block', marginTop: 10, fontSize: 14, color: '#9fb4cf' }}>
          <input type="checkbox" checked={dry} onChange={(e) => setDry(e.target.checked)} disabled={busy} /> Test run: quick check without AI, nothing is saved
        </label>
        {!busy && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8fa6c2' }}>A full search takes about 5–10 minutes. You can leave this page open and watch the progress, or come back later.</p>}
      </section>

      <details style={card}>
        <summary style={{ cursor: 'pointer' }}><strong>⚙ Settings</strong> <span style={{ color: '#8fa6c2', fontSize: 13 }}>{summary}</span></summary>
        <div style={{ marginTop: 12 }}><ImmoFinderSettings onChanged={onSettings} /></div>
      </details>

      {msg && <p role="status" data-testid="immofinder-message" style={{ color: '#ffd28a' }}>{msg}</p>}

      {busy && (
        <section style={{ ...card, borderColor: '#2d8cff' }} data-testid="immofinder-live" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 18, border: '3px solid #2d8cff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'immospin 0.9s linear infinite' }} />
            <strong>{STAGES[pr.stage || 'catalogue'] || 'Working'}</strong>
            <span style={{ marginLeft: 'auto', color: '#8fa6c2' }}>{run ? fmtDur(elapsed) : '0:00'}</span>
          </div>
          <p style={{ margin: '10px 0 6px', wordBreak: 'break-word' }}>{pr.text || 'Starting…'}</p>
          <div style={{ height: 8, background: '#13263f', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct === null ? '35%' : `${pct}%`, background: '#2d8cff', transition: 'width .4s', opacity: pct === null ? 0.5 : 1 }} />
          </div>
          {pr.total ? <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8fa6c2' }}>{pr.current ?? 0} of {pr.total} in this step</p> : null}
          <div style={{ marginTop: 10 }}>
            <span style={chip}>Pages read: {c.fetched ?? 0}</span><span style={chip}>From snippets: {c.snippet_only ?? 0}</span><span style={chip}>Already checked: {(c.skipped_known ?? 0) + (c.skipped_seen ?? 0)}</span>
            <span style={chip}>Searches: {c.search_queries ?? 0}</span><span style={chip}>Matches: {c.kept ?? 0}</span><span style={chip}>New: {c.new ?? 0}</span>
          </div>
          {pr.log && pr.log.length > 0 && (
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: 13, color: '#b9cce6', maxHeight: 220, overflow: 'auto' }}>
              {pr.log.slice().reverse().map((l, i) => <li key={`${l.t}-${i}`} style={{ opacity: i === 0 ? 1 : 0.75, padding: '1px 0', wordBreak: 'break-word' }}>{l.text}</li>)}
            </ul>
          )}
        </section>
      )}

      {!busy && (
        <section style={card} data-testid="immofinder-last-run">
          <strong>Last search</strong>
          {run ? (
            <>
              <p style={{ margin: '6px 0' }}>{new Date(run.started_at).toLocaleString()} · took {fmtDur(elapsed)}{run.dry_run ? ' · test run' : ''}{run.trigger === 'schedule' ? ' · automatic' : ''}</p>
              <p style={{ margin: '6px 0' }}>
                {run.dry_run ? `Test run matched ${run.counts.kept ?? 0} pages (nothing saved).` : `Found ${run.counts.new ?? 0} new and updated ${run.counts.updated ?? 0} listings.`}{' '}
                Checked {run.counts.fetched ?? 0} pages{run.counts.snippet_only ? ` and ${run.counts.snippet_only} search snippets` : ''}; {(run.counts.skipped_known ?? 0) + (run.counts.skipped_seen ?? 0)} were skipped as already checked. Estimated cost ${run.est_cost_usd}.
              </p>
              {filtered.length > 0 && <p style={{ margin: '6px 0', fontSize: 14 }}>Rejected: {filtered.map(([k, v]) => `${v} ${REASONS[k] || k}`).join(' · ')}.</p>}
              {run.errors.length > 0 && <p style={{ margin: '6px 0', fontSize: 14, color: '#ffd28a' }}>Problems: {run.errors.slice(0, 4).map((e) => `${e.source ? `${SOURCE_LABEL[e.source] || e.source}: ` : ''}${e.code.replace(/_/g, ' ')}${e.detail ? ` (${e.detail})` : ''}`).join('; ')}.</p>}
              <p style={{ margin: '6px 0', fontSize: 14 }}>
                {run.delivery?.telegram && run.delivery.telegram !== 'off' && <>Telegram: {run.delivery.telegram}. </>}{run.delivery?.email && run.delivery.email !== 'off' && <>Email: {run.delivery.email}. </>}{run.delivery?.drive && run.delivery.drive !== 'off' && <>Drive: {run.delivery.drive}. </>}
                {driveUrl && <a data-testid="immofinder-drive-link" href={driveUrl} target="_blank" rel="noopener noreferrer">Open Google Drive folder</a>}
              </p>
              {run.sources && run.sources.length > 0 && (
                <details data-testid="immofinder-run-details">
                  <summary>What was examined ({run.sources.length} pages)</summary>
                  <ul style={{ fontSize: 13, paddingLeft: 18 }}>{run.sources.map((p) => (
                    <li key={p.url}>{p.kept ? '✅' : '✖'} <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title || p.url}</a> — {SOURCE_LABEL[p.source] || p.source}{p.municipality ? `, ${p.municipality}` : ''}{p.rooms ? `, ${p.rooms} rooms` : ''}{p.reason ? ` — ${REASONS[p.reason] || p.reason}` : ''}{p.detail ? ` (${p.detail})` : ''}</li>
                  ))}</ul>
                </details>
              )}
            </>
          ) : <p style={{ margin: '6px 0' }}>No search yet. Press “New search” to start the first one.</p>}
        </section>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
        <h2 style={{ margin: 0 }}>Listings ({items.length})</h2>
        <label style={{ marginLeft: 'auto', fontSize: 14 }}>Show <select data-testid="immofinder-status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">all</option>{STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select></label>
      </div>
      {items.length === 0 && !msg && <p style={{ color: '#8fa6c2' }}>Nothing here yet. Matching listings appear in this list after a search.</p>}
      {items.map((l) => (
        <article key={l.id} style={card} data-testid="immofinder-card">
          <h3 style={{ margin: '0 0 6px' }}>{l.property_name}</h3>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#8fa6c2' }} data-testid="immofinder-found-at">Found: {fmtFound(l.first_seen_at)}</p>
          <div><span style={chip}>📍 {l.municipality}</span><span style={chip}>🚪 {l.rooms_estimated} rooms</span>{l.source_ids.map((s) => <span key={s} style={chip}>{SOURCE_LABEL[s] || s}</span>)}
            {l.private_signals.includes('platform_says_private') && <span style={chip}>listed as private</span>}{l.private_signals.includes('snippet_only') && <span style={chip}>from search snippet</span>}{l.private_signals.includes('generic_link') && <span style={chip}>link opens a search or group page</span>}</div>
          {l.title_ru && <p style={{ color: '#9fd8ff', margin: '8px 0 2px' }}>{l.title_ru}</p>}
          {l.description_ru && <p style={{ color: '#9fd8ff', margin: '2px 0' }}>{l.description_ru}</p>}
          {l.description_de && <p style={{ margin: '4px 0', fontSize: 14, color: '#b9cce6' }}>{l.description_de}</p>}
          <p style={{ margin: '8px 0' }}>
            <strong>Contact: </strong>{l.contact_status === 'found' ? [l.owner_name, l.direct_phone, l.direct_email].filter(Boolean).join(' · ') : <em>no direct contact found yet. {l.contact_advice}</em>}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="immo-btn small">Open listing</a>
            {l.photo_urls.slice(0, 3).map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ ...chip, textDecoration: 'none' }}>Photo {i + 1}</a>)}
            <button type="button" onClick={() => void navigator.clipboard?.writeText(l.draft_message_de)}>Copy German letter</button>
            <label style={{ marginLeft: 'auto', fontSize: 14 }}>Status <select value={l.status} onChange={(e) => void setStatus(l.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <details style={{ marginTop: 8 }}><summary>Read the German letter</summary><pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{l.draft_message_de}</pre></details>
        </article>
      ))}
    </div>
    </>
  );
}
