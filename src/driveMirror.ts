/**
 * Browser-side Google Drive mirror for user uploads and agent files (all modes).
 * Drive is a durable copy; the app keeps working offline / without Drive.
 * Requires a live access token with drive.file (see DRIVE_FULL_SCOPE on connect).
 * No server-side Google credentials.
 */
import {
  DriveAuthError,
  driveFindOrCreateFolder,
  driveUploadBinary,
  isDriveConfigured,
  type DriveToken,
} from './driveClient.ts';

const K_TOKEN = 'be_v13_drive_token';
const K_EXP = 'be_v13_drive_expires';
const MANIFEST_KEY = 'be_v13_drive_mirror_manifest';
const EXPIRY_MARGIN_MS = 30_000;
const FOLDER_CACHE_KEY = 'be_v13_drive_folder_id';

export type MirrorMode = 'simple' | 'expert' | 'project' | 'library' | 'unknown';

export interface MirrorEntry {
  localKey: string;
  name: string;
  driveId: string;
  mode: MirrorMode;
  size: number;
  updatedAt: number;
  webViewLink?: string;
}

export interface MirrorManifest {
  version: 1;
  files: MirrorEntry[];
}

function ssGet(k: string): string | null {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function lsGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* quota */ }
}

/** Live token from the same sessionStorage keys as useDrive (after Connect). */
export function getMirrorToken(): DriveToken | null {
  const token = ssGet(K_TOKEN);
  const exp = Number(ssGet(K_EXP));
  if (!token || !(exp - EXPIRY_MARGIN_MS > Date.now())) return null;
  return { token, expiresAt: exp };
}

export function isMirrorConnected(): boolean {
  return Boolean(getMirrorToken());
}

export function loadMirrorManifest(): MirrorManifest {
  try {
    const raw = lsGet(MANIFEST_KEY);
    if (!raw) return { version: 1, files: [] };
    const j = JSON.parse(raw);
    if (!j || j.version !== 1 || !Array.isArray(j.files)) return { version: 1, files: [] };
    return j as MirrorManifest;
  } catch {
    return { version: 1, files: [] };
  }
}

function saveMirrorManifest(m: MirrorManifest) {
  lsSet(MANIFEST_KEY, JSON.stringify({ version: 1, files: m.files.slice(-200) }));
}

export function getMirrorEntry(localKey: string): MirrorEntry | undefined {
  return loadMirrorManifest().files.find((f) => f.localKey === localKey);
}

export type MirrorStatus = 'saved' | 'not_on_drive' | 'not_connected' | 'not_configured';

export function mirrorStatus(localKey: string): MirrorStatus {
  if (!isDriveConfigured()) return 'not_configured';
  if (!isMirrorConnected()) return 'not_connected';
  return getMirrorEntry(localKey) ? 'saved' : 'not_on_drive';
}

function guessMime(name: string, fallback = 'application/octet-stream'): string {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.csv') || n.endsWith('.log')) return 'text/plain;charset=utf-8';
  if (n.endsWith('.json')) return 'application/json';
  return fallback;
}

/**
 * Upload a blob to Drive/BiForge and record it in the local manifest.
 * No-ops (returns null) when Drive is not configured or not connected — never throws to callers who fire-and-forget.
 */
export async function mirrorBlob(opts: {
  name: string;
  data: Blob;
  mimeType?: string;
  mode?: MirrorMode;
  localKey?: string;
}): Promise<MirrorEntry | null> {
  if (!isDriveConfigured()) return null;
  const tok = getMirrorToken();
  if (!tok) return null;
  const name = String(opts.name || 'file').slice(0, 200);
  const localKey = opts.localKey || `${Date.now()}_${name}`;
  const mime = opts.mimeType || guessMime(name);
  try {
    let parent = lsGet(FOLDER_CACHE_KEY) || '';
    if (!parent) {
      parent = await driveFindOrCreateFolder(tok.token);
      lsSet(FOLDER_CACHE_KEY, parent);
    }
    const up = await driveUploadBinary(tok.token, name, opts.data, mime, parent);
    const entry: MirrorEntry = {
      localKey,
      name,
      driveId: up.id,
      mode: opts.mode || 'unknown',
      size: opts.data.size || 0,
      updatedAt: Date.now(),
      webViewLink: up.webViewLink,
    };
    const man = loadMirrorManifest();
    const rest = man.files.filter((f) => f.localKey !== localKey);
    rest.push(entry);
    saveMirrorManifest({ version: 1, files: rest });
    return entry;
  } catch (e: any) {
    if (e instanceof DriveAuthError) {
      try {
        sessionStorage.removeItem(K_TOKEN);
        sessionStorage.removeItem(K_EXP);
      } catch { /* */ }
    }
    return null;
  }
}

/** Mirror a browser File (user upload in Simple/Expert/Project). */
export async function mirrorUserFile(file: File, mode: MirrorMode = 'unknown', localKey?: string): Promise<MirrorEntry | null> {
  return mirrorBlob({
    name: file.name,
    data: file,
    mimeType: file.type || guessMime(file.name),
    mode,
    localKey: localKey || `upload_${file.name}_${file.size}_${file.lastModified}`,
  });
}

/** Mirror plain text (e.g. agent document archive). */
export async function mirrorTextFile(
  name: string,
  text: string,
  mode: MirrorMode = 'unknown',
  localKey?: string,
): Promise<MirrorEntry | null> {
  const body = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const safe = name.endsWith('.txt') || name.endsWith('.md') ? name : `${name}.txt`;
  return mirrorBlob({
    name: safe,
    data: body,
    mimeType: 'text/plain;charset=utf-8',
    mode,
    localKey: localKey || `text_${safe}_${body.size}`,
  });
}
