import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import { logError } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  supportReference: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    supportReference: `KAYAD-${Date.now().toString(36).toUpperCase()}`, 
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logError(error, { componentStack: errorInfo.componentStack ?? undefined }).catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 my-8">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-[#13B8A6]/10 text-[#176B87] rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Something went wrong</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                An unexpected application error occurred. The details have been automatically captured and logged for investigation.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>

              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                <Home className="h-4 w-4" />
                Home
              </a>
            </div>

            <p className="text-xs text-muted-foreground" role="note">
              Support reference: <strong className="font-mono">{this.state.supportReference}</strong>
              <br />Share this reference with KAYAD Support if the problem continues.
            </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

