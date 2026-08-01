/**
 * KAYAD Global Error Handler
 * Catches and handles all unhandled errors in the application
 */

import { logger, createModuleLogger, LogLevel } from './logger';
import { healthMonitor } from './healthMonitor';

export interface ErrorContext {
  timestamp: Date;
  type: 'unhandled' | 'promise' | 'react' | 'network' | 'chunk' | 'route' | 'render' | 'unknown';
  message: string;
  stack?: string;
  url: string;
  user?: string;
  browser: string;
  userAgent: string;
  module?: string;
  componentStack?: string;
  recovery?: string;
}

interface ErrorHandlerConfig {
  enableConsoleCapture: boolean;
  enableRemoteReporting: boolean;
  maxErrors: number;
  debounceMs: number;
}

class GlobalErrorHandler {
  private errors: ErrorContext[] = [];
  private config: ErrorHandlerConfig = {
    enableConsoleCapture: true,
    enableRemoteReporting: false,
    maxErrors: 50,
    debounceMs: 1000,
  };
  private lastErrorTime = 0;
  private errorCount = 0;
  private readonly log = createModuleLogger('ErrorHandler');

  configure(options: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  // Create error context
  private createErrorContext(
    type: ErrorContext['type'],
    message: string,
    error?: Error | unknown,
    module?: string,
    componentStack?: string
  ): ErrorContext {
    const stack = error instanceof Error ? error.stack : 
                  typeof error === 'string' ? error : 
                  undefined;
    
    return {
      timestamp: new Date(),
      type,
      message,
      stack,
      url: window.location.href,
      user: this.getUserId(),
      browser: this.getBrowser(),
      userAgent: navigator.userAgent,
      module,
      componentStack,
      recovery: this.suggestRecovery(type, message),
    };
  }

  private getUserId(): string {
    try {
      return localStorage.getItem('kayad_user_id') || 'anonymous';
    } catch {
      return 'unknown';
    }
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  // Suggest recovery action based on error type
  private suggestRecovery(type: ErrorContext['type'], message: string): string {
    const recoverySuggestions: Record<string, string> = {
      unhandled: 'Please refresh the page. If the issue persists, try clearing your browser cache.',
      promise: 'A background operation failed. Please try again.',
      react: 'A component error occurred. The problematic section has been isolated.',
      network: 'Please check your internet connection and try again.',
      chunk: 'A code update is available. Please refresh to get the latest version.',
      route: 'The page could not be loaded. Please try navigating again.',
      render: 'A display error occurred. Please refresh the page.',
      unknown: 'An unexpected error occurred. Please refresh the page.',
    };

    // Customize based on message
    if (message.includes('auth')) {
      return 'Authentication error. Please log in again.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (message.includes('chunk')) {
      return 'A code update is available. Please refresh the page.';
    }

    return recoverySuggestions[type] || recoverySuggestions.unknown;
  }

  // Handle and log an error
  handleError(
    type: ErrorContext['type'],
    message: string,
    error?: Error | unknown,
    module?: string,
    componentStack?: string
  ): ErrorContext {
    // Debounce rapid errors
    const now = Date.now();
    if (now - this.lastErrorTime < this.config.debounceMs) {
      this.errorCount++;
      if (this.errorCount > 10) {
        this.log.warn(`Multiple rapid errors detected: ${this.errorCount}`, module);
      }
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    // Create error context
    const context = this.createErrorContext(type, message, error, module, componentStack);
    
    // Add to error list (limit size)
    this.errors.push(context);
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }

    // Log the error
    const logLevel = type === 'chunk' ? LogLevel.WARNING : LogLevel.ERROR;
    this.log.log(logLevel, `[${type.toUpperCase()}] ${message}`, module, {
      stack: context.stack,
      recovery: context.recovery,
      errorCount: this.errorCount,
    });

    // Update health monitor
    healthMonitor.updateServiceHealth('Frontend', 'warning', {
      error: message,
      errorType: type,
    });

    // Report to remote if configured
    if (this.config.enableRemoteReporting) {
      this.reportToRemote(context);
    }

    return context;
  }

  // Report error to remote endpoint
  private async reportToRemote(context: ErrorContext): Promise<void> {
    try {
      // Would send to Sentry, Datadog, etc.
      this.log.debug('Error report sent to remote', undefined, { errorId: context.timestamp.getTime() });
    } catch {
      // Silently fail
    }
  }

  // Get all captured errors
  getErrors(): ErrorContext[] {
    return [...this.errors];
  }

  // Get error count
  getErrorCount(): number {
    return this.errors.length;
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
    this.errorCount = 0;
  }

  // Initialize global handlers
  initialize(): () => void {
    this.log.info('Initializing global error handlers');

    // Unhandled exceptions
    const unhandledHandler = (event: ErrorEvent) => {
      event.preventDefault();
      this.handleError(
        'unhandled',
        event.message,
        event.error,
        'window.onerror'
      );
    };

    // Unhandled promise rejections
    const promiseHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const message = event.reason instanceof Error 
        ? event.reason.message 
        : String(event.reason);
      this.handleError(
        'promise',
        message,
        event.reason,
        'window.onunhandledrejection'
      );
    };

    // Network error handler for fetch/XHR
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && response.status >= 500) {
          this.handleError(
            'network',
            `Server error: ${response.status} ${response.statusText}`,
            undefined,
            'fetch'
          );
        }
        return response;
      } catch (error) {
        this.handleError(
          'network',
          error instanceof Error ? error.message : 'Network request failed',
          error,
          'fetch'
        );
        throw error;
      }
    };

    // Chunk loading error handler
    const chunkHandler = (event: Event) => {
      const target = event.target as HTMLScriptElement;
      if (target.src) {
        this.handleError(
          'chunk',
          `Failed to load chunk: ${target.src.split('/').pop()}`,
          undefined,
          'chunk-loading'
        );
      }
    };

    // Attach listeners
    window.addEventListener('error', unhandledHandler);
    window.addEventListener('unhandledrejection', promiseHandler);
    window.addEventListener('error', chunkHandler);

    // Return cleanup function
    return () => {
      window.removeEventListener('error', unhandledHandler);
      window.removeEventListener('unhandledrejection', promiseHandler);
      window.removeEventListener('error', chunkHandler);
      this.log.info('Global error handlers removed');
    };
  }
}

// Singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

export default globalErrorHandler;
