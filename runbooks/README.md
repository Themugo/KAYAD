# KAYAD Operations Runbooks

This directory contains operational runbooks for managing the KAYAD platform. These documents provide step-by-step procedures for handling incidents, performing maintenance, and troubleshooting issues.

## Quick Reference

| Severity | Response Time | Escalation |
|----------|-------------|------------|
| P0 (Critical) | 15 minutes | Immediate escalation to CTO |
| P1 (High) | 1 hour | Engineering Manager |
| P2 (Medium) | 4 hours | Team Lead |
| P3 (Low) | 24 hours | On-call engineer |

## Runbook Index

### Incident Response

| Runbook | Severity | RTO | Description |
|---------|----------|-----|-------------|
| [Security Incident](../docs/runbooks/security-incident.md) | P0-P3 | Varies | Security breach response |
| [Database Failure](../docs/DATABASE.md) | P1-P2 | 30 min | Database outage handling |
| [Cache Failure](../docs/OBSERVABILITY.md) | P2 | 5 min | Redis/cache issues |
| [Third-Party Outage](../docs/runbooks/infrastructure-outage.md) | P1-P2 | Varies | External service failures |

### Deployment & Release

| Runbook | Severity | RTO | Description |
|---------|----------|-----|-------------|
| [Deployment Rollback](../docs/runbooks/deployment-failure.md) | P1 | 15 min | Revert problematic deployment |

### Maintenance

| Runbook | Description |
|---------|-------------|
| [Database Backup](../docs/production/DISASTER_RECOVERY.md) | Backup procedures |
| [Service Health Check](../docs/OBSERVABILITY.md) | System health verification |

## Critical Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | To be confirmed by receiving team | Not configured in this archive |
| Engineering Manager | To be confirmed by receiving team | Not configured in this archive |
| CTO | To be confirmed by receiving team | Not configured in this archive |
| Security Lead | To be confirmed by receiving team | Not configured in this archive |

## Monitoring Dashboards

| Dashboard | URL | Purpose |
|----------|-----|---------|
| Grafana | Verify endpoint and access with operations owner | Metrics & alerting |
| Sentry | Verify project and access with operations owner | Error tracking |
| Supabase | Use the authorized project dashboard | Database monitoring |
| Cloudinary | Use the authorized account console | Media storage |

## Alert Severity Levels

### P0 - Critical
- Complete service outage
- Data breach or security incident
- Payment processing failure
- All auctions down

### P1 - High
- Partial service degradation
- Payment delays
- Database slowdowns
- Authentication failures

### P2 - Medium
- Non-critical feature failures
- Performance degradation
- Third-party integration issues
- Cache failures

### P3 - Low
- Minor bugs
- Documentation issues
- Non-urgent feature requests
- Monitoring alerts

## Health Check Endpoints

| Endpoint | Purpose |
|----------|--------|
| `GET /api/health` | Basic health check |
| `GET /api/health/detailed` | Detailed health with dependencies |
| `GET /api/metrics` | Prometheus metrics |

## Common Commands

### Restart Services

```bash
# Backend
sudo systemctl restart kayad-backend

# Frontend (if applicable)
sudo systemctl restart kayad-frontend

# Nginx
sudo systemctl restart nginx
```

### Check Logs

```bash
# Backend logs
tail -f /var/log/kayad/backend.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -u kayad-backend -f
```

### Database Operations

```bash
# Connect to database
psql $DATABASE_URL

# Check connections
SELECT * FROM pg_stat_activity WHERE datname = 'kayad';

-- Do not terminate database sessions as a routine troubleshooting step.
-- Review session ownership, transaction state and service impact with the
-- database owner before using pg_terminate_backend.
```

### Cache Operations

```bash
# Check Redis
redis-cli ping
redis-cli info

# Check cache size
redis-cli DBSIZE

# Do not run FLUSHALL in production as a routine cache-clear command:
# it deletes every key in the selected Redis database. Use an approved,
# scoped invalidation procedure after confirming the impact with the owner.
```

## Escalation Policy

1. **On-call engineer** receives initial alert
2. If unresolved in **15 minutes**, escalate to **Engineering Manager**
3. If unresolved in **30 minutes**, escalate to **CTO**
4. For security incidents, immediately contact **Security Lead**

## Communication Channels

| Channel | Purpose |
|---------|---------|
| #incidents | Active incident coordination |
| #alerts | Automated monitoring alerts |
| #engineering | General engineering discussion |
| #on-call | On-call rotation and handoffs |

## Post-Incident Requirements

All P0 and P1 incidents require:
1. Incident report within 24 hours
2. Root cause analysis within 48 hours
3. Action items with owners and deadlines
4. Post-mortem meeting within 1 week

## Training

All team members must complete:
- [ ] Incident response training
- [ ] Security awareness training
- [ ] Runbook review session
- [ ] Tabletop exercise participation (quarterly)

## Additional Resources

- [API Documentation](../docs/API.md)
- [Deployment Guide](../docs/production/DEPLOY.md)
- [Security Policy](../SECURITY.md)
- [Monitoring Setup](../docs/production/MONITORING.md)
