import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
type ImmoGRStatus = { product: string; stage: string; liveDiscoveryEnabled: boolean; liveSearchEnabled: boolean; listingQualificationEnabled: boolean; message: string; resultCategories: string[] };
type DiscoveryLead = { title: string; url: string; host: string; verification: string; accessReview: string };
type CommuneOption = { bfsId: number; name: string };
const panel: CSSProperties = { border: '1px solid #243a57', borderRadius: 14, background: '#0b1626', padding: 20 };
const field: CSSProperties = { display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #40536b', background: '#101f33', color: '#eef4ff' };
export default function ImmoGR() {
  const [status, setStatus] = useState<ImmoGRStatus | null>(null);
  const [error, setError] = useState('');
  const [commune, setCommune] = useState('');
  const [communes, setCommunes] = useState<CommuneOption[]>([]);
  const [category, setCategory] = useState<'direct_rental' | 'private_owner_prospect'>('direct_rental');
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/immogr/communes', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Commune reference unavailable'); return body; })
      .then((body) => { if (active) setCommunes(Array.isArray(body.communes) ? body.communes : []); })
      .catch((reason) => { if (active) setSearchError(reason instanceof Error ? reason.message : 'Commune reference unavailable'); });
    fetch('/api/immogr/status', { credentials: 'same-origin' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || ('Status unavailable (' + response.status + ')'));
        return body as ImmoGRStatus;
      })
      .then((body) => { if (active) setStatus(body); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Status unavailable'); });
    return () => { active = false; };
  }, []);
  async function discover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSearching(true); setSearchError(''); setLeads([]); setSearched(false);
    try {
      const response = await fetch('/api/immogr/discovery', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commune, category }) });
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
      <h2 style={{ marginTop: 0 }}>Live discovery leads</h2>
      <p style={{ color: '#9aadc5' }}>Select from the official municipality directory and search the web for current candidate URLs. Results are unverified leads only; ImmoGR does not fetch listing pages or turn search snippets into property records. Your priority ratings are collected separately in config/immogr/commune-priorities.csv.</p>
      <form onSubmit={discover} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
        <label>Target commune<select required value={commune} onChange={(e) => setCommune(e.target.value)} style={field}><option value="">Select a Graubünden municipality</option>{communes.map((item) => <option key={item.bfsId} value={item.name}>{item.name} · BFS {item.bfsId}</option>)}</select></label>
        <label>Discovery category<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={field}><option value="direct_rental">Direct Rental leads</option><option value="private_owner_prospect">Private Owner Prospect leads</option></select></label>
        <button type="submit" disabled={!status?.liveDiscoveryEnabled || searching || !commune} style={{ padding: '11px 16px', borderRadius: 8, border: 0, background: '#2473ad', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!status?.liveDiscoveryEnabled || searching || commune.trim().length < 2) ? 0.55 : 1 }}>{searching ? 'Searching…' : 'Find live leads'}</button>
      </form>
      {searchError && <p role="alert">{searchError}</p>}
      {searched && <p>{leads.length} candidate URL(s) returned for {commune}. Each needs manual page and access review.</p>}
      {leads.length > 0 && <ul style={{ paddingLeft: 20 }}>{leads.map((lead) => <li key={lead.url} style={{ margin: '12px 0' }}><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.title}</a><div style={{ color: '#9aadc5', fontSize: 12 }}>{lead.host} · UNVERIFIED URL · manual source review required</div></li>)}</ul>}
      <p style={{ color: '#f4d28b', fontSize: 12, marginBottom: 0 }}>A search result is not a property listing. No price, commune, owner, contact, or availability is verified at this stage.</p>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <section style={panel}><h2>Direct Rentals</h2><p>Long-term rental offers on a specific property page, in a target commune, with verified monthly rent up to CHF 2,000 and a private advertiser.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Listing qualification remains disabled until a permitted source and page-level evidence pipeline are approved.</p></section>
      <section style={panel}><h2>Private Owner Prospects</h2><p>Specific seasonal or holiday properties with evidence of a private owner and a direct public contact route.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Long-term rental potential will be labelled as an estimate, never as a confirmed offer.</p></section>
      <section style={panel}><h2>Evidence &amp; Reviews</h2><p>Every admitted fact will carry its source URL, supporting page evidence, extraction method, and review status.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>No search-result snippet alone can create a listing.</p></section>
    </div>
    <p style={{ marginTop: 24, color: '#8fa6c2', fontSize: 13 }}>ImmoFinder is permanently retired. ImmoGR has separate code, configuration, data, search runs, and quality checks.</p>
  </main>;
}
