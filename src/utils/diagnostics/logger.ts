/**
 * KAYAD Structured Logging Framework
 * Provides consistent logging across all application modules
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARNING]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.CRITICAL]: 'CRITICAL',
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  module?: string;
  data?: Record<string, unknown>;
  stack?: string;
  user?: string;
  url?: string;
  browser?: string;
  recovery?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  captureStack: boolean;
  environment: 'development' | 'production' | 'test';
}

class KayadLogger {
  private config: LoggerConfig = {
    minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARNING,
    enableConsole: true,
    enableRemote: false,
    captureStack: true,
    environment: import.meta.env.PROD ? 'production' : import.meta.env.DEV ? 'development' : 'test',
  };

  private startupMarkers: Map<string, number> = new Map();

  configure(options: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private createEntry(
    level: LogLevel,
    message: string,
    module?: string,
    data?: Record<string, unknown>,
    stack?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      module,
      data,
      stack,
      user: typeof localStorage !== 'undefined' ? localStorage.getItem('kayad_user_id') || 'anonymous' : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      browser: typeof navigator !== 'undefined' ? this.getBrowserInfo() : 'Unknown',
    };
  }

  private formatEntry(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.levelName}]`;
    const module = entry.module ? ` [${entry.module}]` : '';
    const msg = `${prefix}${module} ${entry.message}`;
    
    if (entry.data) {
      return `${msg}\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    return msg;
  }

  private log(level: LogLevel, message: string, module?: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const stack = level >= LogLevel.ERROR && this.config.captureStack 
      ? new Error().stack 
      : undefined;
    
    const entry = this.createEntry(level, message, module, data, stack);

    if (this.config.enableConsole) {
      const formatted = this.formatEntry(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARNING:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formatted);
          if (entry.stack) console.error('Stack:', entry.stack);
          break;
      }
    }

    // Remote logging would go here (e.g., to Sentry, Datadog, etc.)
    if (this.config.enableRemote && this.config.remoteEndpoint && level >= LogLevel.ERROR) {
      this.sendToRemote(entry);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true,
      });
    } catch {
      // Silently fail - don't create infinite loops
    }
  }

  // Public API
  debug(message: string, module?: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, module, data);
  }

  info(message: string, module?: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, module, data);
  }

  warn(message: string, module?: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARNING, message, module, data);
  }

  error(message: string, module?: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, module, data);
  }

  critical(message: string, module?: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.CRITICAL, message, module, data);
  }

  // Startup timing methods
  startMarker(id: string): void {
    this.startupMarkers.set(id, performance.now());
    this.debug(`START: ${id}`, 'Startup');
  }

  endMarker(id: string, data?: Record<string, unknown>): number {
    const start = this.startupMarkers.get(id);
    if (!start) {
      this.warn(`No start marker found for: ${id}`, 'Startup');
      return 0;
    }
    const duration = performance.now() - start;
    this.info(`COMPLETE: ${id} (${duration.toFixed(2)}ms)`, 'Startup', { duration, ...data });
    this.startupMarkers.delete(id);
    return duration;
  }

  // Recovery logging
  logRecovery(error: Error, action: string, module?: string): void {
    this.error(`RECOVERY: ${action}`, module, {
      error: error.message,
      stack: error.stack,
      recoveryAction: action,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, module?: string): void {
    const level = duration > 3000 ? LogLevel.WARNING : LogLevel.INFO;
    this.log(level, `PERF: ${operation} took ${duration.toFixed(2)}ms`, module, { duration });
  }
}

// Singleton instance
export const logger = new KayadLogger();

// Convenience exports
export const createModuleLogger = (module: string) => ({
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug(msg, module, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info(msg, module, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn(msg, module, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error(msg, module, data),
  critical: (msg: string, data?: Record<string, unknown>) => logger.critical(msg, module, data),
  startMarker: (id: string) => logger.startMarker(`${module}:${id}`),
  endMarker: (id: string, data?: Record<string, unknown>) => logger.endMarker(`${module}:${id}`, data),
});

export default logger;
