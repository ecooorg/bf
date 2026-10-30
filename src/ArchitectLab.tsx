import React, { useEffect, useState } from 'react';
import { waitForProjectBuild, type BuildJobResult } from './projectBuildJob.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

type Passport = { status: 'proposed' | 'confirmed'; projectType: string; goal: string; users: string; inputsOutputs: string; constraints: string; securityData: string; successCriteria: string; budget: { calls: number; tokens: number; executorRuns: number }; executor: 'manual' | 'model_patch'; humanLevel: 'supervised' | 'manual' };
type Project = { id: string; name: string; state: Record<string, unknown>; state_version: number };
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
  const [passport, setPassport] = useState<Passport | null>(null);
  const [result, setResult] = useState<BuildJobResult | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [diagnosticsText, setDiagnosticsText] = useState('');
  const [diagnosticsMenuOpen, setDiagnosticsMenuOpen] = useState(false);

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

  function proposedPassport(description: string): Passport {
    return {
      status: 'proposed', projectType: 'Web application', goal: description.trim(),
      users: 'Individual users managing their personal expenses',
      inputsOutputs: 'Inputs: expense amount, date, category, description. Outputs: expense list, totals, and summaries.',
      constraints: 'Start with a responsive browser-based application. Keep the implementation small and understandable.',
      securityData: 'Do not include secrets or real financial data in generated fixtures. Validate user-entered amounts.',
      successCriteria: 'A user can add, view, edit, and delete expenses and see totals by category; the source ZIP includes setup instructions.',
      budget: { calls: 40, tokens: 200000, executorRuns: 8 }, executor: 'model_patch', humanLevel: 'supervised',
    };
  }

  async function createPassport(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setProject(null); setPassport(null);
    try {
      setStage('Creating project and preparing its passport');
      const proposed = proposedPassport(goal);
      const created = await request<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: name.trim() || 'Architectural Lab experiment', goal: goal.trim(), state: { passport: proposed, architecturalLab: { createdAt: new Date().toISOString() } } }) });
      setProject(created); setPassport(proposed); setStage('Review and confirm the project passport');
    } catch (e) { setError((e as Error).message || String(e)); setStage('Stopped with error'); }
    finally { setBusy(false); }
  }

  async function confirmAndBuild() {
    if (!project || !passport) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const confirmed = { ...passport, status: 'confirmed' as const };
      setStage('Saving confirmed project passport');
      const updated = await request<{ project_id: string; state_version: number; state: Record<string, unknown> }>(`/api/projects/${encodeURIComponent(project.id)}/state`, { method: 'PUT', body: JSON.stringify({ expected_version: project.state_version, state: { ...project.state, passport: confirmed } }) });
      setProject({ ...project, state_version: updated.state_version, state: updated.state }); setPassport(confirmed);
      setStage('Submitting build');
      const initial = await request<BuildJobResult>(`/api/projects/${encodeURIComponent(project.id)}/code/build`, { method: 'POST', body: JSON.stringify({ goal: goal.trim() }) });
      setStage('Generating and validating');
      const finished = initial.jobId ? await waitForProjectBuild(project.id, initial, job => setStage(`Build: ${job.stage || job.status || 'working'}`)) : initial;
      setResult(finished); setStage(finished.outcome || finished.status || 'Finished');
    } catch (e) { setError((e as Error).message || String(e)); setStage('Stopped with error'); }
    finally { setBusy(false); }
  }

  async function loadDiagnostics(kind: 'session' | 'system' | 'operations') {
    setDiagnosticsMenuOpen(false); setDiagnosticsOpen(true); setDiagnosticsBusy(true); setDiagnosticsText('Loading diagnostics…');
    try {
      const path = kind === 'session' ? '/api/projects/diagnostics/session-log' : `/api/projects/diagnostics/${kind}`;
      const response = await fetch(path, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Diagnostics request failed (${response.status})`);
      setDiagnosticsText(kind === 'session' ? await response.text() : JSON.stringify(await response.json(), null, 2));
    } catch (e) { setDiagnosticsText(`DIAGNOSTICS ERROR: ${String((e as Error).message || e)}`); }
    finally { setDiagnosticsBusy(false); }
  }

  async function downloadDiagnostics() {
    setDiagnosticsMenuOpen(false);
    try {
      const response = await fetch('/api/projects/diagnostics/export', { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Diagnostic export failed (${response.status})`);
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'biforge-diagnostics.zip'; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { setDiagnosticsText(`DIAGNOSTIC EXPORT ERROR: ${String((e as Error).message || e)}`); setDiagnosticsOpen(true); }
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
    <header className="architect-lab-header"><div><span className="architect-lab-kicker">PRIMARY ARCHITECT WORKSPACE · P121.0.27</span><h1>Architectural Test Lab</h1><p>Build software, review its passport, and inspect diagnostics when something fails.</p></div><div className="architect-lab-toolbar"><div className="architect-lab-menu-wrap"><button type="button" className="architect-lab-back" data-testid="architect-lab-diagnostics-menu" aria-expanded={diagnosticsMenuOpen} onClick={() => setDiagnosticsMenuOpen(v => !v)}>Diagnostics ▾</button>{diagnosticsMenuOpen && <div className="architect-lab-menu" role="menu"><button type="button" role="menuitem" onClick={() => void loadDiagnostics('session')}>Compact session log</button><button type="button" role="menuitem" onClick={() => void loadDiagnostics('system')}>System diagnostics</button><button type="button" role="menuitem" onClick={() => void loadDiagnostics('operations')}>Recent operations</button><button type="button" role="menuitem" onClick={() => void downloadDiagnostics()}>Download diagnostic ZIP</button></div>}</div><a href="/" className="architect-lab-back">← BiForge</a><a href="/project" className="architect-lab-legacy">Legacy Architect</a></div></header>
    {diagnosticsOpen && <div className="architect-lab-diagnostics-overlay" role="dialog" aria-modal="true" aria-label="Architectural Lab diagnostics"><section className="architect-lab-diagnostics"><div className="architect-lab-diagnostics-head"><h2>Diagnostics</h2><button type="button" onClick={() => setDiagnosticsOpen(false)}>Close</button></div><p>Copy this report and paste it into the support chat. Secrets and passwords should not be included.</p><button type="button" onClick={() => void navigator.clipboard?.writeText(diagnosticsText)}>Copy report</button><textarea aria-label="Diagnostic report" readOnly value={diagnosticsBusy ? 'Loading diagnostics…' : diagnosticsText} /></section></div>}
    <div className="architect-lab-grid">
      <form style={panel} onSubmit={createPassport} data-testid="architect-lab-build-form">
        <h2>Start an experiment</h2><label>Project name<input value={name} onChange={e => setName(e.target.value)} placeholder="My test project" /></label>
        <label>What should be built?<textarea required minLength={8} rows={7} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Describe the application, its users, and the expected behavior…" /></label>
        <button data-testid="architect-lab-build" className="architect-lab-primary" disabled={busy || Boolean(project) || goal.trim().length < 8}>{busy ? 'Working…' : 'Create project passport'}</button>
        <p className="architect-lab-stage" aria-live="polite">{stage}</p>{error && <div className="architect-lab-error" role="alert"><strong>Could not complete this step</strong><p>{error}</p></div>}
      </form>
      {project && passport && <section style={panel} data-testid="architect-lab-passport"><h2>Project passport</h2><p>Review the proposed scope before authorizing generation.</p><dl><dt>Type</dt><dd>{passport.projectType}</dd><dt>Goal</dt><dd>{passport.goal}</dd><dt>Users</dt><dd>{passport.users}</dd><dt>Inputs / outputs</dt><dd>{passport.inputsOutputs}</dd><dt>Constraints</dt><dd>{passport.constraints}</dd><dt>Security</dt><dd>{passport.securityData}</dd><dt>Success criteria</dt><dd>{passport.successCriteria}</dd><dt>Status</dt><dd>{passport.status}</dd></dl><button data-testid="architect-lab-confirm-passport" className="architect-lab-primary" type="button" disabled={busy || passport.status === 'confirmed'} onClick={() => void confirmAndBuild()}>{busy ? 'Working…' : 'Confirm passport and build'}</button></section>}
      <section style={panel} aria-live="polite" data-testid="architect-lab-completion"><h2>Build result</h2>{!result && <p className="architect-lab-muted">The result and validation summary will appear here. This panel remains mounted while a build runs.</p>}
        {result && <><div className="architect-lab-status">{result.outcome || result.status || 'Result received'}</div><p>{result.note || result.report?.failureReason || 'Build process returned.'}</p><dl><dt>Project</dt><dd>{project?.name}</dd><dt>Job</dt><dd>{result.jobId || '—'}</dd><dt>Validation</dt><dd>{result.goalImplemented === true ? 'Implemented' : result.goalImplemented === false ? 'Not fully implemented' : 'Not confirmed'}</dd></dl>{result.downloadUrl && <button data-testid="architect-lab-download" className="architect-lab-primary" type="button" onClick={() => void download()}>Download project ZIP</button>}</>}
      </section>
    </div>
    <footer>Primary Architect workspace: <code>/architect-lab</code>. The former workspace remains available at <code>/project</code> for rollback and comparison. Both use shared authenticated project APIs, model orchestration, and artifact storage.</footer>
  </main>;
}

export default function ArchitectLab() {
  return <ErrorBoundary label="Architectural Test Lab"><LabWorkspace /></ErrorBoundary>;
}
