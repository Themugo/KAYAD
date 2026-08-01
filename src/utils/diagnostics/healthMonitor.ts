/**
 * KAYAD Health Monitor System
 * Monitors all application services and their health status
 */

import { logger, createModuleLogger } from './logger';

export type HealthStatus = 'healthy' | 'warning' | 'offline' | 'unknown';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  timestamp: Date;
  overall: HealthStatus;
  services: ServiceHealth[];
  startupComplete: boolean;
  startupDuration?: number;
}

// Service definitions
export const SERVICE_DEFINITIONS = {
  FRONTEND: 'Frontend',
  ROUTER: 'Router',
  AUTH: 'Authentication',
  THEME: 'Theme',
  API_CLIENT: 'API Client',
  STORAGE: 'Storage',
  NOTIFICATIONS: 'Notifications',
  ANALYTICS: 'Analytics',
  PAYMENT: 'Payment Services',
  INSPECTION: 'Inspection Services',
  AUCTION: 'Auction Services',
  BACKEND: 'Backend API',
} as const;

type ServiceName = typeof SERVICE_DEFINITIONS[keyof typeof SERVICE_DEFINITIONS];

class HealthMonitor {
  private services: Map<ServiceName, ServiceHealth> = new Map();
  private healthCheckInterval: number | null = null;
  private startupStartTime: number | null = null;
  private startupComplete = false;
  private readonly log = createModuleLogger('HealthMonitor');

  constructor() {
    // Initialize all services with unknown status
    Object.values(SERVICE_DEFINITIONS).forEach((name) => {
      this.services.set(name, {
        name,
        status: 'unknown',
        lastCheck: new Date(0),
      });
    });
  }

  // Mark startup as beginning
  markStartupStart(): void {
    this.startupStartTime = performance.now();
    this.log.info('Application startup initiated');
  }

  // Mark startup as complete
  markStartupComplete(): void {
    if (this.startupStartTime) {
      const duration = performance.now() - this.startupStartTime;
      this.startupComplete = true;
      this.log.info(`Startup complete in ${duration.toFixed(2)}ms`, undefined, { duration });
    }
  }

  // Update a service's health
  updateServiceHealth(
    name: ServiceName,
    status: HealthStatus,
    details?: { latency?: number; error?: string; details?: Record<string, unknown> }
  ): void {
    const health: ServiceHealth = {
      name,
      status,
      lastCheck: new Date(),
      ...details,
    };
    this.services.set(name, health);

    if (status === 'offline') {
      this.log.warn(`${name} is offline`, undefined, details);
    } else if (status === 'warning') {
      this.log.warn(`${name} has warnings`, undefined, details);
    } else if (status === 'healthy') {
      this.log.debug(`${name} is healthy`, undefined, details);
    }
  }

  // Get overall health status
  private calculateOverallStatus(): HealthStatus {
    const serviceStatuses = Array.from(this.services.values()).map((s) => s.status);
    
    // Critical services that must be healthy
    const criticalServices: ServiceName[] = [
      SERVICE_DEFINITIONS.FRONTEND,
      SERVICE_DEFINITIONS.ROUTER,
      SERVICE_DEFINITIONS.THEME,
    ];
    
    for (const critical of criticalServices) {
      const health = this.services.get(critical);
      if (health && health.status === 'offline') {
        return 'offline';
      }
    }
    
    // Check for any warnings or offline services
    if (serviceStatuses.includes('offline')) {
      return 'warning';
    }
    if (serviceStatuses.includes('warning')) {
      return 'warning';
    }
    if (serviceStatuses.every((s) => s === 'healthy' || s === 'unknown')) {
      return 'healthy';
    }
    return 'unknown';
  }

  // Generate full health report
  getHealthReport(): HealthReport {
    return {
      timestamp: new Date(),
      overall: this.calculateOverallStatus(),
      services: Array.from(this.services.values()),
      startupComplete: this.startupComplete,
      startupDuration: this.startupStartTime 
        ? performance.now() - this.startupStartTime 
        : undefined,
    };
  }

  // Get single service health
  getServiceHealth(name: ServiceName): ServiceHealth | undefined {
    return this.services.get(name);
  }

  // Check backend API health
  async checkBackendHealth(endpoint: string = '/api/health', timeout: number = 5000): Promise<void> {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;

      if (response.ok) {
        this.updateServiceHealth(SERVICE_DEFINITIONS.BACKEND, 'healthy', { latency });
      } else {
        this.updateServiceHealth(SERVICE_DEFINITIONS.BACKEND, 'warning', {
          latency,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      const latency = performance.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      // Network errors are expected if backend is unavailable
      this.updateServiceHealth(SERVICE_DEFINITIONS.BACKEND, 'warning', {
        latency,
        error: message,
      });
    }
  }

  // Check if frontend is mounted and rendering
  checkFrontendHealth(): void {
    const root = document.getElementById('root');
    const hasContent = root && root.children.length > 0;
    const bodyHasClass = document.body.className.length > 0;

    if (hasContent && bodyHasClass) {
      this.updateServiceHealth(SERVICE_DEFINITIONS.FRONTEND, 'healthy');
    } else if (hasContent) {
      this.updateServiceHealth(SERVICE_DEFINITIONS.FRONTEND, 'warning', {
        error: 'Root exists but body not fully configured',
      });
    } else {
      this.updateServiceHealth(SERVICE_DEFINITIONS.FRONTEND, 'offline', {
        error: 'Root element has no content',
      });
    }
  }

  // Check localStorage availability
  checkStorageHealth(): void {
    try {
      localStorage.setItem('__health_check__', '1');
      localStorage.removeItem('__health_check__');
      this.updateServiceHealth(SERVICE_DEFINITIONS.STORAGE, 'healthy');
    } catch {
      this.updateServiceHealth(SERVICE_DEFINITIONS.STORAGE, 'warning', {
        error: 'localStorage not available',
      });
    }
  }

  // Subscribe to health changes (for UI updates)
  private listeners: Array<(report: HealthReport) => void> = [];

  subscribe(callback: (report: HealthReport) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(): void {
    const report = this.getHealthReport();
    this.listeners.forEach((listener) => listener(report));
  }

  // Start periodic health checks
  startPeriodicChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = window.setInterval(() => {
      this.checkFrontendHealth();
      this.checkStorageHealth();
      this.checkBackendHealth().catch(() => {});
      this.notifyListeners();
    }, intervalMs);
  }

  stopPeriodicChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

export default healthMonitor;
