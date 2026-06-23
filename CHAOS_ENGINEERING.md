# Chaos Engineering Framework

## Overview

This document outlines the chaos engineering framework for the KAYAD platform, including outage simulations, resilience validation, and scorecard generation.

## Chaos Experiments

### Database Outage
- **File**: `backend/chaos/databaseOutage.js`
- **Simulation**: Closes database connection or enables chaos mode
- **Severity**: Partial (chaos mode) or Full (connection close)
- **Duration**: Configurable (default 30 seconds)
- **Validation**: Retry, Circuit Breaker, Failover

### Cache Outage
- **File**: `backend/chaos/cacheOutage.js`
- **Simulation**: Closes Redis connection or enables chaos mode
- **Severity**: Partial or Full
- **Duration**: Configurable (default 30 seconds)
- **Validation**: Retry, Circuit Breaker, Fallback to database

### Queue Outage
- **File**: `backend/chaos/queueOutage.js`
- **Simulation**: Sets chaos flag for queue workers
- **Severity**: Partial or Full
- **Duration**: Configurable (default 30 seconds)
- **Validation**: Retry, Circuit Breaker, Dead Letter Queue

### Payment Provider Outage
- **File**: `backend/chaos/paymentOutage.js`
- **Simulation**: Sets chaos flag for payment service
- **Severity**: Partial or Full
- **Duration**: Configurable (default 30 seconds)
- **Validation**: Retry, Circuit Breaker, Fallback, Escrow protection

### Notification Service Outage
- **File**: `backend/chaos/notificationOutage.js`
- **Simulation**: Sets chaos flag for notification service
- **Severity**: Partial or Full
- **Duration**: Configurable (default 30 seconds)
- **Validation**: Retry, Circuit Breaker, Fallback, Queue persistence

## Resilience Patterns

### Retry Mechanism
- **File**: `backend/services/resilienceService.js`
- **Features**:
  - Exponential backoff
  - Configurable max retries
  - Configurable initial delay
  - Configurable max delay
  - Configurable backoff multiplier

### Circuit Breaker
- **File**: `backend/services/resilienceService.js`
- **Features**:
  - Three states: CLOSED, OPEN, HALF_OPEN
  - Configurable failure threshold
  - Configurable reset timeout
  - Automatic state transitions
  - Manual reset capability

### Failover Mechanism
- **File**: `backend/services/resilienceService.js`
- **Features**:
  - Primary and secondary endpoints
  - Automatic failover on threshold
  - Automatic failback to primary
  - Configurable failure threshold
  - Configurable health check interval

## Running Chaos Experiments

### CLI
```bash
# Run specific experiment
node backend/chaos/runChaosExperiment.js database 30000 partial

# Run all experiments
node backend/chaos/runChaosExperiment.js all 30000 partial
```

### GitHub Actions
- **Workflow**: `.github/workflows/chaos-engineering.yml`
- **Triggers**: Weekly scheduled, manual dispatch
- **Parameters**: Experiment type, duration, severity
- **Outputs**: Resilience scorecard, PR comments, GitHub issues

## Resilience Scorecard

### Metrics
- **Retry**: Does the component retry failed operations?
- **Circuit Breaker**: Does the component have circuit breaker protection?
- **Failover**: Does the component failover to backup?
- **Overall**: Is the component resilient overall?

### Grading
- **A**: 90-100% resilience
- **B**: 80-89% resilience
- **C**: 70-79% resilience
- **D**: 60-69% resilience
- **F**: <60% resilience

### Output
- **File**: `backend/resilience-scorecard.json`
- **Format**: JSON
- **Content**: Component scores, overall score, grade

## Validation Tests

### Database Resilience
- Retry mechanism with exponential backoff
- Circuit breaker for connection failures
- Failover to secondary database (if configured)

### Cache Resilience
- Retry mechanism for cache operations
- Circuit breaker for cache failures
- Fallback to database when cache unavailable

### Queue Resilience
- Retry mechanism for queue operations
- Circuit breaker for queue failures
- Dead letter queue for failed jobs

### Payment Resilience
- Retry mechanism for payment operations
- Circuit breaker for payment failures
- Fallback to alternative payment methods
- Escrow protection for funds

### Notification Resilience
- Retry mechanism for notification sends
- Circuit breaker for notification failures
- Fallback to alternative channels
- Queue persistence for failed notifications

## Best Practices

### Experiment Design
- Start with partial severity
- Keep duration short (30 seconds)
- Run during low-traffic periods
- Monitor system during experiments
- Have rollback plan ready

### Safety Measures
- Never run in production without approval
- Always have monitoring enabled
- Set up alerts for experiment failures
- Document experiment results
- Review and update resilience patterns

### Continuous Improvement
- Review scorecard weekly
- Update resilience patterns based on results
- Add new experiments as needed
- Retire experiments that are no longer useful
- Share learnings with team

## References

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Chaos Engineering Best Practices](https://aws.amazon.com/chaos-engineering-best-practices/)
- [Resilience Patterns](https://microservices.io/patterns/resilience/)
