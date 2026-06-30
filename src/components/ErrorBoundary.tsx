// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";
import { logError } from "../utils/logger";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError("React ErrorBoundary caught", { error: error.message, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-display text-gold mb-2">Something went wrong</h2>
              <p className="text-text-muted mb-4">{this.state.error?.message ?? "An unexpected error occurred."}</p>
              <button
                onClick={() => location.reload()}
                className="px-4 py-2 bg-gold text-bg rounded-lg font-semibold"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
