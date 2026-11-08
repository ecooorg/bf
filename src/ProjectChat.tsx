/**
 * P127.15 — Chat-first Project Mode surface.
 * One transcript + one composer. Build and continue are driven by messages, not panels.
 */
import React, { useEffect, useRef, useState } from 'react';
import { downloadViaFetch } from './downloadFile.ts';
import { suggestProjectName } from './projectAppBuilder.ts';
import { waitForProjectBuild, type BuildJobResult } from './projectBuildJob.ts';
import { BuildFilesPanel, type BuildFileView } from './BuildFilesPanel.tsx';

type ApiResult<T> = { success: boolean; data?: T; error?: string; code?: string };

type Project = {
  id: string;
  name: string;
  status: string;
  state: Record<string, unknown>;
  state_version: number;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  downloadUrl?: string;
  downloadName?: string;
  at: number;
  /** P127.34: this message is a brief awaiting confirm/cancel. */
  briefPending?: boolean;
};

type PendingBrief = {
  goal: string;
  humanBrief: string;
  title: string;
  userNotes: string;
  projectId: string;
};

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResult<T>;
  if (!response.ok || payload.success === false || payload.data === undefined) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload.data;
}

function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const S: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 64px)',
    maxWidth: 720,
    margin: '0 auto',
    padding: '12px 12px 0',
    boxSizing: 'border-box',
  },
  transcript: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    padding: '10px 14px',
    borderRadius: 12,
    background: '#1a3a5c',
    color: '#e6edf7',
    fontSize: 15,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    padding: '10px 14px',
    borderRadius: 12,
    background: '#0b1a2c',
    border: '1px solid #1f4f86',
    color: '#e6edf7',
    fontSize: 15,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
  },
  composer: {
    position: 'sticky',
    bottom: 0,
    padding: '10px 0 calc(12px + env(safe-area-inset-bottom, 0px))',
    background: 'linear-gradient(180deg, transparent, #0a1220 18%)',
  },
  row: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 160,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #3d7fc4',
    background: '#07111f',
    color: '#e6edf7',
    fontSize: 16,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  send: {
    minHeight: 48,
    minWidth: 72,
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid #78baff',
    background: '#24517b',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  link: {
    display: 'inline-block',
    marginTop: 8,
    color: '#9ac7ff',
    fontWeight: 600,
  },
  muted: { fontSize: 13, color: '#8fa6c2', margin: '0 0 8px' },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ghost: {
    minHeight: 36,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #25405e',
    background: 'transparent',
    color: '#8fa6c2',
    cursor: 'pointer',
    fontSize: 13,
  },
};

