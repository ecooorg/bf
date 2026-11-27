import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
type ImmoGRStatus = { product: string; stage: string; liveDiscoveryEnabled: boolean; liveSearchEnabled: boolean; listingQualificationEnabled: boolean; message: string; resultCategories: string[] };
type DiscoveryLead = { title: string; url: string; host: string; verification: string; accessReview: string };
type LocalityOption = { id: string; name: string; canton: 'GR'; group: 1 | 2 };
type GroupMode = 'group1' | 'group2' | 'both';
type ManualSource = { id: string; name: string; category: string; automationStatus: string; ownerSignal: string; accessNote: string; homepageUrl?: string };
type ManualDraft = { canonicalUrl: string; localityId: string; pageTitle: string; propertyType: string; priceAmount: string; currency: string; pricePeriod: string; ownerClass: string; availability: string; accessOutcome: string; notes: string };
const emptyManualDraft: ManualDraft = { canonicalUrl: '', localityId: '', pageTitle: '', propertyType: 'unknown', priceAmount: '', currency: 'CHF', pricePeriod: 'unknown', ownerClass: 'unknown', availability: '', accessOutcome: 'reviewed', notes: '' };
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
  const [manualLocalities, setManualLocalities] = useState<LocalityOption[]>([]);
  const [category, setCategory] = useState<'direct_rental' | 'private_owner_prospect'>('direct_rental');
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const [sources, setSources] = useState<ManualSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [manualDraft, setManualDraft] = useState<ManualDraft>(emptyManualDraft);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualReviews, setManualReviews] = useState<Array<{ id: string; canonical_url: string; locality_id: string; reviewed_at: string; manual_access_outcome: string; page_title: string | null; price_amount: string | null; currency: string; price_period: string; owner_class: string }>>([]);
  const [manualMessage, setManualMessage] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/immogr/localities?groupMode=' + groupMode, { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Locality reference unavailable'); return body; })
      .then((body) => { if (active) { const next = Array.isArray(body.localities) ? body.localities : []; setLocalities(next); setLocality((current) => next.some((item: LocalityOption) => item.name === current) ? current : (next[0]?.name || '')); } })
      .catch((reason) => { if (active) setSearchError(reason instanceof Error ? reason.message : 'Locality reference unavailable'); });
    return () => { active = false; };
  }, [groupMode]);
  useEffect(() => {
    fetch('/api/immogr/localities?groupMode=both', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Manual locality reference unavailable'); return body; })
      .then((body) => setManualLocalities(Array.isArray(body.localities) ? body.localities : []))
      .catch(() => setManualLocalities([]));
  }, []);
  useEffect(() => {
    fetch('/api/immogr/sources', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Source registry unavailable'); return body; })
      .then((body) => setSources(Array.isArray(body.sources) ? body.sources : []))
      .catch((reason) => setManualMessage(reason instanceof Error ? reason.message : 'Source registry unavailable'));
  }, []);
  useEffect(() => {
    if (!selectedSourceId) { setManualReviews([]); return; }
    fetch('/api/immogr/manual-reviews?sourceId=' + encodeURIComponent(selectedSourceId), { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Could not load saved notes'); return body; })
      .then((body) => setManualReviews(Array.isArray(body.reviews) ? body.reviews : []))
      .catch(() => setManualReviews([]));
  }, [selectedSourceId]);
  useEffect(() => {
    fetch('/api/immogr/status', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || ('Status unavailable (' + response.status + ')')); return body as ImmoGRStatus; })
      .then(setStatus).catch((reason) => setError(reason instanceof Error ? reason.message : 'Status unavailable'));
  }, []);
  function changeGroupMode(value: GroupMode) {
    setGroupMode(value); setLeads([]); setSearched(false);
    try { localStorage.setItem('immogr.groupMode', value); } catch { /* selection remains usable for this session */ }
  }
  function selectManualSource(sourceId: string) {
    setSelectedSourceId(sourceId);
    setManualDraft((current) => ({ ...current, canonicalUrl: '', localityId: manualLocalities[0]?.id || localities[0]?.id || '' }));
    setManualMessage('');
  }
  async function saveManualReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSourceId) return;
    setManualSaving(true); setManualMessage('');
    try {
      const response = await fetch('/api/immogr/manual-reviews', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: selectedSourceId, ...manualDraft }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || ('Save failed (' + response.status + ')'));
      setManualMessage('Saved to your ImmoGR personal research notebook.');
      const savedResponse = await fetch('/api/immogr/manual-reviews?sourceId=' + encodeURIComponent(selectedSourceId), { credentials: 'same-origin' });
      const savedBody = await savedResponse.json().catch(() => ({}));
      setManualReviews(Array.isArray(savedBody.reviews) ? savedBody.reviews : []);
      setManualDraft((current) => ({ ...emptyManualDraft, localityId: current.localityId }));
    } catch (reason) { setManualMessage(reason instanceof Error ? reason.message : 'Could not save manual research'); }
    finally { setManualSaving(false); }
  }
  async function importLocalPageFile(file?: File) {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = new Set(['html', 'htm', 'txt', 'md', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', 'tsv', 'json']);
    if (!supported.has(extension) || file.size > 5 * 1024 * 1024) {
      setManualMessage('Choose HTML, TXT, Markdown, PDF, DOCX, XLSX, PPTX, CSV, TSV or JSON up to 5 MB.');
      return;
    }
    try {
      let title = file.name;
      let extracted = '';
      if (extension === 'html' || extension === 'htm') {
        const raw = await file.text();
        const documentCopy = new DOMParser().parseFromString(raw, 'text/html');
        title = (documentCopy.title || file.name).slice(0, 300);
        documentCopy.querySelectorAll('script,style,noscript,svg,nav,footer,header').forEach((node) => node.remove());
        extracted = (documentCopy.body?.innerText || documentCopy.body?.textContent || '').replace(/\s+/g, ' ').trim();
      } else {
        const fileClass: 'pdf' | 'office' | 'data' | 'doc' = extension === 'pdf' ? 'pdf'
          : ['docx', 'xlsx', 'pptx'].includes(extension) ? 'office'
          : ['csv', 'tsv', 'json'].includes(extension) ? 'data' : 'doc';
        const { extractFileContent } = await import('./workspace/extract.ts');
        const result = await extractFileContent(file.name, new Uint8Array(await file.arrayBuffer()), fileClass, {
          maxChars: 5000, maxPdfPages: 20, maxXlsxRows: 100, maxCsvRows: 200,
        });
        if (result.metadataOnly || !result.text.trim()) {
          setManualMessage('This file was opened locally, but no text could be extracted. Image OCR is not available yet.');
          return;
        }
        extracted = result.text;
        if (result.meta.pages) title += ' · ' + result.meta.pages + ' pages';
      }
      setManualDraft((current) => ({ ...current, pageTitle: current.pageTitle || title, notes: extracted.slice(0, 5000) }));
      setManualMessage('Local file processed in this browser. Review and edit the extracted notes before saving; the original file was not uploaded.');
    } catch (error) {
      setManualMessage(error instanceof Error ? 'Local import failed: ' + error.message.slice(0, 180) : 'Could not read that local file.');
    }
  }
  function openSourceHomepage() {
    const homepage = sources.find((source) => source.id === selectedSourceId)?.homepageUrl;
    if (!homepage) return;
    try { const url = new URL(homepage); if (url.protocol === 'https:') window.open(url.toString(), '_blank', 'noopener,noreferrer'); }
    catch { setManualMessage('The source homepage URL is invalid.'); }
  }
  function openManualSource() {
    let url: URL;
    try { url = new URL(manualDraft.canonicalUrl); } catch { setManualMessage('Enter a valid source URL first.'); return; }
    if (!['http:', 'https:'].includes(url.protocol)) { setManualMessage('Only HTTP(S) source URLs can be opened.'); return; }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
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
      <span style={{ display: 'inline-block', border: '1px solid #52647a', borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>WP2 · Manual source research</span>
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
    <section style={{ ...panel, marginBottom: 18 }} data-testid="immogr-manual-research">
      <h2 style={{ marginTop: 0 }}>Personal manual research notebook · {sources.length || 29} sources</h2>
      <p style={{ color: '#9aadc5' }}>Choose any registered source, open its original page in your browser, then save the facts you observed for your own housing search. Automation status is shown separately and does not hide manual research.</p>
      <label>Source<select value={selectedSourceId} onChange={(e) => selectManualSource(e.target.value)} style={field}><option value="">Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name} · automation: {source.automationStatus}</option>)}</select></label>
      {selectedSourceId && <><p style={{ color: '#9aadc5', fontSize: 13 }}>{sources.find((source) => source.id === selectedSourceId)?.ownerSignal} {sources.find((source) => source.id === selectedSourceId)?.accessNote}</p>{sources.find((source) => source.id === selectedSourceId)?.homepageUrl && <button type="button" onClick={openSourceHomepage} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Open source website ↗</button>}</>}
      {sources.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>{sources.map((source) => <button type="button" key={source.id} onClick={() => selectManualSource(source.id)} aria-pressed={selectedSourceId === source.id} style={{ border: selectedSourceId === source.id ? '2px solid #79c7ff' : '1px solid #40536b', borderRadius: 8, padding: '7px 10px', background: '#101f33', color: '#eef4ff', cursor: 'pointer' }}>{source.name}</button>)}</div>}
      {selectedSourceId && <form onSubmit={saveManualReview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label style={{ gridColumn: '1 / -1' }}>Original listing URL<input required type="url" value={manualDraft.canonicalUrl} onChange={(e) => setManualDraft({ ...manualDraft, canonicalUrl: e.target.value })} placeholder="https://…" style={field} /></label>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={openManualSource} disabled={!manualDraft.canonicalUrl} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Open original page ↗</button><span style={{ color: '#9aadc5', fontSize: 12, alignSelf: 'center' }}>The page opens directly from its source; ImmoGR does not proxy it.</span></div>
        <label style={{ gridColumn: '1 / -1' }}>Import a local page or document (HTML, TXT, MD, PDF, DOCX, XLSX, PPTX, CSV, TSV, JSON · up to 5 MB)<input type="file" accept=".html,.htm,.txt,.md,.pdf,.docx,.xlsx,.pptx,.csv,.tsv,.json,text/html,text/plain,application/pdf" onChange={(e) => void importLocalPageFile(e.target.files?.[0])} style={field} /><span style={{ color: '#9aadc5', fontSize: 12 }}>Read and extract locally in this browser. The original file is not uploaded; extraction runs in this browser and notes are saved only when you submit the form. Scanned-image OCR is not yet supported.</span></label>
        <label>Locality<select required value={manualDraft.localityId} onChange={(e) => setManualDraft({ ...manualDraft, localityId: e.target.value })} style={field}><option value="">Select locality</option>{manualLocalities.map((item) => <option key={item.id} value={item.id}>{item.name} · Group {item.group}</option>)}</select></label>
        <label>Page / property title<input value={manualDraft.pageTitle} onChange={(e) => setManualDraft({ ...manualDraft, pageTitle: e.target.value })} maxLength={300} style={field} /></label>
        <label>Property type<select value={manualDraft.propertyType} onChange={(e) => setManualDraft({ ...manualDraft, propertyType: e.target.value })} style={field}><option value="unknown">Unknown</option><option value="apartment">Apartment</option><option value="house">House</option><option value="chalet">Chalet</option><option value="room">Room</option><option value="other">Other</option></select></label>
        <label>Price<input type="number" min="0" max="1000000" step="0.01" value={manualDraft.priceAmount} onChange={(e) => setManualDraft({ ...manualDraft, priceAmount: e.target.value })} style={field} /></label>
        <label>Currency<select value={manualDraft.currency} onChange={(e) => setManualDraft({ ...manualDraft, currency: e.target.value })} style={field}><option>CHF</option><option>EUR</option></select></label>
        <label>Price period<select value={manualDraft.pricePeriod} onChange={(e) => setManualDraft({ ...manualDraft, pricePeriod: e.target.value })} style={field}><option value="unknown">Unknown</option><option value="month">Per month</option><option value="week">Per week</option><option value="night">Per night</option><option value="season">Per season</option></select></label>
        <label>Advertiser / owner type<select value={manualDraft.ownerClass} onChange={(e) => setManualDraft({ ...manualDraft, ownerClass: e.target.value })} style={field}><option value="unknown">Unknown</option><option value="private_owner">Private owner</option><option value="agency">Agency</option><option value="management_company">Management company</option><option value="tour_operator">Tour operator</option><option value="intermediary">Intermediary</option></select></label>
        <label>Availability<input value={manualDraft.availability} onChange={(e) => setManualDraft({ ...manualDraft, availability: e.target.value })} maxLength={500} placeholder="e.g. from 1 December" style={field} /></label>
        <label>Review outcome<select value={manualDraft.accessOutcome} onChange={(e) => setManualDraft({ ...manualDraft, accessOutcome: e.target.value })} style={field}><option value="reviewed">Reviewed</option><option value="in_progress">In progress</option><option value="blocked_by_source">Blocked by source</option><option value="no_relevant_inventory">No relevant inventory</option></select></label>
        <label style={{ gridColumn: '1 / -1' }}>Your notes<textarea value={manualDraft.notes} onChange={(e) => setManualDraft({ ...manualDraft, notes: e.target.value })} maxLength={5000} rows={3} style={field} placeholder="Owner signals, contact route, rental conditions, follow-up notes…" /></label>
        <button type="submit" disabled={manualSaving || !manualDraft.localityId || !manualDraft.canonicalUrl} style={{ padding: '11px 16px', borderRadius: 8, border: 0, background: '#2473ad', color: '#fff', fontWeight: 700 }}>{manualSaving ? 'Saving…' : 'Save personal research note'}</button>
      </form>}
      {manualMessage && <p role="status" aria-live="polite">{manualMessage}</p>}
      {manualReviews.length > 0 && <div style={{ marginTop: 18 }}><h3>Saved notes ({manualReviews.length})</h3><ul style={{ paddingLeft: 20 }}>{manualReviews.map((review) => <li key={review.id} style={{ margin: '8px 0' }}><a href={review.canonical_url} target="_blank" rel="noopener noreferrer">{review.page_title || review.canonical_url}</a><div style={{ color: '#9aadc5', fontSize: 12 }}>{review.locality_id} · {review.price_amount ? review.price_amount + ' ' + review.currency + ' / ' + review.price_period : 'Price unknown'} · {review.owner_class} · {review.manual_access_outcome} · {new Date(review.reviewed_at).toLocaleString()}</div></li>)}</ul></div>}
      <p style={{ color: '#9aadc5', fontSize: 12, marginBottom: 0 }}>Records are personal research notes, not verified listings. Keep the original URL so you can reopen and contact the advertiser. Do not enter passwords or session tokens.</p>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <section style={panel}><h2>Direct Rentals</h2><p>Long-term rental offers in one of the 44 selected localities, with verified monthly rent up to CHF 2,000 and a private advertiser.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Listing qualification remains disabled until a permitted source and page-level evidence pipeline are approved.</p></section>
      <section style={panel}><h2>Private Owner Prospects</h2><p>Specific seasonal or holiday properties with evidence of a private owner and a direct public contact route.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Long-term rental potential will be labelled as an estimate, never as a confirmed offer.</p></section>
      <section style={panel}><h2>Evidence &amp; Reviews</h2><p>Every admitted fact will carry its source URL, supporting page evidence, extraction method, and review status.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>No search-result snippet alone can create a listing.</p></section>
    </div>
    <p style={{ marginTop: 24, color: '#8fa6c2', fontSize: 13 }}>ImmoFinder is permanently retired. ImmoGR has separate code, configuration, data, search runs, and quality checks.</p>
  </main>;
}
