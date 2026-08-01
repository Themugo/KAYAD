/**
 * KAYAD Error Boundary Components
 * Provides graceful error handling for React components
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { globalErrorHandler } from './errorHandler';
import { logger, createModuleLogger } from './logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  moduleName?: string;
  showDetails?: boolean;
  variant?: 'full' | 'inline' | 'card';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

const log = createModuleLogger('ErrorBoundary');

/**
 * Standard Error Boundary
 * Wraps components and displays fallback on error
 */
export class StandardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log the error
    log.error(
      `Error in ${this.props.moduleName || 'component'}`,
      this.props.moduleName,
      { message: error.message, stack: error.stack, componentStack: errorInfo.componentStack }
    );

    // Handle globally
    globalErrorHandler.handleError(
      'react',
      error.message,
      error,
      this.props.moduleName,
      errorInfo.componentStack
    );

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function' 
          ? (this.props.fallback as any)({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      // Default fallback based on variant
      if (this.props.variant === 'inline') {
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span>Something went wrong in this section.</span>
              <button 
                onClick={this.handleReset}
                className="ml-auto text-amber-600 hover:text-amber-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        );
      }

      if (this.props.variant === 'card') {
        return (
          <div className="bg-white rounded-xl border border-cream-200 p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-charcoal-900 mb-2">Section Unavailable</h3>
            <p className="text-sm text-charcoal-600 mb-4">
              This section couldn't load. The rest of the app is working.
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      }

      // Full page variant (default)
      return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-cream-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-charcoal-900 mb-3">
              Something went wrong
            </h1>

            <p className="text-charcoal-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page or return to the homepage.
            </p>

            {this.state.error && this.state.error.message && (
              <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal-500 uppercase">Error Details</p>
                  <button
                    onClick={this.toggleDetails}
                    className="text-charcoal-400 hover:text-charcoal-600"
                  >
                    {this.state.showDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {this.state.showDetails && (
                  <p className="text-xs text-charcoal-600 break-all font-mono">
                    {this.state.error.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                to="/"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 text-charcoal-900 rounded-xl font-medium hover:bg-amber-500 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>

            <button
              onClick={() => {
                log.info('User reported error', this.props.moduleName);
                alert('Thank you for reporting. Our team has been notified.');
              }}
              className="mt-4 text-sm text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1 mx-auto"
            >
              <Bug className="w-3 h-3" />
              Report this error
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Module-specific error boundaries for major application sections
 */

interface ModuleErrorBoundaryProps {
  children: ReactNode;
  moduleName: string;
  onError?: (error: Error) => void;
}

export function MarketplaceErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="Marketplace"
      variant="card"
      onError={onError}
      fallback={
        <div className="bg-cream-50 rounded-xl p-8 text-center border border-cream-200">
          <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-navy-500" />
          </div>
          <h3 className="font-semibold text-charcoal-900 mb-2">Marketplace Unavailable</h3>
          <p className="text-sm text-charcoal-600 mb-4">
            The marketplace couldn't load. Other sections are still working.
          </p>
        </div>
      }
    >
      {children}
    </StandardErrorBoundary>
  );
}

export function DealerPortalErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="DealerPortal"
      variant="card"
      onError={onError}
    >
      {children}
    </StandardErrorBoundary>
  );
}

export function FinanceErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="Finance"
      variant="card"
      onError={onError}
    >
      {children}
    </StandardErrorBoundary>
  );
}

export function AuctionErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="Auction"
      variant="card"
      onError={onError}
    >
      {children}
    </StandardErrorBoundary>
  );
}

export function AdminErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="Admin"
      variant="card"
      onError={onError}
    >
      {children}
    </StandardErrorBoundary>
  );
}

export function CheckoutErrorBoundary({ children, onError }: ModuleErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName="Checkout"
      variant="full"
      onError={onError}
    >
      {children}
    </StandardErrorBoundary>
  );
}

/**
 * Lazy loading error boundary for code-split chunks
 */
interface LazyLoadErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  chunkName?: string;
}

export function LazyLoadErrorBoundary({ children, fallback, chunkName }: LazyLoadErrorBoundaryProps) {
  return (
    <StandardErrorBoundary
      moduleName={chunkName || 'LazyModule'}
      variant="inline"
      fallback={
        fallback || (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-4 text-center">
            <p className="text-sm text-charcoal-600 mb-2">
              This content couldn't be loaded.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-navy-600 hover:text-navy-800 text-sm underline"
            >
              Reload page
            </button>
          </div>
        )
      }
    >
      {children}
    </StandardErrorBoundary>
  );
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  moduleName?: string,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <StandardErrorBoundary moduleName={moduleName} fallback={fallback}>
        <Component {...props} />
      </StandardErrorBoundary>
    );
  };
}

export default StandardErrorBoundary;
