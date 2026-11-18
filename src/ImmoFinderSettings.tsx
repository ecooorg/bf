import { useCallback, useEffect, useState } from 'react';

type S = {
  schedule: { mode: 'manual' | 'hours' | 'daily'; everyHours: number; dailyAt: string };
  delivery: {
    telegram: boolean; email: boolean; emailTo: string; emailContent: 'new' | 'all';
    drive: boolean; driveFolderId: string; notifyWhenEmpty: boolean;
  };
  search: {
    minRooms: number;
    communes: string[];
    municipalityGroups: { group1: boolean; group2: boolean };
    sources: Record<string, boolean>;
    maxAiPages: number;
    limitPrice: boolean;
    maxMonthlyRentChf: number;
    maxListingAgeDays: number;
    requirePrice: boolean;
    rejectNonMonthly: boolean;
    rejectSeekerPosts: boolean;
    requireContact: boolean;
    defaultWave: 'priority' | 'full';
    profile: 'carousel' | 'burst';
    carouselCommunesPerRun: number;
  };
};
type Channels = { telegram: boolean; email: boolean; drive: boolean; driveAccount?: string };

/** High-value first; labels match Stage-1 productivity for private long-term leads. */
/** High-value first. Only private long-term leads with a stated price. */
const SOURCE_ROWS: { id: string; label: string; hint: string; priority: boolean }[] = [
  { id: 'search', label: 'Web search (Facebook & private)', hint: 'Facebook groups, Nachmieter, direct owner ads via Google', priority: true },
  { id: 'portal-immoscout24', label: 'ImmoScout24', hint: 'site:immoscout24.ch', priority: true },
  { id: 'portal-homegate', label: 'Homegate', hint: 'site:homegate.ch', priority: true },
  { id: 'portal-newhome', label: 'Newhome', hint: 'site:newhome.ch', priority: true },
  { id: 'portal-flatfox', label: 'Flatfox', hint: 'site:flatfox.ch', priority: true },
  { id: 'portal-tutti', label: 'Tutti', hint: 'site:tutti.ch', priority: true },
  { id: 'portal-anibis', label: 'Anibis', hint: 'site:anibis.ch', priority: true },
  { id: 'portal-petitesannonces', label: 'Petites Annonces', hint: 'site:petitesannonces.ch', priority: true },
  { id: 'portal-immobilier', label: 'Immobilier.ch', hint: 'site:immobilier.ch', priority: true },
  { id: 'portal-acheter-louer', label: 'Acheter-Louer', hint: 'site:acheter-louer.ch', priority: true },
  { id: 'portal-immostreet', label: 'ImmoStreet', hint: 'site:immostreet.ch', priority: true },
  { id: 'portal-home', label: 'Home.ch', hint: 'site:home.ch', priority: true },
  { id: 'portal-icasa', label: 'ICasa', hint: 'site:icasa.ch', priority: true },
  { id: 'portal-urbanhome', label: 'UrbanHome', hint: 'site:urbanhome.ch', priority: true },
];


/** Fixed 22+22 groups — keep chips in sync with group checkboxes. */
const GROUP1_COMMUNES = ["Chur", "Haldenstein", "Trimmis", "Untervaz", "Zizers", "Igis", "Landquart", "Felsberg", "Domat/Ems", "Tamins", "Trin", "Flims", "Bonaduz", "Rhäzüns", "Cazis", "Thusis", "Maladers", "Churwalden", "Passugg", "Araschgen", "Praden", "Tschiertschen"];
const GROUP2_COMMUNES = ["Maienfeld", "Fläsch", "Jenins", "Malans", "Grüsch", "Seewis-Pardisla", "Schiers", "Laax", "Versam", "Valendas", "Castrisch", "Ilanz", "Rothenbrunnen", "Rodels", "Realta", "Parpan", "Valbella", "Lenzerheide", "Castiel", "Lüen", "St. Peter-Molinis", "Peist"];
function communesForGroups(g: { group1?: boolean; group2?: boolean }, all: string[]): string[] {
  const g1on = g?.group1 !== false;
  const g2on = g?.group2 !== false;
  const set = new Set<string>();
  if (g1on) GROUP1_COMMUNES.forEach((m) => set.add(m));
  if (g2on) GROUP2_COMMUNES.forEach((m) => set.add(m));
  // Preserve order from full list
  return all.filter((m) => set.has(m));
}

