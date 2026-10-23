/** App chrome: method guide and main header. */
import React, { useState, useRef } from 'react';
import { ModeMenu, type AppMode } from './ModeMenu.tsx';
import {
  BrainCircuit, CircleHelp, Cloud, CloudUpload, History as HistoryIcon,
  MoreHorizontal, SlidersHorizontal, Trash2, KeyRound, FolderOpen, Download, Upload, Plus,
} from 'lucide-react';
import { STAGES, LOOPS, type Step, type Decision } from './decision.ts';
import { FEATURES } from './config.ts';
import { StateNotice, driveLabel as sharedDriveLabel, driveTitle, historyLabel, HISTORY_OFF_TITLE } from './uiStates.tsx';
import { PICK_FOLDER_EVENT } from './WorkspacePanel.tsx';

export function MethodGuide({ step, stageMeta, busy }: { step: Step; stageMeta: typeof STAGES[number]; busy: boolean }) {
  const currentLoopIndex = Math.max(0, LOOPS.findIndex((l) => l.steps.includes(step)));
  return (
    <div className="method-guide" style={{ padding: '14px 18px', marginBottom: 16 }}>
      <div className="method-guide-head" style={{ alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">ANALYSIS</div>
          <h1 style={{ marginBottom: 4 }}>Your decision, step by step</h1>
          <p style={{ margin: 0 }}>The analysis below is built from your conversation and the information already found.</p>
        </div>
        {busy && <div className="method-busy"><div className="spinner" /> Working…</div>}
      </div>
      <div className="method-stepper" aria-label="Expert analysis progress" style={{ marginTop: 12 }}>
        {LOOPS.map((loop, i) => {
          const active = i === currentLoopIndex;
          const done = i < currentLoopIndex;
          return (
            <div key={loop.id} className={`method-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <span>{done ? '✓' : i + 1}</span>
              <b>{loop.label}</b>
            </div>
          );
        })}
      </div>
      <div className="method-current" style={{ marginTop: 10, padding: '10px 12px' }}>
        <div>
          <span className="method-current-label">NOW</span>
          <strong>{stageMeta.label}</strong>
        </div>
        <div className="method-current-count">{currentLoopIndex + 1} / {LOOPS.length}</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: '#c5d4e8' }}>
        <strong>What this step is for:</strong> {stageMeta.human}
        {stageMeta.model && stageMeta.model !== 'Not used yet' ? (
          <span> · <strong>Model helps with:</strong> {stageMeta.model}</span>
        ) : null}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#8fa6c2' }}>
        Progress when you are ready — nothing advances automatically. Open chat below is for clarifications only.
      </p>
    </div>
  );
}

// --- Header ---
export function Header(props: {
  onNew: () => void;
  showNew?: boolean;
  onExport?: () => void;
  onExportAll: (fmt: 'json' | 'md' | 'docx' | 'pdf' | 'gdocs') => void;
  onImport: (f: File) => void;
  onImportAsDialog?: (f: File) => void;
  onImportDrive?: () => void;
  onBrief?: () => void;
  onDelete?: () => void;
  expertMode?: boolean;
  onToggleExpert?: () => void;
  onChangeMode?: () => void;
  onSelectMode?: (mode: AppMode) => void;
  onDrive?: () => void;
  driveConnected?: boolean;
  driveBusy?: boolean;
  driveMessage?: string;
  onGoogleAI?: () => void;
  onProgramFiles?: () => void;
  onHistory?: () => void;
  historyAvailable?: boolean;
  projectModeEnabled?: boolean;
  onUserGuide?: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [sub, setSub] = useState<'' | 'export' | 'import'>('');
  const moreRef = useRef<HTMLDivElement>(null);
  // Cloud is a sync status indicator only; actions live under More → Import / Export all.
  const driveLabel = sharedDriveLabel({ connected: Boolean(props.driveConnected), busy: props.driveBusy });
  React.useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc as unknown as EventListener, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc as unknown as EventListener); document.removeEventListener('keydown', onKey); };
  }, [moreOpen]);
  return (
    <header className="header" style={{ justifyContent: 'flex-end' }}>
      <div className="header-actions has-mode">
        {props.onSelectMode && props.onChangeMode && (
          <ModeMenu current={props.expertMode ? 'Expert' : 'Simple'} projectEnabled={Boolean(props.projectModeEnabled)} onSelect={props.onSelectMode} onOverview={props.onChangeMode} />
        )}
        {props.showNew !== false && <button className="ghost" onClick={props.onNew} title="Start a new conversation" aria-label="New conversation"><Plus size={14} /> <span className="lbl">New</span></button>}
        {props.onDrive && (
          <button className="ghost" onClick={props.onDrive} disabled={props.driveBusy} aria-label={driveLabel} title={driveTitle({ connected: Boolean(props.driveConnected) })}>
            {props.driveConnected ? <CloudUpload size={14} /> : <Cloud size={14} />} <span className="lbl">{driveLabel}</span>
          </button>
        )}
        {props.onHistory && (
          props.historyAvailable === false
            ? <button className="ghost" disabled aria-label={historyLabel(false)} title={HISTORY_OFF_TITLE}><HistoryIcon size={14} /> <span className="lbl">{historyLabel(false)}</span></button>
            : <button className="ghost" onClick={props.onHistory} aria-label="History" title="Open past conversations on this device"><HistoryIcon size={14} /> <span className="lbl">{historyLabel(true)}</span></button>
        )}
        {/* Decision brief lives in the More menu (not a header button): six header buttons pushed More onto a second row. */}
        <div className="hdr-more-wrap" ref={moreRef}>
          <button className="ghost hdr-more-btn" aria-label="More tools" title="Export, import, saved texts, help, and settings" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
            <MoreHorizontal size={14} /> <span className="lbl">More</span>
          </button>
          {/* Unified More menu (same order in both modes; Brief / Delete only in expert) */}
          <div className={`hdr-secondary${moreOpen ? ' open' : ''}`} role="menu">
            <button type="button" className="ghost" role="menuitem" aria-expanded={sub === 'export'} onClick={() => setSub(sub === 'export' ? '' : 'export')}>
              <Download size={14} /> Export all ▸
            </button>
            {sub === 'export' && (
              <div className="hdr-sub" role="menu">
                {([['json', 'Backup (.json)'], ['md', 'Readable text (.md)'], ['docx', 'Word'], ['pdf', 'PDF'], ['gdocs', 'Google Docs']] as const).map(([f, label]) => (
                  <button key={f} type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); setSub(''); props.onExportAll(f); }}>{label}</button>
                ))}
              </div>
            )}
            <button type="button" className="ghost" role="menuitem" aria-expanded={sub === 'import'} onClick={() => setSub(sub === 'import' ? '' : 'import')}>
              <Upload size={14} /> Import ▸
            </button>
            {sub === 'import' && (
              <div className="hdr-sub" role="menu">
                <label className="ghost" style={{ cursor: 'pointer' }} role="menuitem">
                  From backup (.json)
                  <input type="file" accept="application/json,.json" hidden onChange={(e) => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    if (f) { props.onImport(f); setMoreOpen(false); setSub(''); }
                  }} />
                </label>
                {isFolderPickerSupported() && (
                  <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); setSub(''); window.dispatchEvent(new CustomEvent(PICK_FOLDER_EVENT)); }} title="Load a whole project folder from this computer so the assistant can read it (desktop browsers only)">
                    <FolderOpen size={14} /> Project folder (desktop)
                  </button>
                )}
                {props.onImportDrive && (
                  <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); setSub(''); props.onImportDrive?.(); }}>From Google Drive</button>
                )}
                {props.onImportAsDialog && (
                  <label className="ghost" style={{ cursor: 'pointer' }} role="menuitem">
                    From a file as a new dialogue
                    <input type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf" hidden onChange={(e) => {
                      const f = e.target.files?.[0]; e.target.value = '';
                      if (f) { props.onImportAsDialog?.(f); setMoreOpen(false); setSub(''); }
                    }} />
                  </label>
                )}
              </div>
            )}
            {props.onProgramFiles && (
              <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); props.onProgramFiles?.(); }} title="Texts saved from chats on this device">
                Saved texts on this device
              </button>
            )}
            {props.onGoogleAI && (
              <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); props.onGoogleAI?.(); }} title="Optional: use your own Gemini API key">
                <KeyRound size={14} /> Your Gemini API key
              </button>
            )}
            {props.onUserGuide && (
              <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); props.onUserGuide?.(); }} title="Open the BiForge user guide">
                <CircleHelp size={14} /> User guide
              </button>
            )}
            {props.expertMode && props.onBrief && (
              <button type="button" className="ghost" role="menuitem" onClick={() => { setMoreOpen(false); props.onBrief?.(); }} title="Short overview of this decision"><SlidersHorizontal size={14} /> Decision brief</button>
            )}
            {props.expertMode && props.onDelete && (
              <button type="button" className="ghost danger" role="menuitem" aria-label="Delete" onClick={() => { setMoreOpen(false); props.onDelete?.(); }}>
                <Trash2 size={14} /> Delete dialogue
              </button>
            )}
          </div>
        </div>
        {props.driveMessage && <span className="hdr-msg">{props.driveMessage}</span>}
      </div>
    </header>
  );
}

