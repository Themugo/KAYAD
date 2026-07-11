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
