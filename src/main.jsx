import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ─── Security Initialization ──────────────────────────────────

if (typeof window !== 'undefined') {
  // Prevent drag-and-drop file hijacking on document
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
}

// ─── Service Worker Registration ──────────────────────────────

function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                console.log('[App] New content available, refresh to update');
              }
            });
          });
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error);
        });

      // Handle controller change (new SW activated) — reload once to get fresh content
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[App] New SW active, reloading...');
        window.location.reload();
      });
    });

    // Request persistent storage for offline support
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          console.log('[App] Persistent storage granted');
        }
      });
    }
  }
}

registerServiceWorker();

// ─── Global Error Handler ─────────────────────────────────────

class SecurityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    console.log('[SecurityErrorBoundary] Constructor called');
  }

  static getDerivedStateFromError(error) {
    console.error('[SecurityErrorBoundary] getDerivedStateFromError called');
    console.error('[SecurityErrorBoundary] Error:', error);
    console.error('[SecurityErrorBoundary] Error message:', error?.message);
    console.error('[SecurityErrorBoundary] Error stack:', error?.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SecurityErrorBoundary] componentDidCatch called');
    console.error('[SECURITY] React Error:', error);
    console.error('[SECURITY] Error Info:', errorInfo);
    console.error('[SECURITY] Component Stack:', errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    console.log('[SecurityErrorBoundary] Rendering, hasError:', this.state.hasError);
    
    if (this.state.hasError) {
      const errorDetails = this.state.error ? `${this.state.error.message}\n\n${this.state.error.stack || ''}` : 'Unknown error';
      return React.createElement('div', { 
        style: { 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          background: '#F8FAFC',
          color: '#0F172A',
          fontFamily: 'Inter, sans-serif',
          padding: '20px',
          textAlign: 'center',
        }
      }, 
        React.createElement('h1', { style: { fontSize: '24px', marginBottom: '10px' }}, 'Something went wrong'),
        React.createElement('p', { style: { color: 'rgba(15, 23, 42, 0.7)', marginBottom: '20px' }}, 'Please refresh the page or contact support.'),
        React.createElement('details', { style: { textAlign: 'left', maxWidth: '600px', width: '100%' } },
          React.createElement('summary', { style: { cursor: 'pointer', fontWeight: 'bold' }}, 'Error details (click to expand)'),
          React.createElement('pre', { 
            style: { 
              marginTop: '10px', 
              padding: '15px', 
              background: '#fee2e2', 
              borderRadius: '8px', 
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '300px',
              textAlign: 'left',
            } 
          }, errorDetails)
        )
      );
    }

    return this.props.children;
  }
}

// ─── App Mount ────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(SecurityErrorBoundary, null,
      React.createElement(App, null)
    )
  )
);
