/**
 * Error Handling Utility
 * Standardized error handling for API calls and form submissions
 */

import type { ApiError } from '../types';

// ============================================================
// Error Types
// ============================================================

export class AppError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network error. Please check your connection.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// ============================================================
// Error Parsing
// ============================================================

export function parseApiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const apiError = error as ApiError;

  // Network errors
  if (!apiError.response && !apiError.status) {
    if (apiError.message?.includes('Network') || apiError.message?.includes('fetch')) {
      return new NetworkError();
    }
    return new AppError(apiError.message || 'An unexpected error occurred', 500);
  }

  const status = apiError.response?.status || 500;
  const message = apiError.response?.data?.message || apiError.message || 'An unexpected error occurred';
  const code = apiError.response?.data?.error || apiError.code;

  switch (status) {
    case 400:
      return new AppError(message, status, code || 'BAD_REQUEST');
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError();
    case 422:
      return new ValidationError(message);
    case 429:
      return new AppError('Too many requests. Please try again later.', status, 'RATE_LIMITED');
    case 500:
    case 502:
    case 503:
    case 504:
      return new AppError('Server error. Please try again later.', status, 'SERVER_ERROR');
    default:
      return new AppError(message, status, code);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function getErrorStatus(error: unknown): number {
  if (error instanceof AppError) {
    return error.status;
  }
  const apiError = error as ApiError;
  return apiError.response?.status || 500;
}

// ============================================================
// Error Logging
// ============================================================

export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error('[Error]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  }

  // In production, you might want to send this to a logging service
  if (import.meta.env.PROD && error instanceof AppError) {
    // Send to error tracking service
    // Sentry.captureException(error, { extra: context });
  }
}

// ============================================================
// Async Wrapper
// ============================================================

export type AsyncResult<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

export async function handleAsync<T>(
  promise: Promise<T>,
  context?: Record<string, unknown>
): Promise<AsyncResult<T>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    const appError = parseApiError(error);
    logError(appError, context);
    return { success: false, error: appError };
  }
}

// ============================================================
// Retry Logic
// ============================================================

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// ============================================================
// Common Error Handlers
// ============================================================

export function handleAuthError(error: unknown, onLogout: () => void): boolean {
  const appError = parseApiError(error);
  
  if (appError.status === 401) {
    onLogout();
    return true;
  }
  
  return false;
}

export function handleFormError(
  error: unknown
): Record<string, string> {
  const appError = parseApiError(error);
  
  if (appError instanceof ValidationError && appError.field) {
    return { [appError.field]: appError.message };
  }
  
  // For general errors, you might want to show a toast
  return {};
}
