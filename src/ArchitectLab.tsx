import React, { useEffect, useState } from 'react';
import { waitForProjectBuild, type BuildJobResult } from './projectBuildJob.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

type Project = { id: string; name: string };
type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string };

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin', ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok || body.success === false || body.data === undefined) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body.data;
}

function LabWorkspace() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [result, setResult] = useState<BuildJobResult | null>(null);

  useEffect(() => {
    fetch('/api/session', { credentials: 'same-origin' }).then(r => r.json()).then(s => {
      setAuthenticated(Boolean(s.authenticated)); setEnabled(Boolean(s.projectModeEnabled));
    }).catch(() => { setAuthenticated(false); });
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok || !body.authenticated) throw new Error(body.error || 'Sign-in failed');
      setAuthenticated(true); setPassword('');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function build(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setProject(null);
    try {
      setStage('Creating isolated lab project');
      const created = await request<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: name.trim() || 'Architectural Lab experiment', goal: goal.trim() }) });
      setProject(created);
      setStage('Submitting build');
      const initial = await request<BuildJobResult>(`/api/projects/${encodeURIComponent(created.id)}/code/build`, { method: 'POST', body: JSON.stringify({ goal: goal.trim() }) });
      setStage('Generating and validating');
      const finished = initial.jobId
        ? await waitForProjectBuild(created.id, initial, job => setStage(`Build: ${job.stage || job.status || 'working'}`))
        : initial;
      setResult(finished);
      setStage(finished.outcome || finished.status || 'Finished');
    } catch (e) { setError((e as Error).message || String(e)); setStage('Stopped with error'); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!project?.id || !result?.downloadUrl) return;
    try {
      const url = result.downloadUrl.startsWith('/') ? result.downloadUrl : `/api/projects/${encodeURIComponent(project.id)}/artifacts/${encodeURIComponent(result.downloadUrl)}/download`;
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'architectural-lab-result.zip'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    } catch (e) { setError((e as Error).message); }
  }

  const panel: React.CSSProperties = { background: '#111d2c', border: '1px solid #29445c', borderRadius: 18, padding: 20 };
  if (authenticated === null) return <main className="architect-lab"><p>Checking secure session…</p></main>;
  if (!enabled) return <main className="architect-lab"><section style={panel}><h1>Architectural Test Lab</h1><p>Project Mode is not enabled for this deployment.</p><a href="/">Return to BiForge</a></section></main>;
  if (!authenticated) return <main className="architect-lab"><form style={panel} onSubmit={login}><h1>Architectural Test Lab</h1><p>Sign in to continue.</p><input aria-label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /><button disabled={busy}>Sign in</button>{error && <p role="alert">{error}</p>}</form></main>;

  return <main className="architect-lab">
    <header className="architect-lab-header"><div><span className="architect-lab-kicker">EXPERIMENTAL WORKSPACE · P122</span><h1>Architectural Test Lab</h1><p>A separate workspace for testing a cleaner project-building experience.</p></div><a href="/" className="architect-lab-back">← BiForge</a></header>
    <div className="architect-lab-grid">
      <form style={panel} onSubmit={build} data-testid="architect-lab-build-form">
        <h2>Start an experiment</h2><label>Project name<input value={name} onChange={e => setName(e.target.value)} placeholder="My test project" /></label>
        <label>What should be built?<textarea required minLength={8} rows={7} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Describe the application, its users, and the expected behavior…" /></label>
        <button data-testid="architect-lab-build" className="architect-lab-primary" disabled={busy || goal.trim().length < 8}>{busy ? 'Working…' : 'Create and build'}</button>
        <p className="architect-lab-stage" aria-live="polite">{stage}</p>{error && <div className="architect-lab-error" role="alert"><strong>Could not complete this step</strong><p>{error}</p></div>}
      </form>
      <section style={panel} aria-live="polite" data-testid="architect-lab-completion"><h2>Build result</h2>{!result && <p className="architect-lab-muted">The result and validation summary will appear here. This panel remains mounted while a build runs.</p>}
        {result && <><div className="architect-lab-status">{result.outcome || result.status || 'Result received'}</div><p>{result.note || result.report?.failureReason || 'Build process returned.'}</p><dl><dt>Project</dt><dd>{project?.name}</dd><dt>Job</dt><dd>{result.jobId || '—'}</dd><dt>Validation</dt><dd>{result.goalImplemented === true ? 'Implemented' : result.goalImplemented === false ? 'Not fully implemented' : 'Not confirmed'}</dd></dl>{result.downloadUrl && <button data-testid="architect-lab-download" className="architect-lab-primary" type="button" onClick={() => void download()}>Download project ZIP</button>}</>}
      </section>
    </div>
    <footer>Experimental UI is isolated at <code>/architect-lab</code>. Shared services: authenticated project API, model orchestration, and artifact storage. Legacy Architect UI is not mounted here.</footer>
  </main>;
}

export default function ArchitectLab() {
  return <ErrorBoundary label="Architectural Test Lab"><LabWorkspace /></ErrorBoundary>;
}
