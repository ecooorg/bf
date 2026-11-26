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
    defaultWave: 'carousel' | 'full';
    profile: 'carousel' | 'burst';
    carouselCommunesPerRun: number;
    privateQueryTemplates: number;
    enrichSearchesPerRun: number;
    recheckContactSearch: boolean;
  };
};
type Channels = { telegram: boolean; email: boolean; drive: boolean; driveAccount?: string };

/** Production sources: each enabled row is a direct index/detail adapter, not a search-engine snippet. */
const SOURCE_ROWS: { id: string; label: string; hint: string; priority: boolean }[] = [
  { id: 'ferienhausmiete', label: 'Ferienhausmiete', hint: 'Directly fetched holiday-home listings', priority: true },
  { id: 'happyholiday', label: 'HappyHoliday', hint: 'Directly fetched regional owner listings', priority: true },
  { id: 'portal-anibis', label: 'Anibis', hint: 'Paused after HTTP 403 in the live pilot; re-enable only after access changes', priority: false },
  { id: 'portal-tutti', label: 'Tutti', hint: 'Paused after HTTP 403 in the live pilot; re-enable only after access changes', priority: false },
];


/** Full canton scope: 100 official municipalities plus 19 legacy/locality aliases. */
const GROUP1_COMMUNES = ["Albula/Alvra","Andeer","Arosa","Avers","Bergün Filisur","Bever","Bonaduz","Bregaglia","Breil/Brigels","Brusio","Buseno","Calanca","Cama","Castaneda","Cazis","Celerina/Schlarigna","Chur","Churwalden","Conters im Prättigau","Davos","Disentis/Mustér","Domat/Ems","Domleschg","Falera","Felsberg","Ferrera","Fideris","Fläsch","Flerden","Flims","Furna","Fürstenau","Grono","Grüsch","Ilanz/Glion","Jenaz","Jenins","Klosters","Küblis","La Punt Chamues-ch","Laax","Landquart","Lantsch/Lenz","Lostallo","Lumnezia","Luzein","Madulain","Maienfeld","Malans","Masein","Medel (Lucmagn)","Mesocco","Muntogna da Schons","Obersaxen Mundaun","Pontresina","Poschiavo","Rhäzüns","Rheinwald","Rongellen","Rossa","Rothenbrunnen","Roveredo (GR)","Safiental","Sagogn","Samedan","Samnaun","San Vittore","Santa Maria in Calanca","S-chanf","Scharans","Schiers","Schluein","Schmitten (GR)","Scuol","Seewis im Prättigau","Sils im Domleschg","Sils im Engadin/Segl","Silvaplana","Soazza","St. Moritz","Sufers","Sumvitg","Surses","Tamins","Thusis","Trimmis","Trin","Trun","Tschappina","Tujetsch","Untervaz","Urmein","Val Müstair","Vals","Valsot","Vaz/Obervaz","Zernez","Zillis-Reischen","Zizers","Zuoz"];
const GROUP2_COMMUNES = ["Haldenstein","Igis","Lenzerheide","Maladers","Parpan","Valbella","Passugg","Araschgen","Praden","Tschiertschen","Castiel","Lüen","St. Peter-Molinis","Peist","Versam","Valendas","Castrisch","Realta","Seewis-Pardisla","Savognin","Schmitten"]
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

  const resetToDefaults = async () => {
    try {
      const r = await api('/api/immofinder/settings/reset', { method: 'POST', body: '{}' });
      setS(r.settings);
      setChannels(r.channels);
      setCommunes(r.communes || communes);
      setDirty(false);
      setNote('Default settings applied and saved.');
      onChanged?.(r.settings);
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  const prepareChurTest = async () => {
    try {
      const reset = await api('/api/immofinder/settings/reset', { method: 'POST', body: '{}' });
      const base = reset.settings as S;
      const profile: S = {
        ...base,
        schedule: { ...base.schedule, mode: 'manual' },
        delivery: { ...base.delivery, telegram: false, email: false, emailTo: '', drive: false, notifyWhenEmpty: false },
        search: {
          ...base.search,
          minRooms: 3,
          communes: ['Chur'],
          municipalityGroups: { group1: true, group2: false },
          sources: Object.fromEntries(Object.keys(base.search.sources).map((id) => [id, true])),
          maxAiPages: 200,
          limitPrice: false,
          maxListingAgeDays: 0,
          requirePrice: false,
          rejectNonMonthly: false,
          rejectSeekerPosts: true,
          requireContact: false,
          defaultWave: 'full',
          profile: 'burst',
          privateQueryTemplates: 4,
          enrichSearchesPerRun: 0,
          recheckContactSearch: false,
        },
      };
      const saved = await api('/api/immofinder/settings', { method: 'PUT', body: JSON.stringify(profile) });
      setS(saved.settings);
      setChannels(saved.channels);
      setCommunes(reset.communes || ['Chur']);
      setDirty(false);
      setShowAdvanced(false);
      setShowCommunes(false);
      setNote('Settings reset. Chur-only test profile saved: all configured sources on, optional filters off, delivery and schedule off.');
      onChanged?.(saved.settings);
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
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
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
            Group 1 (100) — all official Graubünden municipalities
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
            Group 2 (19) — legacy and locality aliases
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
          <button type="button" className="ghost" data-testid="immofinder-chur-only" onClick={() => {
            upd((x) => ({ ...x, search: { ...x.search, municipalityGroups: { group1: true, group2: false }, communes: ['Chur'] } }));
            setShowCommunes(false);
          }}>Chur only</button>
          <button type="button" className="ghost" style={{ fontSize: 13 }} onClick={() => setShowCommunes((v) => !v)}>
            Communes ({selectedCommunes} of {allCommunes || selectedCommunes} selected)
          </button>
        </div>
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
        <p style={hint}>Carousel rotates through selected communes on each scheduled run. Full processes every selected commune in one run.</p>
        <label style={labelBlock}>
          <input
            type="radio"
            name="immo-profile"
            checked={(s.search.profile || 'carousel') === 'carousel'}
            onChange={() => upd((x) => ({ ...x, search: { ...x.search, profile: 'carousel' } }))}
            data-testid="immofinder-profile-carousel"
          />{' '}
          Carousel (recommended: rotating batches)
        </label>
        <label style={labelBlock}>
          Communes per carousel run{' '}
          <select
            value={s.search.carouselCommunesPerRun || 12}
            disabled={(s.search.profile || 'carousel') !== 'carousel'}
            onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, carouselCommunesPerRun: Number(e.target.value) } }))}
          >
            {[4, 6, 8, 12].map((n) => (
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
          Full (all selected communes in one run)
        </label>

        <strong style={{ display: 'block', marginTop: 12 }}>Search targets</strong>
        <p style={hint}>
          <span>Searches use generated rental-intent queries for enabled portals and private offers.</span>{' '}
          <span>Detail pages must verify rooms, monthly CHF rent, publication date, active status, and advertiser contact.</span>{' '}
          <span>Snippets, failed fetches, sales, seeker posts, stale offers, platform contacts, and conflicting facts are rejected.</span>
        </p>
        <button type="button" className="ghost" data-testid="immofinder-enable-all-sources" style={{ margin: '6px 0' }}
          onClick={() => upd((x) => ({ ...x, search: { ...x.search, sources: Object.fromEntries(Object.keys(x.search.sources).map((id) => [id, true])) } }))}>
          Enable all configured sources
        </button>
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
              <div style={{ ...hint, marginLeft: 22 }}>{row.hint}</div>
            </label>
          );
        })}
        <p style={hint}>Main-screen buttons can still override the run mode for a single search.</p>
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
            <p style={{ ...hint, marginBottom: 8 }}>C131 rejects seekers, sales, non-residential pages and unverified rooms. Price periods and direct contact stay optional.</p>
            <label style={labelBlock}>
              <input type="checkbox" checked={s.search.requirePrice}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, requirePrice: e.target.checked } }))}
                data-testid="immofinder-require-price"
              />{' '}
              Require a stated price (optional filter)
            </label>
            <label style={labelBlock}>
              <input type="checkbox" checked={s.search.requireContact}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, requireContact: e.target.checked } }))}
                data-testid="immofinder-require-contact"
              />{' '}
              Require direct advertiser phone or email (optional filter)
            </label>
            <label style={labelBlock}>
              <input type="checkbox" checked={s.search.rejectNonMonthly}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, rejectNonMonthly: e.target.checked } }))}
                data-testid="immofinder-reject-nonmonthly"
              />{' '}
              Reject night / week / season-only prices (optional filter)
            </label>
            <p style={hint}>Seeker posts remain excluded by the C131 admission rule. Publication date and direct contact are not required for L1.</p>
            <label style={labelBlock}>
              Max listing age (days, 0 = use 180-day default){' '}
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
            <p style={hint}>AI extraction is disabled. Listing facts are parsed from the fetched detail page and checked by deterministic rules.</p>
            <label style={labelBlock}>
              Private-search queries per commune{' '}
              <select
                value={s.search.privateQueryTemplates ?? 2}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, privateQueryTemplates: Number(e.target.value) } }))}
                data-testid="immofinder-private-templates"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <p style={hint}>No date filter is applied; active listings may remain indexed for months.</p>
            <label style={labelBlock}>
              Contact searches per run (0 = off){' '}
              <select
                value={s.search.enrichSearchesPerRun ?? 6}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, enrichSearchesPerRun: Number(e.target.value) } }))}
                data-testid="immofinder-enrich-searches"
              >
                {[0, 3, 6, 12, 25, 35].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label style={labelBlock}>
              <input
                type="checkbox"
                checked={s.search.recheckContactSearch === true}
                onChange={(e) => upd((x) => ({ ...x, search: { ...x.search, recheckContactSearch: e.target.checked } }))}
                data-testid="immofinder-recheck-contact-search"
              />{' '}
              Search for contacts during Recheck list
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        data-testid="immofinder-settings-reset"
        onClick={() => void resetToDefaults()}
        disabled={false}
        className="immo-btn"
        style={{ padding: '10px 18px', fontSize: 16, marginRight: 8 }}
      >
        Reset to defaults
      </button>
      <button
        type="button"
        data-testid="immofinder-prepare-chur-test"
        onClick={() => void prepareChurTest()}
        disabled={false}
        className="immo-btn"
        style={{ padding: '10px 18px', fontSize: 16, marginRight: 8 }}
      >
        Reset & prepare Chur test
      </button>
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
