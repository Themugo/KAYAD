// backend/scripts/deploymentMonitor.js - Deployment Health Monitor
// ─────────────────────────────────────────────────────────────
// Monitors deployment health and sends alerts
// ─────────────────────────────────────────────────────────────

import { monitoringConfig } from '../config/monitoring.js';
import { logInfo, logError, logWarn } from '../utils/logger.js';

// =============================
// 📊 HEALTH CHECKS
// =============================

const checkHealth = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: monitoringConfig.healthCheck.timeout
    });
    return {
      url,
      status: response.status,
      healthy: response.ok,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      url,
      status: 0,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

const runHealthChecks = async () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const results = [];

  for (const endpoint of monitoringConfig.healthCheck.endpoints) {
    const url = `${baseUrl}${endpoint}`;
    const result = await checkHealth(url);
    results.push(result);

    if (!result.healthy) {
      logError('Health check failed', { url: result.url, status: result.status });
      await sendAlert('health_check_failed', result);
    }
  }

  return results;
};

// =============================
// 🚨 ALERTS
// =============================

const sendAlert = async (type, data) => {
  try {
    const webhookUrl = monitoringConfig.deployment.webhookUrl;
    if (!webhookUrl) return;

    const payload = {
      type,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      data
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    logInfo('Alert sent', { type });
  } catch (error) {
    logError('Failed to send alert', { type, error: error.message });
  }
};

const notifyDeployment = async (status, details = {}) => {
  if (!monitoringConfig.deployment.enableWebhooks) return;

  const shouldNotify = monitoringConfig.deployment.notifyOn[status];
  if (!shouldNotify) return;

  await sendAlert('deployment', {
    status,
    ...details
  });
};

// =============================
// 🔄 CONTINUOUS MONITORING
// =============================

const startMonitoring = () => {
  logInfo('Starting deployment monitoring...');

  // Health checks
  setInterval(async () => {
    const results = await runHealthChecks();
    const allHealthy = results.every(r => r.healthy);

    if (!allHealthy) {
      logWarn('Health checks failed', { results });
    }
  }, monitoringConfig.healthCheck.interval);

  logInfo('Deployment monitoring started', {
    healthCheckInterval: monitoringConfig.healthCheck.interval,
    endpoints: monitoringConfig.healthCheck.endpoints
  });
};

// =============================
// 🚀 CLI INTERFACE
// =============================

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      runHealthChecks().then(results => {
        console.log(JSON.stringify(results, null, 2));
        process.exit(results.every(r => r.healthy) ? 0 : 1);
      });
      break;

    case 'monitor':
      startMonitoring();
      break;

    case 'notify':
      const status = process.argv[3];
      notifyDeployment(status).then(() => process.exit(0));
      break;

    default:
      console.log('Usage: node deploymentMonitor.js [check|monitor|notify]');
      process.exit(1);
  }
}

export { runHealthChecks, sendAlert, notifyDeployment, startMonitoring };
