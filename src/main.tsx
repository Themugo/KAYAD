import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Simple error boundary for the entire app
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Logging the URL alongside the error, since this app supports
    // URL-encoded state (deep-linked vehicles via ?vehicleId=<id>, see
    // utils/navigation.ts) that can be a factor in what triggered a
    // given crash - knowing the URL narrows down "which page/state"
    // immediately instead of requiring that back-and-forth separately.
    console.error('[KAYAD] Uncaught error:', error, errorInfo);
    console.error('[KAYAD] URL at time of crash:', window.location.href);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F1E8',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ color: '#17244B', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ color: '#64748B', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                // Plain window.location.reload() re-requests the exact
                // same URL. If a crash is ever tied to URL-encoded state
                // (e.g. a deep-linked vehicle - see utils/navigation.ts's
                // VEHICLE_PARAM - this app supports ?vehicleId=<id> links
                // that reopen a specific vehicle's detail modal on load),
                // reloading the same URL reopens the same state and can
                // reproduce the same crash immediately, trapping the user
                // in a loop with no way out except manually editing the
                // address bar. Navigating to the site root first clears
                // any such state unconditionally, so this button is a
                // real escape hatch for any future crash tied to URL
                // state, not just the one that motivated this fix.
                window.location.href = window.location.origin;
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#17244B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          {/* AuthProvider wraps the whole app (KAYAD Fusion Phase 3) -
              real backend-authoritative auth state now lives here,
              above App itself, so App.tsx's own user state can be
              replaced with useAuth() rather than a local useState. */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('[KAYAD] Root element not found');
}
