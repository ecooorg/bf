import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { extractSchemaFactsFromJsonLd, normalizeLocalityLabel } from './immogr/local-schema.ts';
import { inspectLocalHtmlDocument, type LocalPageInspection } from './immogr/local-page-inspector.ts';
import { downloadAllLogs } from './allLogs.ts';
type ImmoGRStatus = { product: string; stage: string; liveDiscoveryEnabled: boolean; liveSearchEnabled: boolean; listingQualificationEnabled: boolean; message: string; resultCategories: string[] };
type DiscoveryLead = { title: string; url: string; host: string; verification: string; accessReview: string };
type LocalityOption = { id: string; name: string; canton: 'GR'; group: 0 | 1 | 2 };
type GroupMode = 'group1' | 'group2' | 'both' | 'chur';
type ManualSource = { id: string; name: string; category: string; automationStatus: string; ownerSignal: string; accessNote: string; homepageUrl?: string; probePolicyStatus?: string };
type ManualDraft = { canonicalUrl: string; localityId: string; pageTitle: string; propertyType: string; priceAmount: string; currency: string; pricePeriod: string; ownerClass: string; availability: string; accessOutcome: string; notes: string };
type ProbeBatchResult = { sourceId: string; sourceName: string; status: string; reason?: string; requestCount?: number | null; reportPath?: string | null };
type ProbeBatchReport = { generatedAt: string; sourceCount: number; requestsSentByThisBatch: number | null; summary: Record<string, number>; results: ProbeBatchResult[] };
const emptyManualDraft: ManualDraft = { canonicalUrl: '', localityId: '', pageTitle: '', propertyType: 'unknown', priceAmount: '', currency: 'CHF', pricePeriod: 'unknown', ownerClass: 'unknown', availability: '', accessOutcome: 'reviewed', notes: '' };
const panel: CSSProperties = { border: '1px solid #243a57', borderRadius: 14, background: '#0b1626', padding: 20 };
const field: CSSProperties = { display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #40536b', background: '#101f33', color: '#eef4ff' };
export default function ImmoGR() {
  const [status, setStatus] = useState<ImmoGRStatus | null>(null);
  const [error, setError] = useState('');
  const [locality, setLocality] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>(() => {
    try { const saved = localStorage.getItem('immogr.groupMode'); return saved === 'group1' || saved === 'group2' || saved === 'chur' ? saved : 'both'; } catch { return 'both'; }
  });
  const [localities, setLocalities] = useState<LocalityOption[]>([]);
  const [manualLocalities, setManualLocalities] = useState<LocalityOption[]>([]);
  const [selectedLocalityIds, setSelectedLocalityIds] = useState<string[]>(() => { try { const saved = JSON.parse(localStorage.getItem('immogr.selectedLocalityIds') || '[]'); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []; } catch { return []; } });
  const [category, setCategory] = useState<'direct_rental' | 'private_owner_prospect'>('direct_rental');
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchDiagnostics, setSearchDiagnostics] = useState<Record<string, unknown> | null>(null);
  const [diagnosticsDownloading, setDiagnosticsDownloading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sources, setSources] = useState<ManualSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [manualDraft, setManualDraft] = useState<ManualDraft>(emptyManualDraft);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualReviews, setManualReviews] = useState<Array<{ id: string; canonical_url: string; locality_id: string; reviewed_at: string; manual_access_outcome: string; page_title: string | null; price_amount: string | null; currency: string; price_period: string; owner_class: string }>>([]);
  const [manualMessage, setManualMessage] = useState('');
  const [localPageInspection, setLocalPageInspection] = useState<LocalPageInspection | null>(null);
  const [localPageSnapshot, setLocalPageSnapshot] = useState('');
  const [showPageImages, setShowPageImages] = useState(false);
  const [probeSecondUrl, setProbeSecondUrl] = useState('');
  const [sourceSettingsMessage, setSourceSettingsMessage] = useState('');
  const [probeBatchReport, setProbeBatchReport] = useState<ProbeBatchReport | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('immogr.enabledSourceIds') || '[]'); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
  });
  useEffect(() => {
    let active = true;
    fetch('/api/immogr/localities?groupMode=' + groupMode, { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Locality reference unavailable'); return body; })
      .then((body) => { if (active) { const next = Array.isArray(body.localities) ? body.localities : []; setLocalities(next); setLocality((current) => next.some((item: LocalityOption) => item.name === current) ? current : (next[0]?.name || '')); } })
      .catch((reason) => { if (active) setSearchError(reason instanceof Error ? reason.message : 'Locality reference unavailable'); });
    return () => { active = false; };
  }, [groupMode]);
  useEffect(() => {
    Promise.all(['both', 'chur'].map((mode) => fetch('/api/immogr/localities?groupMode=' + mode, { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Locality reference unavailable'); return Array.isArray(body.localities) ? body.localities : []; })))
      .then((groups) => { const all = groups.flat(); setManualLocalities(all); try { if (localStorage.getItem('immogr.selectedLocalityIds') === null) setSelectedLocalityIds(all.map((item) => item.id)); } catch { /* Browser storage may be unavailable. */ } })
      .catch(() => setManualLocalities([]));
  }, []);
  useEffect(() => { if (!manualLocalities.length) return; try { localStorage.setItem('immogr.selectedLocalityIds', JSON.stringify(selectedLocalityIds)); } catch { /* Browser storage may be unavailable. */ } }, [selectedLocalityIds, manualLocalities]);
  useEffect(() => {
    fetch('/api/immogr/sources', { credentials: 'same-origin' })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Source registry unavailable'); return body; })
      .then((body) => { const next = Array.isArray(body.sources) ? body.sources : []; setSources(next); try { if (localStorage.getItem('immogr.enabledSourceIds') === null) setSelectedSourceIds(next.map((source: ManualSource) => source.id)); } catch { /* Browser storage may be unavailable. */ } })
      .catch((reason) => setManualMessage(reason instanceof Error ? reason.message : 'Source registry unavailable'));
  }, []);
  useEffect(() => {
    if (!sources.length) return;
    try { localStorage.setItem('immogr.enabledSourceIds', JSON.stringify(selectedSourceIds)); } catch { /* Browser storage may be unavailable. */ }
  }, [selectedSourceIds, sources]);
  useEffect(() => {
    if (sources.length) setSelectedSourceIds((current) => current.filter((id) => sources.some((source) => source.id === id)));
  }, [sources]);
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
    setManualDraft(emptyManualDraft);
    setLocalPageInspection(null);
    setLocalPageSnapshot('');
    setShowPageImages(false);
    setProbeSecondUrl('');
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
      setManualDraft(emptyManualDraft);
    } catch (reason) { setManualMessage(reason instanceof Error ? reason.message : 'Could not save manual research'); }
    finally { setManualSaving(false); }
  }
  async function importLocalPageFile(file?: File) {
    if (!file) return;
    setLocalPageInspection(null); setLocalPageSnapshot('');
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = new Set(['html', 'htm', 'txt', 'md', 'pdf', 'docx', 'xlsx', 'pptx', 'csv', 'tsv', 'json']);
    if (!supported.has(extension) || file.size > 5 * 1024 * 1024) {
      setManualMessage('Choose HTML, TXT, Markdown, PDF, DOCX, XLSX, PPTX, CSV, TSV or JSON up to 5 MB.');
      return;
    }
    try {
      if (extension === 'json') {
        const parsed = JSON.parse(await file.text());
        if (parsed?.mode === 'owner_triggered_local_limited_research_probe' && Array.isArray(parsed.results)) {
          setProbeBatchReport(parsed as ProbeBatchReport);
          setManualMessage('Imported the local variant-B probe report. Review the per-source status below; this file was processed only in this browser.');
          return;
        }
      }
      let title = file.name;
      let extracted = '';
      let schemaFacts: ReturnType<typeof extractSchemaFactsFromJsonLd> = {};
      if (extension === 'html' || extension === 'htm') {
        const raw = await file.text();
        const documentCopy = new DOMParser().parseFromString(raw, 'text/html');
        schemaFacts = extractSchemaFactsFromJsonLd(Array.from(documentCopy.querySelectorAll('script[type="application/ld+json"]')).map((script) => script.textContent || ''));
        const sourceUrl = manualDraft.canonicalUrl || documentCopy.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
        setLocalPageInspection(inspectLocalHtmlDocument(documentCopy, sourceUrl));
        setLocalPageSnapshot(raw);
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
      setManualDraft((current) => {
        const localityMatch = schemaFacts.localityName ? manualLocalities.find((item) => normalizeLocalityLabel(item.name) === normalizeLocalityLabel(schemaFacts.localityName || '')) : undefined;
        return {
          ...current,
          pageTitle: current.pageTitle || schemaFacts.pageTitle || title,
          propertyType: current.propertyType === 'unknown' ? (schemaFacts.propertyType || 'unknown') : current.propertyType,
          priceAmount: current.priceAmount || schemaFacts.priceAmount || '',
          currency: schemaFacts.currency || current.currency,
          pricePeriod: current.pricePeriod === 'unknown' ? (schemaFacts.pricePeriod || 'unknown') : current.pricePeriod,
          localityId: current.localityId || localityMatch?.id || '',
          availability: current.availability || schemaFacts.availability || '',
          notes: extracted.slice(0, 5000),
        };
      });
      setManualMessage(Object.keys(schemaFacts).length ? 'Local file processed. Structured facts were suggested from page metadata; verify every value before saving.' : 'Local file processed in this browser. Review and edit the extracted notes before saving; the original file was not uploaded.');
    } catch (error) {
      setManualMessage(error instanceof Error ? 'Local import failed: ' + error.message.slice(0, 180) : 'Could not read that local file.');
    }
  }
  function downloadSelectedProbeBatch() {
    const selected = sources.filter((source) => selectedSourceIds.includes(source.id) && source.homepageUrl);
    if (!selected.length) { setSearchError('Select at least one source in Search settings first.'); return; }
    const payload = { version: 1, probes: selected.map((source) => ({ sourceId: source.id, urls: [source.homepageUrl] })) };
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'immogr-selected-source-probes.json';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    setSearchError('');
    setSourceSettingsMessage('Batch plan downloaded. The local agent checks registry authorization separately and skips sources without approval.');
  }
  function downloadLocalProbePlan() {
    const sourceId = selectedSourceId;
    const urls = [manualDraft.canonicalUrl.trim(), probeSecondUrl.trim()].filter(Boolean);
    if (!sourceId || !urls.length) { setManualMessage('Select a source and enter at least one HTTPS page URL first.'); return; }
    try {
      for (const value of urls) {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Only credential-free HTTPS page URLs can be included.');
      }
      const blob = new Blob([JSON.stringify({ sourceId, urls }, null, 2) + '\n'], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'immogr-probe-' + sourceId + '.json';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setManualMessage('Local probe plan downloaded. It contains only the source ID and page URLs; the local agent checks the registry authorization before sending any request.');
    } catch (reason) { setManualMessage(reason instanceof Error ? reason.message : 'Could not create the local probe plan.'); }
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
  async function downloadSearchDiagnostics() {
    setDiagnosticsDownloading(true);
    try { await downloadAllLogs(); }
    catch (reason) { setSearchError(reason instanceof Error ? reason.message : 'Could not download diagnostics.'); }
    finally { setDiagnosticsDownloading(false); }
  }
  async function discover() {
    setSearching(true); setSearchError(''); setSearchDiagnostics(null); setLeads([]); setSearched(false);
    try {
      if (!selectedSourceIds.length) throw new Error('Select at least one source.');
      if (!selectedLocalityIds.length) throw new Error('Select at least one locality.');
      const response = await fetch('/api/immogr/discovery', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ localityIds: selectedLocalityIds, category: 'direct_rental', sourceIds: selectedSourceIds }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const diagnostics = body.diagnostics && typeof body.diagnostics === 'object' ? body.diagnostics : {
          requestId: body.requestId || response.headers.get('X-Request-Id') || null,
          httpStatus: response.status, code: body.code || null, providerStatus: body.providerStatus || null,
          reason: body.reason || null,
        };
        setSearchDiagnostics(diagnostics);
        const detail = body.reason ? ' · ' + String(body.reason).slice(0, 180) : '';
        throw new Error((body.error || ('Discovery failed (' + response.status + ')')) + detail);
      }
      setSearchDiagnostics(body.diagnostics && typeof body.diagnostics === 'object' ? body.diagnostics : { httpStatus: response.status, resultCount: Array.isArray(body.leads) ? body.leads.length : 0 });
      setLeads(Array.isArray(body.leads) ? body.leads : []); setSearched(true);
    } catch (reason) { setSearchError(reason instanceof Error ? reason.message : 'Discovery failed'); }
    finally { setSearching(false); }
  }
  return <main className="shell immogr-shell" data-testid="immogr-root" style={{ maxWidth: 1440, width: '100%', margin: '0 auto', padding: 'clamp(12px, 2.5vw, 28px)' }}>
    <style>{`
      .immogr-shell { box-sizing: border-box; color: #eef4ff; }
      .immogr-shell * { box-sizing: border-box; }
      .immogr-panel { min-width: 0; padding: clamp(14px, 2vw, 24px) !important; }
      .immogr-shell input, .immogr-shell select, .immogr-shell textarea { font-size: 16px; min-height: 48px; }
      .immogr-shell button, .immogr-shell summary, .immogr-shell label.immogr-source-toggle { min-height: 48px; }
      .immogr-shell button { touch-action: manipulation; }
      .immogr-shell a { overflow-wrap: anywhere; }
      .immogr-inspector { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(260px, .85fr); gap: 14px; }
      .immogr-inspector-main, .immogr-inspector-side { min-width: 0; }
      .immogr-inspector pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 48vh; overflow: auto; font-size: 14px; line-height: 1.55; }
      .immogr-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
      .immogr-photo-card { min-width: 0; border: 1px solid #40536b; border-radius: 10px; padding: 8px; }
      .immogr-photo-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px; background: #101f33; }
      .immogr-source-grid, .immogr-locality-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; }
      .immogr-selection-block { margin-bottom: 20px; }
      .immogr-selection-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .immogr-selection-heading h2 { margin: 0 0 10px; font-size: 20px; }
      .immogr-selection-heading span { color: #9aadc5; font-size: 13px; }
      .immogr-selection-actions, .immogr-search-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
      .immogr-selection-actions button, .immogr-search-actions button { padding: 9px 14px; border: 1px solid #52708f; border-radius: 8px; background: #152b43; color: #eef4ff; }
      .immogr-search-actions { justify-content: flex-end; margin-top: 18px; }
      .immogr-search-actions button:last-child { background: #2473ad; border-color: #2473ad; font-weight: 700; min-width: 130px; }
      .immogr-advanced { margin-top: 16px; }
      .immogr-advanced > summary { cursor: pointer; color: #9aadc5; padding: 12px 0; }
      .immogr-lead-list li { margin: 10px 0; overflow-wrap: anywhere; }
      .immogr-lead-list li div { color: #9aadc5; font-size: 12px; }
      .immogr-probe-result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
      .immogr-probe-result { border: 1px solid #40536b; border-radius: 9px; padding: 12px; background: #101f33; min-width: 0; }
      .immogr-source-toggle { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid #40536b; border-radius: 9px; background: #101f33; }
      .immogr-source-toggle input { width: 22px; height: 22px; min-height: 22px; accent-color: #54a9e8; }
      .immogr-settings summary, .immogr-shell details > summary { cursor: pointer; padding: 10px 4px; font-weight: 650; }
      @media (max-width: 760px) {
        .immogr-inspector { grid-template-columns: minmax(0, 1fr); }
        .immogr-shell h1 { font-size: 30px !important; }
        .immogr-shell h2 { font-size: 21px; }
        .immogr-shell form { grid-template-columns: minmax(0, 1fr) !important; }
        .immogr-shell form > label, .immogr-shell form > div { grid-column: 1 / -1 !important; }
        .immogr-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .immogr-probe-result-grid { grid-template-columns: minmax(0, 1fr); }
      }
      @media (min-width: 761px) and (max-width: 1100px) {
        .immogr-shell { padding: 18px !important; }
        .immogr-inspector { grid-template-columns: minmax(0, 1.2fr) minmax(220px, .8fr); }
      }
    `}</style>
    <p><a href="/">← BiForge home</a></p>
    <header style={{ margin: '8px 0 18px' }}>
      <h1 style={{ fontSize: 32, margin: '8px 0' }}>ImmoGR · Rental search</h1>
    </header>
    <section className="immogr-panel" style={{ ...panel, marginBottom: 18 }} data-testid="immogr-search">
      <div className="immogr-selection-block">
        <div className="immogr-selection-heading"><h2>Sources</h2><span>{selectedSourceIds.length} / {sources.length || 29}</span></div>
        <div className="immogr-selection-actions">
          <button type="button" onClick={() => setSelectedSourceIds(sources.map((source) => source.id))}>Select all</button>
          <button type="button" onClick={() => setSelectedSourceIds([])}>Clear</button>
        </div>
        <div className="immogr-source-grid">{sources.map((source) => <label className="immogr-source-toggle" key={source.id}>
          <input type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={(event) => setSelectedSourceIds((current) => event.target.checked ? [...current, source.id] : current.filter((id) => id !== source.id))} />
          <span>{source.name}</span>
        </label>)}</div>
      </div>
      <div className="immogr-selection-block">
        <div className="immogr-selection-heading"><h2>Localities</h2><span>{selectedLocalityIds.length} / {manualLocalities.length || 45}</span></div>
        <div className="immogr-selection-actions">
          <button type="button" onClick={() => setSelectedLocalityIds(manualLocalities.map((item) => item.id))}>Select all</button>
          <button type="button" onClick={() => setSelectedLocalityIds([])}>Clear</button>
        </div>
        <div className="immogr-locality-grid">{manualLocalities.map((item) => <label className="immogr-source-toggle" key={item.id}>
          <input type="checkbox" checked={selectedLocalityIds.includes(item.id)} onChange={(event) => setSelectedLocalityIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
          <span>{item.name}</span>
        </label>)}</div>
      </div>
      <div className="immogr-search-actions">
        <button type="button" onClick={() => void downloadSearchDiagnostics()} disabled={diagnosticsDownloading}>{diagnosticsDownloading ? 'Preparing logs…' : 'Download logs'}</button>
        <button type="button" onClick={() => void discover()} disabled={!status?.liveDiscoveryEnabled || searching || !selectedSourceIds.length || !selectedLocalityIds.length}>{searching ? 'Searching…' : 'Search'}</button>
      </div>
      {searchError && <p role="alert">{searchError}</p>}
      {searched && <p role="status">{leads.length} candidate URLs found (maximum 100). Results are unverified.</p>}
      {leads.length > 0 && <ol className="immogr-lead-list">{leads.map((lead) => <li key={lead.url}><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.title || lead.host}</a><div>{lead.host} · unverified</div></li>)}</ol>}
    </section>
    <details className="immogr-advanced">
      <summary>Personal notebook and research tools</summary>
    <section className="immogr-panel" style={{ ...panel, marginBottom: 18 }} data-testid="immogr-manual-research">
      <h2 style={{ marginTop: 0 }}>Personal manual research notebook · {sources.length || 29} sources</h2>
      <p style={{ color: '#9aadc5' }}>Select a source, open its page, and save your observations. Automation status is shown separately and does not hide manual research.</p>
      <label>Source<select value={selectedSourceId} onChange={(e) => selectManualSource(e.target.value)} style={field}><option value="">Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name} · automation: {source.automationStatus}</option>)}</select></label>
      {selectedSourceId && <><p style={{ color: '#9aadc5', fontSize: 13 }}>Automation note: {sources.find((source) => source.id === selectedSourceId)?.accessNote}</p>{sources.find((source) => source.id === selectedSourceId)?.homepageUrl && <button type="button" onClick={openSourceHomepage} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Open source website ↗</button>}</>}
      {selectedSourceId && <form onSubmit={saveManualReview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, alignItems: 'end' }}>
        <label style={{ gridColumn: '1 / -1' }}>Original listing URL<input required type="url" value={manualDraft.canonicalUrl} onChange={(e) => setManualDraft({ ...manualDraft, canonicalUrl: e.target.value })} placeholder="https://…" style={field} /></label>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={openManualSource} disabled={!manualDraft.canonicalUrl} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Open original page ↗</button><button type="button" onClick={downloadLocalProbePlan} disabled={!manualDraft.canonicalUrl || !selectedSourceId} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Download local probe plan</button><span style={{ color: '#9aadc5', fontSize: 12, alignSelf: 'center' }}>The original page opens directly; the plan only runs on your local agent if the source registry explicitly authorizes it.</span></div>
        <label style={{ gridColumn: '1 / -1' }}>Second page URL for a three-request probe (optional)<input type="url" value={probeSecondUrl} onChange={(e) => setProbeSecondUrl(e.target.value)} placeholder="https://same-source.example/another-page" style={field} /><span style={{ color: '#9aadc5', fontSize: 12 }}>The local runner counts robots.txt as request one. Add at most two page URLs; all must use the same authorized host.</span></label>
        <label style={{ gridColumn: '1 / -1' }}>Import a local page, document or variant-B probe report (HTML, TXT, MD, PDF, DOCX, XLSX, PPTX, CSV, TSV, JSON · up to 5 MB)<input type="file" accept=".html,.htm,.txt,.md,.pdf,.docx,.xlsx,.pptx,.csv,.tsv,.json,text/html,text/plain,application/pdf" onChange={(e) => void importLocalPageFile(e.target.files?.[0])} style={field} /><span style={{ color: '#9aadc5', fontSize: 12 }}>Read and extract locally in this browser. The original file is not uploaded; extraction runs in this browser and notes are saved only when you submit the form. Scanned-image OCR is not yet supported.</span></label>
        {localPageInspection && <div style={{ gridColumn: '1 / -1', border: '1px solid #40536b', borderRadius: 10, padding: 14, background: '#0e1c2e' }} data-testid="immogr-page-inspector">
          <h3 style={{ marginTop: 0 }}>Local page viewer</h3>
          <p style={{ color: '#9aadc5', fontSize: 12 }}>Extracted from the HTML file you selected or imported from your local ImmoGR agent. The page's scripts are not executed and its original file is not uploaded. Photo URLs are listed first; thumbnails load only after you explicitly choose to show them.</p>
          <p><strong>{localPageInspection.title || 'Untitled page'}</strong> · {localPageInspection.text.length.toLocaleString()} text characters · {localPageInspection.links.length} links · {localPageInspection.images.length} photo URLs · {localPageInspection.jsonLd.length} JSON-LD block(s)</p>
          {localPageInspection.sourceUrl && <p style={{ overflowWrap: 'anywhere', fontSize: 12 }}>Page URL: {localPageInspection.sourceUrl}</p>}
          <div className="immogr-inspector">
            <div className="immogr-inspector-main"><details open><summary>Listing text</summary><pre>{localPageInspection.text || 'No readable body text found.'}</pre></details></div>
            <aside className="immogr-inspector-side">
              <h4 style={{ margin: '8px 0' }}>Photos ({localPageInspection.images.length})</h4>
              <button type="button" onClick={() => setShowPageImages((current) => !current)} disabled={!localPageInspection.images.length} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>{showPageImages ? 'Hide photo previews' : 'Load photo previews'}</button>
              <p style={{ color: '#9aadc5', fontSize: 12 }}>Photo files are requested directly from their hosts only after you tap the button. No ImmoGR image proxy is used.</p>
              {showPageImages && <div className="immogr-photo-grid">{localPageInspection.images.map((item, index) => {
                let previewable = false;
                try { const imageUrl = new URL(item.url); previewable = imageUrl.protocol === 'https:' && !imageUrl.username && !imageUrl.password && !/^(localhost|.*\.local)$/i.test(imageUrl.hostname) && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(imageUrl.hostname) && !imageUrl.hostname.includes(':'); } catch { /* invalid preview URL */ }
                return <div className="immogr-photo-card" key={item.url + index}>
                  {previewable ? <a href={item.url} target="_blank" rel="noopener noreferrer"><img src={item.url} alt={item.alt || 'Listing photo'} title={item.title || item.alt || 'Listing photo'} loading="lazy" referrerPolicy="no-referrer" /></a> : <p style={{ color: '#9aadc5', fontSize: 12 }}>Preview unavailable for this URL scheme or host.</p>}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>{item.alt || item.title || 'Open photo'}</a>
                </div>;
              })}</div>}
              <details style={{ marginTop: 10 }}><summary>Photo URLs</summary><ul>{localPageInspection.images.map((item, index) => <li key={item.url + index} style={{ overflowWrap: 'anywhere', margin: '6px 0' }}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>{item.alt ? ' · ' + item.alt : ''}</li>)}</ul></details>
            </aside>
          </div>
          <details><summary>Page links ({localPageInspection.links.length})</summary><ul>{localPageInspection.links.map((item, index) => <li key={item.url + index} style={{ overflowWrap: 'anywhere', margin: '6px 0' }}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.text || item.url}</a></li>)}</ul></details>
          <details><summary>Metadata and JSON-LD</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ metadata: localPageInspection.metadata, jsonLd: localPageInspection.jsonLd }, null, 2)}</pre></details>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" onClick={() => { const blob = new Blob([localPageSnapshot], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'immogr-local-page-snapshot.html'; anchor.click(); URL.revokeObjectURL(url); }}>Save local HTML snapshot</button>
            <button type="button" onClick={() => { const blob = new Blob([JSON.stringify(localPageInspection, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'immogr-page-inspection.json'; anchor.click(); URL.revokeObjectURL(url); }}>Export extracted data</button>
            <button type="button" onClick={() => { setLocalPageInspection(null); setLocalPageSnapshot(''); setShowPageImages(false); }}>Close viewer</button>
          </div>
        </div>}
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
      <p style={{ color: '#9aadc5', fontSize: 12, marginBottom: 0 }}>Notes are unverified. Keep the source URL for follow-up. Do not enter passwords or session tokens.</p>
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <section style={panel}><h2>Direct Rentals</h2><p>Long-term rental offers in one of the 44 selected localities, with verified monthly rent up to CHF 2,000 and a private advertiser.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Listing qualification remains disabled until a permitted source and page-level evidence pipeline are approved.</p></section>
      <section style={panel}><h2>Private Owner Prospects</h2><p>Specific seasonal or holiday properties with evidence of a private owner and a direct public contact route.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Long-term rental potential will be labelled as an estimate, never as a confirmed offer.</p></section>
      <section style={panel}><h2>Evidence &amp; Reviews</h2><p>Every admitted fact will carry its source URL, supporting page evidence, extraction method, and review status.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>No search-result snippet alone can create a listing.</p></section>
    </div>
    {probeBatchReport && <section className="immogr-panel" style={{ ...panel, marginTop: 18 }} data-testid="immogr-probe-batch-results">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Local research probe results</h2>
        <button type="button" onClick={() => setProbeBatchReport(null)} style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid #52708f', background: '#152b43', color: '#eef4ff' }}>Close report</button>
      </div>
      <p style={{ color: '#9aadc5', fontSize: 13 }}>Generated {new Date(probeBatchReport.generatedAt).toLocaleString()} · {probeBatchReport.sourceCount} registry sources · requests sent: {probeBatchReport.requestsSentByThisBatch === null ? 'unknown (a probe failed before its count was recorded)' : probeBatchReport.requestsSentByThisBatch}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>{Object.entries(probeBatchReport.summary || {}).map(([status, count]) => <span key={status} style={{ border: '1px solid #40536b', borderRadius: 20, padding: '6px 10px', fontSize: 12 }}>{status}: <strong>{count}</strong></span>)}</div>
      <div className="immogr-probe-result-grid">{probeBatchReport.results.map((result) => <article className="immogr-probe-result" key={result.sourceId}>
        <strong>{result.sourceName}</strong>
        <div style={{ margin: '6px 0', fontSize: 13 }}>Status: <strong>{result.status}</strong> · requests: {result.requestCount ?? '—'}</div>
        {result.reason && <p style={{ margin: 0, color: '#c2cede', fontSize: 12, overflowWrap: 'anywhere' }}>{result.reason}</p>}
        {result.reportPath && <p style={{ margin: '6px 0 0', color: '#9aadc5', fontSize: 11, overflowWrap: 'anywhere' }}>Local report: {result.reportPath}</p>}
      </article>)}</div>
    </section>}
    </details>
    <p style={{ marginTop: 24, color: '#8fa6c2', fontSize: 13 }}>ImmoFinder is permanently retired. ImmoGR has separate code, configuration, data, search runs, and quality checks.</p>
  </main>;
}
