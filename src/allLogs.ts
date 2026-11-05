/**
 * Client helper: download the unified 72h all-logs ZIP from GET /api/diagnostics/all-logs.
 * Does not display content on screen — only triggers a file download.
 */
export async function downloadAllLogs(): Promise<void> {
  const response = await fetch('/api/diagnostics/all-logs', { credentials: 'same-origin' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`All Logs download failed (${response.status})${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
  const filename = match ? match[1].replace(/['"]/g, '') : `biforge-all-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
