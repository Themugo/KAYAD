// src/components/ErrorBoundary.jsx
import { Component } from 'react';
import { reportError } from '../utils/sentry';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Kayad] Uncaught error:', error, info);
    // Report to Sentry in production
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }} aria-hidden="true">💥</div>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, marginBottom: 28 }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              className="btn btn-gold"
              aria-label="Go to homepage"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            >
              ← Go Home
            </button>
            <button className="btn btn-outline" aria-label="Reload page" onClick={() => window.location.reload()}>
              ↻ Reload Page
            </button>
          </div>
          {import.meta.env.MODE === 'development' && this.state.error && (
            <pre style={{
              marginTop: 28, padding: 16, background: 'var(--surface)', borderRadius: 8,
              fontSize: 11, color: 'var(--red)', textAlign: 'left', maxWidth: 600,
              overflow: 'auto', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
