import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { installEmergencyDiagnostics } from './emergencyDiagnostics.ts';

installEmergencyDiagnostics();

const path = window.location.pathname;
const isProject = ['/project', '/project-legacy', '/architect'].some((route) => path === route || path.startsWith(route + '/'));
const isImmoGR = path === '/immogr' || path.startsWith('/immogr/');
const isRetiredImmoFinder = path === '/immofinder' || path.startsWith('/immofinder/');

const ProjectMode = lazy(() => import('./ProjectMode.tsx'));
const ImmoGR = lazy(() => import('./ImmoGR.tsx'));

function ProjectRoot() {
  return <Suspense fallback={<div className="shell"><div className="empty"><h1>BiForge</h1><p>Loading…</p></div></div>}><ProjectMode /></Suspense>;
}
function ImmoGRRoot() {
  return <Suspense fallback={<div className="shell"><div className="empty"><h1>ImmoGR</h1><p>Loading…</p></div></div>}><ImmoGR /></Suspense>;
}
function RetiredImmoFinder() {
  return <main className="shell" style={{ maxWidth: 760, margin: '0 auto', padding: 32 }}>
    <h1>ImmoFinder is permanently retired</h1>
    <p>The previous property-search tool has been stopped and preserved as historical archive. Its search, API, scheduled jobs, and data updates are disabled.</p>
    <p>ImmoGR is the new independent property-search project. Its live search will open only after the new source and quality checks are complete.</p>
    <p><a href="/immogr">Open ImmoGR</a> · <a href="/">BiForge home</a></p>
  </main>;
}
const Root = isRetiredImmoFinder ? RetiredImmoFinder : isImmoGR ? ImmoGRRoot : isProject ? ProjectRoot : App;
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary label={isRetiredImmoFinder ? 'ImmoFinder retired' : isImmoGR ? 'ImmoGR' : isProject ? 'Project' : 'BiForge'}><Root /></ErrorBoundary>
  </React.StrictMode>
);
