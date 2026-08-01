/**
 * KAYAD Dependency Validator
 * Verifies critical dependencies at runtime
 */

import { logger, createModuleLogger } from './logger';

export interface DependencyInfo {
  name: string;
  version: string;
  loaded: boolean;
  error?: string;
}

export interface DependencyValidationResult {
  timestamp: Date;
  allValid: boolean;
  dependencies: DependencyInfo[];
  warnings: string[];
  errors: string[];
}

class DependencyValidator {
  private dependencies: Map<string, DependencyInfo> = new Map();
  private readonly log = createModuleLogger('DependencyValidator');

  // Register a dependency to validate
  register(name: string, version?: string): void {
    this.dependencies.set(name, {
      name,
      version: version || 'unknown',
      loaded: false,
    });
  }

  // Check if a dependency is loaded
  check(name: string): boolean {
    try {
      // Try to access the dependency
      const dep = (window as any)[name] || (globalThis as any)[name];
      
      const info = this.dependencies.get(name);
      if (info) {
        info.loaded = !!dep;
        if (!dep) {
          info.error = 'Dependency not found in global scope';
        }
      }

      return !!dep;
    } catch {
      const info = this.dependencies.get(name);
      if (info) {
        info.loaded = false;
        info.error = 'Error checking dependency';
      }
      return false;
    }
  }

  // Validate all registered dependencies
  validateAll(): DependencyValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check critical dependencies
    const criticalDeps = ['React', 'ReactDOM'];
    criticalDeps.forEach((dep) => {
      if (!this.check(dep)) {
        errors.push(`${dep} is not loaded`);
      }
    });

    // Check optional dependencies
    const optionalDeps = ['Sentry', 'posthog', 'gtag'];
    optionalDeps.forEach((dep) => {
      if (!this.check(dep)) {
        warnings.push(`${dep} is not loaded (optional)`);
      }
    });

    const allValid = errors.length === 0;

    return {
      timestamp: new Date(),
      allValid,
      dependencies: Array.from(this.dependencies.values()),
      warnings,
      errors,
    };
  }

  // Validate a specific package version
  validateVersion(name: string, expectedVersion: string): boolean {
    try {
      const pkg = (window as any)[name];
      if (!pkg) return false;

      const version = pkg.version || pkg.VERSION;
      if (!version) {
        this.log.warn(`${name} loaded but version unknown`);
        return true; // Assume OK if loaded but version unknown
      }

      // Simple version check (doesn't handle all semver cases)
      const [expectedMajor] = expectedVersion.split('.').map(Number);
      const [actualMajor] = version.split('.').map(Number);

      if (actualMajor !== expectedMajor) {
        this.log.warn(
          `Version mismatch for ${name}: expected ${expectedVersion}, got ${version}`,
          undefined,
          { expected: expectedMajor, actual: actualMajor }
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Get all dependencies
  getDependencies(): DependencyInfo[] {
    return Array.from(this.dependencies.values());
  }

  // Clear all
  clear(): void {
    this.dependencies.clear();
  }
}

// Singleton instance
export const dependencyValidator = new DependencyValidator();

// Pre-configured critical dependencies
export function registerCriticalDependencies(): void {
  const validator = dependencyValidator;

  // Core React dependencies
  validator.register('React', React.version);
  validator.register('ReactDOM');

  // Routing
  validator.register('ReactRouter');

  // Animation
  validator.register('Motion');

  // Icons
  validator.register('Lucide');

  // HTTP Client
  validator.register('axios');

  // Logging
  validator.log.info('Critical dependencies registered');
}

// Validate critical dependencies at startup
export function validateCriticalDependencies(): DependencyValidationResult {
  logger.info('Validating critical dependencies', 'DependencyValidator');
  
  const result = dependencyValidator.validateAll();

  if (result.allValid) {
    logger.info('All critical dependencies validated', 'DependencyValidator');
  } else {
    logger.error(
      `Dependency validation failed: ${result.errors.join(', ')}`,
      'DependencyValidator'
    );
  }

  result.warnings.forEach((warning) => {
    logger.warn(warning, 'DependencyValidator');
  });

  return result;
}

export default dependencyValidator;
