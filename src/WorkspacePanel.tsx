/**
 * P27 — Simple Mode workspace attach UI (archive/folder → card → privacy → tree).
 * Expert Mode / ChangeSet / export: out of scope (P28/P29).
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FolderOpen, FileArchive, X, ChevronRight, Loader2 } from 'lucide-react';
import { ingestArchive, ingestFiles } from './workspace/ingest.ts';
import { IndexedDbWorkspaceStore } from './workspace/idbStore.ts';
import { readWorkspaceFile } from './workspace/context.ts';
import {
  canBuildWorkspaceContext,
  languageSummaryLine,
  persistIngestResult,
} from './workspace/persistIngest.ts';
import type { Entry, IngestReport, WorkspaceStore } from './workspace/types.ts';

export type WorkspaceUiState = {
  workspaceId: string;
  name: string;
  version: number;
  privacyAck: boolean;
  entries: Entry[];
  report?: IngestReport;
  languagesLine: string;
};

type Props = {
  disabled?: boolean;
  /** Injected store for tests; default IndexedDB in browser. */
  storeFactory?: () => WorkspaceStore;
  onStateChange?: (state: WorkspaceUiState | null) => void;
};

export function WorkspacePanel({ disabled, storeFactory, onStateChange }: Props) {
  const archiveRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [state, setState] = useState<WorkspaceUiState | null>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [openText, setOpenText] = useState<string | null>(null);
  const [openMeta, setOpenMeta] = useState<string | null>(null);
  const [folderSupported] = useState(() => {
    if (typeof document === 'undefined') return false;
    const input = document.createElement('input');
    return 'webkitdirectory' in input || 'directory' in input;
  });

  const storeRef = useRef<WorkspaceStore | null>(null);
  const getStore = useCallback(() => {
    if (storeFactory) return storeFactory();
    if (!storeRef.current) {
      try {
        storeRef.current = IndexedDbWorkspaceStore.open();
      } catch (e: any) {
        throw new Error(e?.message || 'workspace_indexeddb_unavailable');
      }
    }
    return storeRef.current;
  }, [storeFactory]);

  const publish = useCallback(
    (next: WorkspaceUiState | null) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  const runIngest = async (resultPromise: Promise<Awaited<ReturnType<typeof ingestArchive>>>, name: string) => {
    setBusy(true);
    setError(null);
    setStatus('Reading archive…');
    setOpenPath(null);
    setOpenText(null);
    setOpenMeta(null);
    try {
      const result = await resultPromise;
      if (result.report.rejected) {
        setError(`Rejected: ${result.report.rejected}${result.report.rejectDetail ? ` (${result.report.rejectDetail})` : ''}`);
        publish(null);
        return;
      }
      setStatus('Saving to this device…');
      const store = getStore();
      const persisted = await persistIngestResult(store, result, name);
      if (!persisted.ok) {
        setError(`Could not save workspace: ${persisted.code}${persisted.detail ? ` — ${persisted.detail}` : ''}`);
        publish(null);
        return;
      }
      const next: WorkspaceUiState = {
        workspaceId: persisted.workspaceId,
        name,
        version: persisted.version.no,
        privacyAck: false,
        entries: result.entries.slice().sort((a, b) => a.path.localeCompare(b.path)),
        report: result.report,
        languagesLine: languageSummaryLine(result.entries),
      };
      publish(next);
      setStatus(null);
    } catch (e: any) {
      setError(e?.message || 'Ingest failed');
      publish(null);
    } finally {
      setBusy(false);
    }
  };

  const onArchive = async (list: FileList | null) => {
    if (!list?.length || disabled || busy) return;
    const file = list[0];
    const buf = new Uint8Array(await file.arrayBuffer());
    await runIngest(ingestArchive(buf), file.name.replace(/\.(zip|tar\.gz|tgz|tar)$/i, '') || 'workspace');
    if (archiveRef.current) archiveRef.current.value = '';
  };

  const onFolder = async (list: FileList | null) => {
    if (!list?.length || disabled || busy) return;
    const files = Array.from(list);
    const label = files[0]?.webkitRelativePath?.split('/')[0] || 'folder';
    await runIngest(ingestFiles(files), label);
    if (folderRef.current) folderRef.current.value = '';
  };

  const ackPrivacy = async () => {
    if (!state || state.privacyAck) return;
    try {
      const store = getStore();
      if (store.setPrivacyAck) await store.setPrivacyAck(state.workspaceId, true);
      const next = { ...state, privacyAck: true };
      publish(next);
    } catch (e: any) {
      setError(e?.message || 'Could not save privacy acknowledgement');
    }
  };

  const clear = async () => {
    if (state) {
      try {
        const store = getStore();
        await store.deleteWorkspace(state.workspaceId);
      } catch {
        /* best effort */
      }
    }
    publish(null);
    setError(null);
    setStatus(null);
    setOpenPath(null);
    setOpenText(null);
    setOpenMeta(null);
  };

  const openEntry = async (entry: Entry) => {
    if (!state) return;
    setOpenPath(entry.path);
    setOpenText(null);
    setOpenMeta(null);
    try {
      const store = getStore();
      const read = await readWorkspaceFile(store, state.workspaceId, state.version, entry.path);
      if (read.text != null) {
        setOpenText(read.text);
        setOpenMeta(null);
      } else {
        setOpenText(null);
        setOpenMeta(
          [
            `Path: ${entry.path}`,
            `Class: ${entry.class}`,
            entry.lang ? `Language: ${entry.lang}` : null,
            `Size: ${entry.size} bytes`,
            `SHA-256: ${entry.sha256.slice(0, 12)}…`,
            read.reason ? `Note: ${read.reason}` : 'Binary or non-text — content not shown.',
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }
    } catch (e: any) {
      setOpenMeta(e?.message || 'Could not open file');
    }
  };

  const skippedPreview = useMemo(() => {
    const sk = state?.report?.skipped || [];
    return sk.slice(0, 8);
  }, [state]);

  return (
    <div className="workspace-panel" data-testid="workspace-panel">
      <div className="workspace-panel-buttons">
        <button
          type="button"
          className="ghost files-panel-btn"
          disabled={disabled || busy}
          onClick={() => archiveRef.current?.click()}
          title="Attach a zip or tar archive as a local workspace"
        >
          {busy ? <Loader2 size={16} className="spin" /> : <FileArchive size={16} />}
          <span>Workspace archive</span>
        </button>
        <button
          type="button"
          className="ghost files-panel-btn"
          disabled={disabled || busy || !folderSupported}
          onClick={() => folderRef.current?.click()}
          title={folderSupported ? 'Attach a folder as a local workspace' : 'Folder pick is not supported in this browser'}
        >
          <FolderOpen size={16} />
          <span>Workspace folder</span>
        </button>
        <input
          ref={archiveRef}
          type="file"
          accept=".zip,.tar,.tar.gz,.tgz,application/zip,application/x-tar,application/gzip"
          style={{ display: 'none' }}
          onChange={(e) => void onArchive(e.target.files)}
        />
        <input
          ref={folderRef}
          type="file"
          // @ts-expect-error webkitdirectory is non-standard but widely supported on desktop
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void onFolder(e.target.files)}
        />
      </div>

      {status && <div className="files-panel-status">{status}</div>}
      {error && <div className="files-panel-warn" role="alert">{error}</div>}
      {!folderSupported && (
        <div className="files-panel-warn">Folder attach is not available in this browser (e.g. many mobile browsers). Use a zip/tar archive instead.</div>
      )}

      {state && (
        <div className="workspace-card" data-testid="workspace-card">
          <div className="workspace-card-head">
            <strong>{state.name}</strong>
            <button type="button" className="ghost" onClick={() => void clear()} title="Remove local workspace" aria-label="Clear workspace">
              <X size={14} />
            </button>
          </div>
          <div className="workspace-card-meta">
            {state.entries.length} files · v{state.version}
            {state.languagesLine ? ` · ${state.languagesLine}` : ''}
            {state.report?.skipped?.length ? ` · skipped ${state.report.skipped.length}` : ''}
          </div>

          {!state.privacyAck ? (
            <div className="workspace-privacy" data-testid="workspace-privacy">
              <p>
                Files stay on this device until you send a message. The model receives workspace text only after you agree.
                Do not import secrets or personal data you are not willing to share with the model.
              </p>
              <button type="button" className="primary" disabled={disabled} onClick={() => void ackPrivacy()}>
                I understand — allow workspace context
              </button>
              {!canBuildWorkspaceContext(state.privacyAck) && (
                <span className="files-panel-warn"> Workspace is not sent to the model until you confirm.</span>
              )}
            </div>
          ) : (
            <div className="files-panel-status">Privacy acknowledged — workspace may be included when the product wires context (P28).</div>
          )}

          {skippedPreview.length > 0 && (
            <details className="workspace-skipped">
              <summary>Skipped ({state.report?.skipped.length})</summary>
              <ul>
                {skippedPreview.map((s) => (
                  <li key={s.path + s.reason}>
                    <code>{s.path}</code> — {s.reason}
                    {s.detail ? ` (${s.detail})` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="workspace-tree" data-testid="workspace-tree">
            {state.entries.map((e) => (
              <button
                type="button"
                key={e.path}
                className={`workspace-tree-item${openPath === e.path ? ' active' : ''}`}
                onClick={() => void openEntry(e)}
              >
                <ChevronRight size={12} />
                <span className="workspace-tree-path">{e.path}</span>
                <span className="workspace-tree-lang">{e.lang || e.class}</span>
              </button>
            ))}
          </div>

          {(openText != null || openMeta != null) && (
            <pre className="workspace-file-view" data-testid="workspace-file-view">
              {openText != null ? openText : openMeta}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

