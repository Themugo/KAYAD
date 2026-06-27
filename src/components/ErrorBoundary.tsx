import { Component, ReactNode } from 'react';
import { reportError } from '../utils/posthog';
import { reportError as reportToSentry } from '../utils/sentry';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[Kayad] Uncaught error:', error, info);
    reportError(error, { componentStack: info?.componentStack });
    reportToSentry(error, { componentStack: info?.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

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
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, marginBottom: 28, lineHeight: 1.6 }}>
            An unexpected error occurred. You can try reloading this section or go back to the homepage.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-gold"
              aria-label="Go to homepage"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            >
              Go Home
            </button>
            <button
              className="btn btn-outline"
              aria-label="Try again"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button className="btn btn-outline" aria-label="Reload page" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
          {import.meta.env.MODE === 'development' && this.state.error && (
            <pre style={{
              marginTop: 28, padding: 16, background: 'var(--surface)', borderRadius: 8,
              fontSize: 11, color: 'var(--red)', textAlign: 'left', maxWidth: 600,
              overflow: 'auto', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {this.state.error.toString()}
              {this.state.error.stack && `\n\n${this.state.error.stack}`}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
