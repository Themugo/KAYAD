# Frontend Observability

## Overview

This document outlines the frontend observability implementation for the KAYAD platform, including Real User Monitoring (RUM), session replay, performance tracking, error tracking, and user journey analytics.

## Tools Integrations

### Sentry
- **Purpose**: Error tracking, performance monitoring, session replay
- **Features**:
  - JavaScript error tracking
  - Performance monitoring (RUM)
  - Session replay
  - User context tracking
  - Release tracking
- **Configuration**: Initialized in `main.tsx`

### PostHog
- **Purpose**: Product analytics, user journey tracking
- **Features**:
  - Event tracking
  - User journey analytics
  - Funnel analysis
  - Session recording
  - Feature flags
- **Configuration**: Initialized in `main.tsx`

## Implemented Features

### 1. Real User Monitoring (RUM)

#### Core Web Vitals Tracking
- **File**: `src/utils/observability.ts`
- **Metrics Tracked**:
  - CLS (Cumulative Layout Shift)
  - FID (First Input Delay)
  - FCP (First Contentful Paint)
  - LCP (Largest Contentful Paint)
  - TTFB (Time to First Byte)
  - INP (Interaction to Next Paint)
- **Implementation**: Uses `web-vitals` library
- **Reporting**: Sentry and PostHog

#### Performance Metrics
- **Function**: `trackPerformance(metricName, value, unit)`
- **Usage**: Track custom performance metrics
- **Reporting**: PostHog and Sentry

### 2. Session Replay

#### Sentry Session Replay
- **Feature**: Enabled in Sentry configuration
- **Purpose**: Replay user sessions to debug issues
- **Privacy**: Sensitive data masked
- **Sampling**: 100% for errors, 10% for normal sessions

#### PostHog Session Recording
- **Feature**: Enabled in PostHog configuration
- **Purpose**: User behavior analysis
- **Privacy**: Configurable masking
- **Sampling**: 100% for development, configurable for production

### 3. Frontend Performance Monitoring

#### Page Performance
- **Function**: `trackPageView(pageName, properties)`
- **Metrics**: Page load time, navigation timing
- **Reporting**: PostHog and Sentry breadcrumbs

#### API Performance
- **Function**: `trackApiCall(endpoint, method, duration, success)`
- **Metrics**: API call duration, success rate
- **Reporting**: PostHog and Sentry

### 4. Error Tracking

#### Enhanced Error Boundary
- **File**: `src/components/EnhancedErrorBoundary.tsx`
- **Features**:
  - React error boundary with detailed tracking
  - Sentry exception capture
  - PostHog error event
  - Error ID for correlation
  - Development-only error details
  - Retry functionality

#### JavaScript Errors
- **Function**: `trackError(error, context)`
- **Features**:
  - Sentry exception capture
  - PostHog error event
  - Contextual information
  - Stack trace capture

### 5. User Journey Analytics

#### Workflow Tracking
- **File**: `src/hooks/useWorkflowTracking.ts`
- **Features**:
  - Workflow step tracking
  - Abandonment detection
  - Timeout-based abandonment
  - Duration tracking
- **Workflows**:
  - Car browsing workflow
  - Registration workflow
  - Listing workflow

#### User Journey Tracking
- **Function**: `trackUserJourney(journeyName, step, properties)`
- **Purpose**: Track multi-step user journeys
- **Reporting**: PostHog

### 6. Abandoned Workflow Tracking

#### Detection Methods
- **Timeout-based**: Workflow abandoned after timeout
- **Route change**: User navigates away without completion
- **Session end**: User closes browser

#### Tracked Workflows
- Car browsing (1 minute timeout)
- Registration (5 minute timeout)
- Listing (10 minute timeout)

## Observability Provider

### ObservabilityProvider Component
- **File**: `src/components/ObservabilityProvider.tsx`
- **Purpose**: Initialize observability and track page views
- **Features**:
  - Core Web Vitals initialization
  - Page view tracking on route changes
  - Automatic instrumentation

## Metrics Tracked

### Core Web Vitals
- **CLS**: Cumulative Layout Shift (target: <0.1)
- **FID**: First Input Delay (target: <100ms)
- **FCP**: First Contentful Paint (target: <1.8s)
- **LCP**: Largest Contentful Paint (target: <2.5s)
- **TTFB**: Time to First Byte (target: <600ms)
- **INP**: Interaction to Next Paint (target: <200ms)

### Custom Metrics
- API call duration
- Workflow step duration
- Page load time
- User interaction time

### Error Metrics
- JavaScript error rate
- Error boundary triggers
- API failure rate
- Workflow abandonment rate

## Executive Dashboards

### Dashboard 1: Performance Overview
- **Metrics**:
  - Core Web Vitals (p50, p95, p99)
  - Page load time
  - API response time
  - Error rate
- **Time Range**: Last 7 days, 30 days, 90 days
- **Drill-down**: View by page, by user segment

### Dashboard 2: User Journey Analytics
- **Metrics**:
  - Funnel conversion rates
  - Workflow completion rates
  - Abandonment rates
  - Time to complete
- **Workflows**:
  - Car browsing
  - Registration
  - Listing
  - Payment
- **Time Range**: Last 7 days, 30 days, 90 days

### Dashboard 3: Error Monitoring
- **Metrics**:
  - Error rate by type
  - Error rate by page
  - Error rate by user segment
  - Top errors
- **Features**:
  - Error drill-down
  - Session replay for errors
  - Error trend analysis
- **Time Range**: Last 24 hours, 7 days, 30 days

### Dashboard 4: Real User Monitoring
- **Metrics**:
  - Real-time page views
  - Real-time errors
  - Real-time performance
  - Active users
- **Features**:
  - Live session replay
  - Real-time alerts
  - Geographic distribution

## Configuration

### Environment Variables
```env
VITE_SENTRY_DSN=your-sentry-dsn
VITE_POSTHOG_KEY=your-posthog-key
VITE_POSTHOG_HOST=your-posthog-host
```

### Sampling Rates
- **Sentry Error Sampling**: 100%
- **Sentry Performance Sampling**: 10%
- **Sentry Session Replay**: 100% for errors, 10% for normal
- **PostHog Session Recording**: Configurable

## Privacy Considerations

### Data Masking
- **Sensitive Data**: Passwords, credit cards, personal information
- **PII**: Email addresses, phone numbers
- **Session Replay**: Masked by default

### Consent
- **GDPR**: User consent required for analytics
- **CCPA**: Opt-out option available
- **Cookie Policy**: Clear cookie disclosure

## Best Practices

### Performance
- Keep tracking lightweight (<5% overhead)
- Use sampling for high-volume events
- Batch API calls when possible
- Cache user context

### Privacy
- Mask sensitive data
- Obtain user consent
- Provide opt-out options
- Follow data retention policies

### Debugging
- Use session replay for debugging
- Correlate errors with performance
- Track user context
- Monitor sampling rates

## Troubleshooting

### High Error Rate
1. Check error dashboard in Sentry
2. Review session replays
3. Identify common patterns
4. Prioritize high-impact errors

### Poor Performance
1. Check Core Web Vitals
2. Review page load times
3. Identify slow API calls
4. Optimize critical path

### High Abandonment Rate
1. Review workflow analytics
2. Identify abandonment points
3. Simplify complex workflows
4. Add progress indicators

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [PostHog Documentation](https://posthog.com/docs)
- [Web Vitals](https://web.dev/vitals/)
- [RUM Best Practices](https://www.w3.org/TR/rum/)
