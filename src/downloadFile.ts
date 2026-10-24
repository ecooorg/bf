/** Downloads through fetch+blob (the path that works on mobile Chrome for the diagnostic ZIP) and reports every failure. */
export async function downloadViaFetch(url: string, fallbackName: string): Promise<void> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) { let why = ''; try { const j = await response.json(); why = j?.error ? `: ${j.error}` : ''; } catch { /* not JSON */ } throw new Error(`Download failed (HTTP ${response.status})${why}`); }
  const blob = await response.blob();
  if (!blob.size) throw new Error('Download failed: the server returned an empty file');
  const name = decodeURIComponent((response.headers.get('content-disposition') || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] || '') || fallbackName;
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = href; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}
