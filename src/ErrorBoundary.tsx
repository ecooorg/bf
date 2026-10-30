/** Screen-level error boundary — preserves saved data and exposes emergency diagnostics. */
import React, { Component, type ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';
import { downloadEmergencyLog, emergencyLogText, recordEmergencyError } from './emergencyDiagnostics.ts';

export class ErrorBoundary extends Component<
  { children: React.ReactNode; label?: string },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    recordEmergencyError('REACT_RENDER_ERROR', error, info.componentStack || this.props.label);
  }
  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{ minHeight: '100vh', padding: 24, background: '#101820', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
          <h1><AlertCircle size={20} /> BiForge encountered a critical error</h1>
          <p>{this.props.label || 'The screen'} could not be displayed. Your saved data was not intentionally changed.</p>
          <button className="primary" onClick={downloadEmergencyLog}>Download emergency logs</button>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '45vh', overflow: 'auto', padding: 12, background: '#080d12' }}>{emergencyLogText()}</pre>
          <button className="ghost" onClick={() => this.setState({ error: undefined })}>Retry</button>
        </main>
      );
    }
    return this.props.children;
  }
}
