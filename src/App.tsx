import React, { Component, ErrorInfo, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, BrainCircuit, Check, CircleHelp,
  Download, FlaskConical, KeyRound, Lock, Plus, ShieldAlert, Trash2, Upload,
  Cloud, CloudUpload, History as HistoryIcon, MoreHorizontal, SlidersHorizontal,
  RotateCcw, FolderOpen,
} from 'lucide-react';
import {
  Decision, emptyDecision, STAGES, LOOPS, Step, Option, ExperimentCard,
  Hypothesis, NeutralItem, Unknown, uid, computeReviewDates, SCHEMA_VERSION,
  Level, Door, HumanDecision, JournalEntry,
} from './decision.ts';
import {
  getStoredDecisions, saveDecisions, getActiveDecisionId, setActiveDecisionId,
  getMigrationReport, getArchived,
} from './storage.ts';
import { exportDecisionJson, exportAllJson, downloadBlob, parseImportedJson, parseImportedBackup } from './exportZip.ts';
import { DISTRESS_MARKERS, SUPPORT_CONTACTS, hasDistressMarker, findDistressInTexts } from './support.ts';
import { FEATURES } from './config.ts';
import { exportFileName } from './exportName.ts';
import { useDrive } from './useDrive.ts';
import { HistoryPanel } from './HistoryPanel.tsx';
import { AutoInput, AutoTextarea } from './AutoGrow.tsx';
import { decisionToDocument } from './decisionDocument.ts';
import { FilesPanel, CopyButton, MessageExtras, ProgramFilesManager } from './ConversationFiles.tsx';
import { WorkspacePanel, isFolderPickerSupported, PICK_FOLDER_EVENT } from './WorkspacePanel.tsx';
import { parseChangeSetFromText } from './workspace/changeSetParse.ts';
import {
  Attachment, DocumentSpec, applyAttachmentNotes, attachmentOnlyText, collectAttachments, collectDecisionAttachments,
  conversationToDocument, fitRequest, historyForRequest,
} from './attachments.ts';
import { migrateAttachmentsFromDecisions, exportProgramFilesPayload, importProgramFilesPayload, archiveAgentDocument, archiveAttachment } from './programFiles.ts';
import { en } from './en.ts';
import { triage, TRIAGE_OUTCOME_TEXT, TRIAGE_OUTCOME_LABEL } from './triage.ts';
import { evpi, evpiRange, evpiVerdict, validateEvpiInput } from './evpi.ts';
import { brierScore } from './brier.ts';
import { cardChecksum } from './sha256Export.ts';
import { buildIcs } from './icsBuilder.ts';
import { detectUiLanguage, installUiLanguage, getStoredUiLanguage } from './ui.ts';
import { errorFromResponse, localizedException } from './errors.ts';
import { documentToMarkdown, libraryToDocument, planImport, importReport } from './libraryExport.ts';
import { saveDocumentToGoogleDocs } from './driveExport.ts';
import { isDriveConfigured } from './driveClient.ts';
import { downloadDocument, uploadAttachment } from './attachments.ts';
import { mirrorUserFile, setMirrorMode } from './driveMirror.ts';
import { ModeMenu, START_MODE_KEY, type AppMode } from './ModeMenu.tsx';
import { UserGuideModal } from './UserGuide.tsx';
import { expertConversationFields } from './expertContext.ts';
import { ExpertSidebar, ExpertBottomBar } from './ExpertNav.tsx';
import { expertBaseline, questionLine } from './expertHistory.ts';
import { STEP_TITLE } from './uiTerms.ts';
import { StateNotice, driveLabel as sharedDriveLabel, driveTitle, historyLabel, HISTORY_OFF_TITLE } from './uiStates.tsx';
import { briefSections, BRIEF_EMPTY_TEXT } from './briefView.ts';

import { api, stageIndex, sessionStatus, loginWithPassword } from './appApi.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { Header } from './AppHeader.tsx';
import {
  TriageScreen,
  UnderstandScreen,
  ExpandScreen,
  AttackScreen,
  TestScreen,
  DecideScreen,
  SynthesisScreen,
  LearnScreen,
  BriefPanel,
  StepTitle,
  isBriefWorthShowing,
} from './ExpertStepScreens.tsx';
import { BriefScreen, ConversationScreen, SharedConversationContext } from './ConversationScreens.tsx';

