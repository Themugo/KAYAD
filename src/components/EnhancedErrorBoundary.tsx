// src/components/EnhancedErrorBoundary.tsx
// Enhanced error boundary with detailed observability tracking

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
        errorId: this.state.errorId,
      },
    });

    // Track error in PostHog
    posthog.capture('error_boundary_triggered', {
      error: error.message,
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });

    console.error('[EnhancedErrorBoundary] Error caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });

    // Track retry attempt
    posthog.capture('error_boundary_retry', {
      errorId: this.state.errorId,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div
            style={{ fontSize: 64, marginBottom: 20 }}
            aria-hidden="true"
          >
            💥
          </div>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p
            style={{
              color: 'var(--text-muted)',
              maxWidth: 400,
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Our team has been notified. You can try
            reloading this section or go back to the homepage.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn btn-gold"
              aria-label="Retry"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button
              className="btn btn-outline"
              aria-label="Go to homepage"
              onClick={this.handleGoHome}
            >
              Go to Homepage
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: 32,
                textAlign: 'left',
                maxWidth: 600,
                background: 'var(--bg-secondary)',
                padding: 16,
                borderRadius: 8,
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: 12 }}>
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 300,
                }}
              >
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
