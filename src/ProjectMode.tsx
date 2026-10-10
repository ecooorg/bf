import React, { useCallback, useEffect, useState } from 'react';

type Project = { id: string; name: string; status: string; state: Record<string, unknown>; state_version: number; updated_at?: string };
type Passport = { status: 'proposed' | 'confirmed'; projectType: string; goal: string; users: string; inputsOutputs: string; constraints: string; securityData: string; successCriteria: string; budget: { calls: number; tokens: number; executorRuns: number }; executor: 'manual' | 'model_patch'; humanLevel: 'supervised' | 'manual' };
type ApiResult<T> = { success: boolean; data?: T; error?: string; code?: string; actual_version?: number };

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const payload = await response.json().catch(() => ({})) as ApiResult<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload.data as T;
}

export default function ProjectMode() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [passport, setPassport] = useState<Passport | null>(null);
  const [stateText, setStateText] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProjects = useCallback(async (selectProjectId?: string) => {
    const list = await api<Project[]>('/api/projects');
    setProjects(list);
    // Do not capture selected state in this callback: a state update immediately
    // before calling it is not visible to the current render's closure.
    if (selectProjectId) {
      const fresh = await api<Project>(`/api/projects/${encodeURIComponent(selectProjectId)}`);
      setSelected(fresh);
      setStateText(JSON.stringify(fresh.state ?? {}, null, 2));
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/session', { credentials: 'same-origin' }).then(r => r.json()).then(s => {
      if (active) { setAuthenticated(Boolean(s.authenticated)); setEnabled(Boolean(s.projectModeEnabled)); }
    }).catch(() => { if (active) { setAuthenticated(false); setEnabled(false); setError('Could not verify the session.'); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadProjects().catch(e => setError(String(e.message || e)));
  }, [authenticated]);

  useEffect(() => { setPassport((selected?.state?.passport as Passport | undefined) ?? null); }, [selected]);

  async function savePassport(confirm: boolean) {
    if (!selected || !passport) return; setBusy(true); setError(''); setNotice('');
    try {
      const next = { ...passport, status: confirm ? 'confirmed' : passport.status };
      await api(`/api/projects/${encodeURIComponent(selected.id)}/state`, { method: 'PUT', body: JSON.stringify({ expected_version: selected.state_version, state: { ...selected.state, passport: next } }) });
      await loadProjects(selected.id); setNotice(confirm ? 'Passport confirmed.' : 'Passport saved.');
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const j = await r.json(); if (!r.ok || !j.authenticated) throw new Error(j.error || 'Sign-in failed');
      setAuthenticated(true); setPassword('');
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const project = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: name.trim(), ...(goal.trim() ? { goal: goal.trim() } : {}) }) });
      setName(''); setGoal(''); setSelected(project); setStateText(JSON.stringify(project.state ?? {}, null, 2));
      await loadProjects(project.id); setNotice('Project created.');
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }

  async function saveState() {
    if (!selected) return; setBusy(true); setError(''); setNotice('');
    try {
      let state: unknown;
      try { state = JSON.parse(stateText); } catch { throw new Error('Invalid JSON. Keys must be in double quotes, for example {"key": 777}.'); }
      if (!state || Array.isArray(state) || typeof state !== 'object') throw new Error('State must be a JSON object.');
      await api(`/api/projects/${encodeURIComponent(selected.id)}/state`, { method: 'PUT', body: JSON.stringify({ expected_version: selected.state_version, state }) });
      const fresh = await api<Project>(`/api/projects/${encodeURIComponent(selected.id)}`);
      setSelected(fresh); setStateText(JSON.stringify(fresh.state ?? {}, null, 2));
      await loadProjects(fresh.id); setNotice(`State saved, version ${fresh.state_version}.`);
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Could not end the session.');
      setAuthenticated(false); setProjects([]); setSelected(null); setStateText('{}');
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#0a0f1a', color: '#e6edf7', fontFamily: 'system-ui, sans-serif', padding: '24px', boxSizing: 'border-box' },
    panel: { maxWidth: 1000, margin: '0 auto', background: '#0d1b2e', border: '1px solid #1f4f86', borderRadius: 12, padding: 24 },
    button: { minHeight: 44, padding: '10px 16px', border: '1px solid #3d7fc4', borderRadius: 8, background: '#0b2545', color: '#9fd8ff', cursor: 'pointer' },
    input: { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: 10, border: '1px solid #3d7fc4', borderRadius: 8, background: '#07111f', color: '#e6edf7', fontSize: 16 },
    link: { color: '#78baff' },
  };

  return <main style={styles.page}><section style={styles.panel}>
    <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div><div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8fa6c2' }}>BiForge</div><h1 style={{ margin: '6px 0' }}>Project Mode</h1><p style={{ marginTop: 0, color: '#8fa6c2' }}>Separate storage for projects and versioned state.</p></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <a href="/" style={styles.link}>← Back to Simple Mode</a>
        {authenticated && <button type="button" style={styles.button} disabled={busy} onClick={() => void logout()}>Sign out</button>}
      </div>
    </header>
    {error && <p role="alert" style={{ color: '#ffb4b4', background: '#3a1216', padding: 12, borderRadius: 8 }}>{error}</p>}
    {notice && <p role="status" style={{ color: '#7fe0a8' }}>{notice}</p>}
    {enabled === null || authenticated === null ? <p>Checking session…</p> : !enabled ? <p role="status">Project Mode is disabled in the server configuration. <a href="/" style={styles.link}>Back to Simple Mode</a>.</p> : !authenticated ? <form onSubmit={login} style={{ maxWidth: 420, display: 'grid', gap: 12 }}><h2>Sign in</h2><label htmlFor="project-password">App password</label><input id="project-password" style={styles.input} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button style={styles.button} disabled={busy}>Sign in</button></form> : <>
      <form onSubmit={create} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 24px' }}><input aria-label="Project name" style={{ ...styles.input, flex: '1 1 240px' }} value={name} onChange={e => setName(e.target.value)} placeholder="New project name" required maxLength={200} /><input aria-label="Project goal" style={{ ...styles.input, flex: '1 1 240px' }} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Goal (optional)" maxLength={2000} /><button style={styles.button} disabled={busy || !name.trim()}>Create project</button></form>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 24 }}>
        <section><h2>Projects</h2>{projects.length === 0 ? <p>No projects yet.</p> : <ul style={{ paddingLeft: 20 }}>{projects.map(p => <li key={p.id} style={{ margin: '12px 0' }}><button style={{ ...styles.button, width: '100%', textAlign: 'left', borderColor: selected?.id === p.id ? '#78baff' : '#3d7fc4' }} onClick={async () => { try { const full = await api<Project>(`/api/projects/${encodeURIComponent(p.id)}`); setSelected(full); setStateText(JSON.stringify(full.state ?? {}, null, 2)); setError(''); } catch (e) { setError(String((e as Error).message || e)); } }}><strong>{p.name}</strong><br /><small>{p.status} · version {p.state_version}</small></button></li>)}</ul>}</section>
        <section><h2>Project State</h2>{selected ? <><p><strong>{selected.name}</strong><br /><small>ID: {selected.id} · version {selected.state_version}</small></p>{passport && <section style={{ margin: '0 0 16px', padding: 12, border: '1px solid #1f4f86', borderRadius: 8 }}><h3 style={{ marginTop: 0 }}>Passport <small style={{ color: passport.status === 'confirmed' ? '#7fe0a8' : '#e6c07a' }}>({passport.status})</small></h3><div style={{ display: 'grid', gap: 8 }}>
          {([['projectType', 'Project type'], ['goal', 'Goal'], ['users', 'Users'], ['inputsOutputs', 'Inputs and outputs'], ['constraints', 'Constraints'], ['securityData', 'Security and data requirements'], ['successCriteria', 'Success criteria']] as const).map(([k, label]) => <label key={k} style={{ display: 'grid', gap: 4, fontSize: 13 }}>{label}<textarea value={passport[k]} onChange={e => setPassport({ ...passport, [k]: e.target.value })} rows={k === 'projectType' ? 1 : 2} style={{ ...styles.input, minHeight: 0, fontSize: 14 }} /></label>)}
          {([['calls', 'Budget: calls'], ['tokens', 'Budget: tokens'], ['executorRuns', 'Budget: code executor runs']] as const).map(([k, label]) => <label key={k} style={{ display: 'grid', gap: 4, fontSize: 13 }}>{label}<input type="number" min={0} value={passport.budget[k]} onChange={e => setPassport({ ...passport, budget: { ...passport.budget, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} style={{ ...styles.input, minHeight: 0 }} /></label>)}
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Code executor<select value={passport.executor} onChange={e => setPassport({ ...passport, executor: e.target.value as Passport['executor'] })} style={styles.input}><option value="manual">manual</option><option value="model_patch">model_patch</option></select></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Human involvement<select value={passport.humanLevel} onChange={e => setPassport({ ...passport, humanLevel: e.target.value as Passport['humanLevel'] })} style={styles.input}><option value="supervised">Supervised</option><option value="manual">Manual</option></select></label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" style={styles.button} disabled={busy} onClick={() => void savePassport(false)}>Save passport</button>{passport.status !== 'confirmed' && <button type="button" style={styles.button} disabled={busy} onClick={() => void savePassport(true)}>Confirm passport</button>}</div></div></section>}
          <label htmlFor="project-state">JSON state</label><textarea id="project-state" value={stateText} onChange={e => setStateText(e.target.value)} spellCheck={false} style={{ ...styles.input, minHeight: 260, fontFamily: 'ui-monospace, monospace', fontSize: 14, margin: '8px 0 12px' }} /><button style={styles.button} disabled={busy} onClick={saveState}>Save new version</button><p style={{ color: '#8fa6c2', fontSize: 13 }}>Saving uses expected_version. On a conflict, data is not overwritten.</p></> : <p>Select a project to view or edit its State.</p>}</section>
      </div>
    </>}
  </section></main>;
}
