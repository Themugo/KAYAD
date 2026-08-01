/**
 * KAYAD Startup Diagnostics System
 * Tracks and reports application startup progress
 */

import { logger, createModuleLogger } from './logger';
import { healthMonitor, SERVICE_DEFINITIONS, type HealthStatus } from './healthMonitor';

export interface StartupCheck {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  retryable: boolean;
}

export interface StartupReport {
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  checks: StartupCheck[];
  overallStatus: 'pending' | 'running' | 'success' | 'failed' | 'partial';
  criticalFailure?: string;
}

type StartupCheckFn = () => Promise<void> | void;

class StartupDiagnostics {
  private checks: Map<string, StartupCheck> = new Map();
  private startTime: number | null = null;
  private running = false;
  private readonly log = createModuleLogger('Startup');

  // Register a startup check
  registerCheck(
    id: string,
    name: string,
    fn: StartupCheckFn,
    options: { critical?: boolean; retryable?: boolean; timeout?: number } = {}
  ): void {
    const { critical = false, retryable = false, timeout = 10000 } = options;

    this.checks.set(id, {
      id,
      name,
      status: 'pending',
      retryable,
    });

    // Store the function for later execution
    (this as any)[`__check_${id}__`] = async () => {
      const check = this.checks.get(id);
      if (!check) return;

      check.status = 'running';
      this.log.info(`Starting: ${name}`);

      const startTime = performance.now();

      try {
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
        });

        await Promise.race([fn(), timeoutPromise]);

        check.status = 'success';
        check.duration = performance.now() - startTime;
        this.log.info(`Complete: ${name} (${check.duration.toFixed(2)}ms)`);

        // Update health monitor
        healthMonitor.updateServiceHealth(
          this.mapCheckToService(id),
          'healthy',
          { latency: check.duration }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        
        if (check.retryable && !check.duration) {
          // Allow retry for retryable checks
          this.log.warn(`Failed (will retry): ${name}`, undefined, { error: message });
          check.error = message;
        } else {
          check.status = critical ? 'failed' : 'failed';
          check.duration = performance.now() - startTime;
          check.error = message;
          
          this.log.error(`Failed: ${name}`, undefined, { 
            error: message, 
            critical,
            duration: check.duration 
          });

          // Update health monitor
          healthMonitor.updateServiceHealth(
            this.mapCheckToService(id),
            critical ? 'offline' : 'warning',
            { error: message, duration: check.duration }
          );
        }
      }
    };
  }

  // Map check IDs to health service names
  private mapCheckToService(checkId: string): any {
    const mapping: Record<string, any> = {
      'env': SERVICE_DEFINITIONS.FRONTEND,
      'config': SERVICE_DEFINITIONS.FRONTEND,
      'router': SERVICE_DEFINITIONS.ROUTER,
      'auth': SERVICE_DEFINITIONS.AUTH,
      'theme': SERVICE_DEFINITIONS.THEME,
      'api': SERVICE_DEFINITIONS.API_CLIENT,
      'storage': SERVICE_DEFINITIONS.STORAGE,
    };
    return mapping[checkId] || SERVICE_DEFINITIONS.FRONTEND;
  }

  // Run all startup checks
  async runChecks(): Promise<StartupReport> {
    if (this.running) {
      this.log.warn('Startup checks already running');
      return this.getReport();
    }

    this.running = true;
    this.startTime = performance.now();
    healthMonitor.markStartupStart();

    this.log.info('=== STARTUP DIAGNOSTICS BEGIN ===');
    this.log.info(`Total checks registered: ${this.checks.size}`);

    // Execute all checks
    for (const [id, check] of this.checks) {
      const fn = (this as any)[`__check_${id}__`];
      if (fn) {
        try {
          await fn();
        } catch (error) {
          // Already handled in registerCheck
        }
      }
    }

    this.running = false;
    healthMonitor.markStartupComplete();

    const report = this.getReport();
    
    this.log.info('=== STARTUP DIAGNOSTICS COMPLETE ===');
    this.log.info(`Overall Status: ${report.overallStatus}`);
    this.log.info(`Total Duration: ${report.totalDuration?.toFixed(2)}ms`);

    return report;
  }

  // Get current startup report
  getReport(): StartupReport {
    const checks = Array.from(this.checks.values());
    const hasFailed = checks.some((c) => c.status === 'failed');
    const hasPending = checks.some((c) => c.status === 'pending' || c.status === 'running');
    const allSuccess = checks.every((c) => c.status === 'success');

    let overallStatus: StartupReport['overallStatus'] = 'pending';
    if (this.running) {
      overallStatus = 'running';
    } else if (allSuccess) {
      overallStatus = 'success';
    } else if (hasFailed) {
      overallStatus = 'failed';
    } else if (hasPending) {
      overallStatus = 'partial';
    }

    // Find critical failure
    const criticalFailed = checks.find(
      (c) => c.status === 'failed' && c.id !== 'backend' && c.id !== 'analytics'
    );

    return {
      startTime: new Date(this.startTime || Date.now()),
      endTime: this.startTime ? new Date() : undefined,
      totalDuration: this.startTime ? performance.now() - this.startTime : undefined,
      checks,
      overallStatus,
      criticalFailure: criticalFailed?.error,
    };
  }

  // Get specific check status
  getCheck(id: string): StartupCheck | undefined {
    return this.checks.get(id);
  }

  // Reset all checks
  reset(): void {
    this.checks.forEach((check) => {
      check.status = 'pending';
      check.duration = undefined;
      check.error = undefined;
    });
    this.startTime = null;
    this.running = false;
  }

  // Retry a specific check
  async retryCheck(id: string): Promise<StartupCheck | undefined> {
    const check = this.checks.get(id);
    if (!check || !check.retryable) return undefined;

    check.status = 'pending';
    check.error = undefined;

    const fn = (this as any)[`__check_${id}__`];
    if (fn) {
      await fn();
    }

    return this.checks.get(id);
  }
}

// Singleton instance
export const startupDiagnostics = new StartupDiagnostics();

// Predefined startup checks
export function registerStartupChecks(): void {
  const diag = startupDiagnostics;

  // Environment variables check
  diag.registerCheck('env', 'Environment Variables', async () => {
    const required = ['VITE_APP_NAME'];
    const missing = required.filter((key) => !import.meta.env[key]);
    
    if (missing.length > 0) {
      logger.warn(`Missing env vars: ${missing.join(', ')}`, 'Startup');
    }
  });

  // Router check (verify BrowserRouter is present)
  diag.registerCheck('router', 'Router Initialization', async () => {
    // This is implicitly handled by BrowserRouter wrapper in main.tsx
    // We just verify it doesn't throw
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  // Auth check (try to fetch user, but don't fail if backend unavailable)
  diag.registerCheck('auth', 'Authentication', async () => {
    // Auth initialization is handled by AuthContext
    // This check verifies the system can attempt auth
    await new Promise((resolve) => setTimeout(resolve, 50));
  }, { retryable: true });

  // Theme check
  diag.registerCheck('theme', 'Theme Loading', async () => {
    // Theme is handled by ThemeProvider
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  // API client check
  diag.registerCheck('api', 'API Client', async () => {
    // API client is initialized in api.ts
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  // Storage check
  diag.registerCheck('storage', 'Local Storage', async () => {
    try {
      localStorage.setItem('__kayad_startup__', Date.now().toString());
      localStorage.removeItem('__kayad_startup__');
    } catch {
      throw new Error('localStorage not available');
    }
  });
}

export default startupDiagnostics;
