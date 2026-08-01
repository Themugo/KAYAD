/**
 * KAYAD Recovery Screen
 * Professional error recovery page displayed when startup fails
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Wifi, 
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { healthMonitor, type HealthReport, type ServiceHealth } from './healthMonitor';
import { startupDiagnostics, type StartupReport } from './startup';
import { logger } from './logger';

interface RecoveryScreenProps {
  error?: Error;
  context?: string;
  onRetry?: () => void;
  onReportError?: () => void;
}

export function RecoveryScreen({ 
  error, 
  context = 'application startup',
  onRetry,
  onReportError 
}: RecoveryScreenProps) {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [startupReport, setStartupReport] = useState<StartupReport | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Get current health status
    setHealthReport(healthMonitor.getHealthReport());
    setStartupReport(startupDiagnostics.getReport());
    setCheckingHealth(false);

    // Subscribe to health updates
    const unsubscribe = healthMonitor.subscribe((report) => {
      setHealthReport(report);
    });

    // Refresh health status
    healthMonitor.checkFrontendHealth();
    healthMonitor.checkStorageHealth();
    healthMonitor.checkBackendHealth().finally(() => {
      setHealthReport(healthMonitor.getHealthReport());
    });

    return unsubscribe;
  }, []);

  const handleRetry = (): void => {
    logger.info('User triggered retry from recovery screen');
    onRetry?.();
    window.location.reload();
  };

  const handleReport = (): void => {
    logger.info('User triggered error report from recovery screen', undefined, {
      error: error?.message,
      context,
      healthStatus: healthReport?.overall,
      startupDuration: startupReport?.totalDuration,
    });
    onReportError?.();
    
    // Collect diagnostic info
    const diagnosticInfo = {
      timestamp: new Date().toISOString(),
      error: error?.message,
      stack: error?.stack,
      context,
      health: healthReport,
      startup: startupReport,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create report payload
    const reportText = `KAYAD Error Report\n\nTime: ${diagnosticInfo.timestamp}\nURL: ${diagnosticInfo.url}\nError: ${diagnosticInfo.error || 'N/A'}\nContext: ${diagnosticInfo.context}\n\nHealth Status: ${diagnosticInfo.health?.overall || 'unknown'}\n\nPlease describe what you were doing:`;

    // Open email or support form
    const subject = encodeURIComponent(`KAYAD Error Report: ${diagnosticInfo.error || 'Startup Failure'}`);
    const body = encodeURIComponent(reportText);
    
    window.open(`mailto:support@kayad.co.ke?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-charcoal-900 mb-3">
            We're having trouble starting KAYAD
          </h1>

          {/* Description */}
          <p className="text-charcoal-600 mb-6">
            {error 
              ? `An error occurred: ${error.message}` 
              : 'Something went wrong during application startup. Our team has been notified.'}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary: Retry */}
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-navy-700 text-white rounded-xl font-medium hover:bg-navy-800 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Retry
            </button>

            {/* Secondary: Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReport}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-cream-100 text-charcoal-700 rounded-xl font-medium hover:bg-cream-200 transition-colors"
              >
                <Bug className="w-4 h-4" />
                Report Error
              </button>

              <Link
                to="/"
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-cream-100 text-charcoal-700 rounded-xl font-medium hover:bg-cream-200 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>

          {/* Check Status Link */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-6 text-sm text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1 mx-auto"
          >
            <Wifi className="w-4 h-4" />
            {showDetails ? 'Hide' : 'Check'} Status
          </button>
        </div>

        {/* Status Details Panel */}
        {showDetails && (
          <div className="mt-4 bg-white rounded-xl border border-cream-200 p-6">
            <h2 className="text-lg font-semibold text-charcoal-900 mb-4 text-center">
              System Status
            </h2>

            {/* Startup Status */}
            {startupReport && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-charcoal-500 uppercase mb-3">
                  Startup Progress
                </h3>
                <div className="space-y-2">
                  {startupReport.checks.map((check) => (
                    <div 
                      key={check.id} 
                      className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0"
                    >
                      <span className="text-sm text-charcoal-700">{check.name}</span>
                      <div className="flex items-center gap-2">
                        {check.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {check.status === 'failed' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        {check.status === 'pending' && (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {check.status === 'running' && (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        )}
                        {check.duration && (
                          <span className="text-xs text-charcoal-400">
                            {check.duration.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {startupReport.totalDuration && (
                  <p className="text-xs text-charcoal-400 mt-2 text-right">
                    Total: {startupReport.totalDuration.toFixed(0)}ms
                  </p>
                )}
              </div>
            )}

            {/* Service Health */}
            {healthReport && (
              <div>
                <h3 className="text-sm font-semibold text-charcoal-500 uppercase mb-3">
                  Service Health
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {healthReport.services.map((service) => (
                    <div 
                      key={service.name}
                      className="flex items-center gap-2 py-2 px-3 bg-cream-50 rounded-lg"
                    >
                      <StatusIndicator status={service.status} />
                      <span className="text-sm text-charcoal-700">{service.name}</span>
                      {service.latency && (
                        <span className="text-xs text-charcoal-400 ml-auto">
                          {service.latency.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Status */}
            {healthReport && (
              <div className="mt-4 pt-4 border-t border-cream-200 flex items-center justify-between">
                <span className="font-medium text-charcoal-700">Overall Status</span>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={healthReport.overall} />
                  <span className="font-medium text-charcoal-900 capitalize">
                    {healthReport.overall}
                  </span>
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="mt-4 pt-4 border-t border-cream-200">
              <a
                href="https://status.kayad.co.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-navy-600 hover:text-navy-800"
              >
                Check KAYAD Status Page
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-charcoal-400 mt-6">
          If this problem persists, please contact support@kayad.co.ke
        </p>
      </div>
    </div>
  );
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'offline':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-gray-300" />;
  }
}

/**
 * Minimal inline recovery message for inline errors
 */
export function InlineRecovery({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            This section couldn't load
          </p>
          <p className="text-xs text-amber-600">
            The rest of the app is working normally
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          onRetry?.();
          window.location.reload();
        }}
        className="text-sm text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

/**
 * Loading screen with progress
 */
interface LoadingScreenProps {
  stage?: string;
  progress?: number;
}

export function LoadingScreen({ stage = 'Starting KAYAD...', progress }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-navy-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-black text-amber-400">K</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-charcoal-900 mb-2">
          KAYAD
        </h1>

        {/* Loading stage */}
        <p className="text-sm text-charcoal-500 mb-4">{stage}</p>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="w-48 mx-auto">
            <div className="h-1 bg-cream-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-navy-700 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-charcoal-400 mt-2">{progress}%</p>
          </div>
        )}

        {/* Spinner */}
        {!progress && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-navy-700 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default RecoveryScreen;
