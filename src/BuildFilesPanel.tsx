/** P127.25: live per-file build progress. Green = finished and downloadable, red = being generated now. */
import React from 'react';
import { downloadViaFetch } from './downloadFile.ts';

export type BuildFileView = { path: string; state: 'ready' | 'working' | 'pending' | 'failed'; downloadUrl?: string };

const LABEL: Record<BuildFileView['state'], string> = { ready: 'ready', working: 'in progress', pending: 'waiting', failed: 'failed' };
const COLOR: Record<BuildFileView['state'], string> = { ready: '#2fbf71', working: '#e5484d', pending: '#6b7f99', failed: '#e5484d' };

export function BuildFilesPanel({ files, archiveUrl, archiveName }: { files: BuildFileView[]; archiveUrl?: string; archiveName?: string }) {
  if (!files.length) return null;
  const ready = files.filter((f) => f.state === 'ready').length;
  return (
    <div data-testid="build-files" style={{ border: '1px solid #25405e', borderRadius: 12, padding: 10, margin: '8px 0', background: '#07111f' }}>
      <div style={{ fontSize: 13, color: '#8fa6c2', marginBottom: 6 }} data-testid="build-files-summary">Files: {ready}/{files.length} ready</div>
      {files.map((f) => (
        <div key={f.path} data-testid="build-file" data-state={f.state} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', color: COLOR[f.state], fontSize: 14 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: COLOR[f.state], flex: 'none', opacity: f.state === 'pending' ? 0.5 : 1 }} />
          <span style={{ flex: 1, wordBreak: 'break-all', fontWeight: f.state === 'working' ? 700 : 400 }}>{f.path}</span>
          <span style={{ fontSize: 12 }}>{LABEL[f.state]}</span>
          {f.state === 'ready' && f.downloadUrl ? (
            <button type="button" data-testid="build-file-download" style={{ minHeight: 32, padding: '2px 10px', borderRadius: 8, border: '1px solid #2fbf71', background: 'transparent', color: '#2fbf71', cursor: 'pointer' }}
              onClick={() => { void downloadViaFetch(f.downloadUrl!, f.path.split('/').pop() || 'file.txt').catch(() => undefined); }}>Download</button>
          ) : null}
        </div>
      ))}
      {archiveUrl ? (
        <button type="button" data-testid="build-files-archive" style={{ marginTop: 8, minHeight: 40, padding: '6px 14px', borderRadius: 10, border: '1px solid #78baff', background: '#24517b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => { void downloadViaFetch(archiveUrl, archiveName || 'source.zip').catch(() => undefined); }}>Download all as ZIP</button>
      ) : null}
    </div>
  );
}