const box: React.CSSProperties = { border: '1px solid #243a57', borderRadius: 12, padding: 12, marginBottom: 12 };
const chip = (on: boolean): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', margin: '0 6px 6px 0', borderRadius: 999,
  border: '1px solid #2d8cff', background: on ? '#2d8cff' : 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer',
});
const hint: React.CSSProperties = { fontSize: 12, color: '#8fa6c2', margin: '4px 0 0' };
const labelBlock: React.CSSProperties = { display: 'block', margin: '6px 0' };

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(body?.error || `Request failed (${r.status})`));
  return body;
}


/** One-line summary for the Settings header on the main screen. */
export function summarize(s: S): string {
  if (!s) return '';
  const sched =
    s.schedule.mode === 'manual' ? 'manual only'
    : s.schedule.mode === 'hours' ? `every ${s.schedule.everyHours}h`
    : `daily ${s.schedule.dailyAt}`;
  const send = [
    s.delivery.telegram ? 'Telegram' : null,
    s.delivery.email ? 'email' : null,
    s.delivery.drive ? 'Drive' : null,
  ].filter(Boolean).join(', ') || 'no delivery';
  const price = s.search.limitPrice ? `max CHF ${s.search.maxMonthlyRentChf}` : 'no price cap';
  const n = s.search.communes?.length ?? 0;
  const prof = s.search.profile === 'burst' ? 'burst' : 'carousel';
  return `${prof} · ${sched} · ${send} · ${s.search.minRooms}+ rooms · ${n} communes · ${price}`;
}

