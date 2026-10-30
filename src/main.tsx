import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { installEmergencyDiagnostics } from './emergencyDiagnostics.ts';

installEmergencyDiagnostics();

const isArchitectLab = window.location.pathname === '/architect-lab' || window.location.pathname.startsWith('/architect-lab/');
const isProject =
  window.location.pathname === '/project' || window.location.pathname.startsWith('/project/');

/** Project Mode is a separate chunk — Simple Mode (/) must not wait for it to parse. */
const ProjectMode = lazy(() => import('./ProjectMode.tsx'));
const ArchitectLab = lazy(() => import('./ArchitectLab.tsx'));

function ProjectRoot() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <div className="empty">
            <h1>BiForge</h1>
            <p>Loading…</p>
          </div>
        </div>
      }
    >
      <ProjectMode />
    </Suspense>
  );
}

function ArchitectLabRoot() {
  return <Suspense fallback={<div className="architect-lab">Loading Architectural Test Lab…</div>}><ArchitectLab /></Suspense>;
}

const Root = isArchitectLab ? ArchitectLabRoot : isProject ? ProjectRoot : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label={isArchitectLab ? 'Architectural Test Lab' : isProject ? 'Project Mode' : 'BiForge'}><Root /></ErrorBoundary>
  </React.StrictMode>
);
