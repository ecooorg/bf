import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
type ImmoGRStatus = { product: string; stage: string; liveDiscoveryEnabled: boolean; liveSearchEnabled: boolean; listingQualificationEnabled: boolean; message: string; resultCategories: string[] };
type DiscoveryLead = { title: string; url: string; host: string; verification: string; accessReview: string };
type LocalityOption = { id: string; name: string; canton: 'GR'; group: 1 | 2 };
type GroupMode = 'group1' | 'group2' | 'both';
const panel: CSSProperties = { border: '1px solid #243a57', borderRadius: 14, background: '#0b1626', padding: 20 };
const field: CSSProperties = { display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #40536b', background: '#101f33', color: '#eef4ff' };
export default function ImmoGR() {
  const [status, setStatus] = useState<ImmoGRStatus | null>(null);
  const [error, setError] = useState('');
  const [locality, setLocality] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>(() => {
    try { const saved = localStorage.getItem('immogr.groupMode'); return saved === 'group1' || saved === 'group2' ? saved : 'both'; } catch { return 'both'; }
  });
  const [localities, setLocalities] = useState<LocalityOption[]>([]);
  const [category, setCategory] = useState<'direct_rental' | 'private_owner_prospect'>('direct_rental');
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/immogr/localities?groupMode=' + groupMode, { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Locality reference unavailable'); return body; })
      .then((body) => { if (active) { const next = Array.isArray(body.localities) ? body.localities : []; setLocalities(next); setLocality((current) => next.some((item: LocalityOption) => item.name === current) ? current : (next[0]?.name || '')); } })
      .catch((reason) => { if (active) setSearchError(reason instanceof Error ? reason.message : 'Locality reference unavailable'); });
    return () => { active = false; };
  }, [groupMode]);
  useEffect(() => {
    fetch('/api/immogr/status', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || ('Status unavailable (' + response.status + ')')); return body as ImmoGRStatus; })
      .then(setStatus).catch((reason) => setError(reason instanceof Error ? reason.message : 'Status unavailable'));
  }, []);
  function changeGroupMode(value: GroupMode) {
    setGroupMode(value); setLeads([]); setSearched(false);
    try { localStorage.setItem('immogr.groupMode', value); } catch { /* selection remains usable for this session */ }
  }
  async function discover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSearching(true); setSearchError(''); setLeads([]); setSearched(false);
    try {
      const response = await fetch('/api/immogr/discovery', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locality, groupMode, category }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || ('Discovery failed (' + response.status + ')'));
      setLeads(Array.isArray(body.leads) ? body.leads : []); setSearched(true);
    } catch (reason) { setSearchError(reason instanceof Error ? reason.message : 'Discovery failed'); }
    finally { setSearching(false); }
  }
  return <main className="shell" data-testid="immogr-root" style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
    <p><a href="/">← BiForge home</a></p>
    <header style={{ margin: '22px 0 28px' }}>
      <p style={{ color: '#9fd8ff', letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>INDEPENDENT PROPERTY DISCOVERY</p>
      <h1 style={{ fontSize: 36, margin: '8px 0' }}>ImmoGR</h1>
      <p style={{ color: '#9aadc5', maxWidth: 760 }}>An evidence-first search system for long-term rentals and private-owner prospects in Graubünden.</p>
      <span style={{ display: 'inline-block', border: '1px solid #52647a', borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>WP1 · Foundation and source research</span>
    </header>
    <section style={{ ...panel, marginBottom: 18 }} aria-live="polite">
      <h2 style={{ marginTop: 0 }}>Search engine status</h2>
      {error && <p role="alert">{error}</p>}
      {!status && !error && <p>Checking ImmoGR status…</p>}
      {status && <><p><strong>{status.stage}</strong></p><p>{status.message}</p><p style={{ color: '#f4d28b', marginBottom: 0 }}>Live URL discovery: {status.liveDiscoveryEnabled ? 'available' : 'not configured'} · Verified listing admission: disabled · Automated source-page acquisition: disabled.</p></>}
    </section>
    <section style={{ ...panel, marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>Target localities</h2>
      <p style={{ color: '#9aadc5' }}>The search geography is the exact owner-defined locality list, not municipalities. Only these 44 localities are in scope; all other places are excluded. Group selection is remembered in this browser.</p>
      <label>Enabled locality groups<select value={groupMode} onChange={(e) => changeGroupMode(e.target.value as GroupMode)} style={field}><option value="group1">Group 1 · 22 important localities</option><option value="group2">Group 2 · 22 secondary localities</option><option value="both">Both groups · all 44 localities</option></select></label>
      <p style={{ color: '#9aadc5', fontSize: 13 }}>The selection controls which localities appear in search and which locations the discovery API will accept.</p>
    </section>
    <section style={{ ...panel, marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>Live discovery leads</h2>
      <p style={{ color: '#9aadc5' }}>Search current candidate URLs for one selected locality. Results are unverified leads only; ImmoGR does not fetch listing pages or turn search snippets into property records.</p>
      <form onSubmit={discover} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
        <label>Target locality<select required value={locality} onChange={(e) => setLocality(e.target.value)} style={field}><option value="">Select a target locality</option>{localities.map((item) => <option key={item.id} value={item.name}>{item.name} · Group {item.group}</option>)}</select></label>
        <label>Discovery category<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={field}><option value="direct_rental">Direct Rental leads</option><option value="private_owner_prospect">Private Owner Prospect leads</option></select></label>
        <button type="submit" disabled={!status?.liveDiscoveryEnabled || searching || !locality} style={{ padding: '11px 16px', borderRadius: 8, border: 0, background: '#2473ad', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!status?.liveDiscoveryEnabled || searching || !locality) ? 0.55 : 1 }}>{searching ? 'Searching…' : 'Find live leads'}</button>
      </form>
      {searchError && <p role="alert">{searchError}</p>}
      {searched && <p>{leads.length} candidate URL(s) returned for {locality}. Each needs manual page and access review.</p>}
      {leads.length > 0 && <ul style={{ paddingLeft: 20 }}>{leads.map((lead) => <li key={lead.url} style={{ margin: '12px 0' }}><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.title}</a><div style={{ color: '#9aadc5', fontSize: 12 }}>{lead.host} · UNVERIFIED URL · manual source review required</div></li>)}</ul>}
      <p style={{ color: '#f4d28b', fontSize: 12, marginBottom: 0 }}>A search result is not a property listing. No price, locality, owner, contact, or availability is verified at this stage.</p>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <section style={panel}><h2>Direct Rentals</h2><p>Long-term rental offers in one of the 44 selected localities, with verified monthly rent up to CHF 2,000 and a private advertiser.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Listing qualification remains disabled until a permitted source and page-level evidence pipeline are approved.</p></section>
      <section style={panel}><h2>Private Owner Prospects</h2><p>Specific seasonal or holiday properties with evidence of a private owner and a direct public contact route.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Long-term rental potential will be labelled as an estimate, never as a confirmed offer.</p></section>
      <section style={panel}><h2>Evidence &amp; Reviews</h2><p>Every admitted fact will carry its source URL, supporting page evidence, extraction method, and review status.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>No search-result snippet alone can create a listing.</p></section>
    </div>
    <p style={{ marginTop: 24, color: '#8fa6c2', fontSize: 13 }}>ImmoFinder is permanently retired. ImmoGR has separate code, configuration, data, search runs, and quality checks.</p>
  </main>;
}
