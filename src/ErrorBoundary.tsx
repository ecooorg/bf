/** Screen-level error boundary — preserves saved data on crash. */
import React, { Component, type ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends Component<
  { children: React.ReactNode; label?: string },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(_e: Error, _i: ErrorInfo) {}
  render() {
    if (this.state.error) {
      return (
        <div className="panel">
          <div className="alert error">
            <AlertCircle size={16} />
            <span>
              {this.props.label || 'Screen'} crashed with an error. Saved data was not deleted.
            </span>
          </div>
          <button className="primary" onClick={() => this.setState({ error: undefined })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

