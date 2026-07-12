import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ─── Security Initialization ──────────────────────────────────

if (typeof window !== 'undefined') {
  // Prevent drag-and-drop file hijacking on document
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
}

// ─── Service Worker Registration ──────────────────────────────

// Development logger - only logs in development mode
const devLog = import.meta.env.DEV ? console.log.bind(console, '[App]') : () => {};

function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          devLog('Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                devLog('New content available, refresh to update');
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
        devLog('New SW active, reloading...');
        window.location.reload();
      });
    });

    // Request persistent storage for offline support
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        if (granted) {
          devLog('Persistent storage granted');
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
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SECURITY] React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', { 
        style: { 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          background: '#050505',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
        }
      }, 
        React.createElement('h1', null, 'Something went wrong'),
        React.createElement('p', { style: { color: 'rgba(255,255,255,0.5)' } }, 'Please refresh the page or contact support.')
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
