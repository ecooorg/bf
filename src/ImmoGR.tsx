import { useEffect, useState, type CSSProperties } from 'react';
type ImmoGRStatus = { product: string; stage: string; liveSearchEnabled: boolean; message: string; resultCategories: string[] };
const panel: CSSProperties = { border: '1px solid #243a57', borderRadius: 14, background: '#0b1626', padding: 20, minHeight: 150 };
export default function ImmoGR() {
  const [status, setStatus] = useState<ImmoGRStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
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
  return <main className="shell" data-testid="immogr-root" style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
    <p><a href="/">← BiForge home</a></p>
    <header style={{ margin: '22px 0 28px' }}>
      <p style={{ color: '#9fd8ff', letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>INDEPENDENT PROPERTY DISCOVERY</p>
      <h1 style={{ fontSize: 36, margin: '8px 0' }}>ImmoGR</h1>
      <p style={{ color: '#9aadc5', maxWidth: 760 }}>A new evidence-first search system for verified long-term rentals and private-owner prospects in the target communes of Graubünden.</p>
      <span style={{ display: 'inline-block', border: '1px solid #52647a', borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>WP1 · Foundation and source research</span>
    </header>
    <section style={{ ...panel, minHeight: 0, marginBottom: 18 }} aria-live="polite">
      <h2 style={{ marginTop: 0 }}>Search engine status</h2>
      {error && <p role="alert">{error}</p>}
      {!status && !error && <p>Checking ImmoGR status…</p>}
      {status && <><p><strong>{status.stage}</strong></p><p>{status.message}</p><p style={{ color: '#f4d28b', marginBottom: 0 }}>Live search is not enabled. No listings or owner contacts are fabricated or carried over from ImmoFinder.</p></>}
    </section>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      <section style={panel}><h2>Direct Rentals</h2><p>Long-term rental offers on a specific property page, in a target commune, with verified monthly rent up to CHF 2,000 and a private advertiser.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Awaiting source validation and real-page extraction.</p></section>
      <section style={panel}><h2>Private Owner Prospects</h2><p>Specific seasonal or holiday properties with evidence of a private owner and a direct public contact route.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>Long-term rental potential will be labelled as an estimate, never as a confirmed offer.</p></section>
      <section style={panel}><h2>Evidence &amp; Reviews</h2><p>Every admitted fact will carry its source URL, supporting page evidence, extraction method, and review status.</p><p style={{ color: '#9aadc5', fontSize: 13 }}>No search-result snippet alone can create a listing.</p></section>
    </div>
    <p style={{ marginTop: 24, color: '#8fa6c2', fontSize: 13 }}>ImmoFinder is permanently retired. ImmoGR has separate code, configuration, data, search runs, and quality checks.</p>
  </main>;
}
