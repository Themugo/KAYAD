// backend/config/monitoring.js - Deployment Monitoring & Alerting Configuration
// ─────────────────────────────────────────────────────────────
// Centralized monitoring configuration for deployment health
// ─────────────────────────────────────────────────────────────

export const monitoringConfig = {
  // Health check intervals
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 10000, // 10 seconds
    retries: 3,
    endpoints: [
      '/health',
      '/health/live',
      '/health/ready',
      '/health/deep'
    ]
  },

  // Alert thresholds
  alerts: {
    errorRate: {
      warning: 0.05, // 5% error rate
      critical: 0.10 // 10% error rate
    },
    responseTime: {
      warning: 1000, // 1 second
      critical: 3000 // 3 seconds
    },
    memory: {
      warning: 0.8, // 80% memory usage
      critical: 0.9 // 90% memory usage
    },
    cpu: {
      warning: 0.7, // 70% CPU usage
      critical: 0.9 // 90% CPU usage
    }
  },

  // Deployment monitoring
  deployment: {
    enableWebhooks: true,
    webhookUrl: process.env.DEPLOYMENT_WEBHOOK_URL,
    notifyOn: {
      start: true,
      success: true,
      failure: true,
      rollback: true
    }
  },

  // Service dependencies
  dependencies: {
    supabase: {
      checkInterval: 60000,
      timeout: 5000
    },
    redis: {
      checkInterval: 60000,
      timeout: 3000
    },
    externalApis: {
      posthog: {
        checkInterval: 300000,
        timeout: 5000
      },
      cloudinary: {
        checkInterval: 300000,
        timeout: 5000
      }
    }
  },

  // Queue monitoring
  queues: {
    checkInterval: 60000,
    thresholds: {
      backlog: {
        warning: 100,
        critical: 500
      },
      processingTime: {
        warning: 30000, // 30 seconds
        critical: 120000 // 2 minutes
      }
    }
  },

  // Background job monitoring
  workers: {
    checkInterval: 60000,
    expectedWorkers: [
      'notification',
      'email',
      'sms',
      'fraud',
      'image',
      'seo'
    ]
  }
};

export default monitoringConfig;