export function ImmoFinderSettings({ onChanged }: { onChanged?: (s: S) => void }) {
  const [s, setS] = useState<S | null>(null);
  const [channels, setChannels] = useState<Channels>({ telegram: false, email: false, drive: false });
  const [communes, setCommunes] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCommunes, setShowCommunes] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api('/api/immofinder/settings');
      setS(r.settings);
      setChannels(r.channels);
      setCommunes(r.communes || []);
      onChanged?.(r.settings);
    } catch (e) {
      setNote((e as Error).message);
    }
  }, [onChanged]);

  useEffect(() => { void load(); }, [load]);

  const upd = (fn: (x: S) => S) => {
    setS((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!s) return;
    try {
      const r = await api('/api/immofinder/settings', { method: 'PUT', body: JSON.stringify(s) });
      setS(r.settings);
      setChannels(r.channels);
      setDirty(false);
      setNote('Saved. Changes apply to the next search.');
      onChanged?.(r.settings);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  const test = async (channel: string) => {
    try {
      if (dirty) await save();
      const r = await api('/api/immofinder/settings/test', { method: 'POST', body: JSON.stringify({ channel }) });
      setNote(`Test ${channel}: ${r.result}`);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  const checkDrive = async () => {
    try {
      if (dirty) await save();
      const r = await api('/api/immofinder/settings/test', { method: 'POST', body: JSON.stringify({ channel: 'drive' }) });
      setNote(`Drive: ${r.result}`);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  if (!s) return <p>{note || 'Loading settings…'}</p>;

  const ready = (ok: boolean, need: string) => (
    <span style={{ marginLeft: 8, fontSize: 12, color: ok ? '#7dffa0' : '#ffb4b4' }}>{ok ? 'ready' : `needs ${need}`}</span>
  );

  const selectedCommunes = s.search.communes?.length ?? 0;
  const allCommunes = communes.length;

  return (
    <div data-testid="immofinder-settings">
      {/* 1 · Where & size */}
      <div style={box}>
        <strong>1 · Where and size</strong>
        <p style={hint}>Communes and min rooms. Leave price unlimited unless you need a hard cap.</p>
        <label style={labelBlock}>
          Minimum rooms{' '}
          <select
            value={s.search.minRooms}
            onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, minRooms: Number(e.target.value) } }))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </label>

        <label style={labelBlock}>
          <input
            type="checkbox"
            checked={!!s.search.limitPrice}
            onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, limitPrice: e.target.checked } }))}
            data-testid="immofinder-limit-price"
          />{' '}
          Limit maximum monthly rent
        </label>
        {s.search.limitPrice && (
          <label style={{ ...labelBlock, marginLeft: 22 }}>
            Max monthly rent (CHF){' '}
            <input
              type="number"
              min={200}
              max={10000}
              step={50}
              value={s.search.maxMonthlyRentChf ?? 3000}
              onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, maxMonthlyRentChf: Number(e.target.value) } }))}
              style={{ width: 100 }}
            />
          </label>
        )}
        {!s.search.limitPrice && (
          <p style={{ ...hint, marginLeft: 22 }}>No price cap — better recall for private long-term offers.</p>
        )}

        <div style={{ margin: '10px 0 8px' }}>
          <strong>Municipality groups</strong>
          <p style={hint}>Only checked groups take part in Carousel and Full search.</p>
          <label style={labelBlock}>
            <input
              type="checkbox"
              checked={s.search.municipalityGroups?.group1 !== false}
              onChange={(e) =>
                upd((x) => {
                  const municipalityGroups = {
                    group1: e.target.checked,
                    group2: x.search.municipalityGroups?.group2 !== false,
                  };
                  const base = communes.length ? communes : x.search.communes;
                  return {
                    ...x,
                    search: {
                      ...x.search,
                      municipalityGroups,
                      communes: communesForGroups(municipalityGroups, base.length ? base : [...GROUP1_COMMUNES, ...GROUP2_COMMUNES]),
                    },
                  };
                })
              }
              data-testid="immofinder-group1"
            />{' '}
            Group 1 (22) — Chur / Rhine belt (Haldenstein…Tschiertschen)
          </label>
          <label style={labelBlock}>
            <input
              type="checkbox"
              checked={s.search.municipalityGroups?.group2 !== false}
              onChange={(e) =>
                upd((x) => {
                  const municipalityGroups = {
                    group1: x.search.municipalityGroups?.group1 !== false,
                    group2: e.target.checked,
                  };
                  const base = communes.length ? communes : x.search.communes;
                  return {
                    ...x,
                    search: {
                      ...x.search,
                      municipalityGroups,
                      communes: communesForGroups(municipalityGroups, base.length ? base : [...GROUP1_COMMUNES, ...GROUP2_COMMUNES]),
                    },
                  };
                })
              }
              data-testid="immofinder-group2"
            />{' '}
            Group 2 (22) — Prättigau / Surselva / south (Maienfeld…Peist)
          </label>
        </div>
        <button type="button" className="ghost" style={{ fontSize: 13 }} onClick={() => setShowCommunes((v) => !v)}>
          Communes ({selectedCommunes} of {allCommunes || selectedCommunes} selected)
        </button>
        {showCommunes && (
          <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: 12, marginRight: 8 }}
              onClick={() =>
                upd((x) => ({
                  ...x,
                  search: {
                    ...x.search,
                    communes: communesForGroups(
                      x.search.municipalityGroups || { group1: true, group2: true },
                      communes.length ? communes : [...GROUP1_COMMUNES, ...GROUP2_COMMUNES],
                    ),
                  },
                }))
              }
            >
              Select all
            </button>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: 12 }}
              onClick={() => upd((x) => ({ ...x, search: { ...x.search, communes: [] } }))}
            >
              Clear
            </button>
            <div style={{ marginTop: 6 }}>
              {(communes.length ? communes : s.search.communes).map((m) => {
                const inGroup = communesForGroups(
                  s.search.municipalityGroups || { group1: true, group2: true },
                  [m],
                ).includes(m);
                const on = inGroup && s.search.communes.includes(m);
                return (
                  <span
                    key={m}
                    role="button"
                    tabIndex={0}
                    style={{ ...chip(on), opacity: inGroup ? 1 : 0.35 }}
                    onClick={() =>
                      upd((x) => ({
                        ...x,
                        search: {
                          ...x.search,
                          communes: on ? x.search.communes.filter((c) => c !== m) : [...x.search.communes, m],
                        },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (e.target as HTMLElement).click();
                      }
                    }}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2 · Sources */}
      <div style={box}>
        <strong>2 · Search profile (C129 quality)</strong>
        <p style={hint}>Carousel: 2 communes per scheduled hour via Google + model extract. Burst: manual Stage 1 / Full.</p>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-profile"
            checked={(s.search.profile || 'carousel') === 'carousel'}
            onChange={() => upd((x) => ({ ...x, search: { ...x.search, profile: 'carousel' } }))}
            data-testid="immofinder-profile-carousel"
          />{' '}
          Carousel (quality over a day)
        </label>
        <label style={labelBlock}>
          Communes per carousel tick{' '}
          <select
            value={s.search.carouselCommunesPerRun || 2}
            disabled={(s.search.profile || 'carousel') !== 'carousel'}
            onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, carouselCommunesPerRun: Number(e.target.value) } }))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-profile"
            checked={s.search.profile === 'burst'}
            onChange={() => upd((x) => ({ ...x, search: { ...x.search, profile: 'burst' } }))}
            data-testid="immofinder-profile-burst"
          />{' '}
          Burst (manual Stage 1 / Full, wide coverage)
        </label>

        <strong style={{ display: 'block', marginTop: 12 }}>Sources (Stage 1 prioritises the top rows)</strong>
        <p style={hint}>
          Web search + Swiss portals (Homegate, ImmoScout24, Flatfox, Tutti, Anibis, Newhome, …). Only private ads with a stated price are kept; agencies and priceless ads are dropped.
        </p>
        {SOURCE_ROWS.map((row) => {
          const on = s.search.sources[row.id] !== false;
          return (
            <label key={row.id} style={{ display: 'block', margin: '8px 0', opacity: row.priority ? 1 : 0.92 }}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  upd((x) => ({
                    ...x,
                    search: { ...x.search, sources: { ...x.search.sources, [row.id]: e.target.checked } },
                  }))
                }
              />{' '}
              <strong>{row.label}</strong>
              {row.priority && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#7db8ff' }}>Stage 1 priority</span>
              )}
              <div style={{ ...hint, marginLeft: 22 }}>{row.hint}</div>
            </label>
          );
        })}
        <label style={{ ...labelBlock, marginTop: 10 }}>
          Scheduled / default depth{' '}
          <select
            value={s.search.defaultWave || 'priority'}
            onChange={(e) =>
              upd((x) => ({
                ...x,
                search: { ...x.search, defaultWave: e.target.value === 'full' ? 'full' : 'priority' },
              }))
            }
            data-testid="immofinder-default-wave"
          >
            <option value="full">Full search (all selected sources)</option>
            <option value="priority">Legacy Stage 1 only</option>
          </select>
        </label>
        <p style={hint}>Main-screen buttons still override this for one run.</p>
      </div>

      {/* 3 · Delivery */}
      <div style={box}>
        <strong>3 · Send results to</strong>
        <label style={labelBlock}>
          <input
            type="checkbox"
            checked={s.delivery.telegram}
            onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, telegram: e.target.checked } }))}
          />{' '}
          Telegram{ready(channels.telegram, 'TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID')}
          {s.delivery.telegram && (
            <button type="button" style={{ marginLeft: 8 }} onClick={() => void test('telegram')}>Send test</button>
          )}
        </label>
        <label style={labelBlock}>
          <input
            type="checkbox"
            checked={s.delivery.email}
            onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, email: e.target.checked } }))}
          />{' '}
          Email{ready(channels.email, 'RESEND_API_KEY')}
        </label>
        {s.delivery.email && (
          <div style={{ marginLeft: 22 }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={s.delivery.emailTo}
              onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, emailTo: e.target.value } }))}
            />{' '}
            <button type="button" onClick={() => void test('email')}>Send test</button>
            <div data-testid="immofinder-email-content" style={{ marginTop: 6 }}>
              <label style={{ display: 'block' }}>
                <input
                  type="radio"
                  name="immo-email-content"
                  checked={s.delivery.emailContent !== 'all'}
                  onChange={() => upd((x) => ({ ...x, delivery: { ...x.delivery, emailContent: 'new' } }))}
                />{' '}
                Only new results of this search
              </label>
              <label style={{ display: 'block' }}>
                <input
                  type="radio"
                  name="immo-email-content"
                  checked={s.delivery.emailContent === 'all'}
                  onChange={() => upd((x) => ({ ...x, delivery: { ...x.delivery, emailContent: 'all' } }))}
                />{' '}
                All results found so far (newest first)
              </label>
            </div>
          </div>
        )}
        <label style={labelBlock}>
          <input
            type="checkbox"
            checked={s.delivery.drive}
            onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, drive: e.target.checked } }))}
          />{' '}
          Google Drive (Sheet + Doc){ready(channels.drive, 'GOOGLE_SERVICE_ACCOUNT_JSON')}
        </label>
        {s.delivery.drive && (
          <div style={{ marginLeft: 22, fontSize: 14 }}>
            <div>
              Drive folder (link or ID)
              <input
                style={{ display: 'block', width: '100%', maxWidth: 420, marginTop: 4 }}
                value={s.delivery.driveFolderId}
                onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, driveFolderId: e.target.value } }))}
              />
            </div>
            <button type="button" style={{ marginTop: 6 }} onClick={() => void checkDrive()}>Check Drive</button>
          </div>
        )}
        <label style={labelBlock}>
          <input
            type="checkbox"
            checked={s.delivery.notifyWhenEmpty}
            onChange={(e) => upd((x) => ({ ...x, delivery: { ...x.delivery, notifyWhenEmpty: e.target.checked } }))}
          />{' '}
          Also notify when nothing new was found
        </label>
      </div>

      {/* 4 · Schedule */}
      <div style={box}>
        <strong>4 · Automatic search</strong>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-sched"
            checked={s.schedule.mode === 'manual'}
            onChange={() => upd((x) => ({ ...x, schedule: { ...x.schedule, mode: 'manual' } }))}
          />{' '}
          Only when I press search
        </label>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-sched"
            checked={s.schedule.mode === 'hours'}
            onChange={() => upd((x) => ({ ...x, schedule: { ...x.schedule, mode: 'hours' } }))}
          />{' '}
          Every{' '}
          <select
            value={s.schedule.everyHours}
            disabled={s.schedule.mode !== 'hours'}
            onChange={(e) => upd((x) => ({ ...x, schedule: { ...x.schedule, everyHours: Number(e.target.value) as 3 | 6 | 12 } }))}
          >
            {[1, 3, 6, 12].map((h) => (
              <option key={h} value={h}>{h} h</option>
            ))}
          </select>
        </label>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-sched"
            checked={s.schedule.mode === 'daily'}
            onChange={() => upd((x) => ({ ...x, schedule: { ...x.schedule, mode: 'daily' } }))}
          />{' '}
          Once a day at{' '}
          <input
            type="time"
            value={s.schedule.dailyAt}
            disabled={s.schedule.mode !== 'daily'}
            onChange={(e) => upd((x) => ({ ...x, schedule: { ...x.schedule, dailyAt: e.target.value } }))}
          />{' '}
          Swiss time
        </label>
        {s.schedule.mode !== 'manual' && (
          <p style={hint}>App checks about every 10 min; a due hour-run starts in that window (no external cron).</p>
        )}
      </div>

      {/* 5 · Advanced filters */}
      <div style={box}>
        <button type="button" className="ghost" style={{ fontSize: 14 }} onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? '▼' : '▶'} Advanced filters & cost
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 10 }}>
            <p style={hint}>Defaults favour private leads. Tighten only if results are noisy.</p>
            <label style={labelBlock}>
              <input
                type="checkbox"
                checked={s.search.rejectSeekerPosts !== false}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, rejectSeekerPosts: e.target.checked } }))}
              />{' '}
              Reject “looking for a flat” seeker posts
            </label>
            <label style={labelBlock}>
              <input
                type="checkbox"
                checked={!!s.search.requireContact}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, requireContact: e.target.checked } }))}
              />{' '}
              Require phone or email (drops Messenger-only posts)
            </label>
            <label style={labelBlock}>
              <input
                type="checkbox"
                checked={!!s.search.requirePrice}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, requirePrice: e.target.checked } }))}
              />{' '}
              Require a stated price
            </label>
            <label style={labelBlock}>
              <input
                type="checkbox"
                checked={!!s.search.rejectNonMonthly}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, rejectNonMonthly: e.target.checked } }))}
              />{' '}
              Reject night / week / season prices only
            </label>
            <label style={labelBlock}>
              Max listing age (days, 0 = no limit){' '}
              <input
                type="number"
                min={0}
                max={3650}
                step={30}
                value={s.search.maxListingAgeDays ?? 180}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, maxListingAgeDays: Number(e.target.value) } }))}
                style={{ width: 100 }}
              />
            </label>
            <label style={labelBlock}>
              Analyse at most{' '}
              <select
                value={s.search.maxAiPages}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, maxAiPages: Number(e.target.value) } }))}
              >
                {[20, 40, 60, 100, 200].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>{' '}
              pages with AI per search
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="immofinder-settings-save"
        onClick={() => void save()}
        disabled={!dirty}
        className="immo-btn"
        style={{ padding: '10px 18px', fontSize: 16 }}
      >
        {dirty ? 'Save settings' : 'Saved'}
      </button>
      {note && <p role="status" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  );
}

export default ImmoFinderSettings;
