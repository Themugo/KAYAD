# Observability & Monitoring Guide

## Overview

This document describes the observability and monitoring setup for the KAYAD backend application, including alert thresholds, monitoring configuration, and operational procedures.

## Table of Contents

1. [Monitoring Stack](#monitoring-stack)
2. [Alert Thresholds](#alert-thresholds)
3. [Metrics](#metrics)
4. [Logging](#logging)
5. [Tracing](#tracing)
6. [Health Checks](#health-checks)
7. [Operational Procedures](#operational-procedures)

## Monitoring Stack

### Existing Components

- **Sentry**: Error tracking, performance monitoring, profiling
- **Pino**: Structured logging with JSON format
- **Custom Metrics**: In-memory metrics collection (counters, gauges, histograms)
- **Health Checks**: Comprehensive health monitoring endpoints

### New Components Added

- **Prometheus Metrics**: `/prometheus` endpoint for Prometheus scraping
- **OpenTelemetry**: Distributed tracing instrumentation
- **Performance Monitoring**: Request duration, memory, CPU monitoring middleware

### Configuration

#### Environment Variables

```bash
# Sentry
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=kayad-backend@2.0.0

# OpenTelemetry
OTEL_ENABLED=true
OTEL_SERVICE_NAME=kayad-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Monitoring
NODE_ENV=production
```

## Alert Thresholds

### Critical Alerts (Immediate Action Required)

| Metric | Threshold | Severity | Description |
|--------|-----------|----------|-------------|
| Error Rate | > 5% | CRITICAL | High error rate indicates application issues |
| Database Connection | Down | CRITICAL | Database is unreachable |
| Redis Connection | Down | CRITICAL | Cache layer is unavailable |
| Memory Usage | > 90% | CRITICAL | Near memory exhaustion |
| Response Time (P95) | > 5s | CRITICAL | Severe performance degradation |
| Uptime | < 99% | CRITICAL | Service availability issues |

### Warning Alerts (Investigate Soon)

| Metric | Threshold | Severity | Description |
|--------|-----------|----------|-------------|
| Error Rate | > 1% | WARNING | Elevated error rate |
| Memory Usage | > 80% | WARNING | High memory consumption |
| Response Time (P95) | > 2s | WARNING | Performance degradation |
| Response Time (P99) | > 3s | WARNING | Tail latency issues |
| Slow Requests | > 10% of total | WARNING | High percentage of slow requests |
| Slow DB Queries | > 5% of total | WARNING | Database performance issues |
| External API Latency | > 5s | WARNING | External service issues |

### Info Alerts (Monitor)

| Metric | Threshold | Severity | Description |
|--------|-----------|----------|-------------|
| Response Time (P50) | > 500ms | INFO | Average response time elevated |
| Cache Hit Rate | < 70% | INFO | Cache efficiency decreased |
| Queue Depth | > 100 | INFO | Queue backlog building |

## Metrics

### HTTP Metrics

- `http_requests_total`: Total HTTP requests by method, path, status
- `http_request_duration_ms`: Request duration histogram
- `slow_requests_total`: Requests taking > 1s
- `very_slow_requests_total`: Requests taking > 5s

### Database Metrics

- `db_queries_total`: Database queries by operation, collection
- `db_query_duration_ms`: Query duration histogram
- `slow_db_queries_total`: Queries taking > 1s
- `connection_pool_total`: Total connections in pool
- `connection_pool_available`: Available connections
- `connection_pool_checked_out`: Currently checked out connections

### Cache Metrics

- `cache_hits_total`: Cache hits
- `cache_misses_total`: Cache misses
- `cache_sets_total`: Cache sets
- `cache_deletes_total`: Cache deletions
- `cache_errors_total`: Cache errors

### System Metrics

- `memory_heap_used_mb`: Heap memory used in MB
- `memory_heap_total_mb`: Total heap memory in MB
- `high_memory_usage_total`: Memory usage > 80%
- `critical_memory_usage_total`: Memory usage > 90%
- `cpu_user_time_ms`: CPU user time
- `cpu_system_time_ms`: CPU system time
- `cpu_total_time_ms`: Total CPU time

### External Service Metrics

- `mpesa_token_fetch_duration`: M-Pesa token fetch duration
- `mpesa_stk_push_duration`: M-Pesa STK push duration
- `email_send_duration`: Email send duration
- `sms_send_duration`: SMS send duration
- `redis_operation_duration`: Redis operation duration
- `sentry_capture_duration`: Sentry capture duration

### Payment Metrics

- `payments_total`: Total payments by gateway, status
- `payment_amount`: Payment amount histogram
- `payment_duration_ms`: Payment processing duration

### Escrow Metrics

- `escrow_operations_total`: Escrow operations by type, status
- `escrow_operation_duration_ms`: Escrow operation duration

### Auction Metrics

- `auction_events_total`: Auction events by type
- `auction_event_duration_ms`: Auction event duration

### Circuit Breaker Metrics

- `circuit_breaker_state`: Circuit breaker state (0=closed, 1=open)
- `circuit_breaker_state_change`: Circuit breaker state changes
- `fallback_activation_total`: Fallback activations
- `timeout_total`: Timeouts by service, operation

## Logging

### Log Levels

- **ERROR**: Errors that require immediate attention
- **WARN**: Warning conditions that should be investigated
- **INFO**: Informational messages about normal operation
- **DEBUG**: Detailed debugging information

### Log Format

Logs are structured JSON with the following fields:

```json
{
  "level": "info",
  "time": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123",
  "msg": "Request completed",
  "method": "GET",
  "path": "/api/cars",
  "status": 200,
  "duration": "150ms"
}
```

### Log Locations

- **Development**: Console output with pino-pretty
- **Production**: Rotating log files in `logs/` directory
- **Sentry Integration**: Errors and warnings automatically sent to Sentry

### Audit Logging

Admin and staff actions are automatically logged to the AuditLog collection:

- Action type (e.g., "user.ban", "car.approve")
- Admin user information
- Target resource ID
- HTTP method and path
- IP address
- User agent
- Timestamp

## Tracing

### OpenTelemetry Configuration

OpenTelemetry is disabled by default. Enable it by setting:

```bash
OTEL_ENABLED=true
```

### Traced Components

- HTTP requests (Express)
- Database queries (MongoDB)
- Cache operations (Redis)
- External API calls

### Trace Export

Currently configured for console export. For production, configure OTLP exporter:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-otel-collector:4318
```

## Health Checks

### Endpoints

#### `/health` - Basic Health Check

Returns overall system health status with checks for:
- Database connectivity
- Redis connectivity
- Memory usage
- Cache status

Response codes:
- `200`: Healthy or degraded
- `503`: Unhealthy

#### `/health/detailed` - Detailed Health Check

Extended health check with replica set information:
- All basic checks
- MongoDB replica set status
- Primary and secondary nodes
- Replication lag

#### `/health/cache` - Cache Statistics

Cache performance metrics:
- Hit rate
- Total requests
- Hits and misses
- Cache enabled status

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "host": "localhost",
      "name": "kayad"
    },
    "redis": {
      "status": "healthy",
      "connected": true
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "256 MB",
      "heapTotal": "512 MB"
    },
    "cache": {
      "status": "healthy",
      "enabled": true,
      "stats": {
        "hits": 1000,
        "misses": 100
      }
    }
  }
}
```

## Operational Procedures

### Monitoring Setup

1. **Configure Prometheus**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'kayad-backend'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:5000']
        labels:
          service: 'kayad-backend'
          environment: 'production'
```

2. **Configure Grafana Dashboards** (see `grafana/` directory)

3. **Set up AlertManager** for alert routing

### Incident Response

1. **Critical Alert**:
   - Acknowledge alert immediately
   - Check `/health` endpoint
   - Review logs in Sentry
   - Check system metrics
   - Implement fix or rollback
   - Document incident

2. **Warning Alert**:
   - Acknowledge alert
   - Investigate root cause
   - Monitor trend
   - Implement fix if needed

### Performance Tuning

1. **Slow Requests**:
   - Identify slow endpoints via metrics
   - Check database query performance
   - Review external API calls
   - Optimize code or add caching

2. **Memory Issues**:
   - Check for memory leaks
   - Review connection pool sizes
   - Optimize caching strategy
   - Consider horizontal scaling

3. **Database Performance**:
   - Review query patterns
   - Add appropriate indexes
   - Optimize connection pool settings
   - Consider read replicas

### Maintenance

1. **Log Rotation**: Automatic rotation configured in pino-rotate
2. **Metrics Reset**: Use `/metrics/reset` endpoint (admin only)
3. **Cache Flush**: Use `/health/cache/flush` endpoint (admin only)
4. **Health Monitoring**: Set up external monitoring (e.g., UptimeRobot, Pingdom)

## Security Considerations

- Metrics endpoint `/prometheus` is publicly accessible - consider adding authentication in production
- Health check endpoints are rate-limited
- Sensitive data is filtered from logs and error reports
- Audit logs track all admin actions

## Future Enhancements

- [ ] Add OTLP exporter for production tracing
- [ ] Implement distributed tracing across microservices
- [ ] Add synthetic monitoring for critical user journeys
- [ ] Implement anomaly detection for metrics
- [ ] Add real-time alerting via Slack/Email
- [ ] Create detailed Grafana dashboards
