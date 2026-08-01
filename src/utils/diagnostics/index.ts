/**
 * KAYAD Diagnostics Module
 * Comprehensive startup diagnostics and recovery framework
 */

// Logger
export { logger, createModuleLogger, LogLevel } from './logger';

// Health Monitor
export { 
  healthMonitor, 
  type HealthStatus, 
  type ServiceHealth, 
  type HealthReport,
  SERVICE_DEFINITIONS 
} from './healthMonitor';

// Startup Diagnostics
export { 
  startupDiagnostics, 
  registerStartupChecks,
  type StartupCheck,
  type StartupReport 
} from './startup';

// Global Error Handler
export { 
  globalErrorHandler, 
  type ErrorContext 
} from './errorHandler';

// Error Boundaries
export { 
  StandardErrorBoundary,
  MarketplaceErrorBoundary,
  DealerPortalErrorBoundary,
  FinanceErrorBoundary,
  AuctionErrorBoundary,
  AdminErrorBoundary,
  CheckoutErrorBoundary,
  LazyLoadErrorBoundary,
  withErrorBoundary,
} from './errorBoundary';

// Recovery Screen
export { 
  RecoveryScreen, 
  LoadingScreen,
  InlineRecovery as InlineRecoveryComponent,
} from './RecoveryScreen';

// Performance Timeline
export { 
  performanceTimeline, 
  usePerformanceMetrics,
  type PerformanceEntry,
  type PerformanceMetrics 
} from './performanceTimeline';

// Dependency Validator
export { 
  dependencyValidator, 
  registerCriticalDependencies,
  validateCriticalDependencies,
  type DependencyInfo,
  type DependencyValidationResult 
} from './dependencyValidator';

// Initialize all diagnostics systems
export async function initializeDiagnostics(): Promise<void> {
  const { logger } = await import('./logger');
  const { healthMonitor } = await import('./healthMonitor');
  const { globalErrorHandler } = await import('./errorHandler');
  const { registerStartupChecks } = await import('./startup');
  const { registerCriticalDependencies } = await import('./dependencyValidator');

  // Initialize logger
  logger.info('=== KAYAD DIAGNOSTICS INITIALIZING ===');

  // Initialize global error handler
  const cleanupErrorHandler = globalErrorHandler.initialize();
  
  // Mark startup beginning
  healthMonitor.markStartupStart();

  // Register startup checks
  registerStartupChecks();

  // Register critical dependencies
  registerCriticalDependencies();

  // Initial health checks
  healthMonitor.checkFrontendHealth();
  healthMonitor.checkStorageHealth();

  // Start periodic health monitoring
  healthMonitor.startPeriodicChecks(60000); // Every minute

  logger.info('Diagnostics initialized successfully');

  // Return cleanup function
  return () => {
    cleanupErrorHandler();
    healthMonitor.stopPeriodicChecks();
    logger.info('Diagnostics cleanup complete');
  };
}

export default {
  logger,
  healthMonitor,
  startupDiagnostics,
  globalErrorHandler,
  performanceTimeline,
  dependencyValidator,
  initializeDiagnostics,
};