export function ProjectChat({
  programZipAvailable,
  onOpenAdvanced,
}: {
  programZipAvailable: boolean;
  onOpenAdvanced?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        'Describe the program you want. I build a ZIP. Keep chatting here to change it.',
      at: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [liveFiles, setLiveFiles] = useState<{ files: BuildFileView[]; archiveUrl?: string } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [baseArtifactId, setBaseArtifactId] = useState<string | null>(null);
  const [pendingBrief, setPendingBrief] = useState<PendingBrief | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, statusLine]);

  const push = (msg: Omit<ChatMessage, 'id' | 'at'> & { id?: string }) => {
    const full: ChatMessage = {
      id: msg.id || newId(),
      at: Date.now(),
      role: msg.role,
      text: msg.text,
      downloadUrl: msg.downloadUrl,
      downloadName: msg.downloadName,
      briefPending: msg.briefPending,
    };
    setMessages((m) => [...m, full]);
    return full;
  };

  const latestZipArtifactId = async (pid: string): Promise<string | null> => {
    try {
      const list = await api<Array<{ artifact_id: string; filename: string; version: number }>>(
        `/api/projects/${encodeURIComponent(pid)}/artifacts`,
      );
      const zips = list.filter((a) => /\.zip$/i.test(a.filename));
      if (!zips.length) return null;
      return zips[0].artifact_id;
    } catch {
      return baseArtifactId;
    }
  };

  const ensureProject = async (goal: string): Promise<Project> => {
    if (projectId) {
      return api<Project>(`/api/projects/${encodeURIComponent(projectId)}`);
    }
    const name = suggestProjectName(goal);
    const project = await api<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, goal }),
    });
    const pp = project.state?.passport as { status?: string } | undefined;
    if (pp && pp.status !== 'confirmed') {
      await api(`/api/projects/${encodeURIComponent(project.id)}/state`, {
        method: 'PUT',
        body: JSON.stringify({
          expected_version: project.state_version,
          state: { ...project.state, passport: { ...pp, status: 'confirmed', goal } },
        }),
      });
    }
    const fresh = await api<Project>(`/api/projects/${encodeURIComponent(project.id)}`);
    setProjectId(fresh.id);
    setProjectName(fresh.name);
    return fresh;
  };

  const runBuild = async (
    pid: string,
    goal: string,
    opts?: { approvedBrief?: string; userNotes?: string },
  ) => {
    setStatusLine('Building…');
    const body: Record<string, string> = { goal };
    if (opts?.approvedBrief) body.approvedBrief = opts.approvedBrief;
    if (opts?.userNotes) body.userNotes = opts.userNotes;
    const started = await api<BuildJobResult>(`/api/projects/${encodeURIComponent(pid)}/code/build`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const result = started.jobId
      ? await waitForProjectBuild(pid, started, (job) => {
          setLiveFiles({ files: (job.files as BuildFileView[] | undefined) ?? [], archiveUrl: job.downloadUrl });
          const done = job.units?.filter((u) => u.status === 'done').length ?? 0;
          const total = job.units?.length ?? 0;
          setStatusLine(
            ['done', 'failed', 'cancelled'].includes(String(job.status))
              ? ''
              : `Building… ${job.stage || 'working'} · ${done}/${total || '?'} files · ${job.callsUsed ?? 0} model calls`,
          );
        })
      : started;
    setStatusLine('');
    return result;
  };

  const confirmPendingBrief = async () => {
    if (!pendingBrief || busy) return;
    setBusy(true);
    try {
      setPendingBrief(null);
      setMessages((m) => m.map((msg) => (msg.briefPending ? { ...msg, briefPending: false } : msg)));
      push({ role: 'user', text: 'Confirm and build' });
      const result = await runBuild(pendingBrief.projectId, pendingBrief.goal, {
        approvedBrief: pendingBrief.humanBrief,
        userNotes: pendingBrief.userNotes.trim() || undefined,
      });
      if (result.downloadUrl) {
        const newest = await latestZipArtifactId(pendingBrief.projectId);
        if (newest) setBaseArtifactId(newest);
      }
      replyFromResult(result, 'build');
    } catch (e) {
      push({ role: 'assistant', text: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  const cancelPendingBrief = () => {
    setPendingBrief(null);
    setMessages((m) => m.map((msg) => (msg.briefPending ? { ...msg, briefPending: false } : msg)));
    push({ role: 'assistant', text: 'Build cancelled. Describe the program again when you are ready.' });
  };

  const runContinue = async (pid: string, goal: string, artifactId: string) => {
    setStatusLine('Updating from your last ZIP…');
    const started = await api<BuildJobResult>(`/api/projects/${encodeURIComponent(pid)}/code/continue`, {
      method: 'POST',
      body: JSON.stringify({ goal, artifact_id: artifactId }),
    });
    const result = started.jobId
      ? await waitForProjectBuild(pid, started, (job) => {
          setLiveFiles({ files: (job.files as BuildFileView[] | undefined) ?? [], archiveUrl: job.downloadUrl });
          const done = job.units?.filter((u) => u.status === 'done').length ?? 0;
          const total = job.units?.length ?? 0;
          setStatusLine(
            ['done', 'failed', 'cancelled'].includes(String(job.status))
              ? ''
              : `Updating… ${job.stage || 'working'} · ${done}/${total || '?'} files · ${job.callsUsed ?? 0} model calls`,
          );
        })
      : started;
    setStatusLine('');
    return result;
  };

  const replyFromResult = (result: BuildJobResult, kind: 'build' | 'continue') => {
    const outcome = result.outcome || result.report?.outcome || null;
    const lines: string[] = [];
    if (result.downloadUrl) {
      if (outcome === 'SUCCESS' || result.goalImplemented === true) {
        lines.push(kind === 'continue' ? 'Updated source ZIP is ready.' : 'Source ZIP is ready.');
      } else if (outcome === 'PARTIAL') {
        // P127.27: no banner for partial builds; the ZIP link is enough.
      } else {
        lines.push('A ZIP may be available, but the build did not fully succeed.');
      }
      if (result.note) lines.push(result.note);
      lines.push('');
      lines.push('Reply here to change the program (for example: add a pause button).');
    } else {
      lines.push(result.note || 'No downloadable ZIP was produced.');
      lines.push('Describe the program again, or try a smaller change.');
    }
    push({
      role: 'assistant',
      text: lines.filter(Boolean).join('\n'),
      downloadUrl: result.downloadUrl,
      downloadName: `${projectName || 'program'}-source.zip`,
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!programZipAvailable) {
      push({ role: 'assistant', text: 'Program ZIP builds are not available on this server right now.' });
      return;
    }
    setInput('');
    setLiveFiles(null);
    push({ role: 'user', text });
    setBusy(true);
    try {
      const project = await ensureProject(text);
      // Continue path: already have a ZIP — no brief gate (change request).
      if (baseArtifactId) {
        const result = await runContinue(project.id, text, baseArtifactId);
        if (result.downloadUrl) {
          const newest = await latestZipArtifactId(project.id);
          if (newest) setBaseArtifactId(newest);
        }
        replyFromResult(result, 'continue');
        return;
      }
      const existing = await latestZipArtifactId(project.id);
      if (existing && projectId) {
        setBaseArtifactId(existing);
        const result = await runContinue(project.id, text, existing);
        if (result.downloadUrl) {
          const newest = await latestZipArtifactId(project.id);
          if (newest) setBaseArtifactId(newest);
        }
        replyFromResult(result, 'continue');
        return;
      }
      // P127.34: first build — show human brief card; do not start code until confirm.
      setStatusLine('Preparing plan…');
      const preview = await api<{ humanBrief: string; title: string }>(
        `/api/projects/${encodeURIComponent(project.id)}/code/build/preview`,
        { method: 'POST', body: JSON.stringify({ goal: text }) },
      );
      setStatusLine('');
      setPendingBrief({
        goal: text,
        humanBrief: preview.humanBrief,
        title: preview.title || 'Program',
        userNotes: '',
        projectId: project.id,
      });
      push({
        role: 'assistant',
        text: `${preview.humanBrief}\n\nConfirm to build, or cancel and rephrase.`,
        briefPending: true,
      });
    } catch (e) {
      setStatusLine('');
      push({ role: 'assistant', text: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    if (busy) return;
    setMessages([
      {
        id: newId(),
        role: 'assistant',
        text: 'New chat. Describe the program you want to build.',
        at: Date.now(),
      },
    ]);
    setLiveFiles(null);
    setProjectId(null);
    setProjectName('');
    setBaseArtifactId(null);
    setPendingBrief(null);
    setInput('');
    setStatusLine('');
  };

  return (
    <div style={S.shell} data-testid="project-chat">
      <div style={S.top}>
        <p style={{ ...S.muted, margin: 0 }}>
          {projectName ? `Project: ${projectName}` : 'Project chat'}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={S.ghost} disabled={busy} onClick={startOver} data-testid="project-chat-new">
            New chat
          </button>
          {onOpenAdvanced && (
            <button type="button" style={S.ghost} disabled={busy} onClick={onOpenAdvanced} data-testid="project-chat-advanced">
              Advanced
            </button>
          )}
        </div>
      </div>

      <div style={S.transcript} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} style={m.role === 'user' ? S.bubbleUser : S.bubbleAssistant}>
            {m.text}
            {m.downloadUrl && (
              <a
                href={m.downloadUrl}
                style={S.link}
                onClick={(e) => {
                  e.preventDefault();
                  void downloadViaFetch(m.downloadUrl!, m.downloadName || 'source.zip').catch(() => undefined);
                }}
              >
                Download source ZIP
              </a>
            )}
            {m.briefPending && pendingBrief && (
              <div data-testid="project-chat-brief-card" style={{ marginTop: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#8fa6c2', marginBottom: 4 }}>
                  What to change (optional)
                </label>
                <textarea
                  aria-label="Notes on the plan"
                  data-testid="project-chat-brief-notes"
                  value={pendingBrief.userNotes}
                  onChange={(e) => setPendingBrief({ ...pendingBrief, userNotes: e.target.value })}
                  rows={2}
                  maxLength={2000}
                  disabled={busy}
                  placeholder="Example: only click moves, no AI opponent"
                  style={{ ...S.input, width: '100%', boxSizing: 'border-box', minHeight: 48 }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    data-testid="project-chat-confirm-build"
                    disabled={busy}
                    onClick={() => void confirmPendingBrief()}
                    style={{
                      minHeight: 40,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #78baff',
                      background: '#12345a',
                      color: '#e6edf7',
                      cursor: busy ? 'wait' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Confirm and build
                  </button>
                  <button
                    type="button"
                    data-testid="project-chat-cancel-brief"
                    disabled={busy}
                    onClick={cancelPendingBrief}
                    style={S.ghost}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {statusLine ? <div style={S.bubbleAssistant}>{statusLine}</div> : null}
        {liveFiles?.files.length ? <BuildFilesPanel files={liveFiles.files} archiveUrl={liveFiles.archiveUrl} archiveName={`${projectName || 'program'}-source.zip`} /> : null}
        <div ref={bottomRef} />
      </div>

      <div style={S.composer}>
        <div style={S.row}>
          <textarea
            aria-label="Message to Project"
            data-testid="project-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder={baseArtifactId || projectId ? 'Describe a change…' : 'Describe what to build…'}
            disabled={busy}
            style={S.input}
          />
          <button
            type="button"
            style={S.send}
            disabled={busy || !input.trim()}
            onClick={() => void send()}
            data-testid="project-chat-send"
          >
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
