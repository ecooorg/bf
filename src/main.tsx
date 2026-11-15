import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { installEmergencyDiagnostics } from './emergencyDiagnostics.ts';

installEmergencyDiagnostics();

/** Project Mode routes (primary workspace). Retired lab route removed; Project Mode only. */
const isProject = ['/project', '/project-legacy', '/architect'].some((path) =>
  window.location.pathname === path || window.location.pathname.startsWith(`${path}/`),
);

/** Project Mode is a separate chunk — Simple Mode (/) must not wait for it to parse. */
const ProjectMode = lazy(() => import('./ProjectMode.tsx'));
const ImmoFinder = lazy(() => import('./ImmoFinder.tsx'));
const isImmo = window.location.pathname === '/immofinder' || window.location.pathname.startsWith('/immofinder/');

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

function ImmoRoot() {
  return <Suspense fallback={<div className="shell"><div className="empty"><h1>ImmoFinder</h1><p>Loading…</p></div></div>}><ImmoFinder /></Suspense>;
}

const Root = isImmo ? ImmoRoot : isProject ? ProjectRoot : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label={isImmo ? 'ImmoFinder' : isProject ? 'Project' : 'BiForge'}><Root /></ErrorBoundary>
  </React.StrictMode>
);