export default function App() {
  const [decisions, setDecisions] = useState<Decision[]>(() => getStoredDecisions());
  const [activeId, setActiveId] = useState(() => getActiveDecisionId());
  const drive = useDrive<Decision>(decisions, setDecisions);
  const [showHistory, setShowHistory] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const historyAvailable = useMemo(() => {
    try { localStorage.setItem('be_probe', '1'); localStorage.removeItem('be_probe'); return true; } catch { return false; }
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showBrief, setShowBrief] = useState(false);
  const [showProgramFiles, setShowProgramFiles] = useState(false);
  const [workspaceAttachments, setWorkspaceAttachments] = useState<{ name: string; kind: string; text: string }[]>([]);
  const [proposedWorkspaceChangeSet, setProposedWorkspaceChangeSet] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(() => {
    try { return sessionStorage.getItem(START_MODE_KEY) === 'Expert'; } catch { return false; }
  });
  // P55: the Drive folder follows the mode the person is in (BiForge → Simple | Expert).
  useEffect(() => { setMirrorMode(expertMode ? 'expert' : 'simple'); }, [expertMode]);
  const [startMode, setStartMode] = useState<'Simple' | 'Expert' | 'Project' | null>(() => {
    try {
      const saved = sessionStorage.getItem(START_MODE_KEY);
      // Returning from /project as Expert must open Expert, not Simple
      if (sessionStorage.getItem(START_MODE_KEY) === 'Expert') {/* expert restored via saved */}
      return saved === 'Simple' || saved === 'Expert' || saved === 'Project' ? saved : null;
    } catch { return null; }
  });
  function chooseStartMode(mode: 'Simple' | 'Expert' | 'Project') {
    if (mode === 'Project' && !projectModeEnabled) return;
    if (mode === 'Project') {
      // Project is a separate workspace and is never emulated by the chat UI.
      const ok = window.confirm(
        'Open Project?\n\nProjects are separate from your Simple and Expert conversations, which stay on this device.',
      );
      if (!ok) return;
      try { sessionStorage.setItem(START_MODE_KEY, mode); } catch {}
      window.location.href = '/project';
      return;
    }
    setExpertMode(mode === 'Expert');
    setStartMode(mode);
    try { sessionStorage.setItem(START_MODE_KEY, mode); } catch {}
  }
  function resetStartMode() {
    setStartMode(null);
    setExpertMode(false);
    try { sessionStorage.removeItem(START_MODE_KEY); } catch {}
  }
  const [migrationReport] = useState(() => getMigrationReport());
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [projectModeEnabled, setProjectModeEnabled] = useState(false);
  const [showGoogleAI, setShowGoogleAI] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => { try { return localStorage.getItem('bifurcation_gemini_key_v15') || ''; } catch { return ''; } });
  const [geminiModel, setGeminiModel] = useState(() => { try { return localStorage.getItem('bifurcation_gemini_model_v15') || 'gemini-3.6-flash'; } catch { return 'gemini-3.6-flash'; } });
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [uiLanguage, setUiLanguage] = useState<'en' | 'ru'>('en');

  useEffect(() => {
    sessionStatus().then(s => { setAuthenticated(s.authenticated); setAuthRequired(s.required); setProjectModeEnabled(s.projectModeEnabled); setAuthChecked(true); }).catch(() => { setAuthChecked(true); setAuthRequired(false); setProjectModeEnabled(false); setAuthenticated(true); });
  }, []);

  // Project mode is a separate route (/project). A leftover session value of "Project"
  // on the chat shell must not hide the mode start screen.
  useEffect(() => {
    if (startMode !== 'Project') return;
    setStartMode(null);
    setExpertMode(false);
    try { sessionStorage.removeItem(START_MODE_KEY); } catch {}
  }, [startMode]);

  async function refreshAiHealth() {
    try { const r = await fetch('/api/health'); const j = await r.json(); setAiHealth(j); } catch { setAiHealth(null); }
  }

  function openGoogleAI() { setShowGoogleAI(true); void refreshAiHealth(); }

  function saveGoogleAI() {
    try {
      if (geminiKey.trim()) localStorage.setItem('bifurcation_gemini_key_v15', geminiKey.trim()); else localStorage.removeItem('bifurcation_gemini_key_v15');
      localStorage.setItem('bifurcation_gemini_model_v15', geminiModel);
    } catch {}
    setShowGoogleAI(false);
    setMessage('Google AI settings saved.');
  }

  const active = useMemo(
    () => decisions.find((d) => d.id === activeId) || decisions[0] || null,
    [decisions, activeId]
  );

  // Detect the language from existing conversation content after the active decision is known.
  useEffect(() => {
    const existing = (active?.modelSuggestions as any)?.conversation?.find((m: any) => m?.role === 'user')?.content || active?.brief?.decision || '';
    setUiLanguage(existing ? detectUiLanguage(String(existing)) : 'en');
  }, [active?.id]);

  useEffect(() => installUiLanguage(uiLanguage), [uiLanguage]);

  useEffect(() => {
    const onUserLanguage = (event: Event) => {
      const text = String((event as CustomEvent)?.detail?.text || '').trim();
      if (text) setUiLanguage(detectUiLanguage(text));
    };
    window.addEventListener('be:user-language', onUserLanguage);
    return () => window.removeEventListener('be:user-language', onUserLanguage);
  }, []);

  useEffect(() => {
    saveDecisions(decisions);
  }, [decisions]);

  // Stage 3: one-shot migration of attachment texts into IndexedDB program files
  useEffect(() => {
    void migrateAttachmentsFromDecisions(decisions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (active?.id) setActiveDecisionId(active.id);
  }, [active?.id]);

  const update = useCallback(
    (patch: Partial<Decision> | ((d: Decision) => Decision)) => {
      setDecisions((prev) =>
        prev.map((d) => {
          if (d.id !== (active?.id || '')) return d;
          const next = typeof patch === 'function' ? patch(d) : { ...d, ...patch };
          return { ...next, updatedAt: Date.now() };
        })
      );
    },
    [active?.id]
  );

  const reviseConversationDocument = useCallback((messageIndex: number, next: DocumentSpec) => {
    update((d) => {
      const history = Array.isArray((d.modelSuggestions as any)?.conversation) ? [...(d.modelSuggestions as any).conversation] : [];
      const previous = history[messageIndex];
      if (!previous) return d;
      const revision = {
        role: 'assistant',
        content: 'I updated the document as requested.',
        document: next,
        at: Date.now(),
      };
      history.push(revision);
      return { ...d, modelSuggestions: { ...d.modelSuggestions, conversation: history } };
    });
  }, [uiLanguage, update]);

  const createNew = () => {
    const d = emptyDecision();
    setDecisions((prev) => [d, ...prev]);
    setActiveId(d.id);
  };


  // B2: export everything (json backup, or one document with every dialogue as a chapter).
  const exportAll = (fmt: 'json' | 'md' | 'docx' | 'pdf' | 'gdocs') => {
    if (!decisions.length) { setError('Nothing to export.'); return; }
    setError('');
    const base = exportFileName().replace(/\.json$/i, '');
    if (fmt === 'json') {
      void exportProgramFilesPayload().then((pf) => downloadBlob(exportAllJson(decisions, pf), exportFileName()));
      return;
    }
    const doc = libraryToDocument(decisions);
    if (fmt === 'md') { downloadBlob(new Blob([documentToMarkdown(doc)], { type: 'text/markdown' }), `${base}.md`); return; }
    if (fmt === 'gdocs') {
      if (!isDriveConfigured()) { setError('Google sign-in is not configured.'); return; }
      setMessage('Saving to Google Docs…');
      saveDocumentToGoogleDocs(doc, true, getStoredUiLanguage())   // called straight from the click: the sign-in popup needs it
        .then((saved) => setMessage(`Saved to Google Drive. ${saved.link}`))
        .catch((e: any) => { setMessage(''); setError(e?.message || 'Save failed.'); });
      return;
    }
    setMessage('Preparing…');
    downloadDocument(doc, fmt, true, getStoredUiLanguage())
      .then(() => setMessage(fmt === 'docx' ? 'Saved as Word.' : 'Saved as PDF.'))
      .catch((e: any) => { setMessage(''); setError(e?.message || 'Save failed.'); });
  };

  // B3/B4: import a backup; merge by id (newer wins, nothing removed), show a report.
  const importBackup = (file: File) => {
        const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const backup = parseImportedBackup(String(reader.result));
          const plan = planImport(decisions, backup.decisions);
          if (plan.conflicts.length) {
            const list = plan.conflicts.slice(0, 5).join(', ') + (plan.conflicts.length > 5 ? '…' : '');
            const ask = `${plan.conflicts.length} dialogue(s) have a newer local version than the file (${list}). They will be kept as they are. Continue the import?`;
            if (!confirm(ask)) return;
          }
          await importProgramFilesPayload(backup.programFiles);
          setDecisions((prev) => planImport(prev, backup.decisions).merged);
          setMessage(importReport(plan));
        } catch (e: any) {
          setError(e.message);
        }
      })();
    };
    reader.readAsText(file);
  };

  // B3: a txt / docx / pdf file becomes the first material of a new dialogue.
  const importAsDialog = (file: File) => {
    setError(''); setMessage('Preparing…');
    uploadAttachment(file, getStoredUiLanguage())
      .then((att) => {
        const d = emptyDecision();
        const now = Date.now();
        d.title = att.name.replace(/\.[^.]+$/, '').slice(0, 80) || d.title;
        d.modelSuggestions = { ...(d.modelSuggestions as any), conversation: [{ role: 'user', content: `Attached: ${att.name}`, attachments: [att], at: now }] } as any;
        void archiveAttachment(att, d.id);
        void mirrorUserFile(file);
        setDecisions((prev) => [d, ...prev]);
        setActiveId(d.id);
        setMessage('');
      })
      .catch((e: any) => { setMessage(''); setError(localizedException(e, getStoredUiLanguage(), 'The upload failed.')); });
  };

  const removeDecision = (id: string) => {
    if (!confirm('Delete this decision?')) return;
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) setActiveId('');
  };

  const runApi = async (path: string, body: unknown, onOk: (data: any, meta: any) => void) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      // B1: every expert request carries the decision's files (both sources, images as their saved description only).
      let sendBody = body;
      if (body && typeof body === 'object') {
        const cur = decisions.find((x) => x.id === activeId) || decisions[0];
        const existing = Array.isArray((body as any).attachments) ? (body as any).attachments : [];
        const decisionFiles = path !== '/api/conversation' && !existing.length && cur
          ? collectDecisionAttachments(cur, undefined, true)
          : [];
        const combined = [...existing, ...workspaceAttachments, ...decisionFiles];
        if (combined.length) sendBody = fitRequest({ ...(body as any), attachments: combined });
      }
      const j = await api(path, sendBody);
      onOk(j.data, j.meta);
    } catch (e: any) {
      // Provider/API failures are operational states, not application crashes.
      // Keep the user informed without showing the red error banner.
      setMessage(e.message || 'The AI service is temporarily unavailable. Your text is safe.');
    } finally {
      setBusy(false);
    }
  };

  // --- Deployment password gate ---
  if (!authChecked) {
    return <div className="shell"><div className="empty"><h1>{en.app}</h1><StateNotice kind="loading">Loading…</StateNotice></div></div>;
  }
  if (authRequired && !authenticated) {
    return (
      <div className="shell"><div className="empty">
        <h1>{en.app}</h1><p>{en.subtitle}</p>
        <div className="panel" style={{maxWidth:560,textAlign:'left'}}>
          <h2>Sign in</h2><p>Enter the password to open this app.</p>
          <input aria-label="Sign in" className="input credential-input" type="password" value={password} placeholder="Password" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') void (async()=>{try{setAuthError('');await loginWithPassword(password);setAuthenticated(true);}catch(err:any){setAuthError(err.message||'Invalid password')}})()}} />
          {authError && <p className="alert error">{authError}</p>}
          <button className="primary" style={{marginTop:16}} onClick={()=>void (async()=>{try{setAuthError('');await loginWithPassword(password);setAuthenticated(true);}catch(err:any){setAuthError(err.message||'Invalid password')}})()}>Sign in</button>
        </div>
      </div></div>
    );
  }

  if (!startMode && !showGoogleAI) {
    return (
      <div className="shell">
        <div className="empty" style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 20px' }}>
          <h1>{en.app}</h1>
          <p>Choose how you want to work. You can change modes later with the <strong>Mode</strong> button.</p>
          <div className="mode-start-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 28, textAlign: 'left' }}>
            <button type="button" className="panel" data-testid="start-mode-simple" onClick={() => chooseStartMode('Simple')} style={{ cursor: 'pointer', color: 'inherit', textAlign: 'left', padding: 24 }}>
              <h2>Simple</h2>
              <p style={{ color: '#9fd8ff', marginBottom: 8 }}>Open conversation — no required steps</p>
              <p>Get an explanation, practical advice, or a clear answer. Optional detail fields when you want them.</p>
              <p style={{ fontSize: 13, color: '#8fa6c2', marginBottom: 0 }}><em>Best for:</em> everyday questions and light structure.</p>
            </button>
            <button type="button" className="panel" data-testid="start-mode-expert" onClick={() => chooseStartMode('Expert')} style={{ cursor: 'pointer', color: 'inherit', textAlign: 'left', padding: 24 }}>
              <h2>Expert</h2>
              <p style={{ color: '#9fd8ff', marginBottom: 8 }}>Step-by-step decision method</p>
              <p>Understand → Explore → Challenge → Check → Learn. You confirm suggestions; open chat stays available for clarifications.</p>
              <p style={{ fontSize: 13, color: '#8fa6c2', marginBottom: 0 }}><em>Best for:</em> hard choices where a careful process helps.</p>
            </button>
            <button type="button" className="panel" data-testid="start-mode-project" onClick={() => chooseStartMode('Project')} disabled={!projectModeEnabled} aria-disabled={!projectModeEnabled} style={{ cursor: projectModeEnabled ? 'pointer' : 'not-allowed', color: 'inherit', textAlign: 'left', padding: 24, opacity: projectModeEnabled ? 1 : 0.65 }}>
              <h2>Project</h2>
              <p style={{ color: '#9fd8ff', marginBottom: 8 }}>Managed project workspace</p>
              <p>Describe a project, analyse it, and get a plan and a ZIP.</p>
              {!projectModeEnabled
                ? <StateNotice kind="unavailable"><strong>Currently unavailable</strong> — Project mode is turned off for this site. Your browser is working normally.</StateNotice>
                : <p style={{ fontSize: 13, color: '#8fa6c2', marginBottom: 0 }}><em>Best for:</em> multi-step work with confirmations and deliverables.</p>}
            </button>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: '#8fa6c2' }}>Tip: open <strong>More → User guide</strong> anytime for the full manual.</p>
        </div>
      </div>
    );
  }

  // --- Privacy / about gate ---
  // Welcome / privacy gate removed — open workspace right after sign-in.

  if (showGoogleAI) {
    return (
      <div className="shell">
        <div className="empty">
          <div className="panel" style={{ maxWidth: 620, textAlign: 'left' }}>
            <h2><KeyRound size={18} /> Google AI</h2>
            <p style={{ color: '#8ea2b8' }}>
              Optional. Add your own Gemini key to use your own quota. Without it, the app uses the server key if set.</p>
            <p style={{ color: '#8ea2b8', fontSize: 13 }}>
              The key stays in this browser and goes to this app's server with each request. The server never saves or logs it.
            </p>
            <label style={{ display: 'block', marginTop: 16 }}>Your Google AI key (optional)</label>
            <input aria-label="Gemini API key" className="input credential-input" type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." style={{ width: '100%', marginTop: 8 }} />
            <label style={{ display: 'block', marginTop: 16 }}>Preferred model</label>
            <select aria-label="Preferred first model" className="input credential-input" value={geminiModel} onChange={e => setGeminiModel(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            </select>
            <p style={{ fontSize: 12, color: '#7f93aa', marginTop: 10 }}>
              If the preferred model is busy, the app tries others automatically.
            </p>
            {aiHealth && (
              <div className="alert" style={{ marginTop: 14 }}>
                Server has a key: <b>{aiHealth.hasKey ? 'configured' : 'not configured'}</b><br />
                Fallback order: {(aiHealth.strongModels || []).join(' → ')}
              </div>
            )}
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="primary" onClick={saveGoogleAI}>Save</button>
              <button className="ghost" onClick={() => setShowGoogleAI(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const historyPanel = showHistory ? (
    <HistoryPanel items={decisions} activeId={active?.id || ''} isOnDrive={drive.isOnDrive}
      onSelect={(id) => { setActiveId(id); setShowHistory(false); }} onClose={() => setShowHistory(false)} />
  ) : null;

  if (!active) {
    return (
      <div className="shell">
      <UserGuideModal open={showUserGuide} onClose={() => setShowUserGuide(false)} />
        {historyPanel}
        <Header
          onNew={createNew}
          showNew={false}
          onExportAll={exportAll}
          onDrive={drive.onButton}
          onGoogleAI={openGoogleAI}
          onProgramFiles={() => setShowProgramFiles(true)}
          driveConnected={drive.connected}
          driveBusy={drive.busy}
          driveMessage={drive.message}
        onHistory={() => setShowHistory(true)}
        historyAvailable={historyAvailable}
        projectModeEnabled={projectModeEnabled}
        expertMode={expertMode}
        onSelectMode={chooseStartMode}
        onChangeMode={resetStartMode}
        onImport={importBackup}
        onImportAsDialog={importAsDialog}
        onImportDrive={drive.onButton}
        onUserGuide={() => setShowUserGuide(true)}
        />
        <div className="empty simple-empty">
          <h1>What would you like help with?</h1>
          <p>Start a conversation. Add files only if they help explain the situation.</p>
          <button className="primary simple-start-btn" onClick={createNew}>
            <Plus size={16} /> Start conversation
          </button>
          <details className="simple-files-details">
            <summary>Add files (optional)</summary>
            <div style={{ maxWidth: 760, margin: '12px auto 0', textAlign: 'left' }}>
              <WorkspacePanel hideHint onAttachmentsChange={setWorkspaceAttachments} proposedChangeSet={proposedWorkspaceChangeSet} onChangeSetSettled={() => setProposedWorkspaceChangeSet(null)} />
            </div>
          </details>
          {migrationReport.length > 0 && (
            <div className="panel" style={{ marginTop: 20, textAlign: 'left', maxWidth: 500 }}>
              <h3>Migration report</h3>
              <ul>
                {migrationReport.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              {getArchived() && (
                <button
                  className="ghost"
                  onClick={() => {
                    const blob = new Blob([getArchived() || ''], { type: 'application/json' });
                    downloadBlob(blob, 'archive_v5_v6.json');
                  }}
                >
                  Download archive of old data
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const d = active;
  const si = stageIndex(d.step);
  const stageMeta = STAGES[si] || STAGES[0];
  const goStep = (target: Step) => {
    if (stageIndex(target) <= si) update({ step: target });
  };
  // Expert: the conversation that existed before the method steps is shown once, collapsed.
  const methodStarted = expertMode && d.step !== 'TRIAGE' && d.step !== 'BRIEF';
  const expertBase = methodStarted
    ? expertBaseline(d.id, Array.isArray((d.modelSuggestions as any)?.conversation) ? (d.modelSuggestions as any).conversation.length : 0)
    : 0;

  return (
    <div className="shell">
      <UserGuideModal open={showUserGuide} onClose={() => setShowUserGuide(false)} />
      {historyPanel}
      <Header
        onNew={createNew}
        onExport={() =>
          downloadBlob(exportDecisionJson(d), `${d.title.slice(0, 40) || d.id}.json`)
        }
        onExportAll={exportAll}
        onDrive={drive.onButton}
        onGoogleAI={openGoogleAI}
          onProgramFiles={() => setShowProgramFiles(true)}
          driveConnected={drive.connected}
        driveBusy={drive.busy}
        driveMessage={drive.message}
        onHistory={() => setShowHistory(true)}
        historyAvailable={historyAvailable}
        projectModeEnabled={projectModeEnabled}
        onImport={importBackup}
        onImportAsDialog={importAsDialog}
        onImportDrive={drive.onButton}
        onBrief={() => {
          if (isBriefWorthShowing(d)) {
            setShowBrief(true);
            return;
          }
          // Analysis is already in the chat — do not cover it with an empty frame.
          setMessage('The brief fills in as you complete the steps.');
          window.setTimeout(() => setMessage(''), 6000);
        }}
        onDelete={() => removeDecision(d.id)}
        expertMode={expertMode}
        onSelectMode={chooseStartMode}
        onChangeMode={resetStartMode}
        onUserGuide={() => setShowUserGuide(true)}
      />
      <div className={`layout ${expertMode ? '' : 'friendly-layout'}`}>
        {expertMode && (
          <ExpertSidebar
            step={d.step}
            onGo={goStep}
            heading={<><BrainCircuit size={14} /> Decision method · cycle {d.cycleCount}</>}
          />
        )}

        <main className={`content${expertMode ? ' has-xn-bar' : ''}`}>
          <WorkspacePanel hideHint={expertMode} disabled={busy} onAttachmentsChange={setWorkspaceAttachments} proposedChangeSet={proposedWorkspaceChangeSet} onChangeSetSettled={() => setProposedWorkspaceChangeSet(null)} />
          {expertMode && <StepTitle step={d.step} />}
          {methodStarted && expertBase > 0 && (
            <SharedConversationContext d={d} upTo={expertBase} onDocumentEdit={reviseConversationDocument} />
          )}

          {error && (
            <div className="alert error">
              <AlertCircle size={16} /> {error}
              <button className="ghost" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
          {message && (
            <div className="alert">
              <Check size={16} /> {message}
              <button className="ghost" onClick={() => setMessage('')}>
                ×
              </button>
            </div>
          )}

          <ErrorBoundary label={stageMeta.label}>
            {!expertMode && d.step !== 'BRIEF' ? (
              <ConversationScreen d={d} update={update} runApi={runApi} busy={busy} onDocumentEdit={reviseConversationDocument} onProposedChangeSet={setProposedWorkspaceChangeSet} />
            ) : (
              <>
                {d.step === 'TRIAGE' && (
                  <TriageScreen d={d} update={update} onContinue={() => update({ step: 'BRIEF' })} />
                )}
                {d.step === 'BRIEF' && <BriefScreen d={d} update={update} runApi={runApi} busy={busy} onProposedChangeSet={setProposedWorkspaceChangeSet} expert={expertMode} />}
                {expertMode && d.step === 'UNDERSTAND' && <UnderstandScreen d={d} update={update} runApi={runApi} busy={busy} />}
                {expertMode && d.step === 'EXPAND' && <ExpandScreen d={d} update={update} runApi={runApi} busy={busy} />}
                {expertMode && d.step === 'ATTACK' && <AttackScreen d={d} update={update} runApi={runApi} busy={busy} />}
                {expertMode && d.step === 'TEST' && <TestScreen d={d} update={update} runApi={runApi} busy={busy} />}
                {expertMode && d.step === 'DECIDE' && <DecideScreen d={d} update={update} runApi={runApi} />}
                {expertMode && d.step === 'SYNTHESIS' && <SynthesisScreen d={d} update={update} runApi={runApi} busy={busy} />}
                {expertMode && d.step === 'LEARN' && <LearnScreen d={d} update={update} runApi={runApi} onNextCycle={() => {
                  const next = emptyDecision();
                  next.parentCycleId = d.id;
                  next.cycleCount = (d.cycleCount || 1) + 1;
                  next.title = `${d.title || 'Decision'} · cycle ${next.cycleCount}`;
                  next.brief = { ...emptyDecision().brief, decision: d.brief.decision, goal: d.brief.goal, facts: [...(d.brief.facts || [])], values: [...(d.brief.values || [])], myOptions: [...(d.brief.myOptions || [])], constraints: [...(d.brief.constraints || [])] };
                  next.journal = d.journal.map((j) => ({ ...j }));
                  setDecisions((prev) => [next, ...prev]);
                  setActiveId(next.id);
                  setActiveDecisionId(next.id);
                }} />}
                {expertMode && d.step !== 'TRIAGE' && d.step !== 'BRIEF' && (
                  <div className="expert-open-dialogue" data-testid="expert-open-dialogue" style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid rgba(127,180,255,0.2)' }}>
                    <p className="expert-dialogue-title">
                      <strong>Ask or add something anytime.</strong>
                    </p>
                    <ConversationScreen
                      d={d}
                      update={update}
                      runApi={runApi}
                      busy={busy}
                      onDocumentEdit={reviseConversationDocument}
                      onProposedChangeSet={setProposedWorkspaceChangeSet}
                      startAt={expertBase}
                      alwaysShowComposer
                      expert
                    />
                  </div>
                )}
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>
      {expertMode && <ExpertBottomBar step={d.step} onGo={goStep} />}

      {showProgramFiles && (
        <ProgramFilesManager open={showProgramFiles} onClose={() => setShowProgramFiles(false)} />
      )}
      {showBrief && (
        <BriefPanel d={d} onClose={() => setShowBrief(false)} />
      )}
    </div>
  );
}

