import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ProjectMode from './ProjectMode.tsx';
import './index.css';

const Root = window.location.pathname === '/project' || window.location.pathname.startsWith('/project/') ? ProjectMode : App;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
