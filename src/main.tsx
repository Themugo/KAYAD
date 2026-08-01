// =============================================
// BINARY SEARCH DEBUGGING - ROOT CAUSE FOUND
// FIX: renderApp was called before initializeApp completed
// =============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { 
  initializeDiagnostics, 
  startupDiagnostics,
  healthMonitor,
  RecoveryScreen,
  StandardErrorBoundary 
} from './utils/diagnostics';
import App from './App';
import './index.css';

// =============================================
// FIX: Wait for initialization before rendering
// =============================================

const startupStart = performance.now();
let startupError: Error | null = null;
let appReady = false;

// Initialize diagnostics and THEN render
async function initializeApp(): Promise<void> {
  try {
    // Initialize diagnostics
    await initializeDiagnostics();
    
    // Run startup checks
    const report = await startupDiagnostics.runChecks();
    
    // Check for critical failures
    if (report.criticalFailure) {
      throw new Error(report.criticalFailure);
    }

    // Check backend health (non-blocking)
    healthMonitor.checkBackendHealth().catch(() => {});
    
    // Mark as ready
    appReady = true;
    
    const startupDuration = performance.now() - startupStart;
    console.log(`[KAYAD] Startup complete in ${startupDuration.toFixed(0)}ms`);
  } catch (error) {
    startupError = error instanceof Error ? error : new Error(String(error));
    console.error('[KAYAD] Startup failed:', startupError);
    appReady = true; // Still mark as ready to show recovery screen
  }
}

// Root error boundary
function RootErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <StandardErrorBoundary
      moduleName="Root"
      variant="full"
      fallback={
        <RecoveryScreen 
          context="application initialization"
          onRetry={() => window.location.reload()}
        />
      }
    >
      {children}
    </StandardErrorBoundary>
  );
}

// Render the application
function renderApp(): void {
  const root = document.getElementById('root');
  
  if (!root) {
    console.error('[KAYAD] Root element not found');
    return;
  }

  if (startupError) {
    // Show recovery screen on startup error
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <RecoveryScreen 
          error={startupError}
          context="application initialization"
          onRetry={() => {
            startupError = null;
            window.location.reload();
          }}
        />
      </React.StrictMode>
    );
    return;
  }

  // Normal app render
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

// Start initialization and rendering
async function bootstrap(): Promise<void> {
  // Start initialization in background
  const initPromise = initializeApp();
  
  // Show loading state immediately
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <div style={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F1E8',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '4px solid #fbbf24',
              borderTopColor: '#17244B',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#17244B', fontSize: '14px' }}>
              Loading KAYAD...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </React.StrictMode>
    );
  }
  
  // Wait for initialization
  await initPromise;
  
  // Now render the actual app
  if (!startupError) {
    renderApp();
  }
}

// Start bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
