const STORAGE_KEY = 'biforge.emergency-log.v1';
const MAX_ENTRIES = 40;
const MAX_SUMMARY_CHARS = 7000;
type Entry = { at: string; kind: string; message: string; source?: string; stack?: string };

function readEntries(): Entry[] {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function writeEntry(entry: Entry) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...readEntries(), entry].slice(-MAX_ENTRIES))); }
  catch { /* Storage may be unavailable or full; keep the in-memory report usable. */ }
  memoryEntries.push(entry);
}
const memoryEntries: Entry[] = [];
let overlayShown = false;

export function recordEmergencyError(kind: string, error: unknown, source?: string) {
  const value = error instanceof Error ? error : new Error(String(error));
  const entry: Entry = { at: new Date().toISOString(), kind, message: value.message || String(error), source, stack: value.stack };
  writeEntry(entry);
  return entry;
}

export function emergencyLogText(): string {
  const storedEntries = readEntries();
  const entries = (storedEntries.length ? storedEntries : memoryEntries).slice(-MAX_ENTRIES);
  return [
    'BIFORGE EMERGENCY LOG', `exportedAt=${new Date().toISOString()}`,
    `url=${location.pathname}`, `userAgent=${navigator.userAgent}`,
    `online=${navigator.onLine}`, `viewport=${innerWidth}x${innerHeight}`,
    `documentState=${document.readyState}`, `rootPresent=${Boolean(document.getElementById('root'))}`,
    `entries=${entries.length}`, '',
    ...entries.map((e, i) => [`[${i + 1}] ${e.at} ${e.kind}`, `message=${e.message}`, e.source ? `source=${e.source}` : '', e.stack ? `stack=${e.stack}` : ''].filter(Boolean).join('\n')),
  ].join('\n');
}

export function uiErrorSummaryText(): string {
  const storedEntries = readEntries();
  const entries = (storedEntries.length ? storedEntries : memoryEntries).slice(-20);
  const lines = [
    'BIFORGE UI ERROR SUMMARY',
    `url=${location.pathname}`,
    `time=${new Date().toISOString()}`,
    `online=${navigator.onLine}`,
    `document=${document.readyState}`,
    `errors=${entries.length}`,
  ];
  for (const [index, entry] of entries.entries()) {
    lines.push('', `[${index + 1}] ${entry.kind} ${entry.at}`, `message=${String(entry.message || '').replace(/[\r\n\t]+/g, ' ').slice(0, 240)}`);
    if (entry.source) lines.push(`source=${String(entry.source).replace(/[\r\n\t]+/g, ' ').slice(0, 180)}`);
    if (entry.stack) {
      const firstUsefulFrame = entry.stack.split('\n').find(line => /at |@/.test(line));
      if (firstUsefulFrame) lines.push(`frame=${firstUsefulFrame.trim().slice(0, 180)}`);
    }
  }
  return lines.join('\n').slice(0, MAX_SUMMARY_CHARS) + '\n';
}

export function downloadUiErrorSummary() {
  const blob = new Blob([uiErrorSummaryText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'UI_ERROR_SUMMARY.txt';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadEmergencyLog() {
  const blob = new Blob([emergencyLogText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'biforge-emergency.log';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function showEmergencyScreen() {
  if (overlayShown) return;
  overlayShown = true;
  const root = document.getElementById('root');
  if (!root) return;
  const panel = document.createElement('main');
  panel.setAttribute('role', 'alert');
  panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#101820;color:#fff;padding:24px;font:16px/1.5 system-ui,sans-serif';
  const title = document.createElement('h1'); title.textContent = 'BiForge encountered a critical error';
  const text = document.createElement('p'); text.textContent = 'The interface was stopped to prevent a blank screen. Download the emergency log and send it to support.';
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Download UI error summary';
  button.style.cssText = 'padding:14px 18px;margin:12px 0;background:#245b91;color:white;border:0;border-radius:8px;font-size:16px';
  button.addEventListener('click', downloadUiErrorSummary);
  const details = document.createElement('pre'); details.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;background:#080d12;padding:12px;border-radius:8px;font-size:12px'; details.textContent = emergencyLogText();
  panel.append(title, text, button, details);
  root.replaceChildren(panel);
}

export function installEmergencyDiagnostics() {
  window.addEventListener('error', (event) => {
    // Resource-load errors target an Element; ordinary window errors target Window.
    // Narrow by runtime type instead of comparing incompatible DOM types.
    const target = event.target instanceof Element ? event.target : null;
    const resourceUrl = target instanceof HTMLImageElement ? target.src
      : target instanceof HTMLScriptElement ? target.src
      : target instanceof HTMLLinkElement ? target.href
      : '';
    const resource = target ? `${target.tagName || 'resource'} ${resourceUrl}` : undefined;
    recordEmergencyError(resource ? 'RESOURCE_ERROR' : 'WINDOW_ERROR', event.error || event.message, resource || `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`);
    const tag = target?.tagName?.toUpperCase();
    if (!resource || tag === 'SCRIPT' || tag === 'LINK') showEmergencyScreen();
  }, true);
  window.addEventListener('unhandledrejection', (event) => {
    recordEmergencyError('UNHANDLED_REJECTION', event.reason);
    showEmergencyScreen();
  });
}
