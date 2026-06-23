// src/utils/observability.ts
// Frontend observability utilities for RUM, performance tracking, and analytics

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

/**
 * Initialize observability (Sentry + PostHog)
 */
export function initObservability() {
  // Sentry is already initialized in main.tsx
  // PostHog is already initialized in main.tsx
  // This function is for additional initialization if needed
}

/**
 * Track Core Web Vitals
 */
export function trackCoreWebVitals() {
  if (typeof window === 'undefined') return;

  // Import web-vitals dynamically
  import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
    // CLS (Cumulative Layout Shift)
    onCLS((metric) => {
      Sentry.captureMessage('CLS Metric', {
        level: 'info',
        tags: {
          metric: 'CLS',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'CLS',
        value: metric.value,
        rating: metric.rating,
      });
    });

    // INP (Interaction to Next Paint) - replaces FID in web-vitals v4
    onINP((metric) => {
      Sentry.captureMessage('INP Metric', {
        level: 'info',
        tags: {
          metric: 'INP',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'INP',
        value: metric.value,
        rating: metric.rating,
      });
    });

    // FCP (First Contentful Paint)
    onFCP((metric) => {
      Sentry.captureMessage('FCP Metric', {
        level: 'info',
        tags: {
          metric: 'FCP',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'FCP',
        value: metric.value,
        rating: metric.rating,
      });
    });

    // LCP (Largest Contentful Paint)
    onLCP((metric) => {
      Sentry.captureMessage('LCP Metric', {
        level: 'info',
        tags: {
          metric: 'LCP',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'LCP',
        value: metric.value,
        rating: metric.rating,
      });
    });

    // TTFB (Time to First Byte)
    onTTFB((metric) => {
      Sentry.captureMessage('TTFB Metric', {
        level: 'info',
        tags: {
          metric: 'TTFB',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'TTFB',
        value: metric.value,
        rating: metric.rating,
      });
    });

    // INP (Interaction to Next Paint)
    onINP((metric) => {
      Sentry.captureMessage('INP Metric', {
        level: 'info',
        tags: {
          metric: 'INP',
          value: metric.value,
          rating: metric.rating,
        },
        extra: {
          metric: metric,
        },
      });
      posthog.capture('core_web_vital', {
        metric: 'INP',
        value: metric.value,
        rating: metric.rating,
      });
    });
  });
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  posthog.capture('$pageview', {
    page: pageName,
    ...properties,
  });

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Viewed ${pageName}`,
    level: 'info',
  });
}

/**
 * Track user action
 */
export function trackUserAction(action: string, properties?: Record<string, any>) {
  posthog.capture(action, properties);

  Sentry.addBreadcrumb({
    category: 'user',
    message: action,
    level: 'info',
    data: properties,
  });
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });

  posthog.capture('error', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Track performance
 */
export function trackPerformance(metricName: string, value: number, unit: string = 'ms') {
  posthog.capture('performance', {
    metric: metricName,
    value,
    unit,
  });

  Sentry.captureMessage('Performance Metric', {
    level: 'info',
    tags: {
      metric: metricName,
      value,
      unit,
    },
  });
}

/**
 * Track workflow step
 */
export function trackWorkflowStep(workflowName: string, step: string, properties?: Record<string, any>) {
  posthog.capture('workflow_step', {
    workflow: workflowName,
    step,
    ...properties,
  });

  Sentry.addBreadcrumb({
    category: 'workflow',
    message: `${workflowName} - ${step}`,
    level: 'info',
    data: properties,
  });
}

/**
 * Track workflow completion
 */
export function trackWorkflowCompletion(workflowName: string, success: boolean, properties?: Record<string, any>) {
  posthog.capture('workflow_completion', {
    workflow: workflowName,
    success,
    ...properties,
  });

  Sentry.addBreadcrumb({
    category: 'workflow',
    message: `${workflowName} - ${success ? 'Completed' : 'Failed'}`,
    level: success ? 'info' : 'warning',
    data: properties,
  });
}

/**
 * Track workflow abandonment
 */
export function trackWorkflowAbandonment(workflowName: string, step: string, properties?: Record<string, any>) {
  posthog.capture('workflow_abandonment', {
    workflow: workflowName,
    step,
    ...properties,
  });

  Sentry.captureMessage('Workflow Abandoned', {
    level: 'warning',
    tags: {
      workflow: workflowName,
      step,
    },
    extra: properties,
  });
}

/**
 * Track user journey
 */
export function trackUserJourney(journeyName: string, step: string, properties?: Record<string, any>) {
  posthog.capture('user_journey', {
    journey: journeyName,
    step,
    ...properties,
  });
}

/**
 * Track API call
 */
export function trackApiCall(endpoint: string, method: string, duration: number, success: boolean) {
  posthog.capture('api_call', {
    endpoint,
    method,
    duration,
    success,
  });

  if (!success) {
    Sentry.captureMessage('API Call Failed', {
      level: 'warning',
      tags: {
        endpoint,
        method,
      },
      extra: {
        duration,
      },
    });
  }
}

/**
 * Set user context
 */
export function setUserContext(userId: string, properties?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...properties,
  });

  posthog.identify(userId, properties);
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
  posthog.reset();
}
