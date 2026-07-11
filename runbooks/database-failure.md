---
title: Database Failure
owner: @dba-lead
team: database
last-reviewed: 2026-07-11
review-frequency: quarterly
status: active
tags: [database]
---
# Database Failure Runbook

## Severity: Critical
## RTO: 1 hour
## RPO: 15 minutes

## Symptoms
- Application unable to connect to database
- High database connection errors
- Database response timeouts
- 500 errors on database-dependent endpoints
- Supabase dashboard showing connection issues

## Immediate Actions

### 1. Check Supabase Dashboard
```bash
# Check Supabase project status
# Visit: https://app.supabase.com/project/<project-id>/status

# Check API logs in Supabase dashboard
# Visit: https://app.supabase.com/project/<project-id>/logs
```

### 2. Verify Database Connectivity
```bash
# Check database connection via Supabase CLI
npx supabase status

# Test connection with psql (if using local development)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Check Supabase project health
curl -s "https://[PROJECT-REF].supabase.co/rest/v1/" | head -1
```

### 3. Check Application Logs
```bash
# Check backend logs for database errors
tail -f logs/backend.log

# Look for connection errors
grep -i "database\|connection\|timeout" logs/backend.log
```

### 4. Alert On-Call
- Contact Supabase support if on Pro/Enterprise plan
- Create incident ticket
- Update status page

## Recovery Steps

### Scenario 1: Supabase Connection Issues

#### Steps:
1. **Check Supabase Status**
   - Visit https://status.supabase.com
   - Check for ongoing incidents

2. **Verify Environment Variables**
   ```bash
   # Check SUPABASE_URL and SUPABASE_ANON_KEY are set correctly
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

3. **Check Network/Firewall**
   - Ensure outbound connections to Supabase are allowed
   - Check for IP blocking

4. **Test Connection**
   ```bash
   # Test with a simple query
   curl -s -H "apikey: $SUPABASE_ANON_KEY" \
     "https://$SUPABASE_REF.supabase.co/rest/v1/cars?select=id&limit=1"
   ```

### Scenario 2: Database Performance Issues

#### Steps:
1. **Check Query Performance**
   - Use Supabase Dashboard > Reports > Database
   - Check for slow queries

2. **Identify Long-Running Queries**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
   AND state = 'active';
   ```

3. **Kill Long-Running Queries if Needed**
   ```sql
   -- In Supabase SQL Editor
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '10 minutes'
   AND state = 'active';
   ```

4. **Check Index Usage**
   ```sql
   -- Check for missing indexes on slow queries
   SELECT * FROM pg_stat_user_indexes;
   ```

### Scenario 3: Point-in-Time Recovery Needed

#### Steps:
1. **Access Supabase Backups**
   - Go to Supabase Dashboard > Database > Backups
   - Note available backup times

2. **Restore from Backup**
   - Click "Restore database" on the desired backup
   - This creates a new database from the backup
   - Update connection string to point to restored database

3. **Verify Data Integrity**
   ```sql
   -- Check row counts
   SELECT count(*) FROM cars;
   SELECT count(*) FROM users;
   ```

## Verification

### Health Checks
```bash
# Run application health check
curl https://api.kayad.co.ke/health

# Test database connectivity
curl -s -H "apikey: $SUPABASE_ANON_KEY" \
  "https://$SUPABASE_REF.supabase.co/rest/v1/cars?select=id&limit=1"
```

### Critical Queries
```bash
# Test car listings
curl https://api.kayad.co.ke/api/v1/cars

# Test user authentication
curl -X POST https://api.kayad.co.ke/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test dealer operations
curl https://api.kayad.co.ke/api/v1/dealer/analytics \
  -H "Authorization: Bearer <token>"
```

### Monitoring
- Monitor error rates for 30 minutes
- Check Supabase Dashboard for performance metrics
- Monitor application response times
- Verify cache hit rates return to normal

## Escalation

### Timeline
- **15 minutes**: Alert senior backend engineer if not resolved
- **30 minutes**: Alert CTO if not resolved
- **1 hour**: Declare major incident, escalate to executive team

### Escalation Contacts
- **Supabase Support**: Via Dashboard > Support (if on paid plan)
- **Senior Backend Engineer**: [Contact]
- **CTO**: [Contact]
- **Executive Team**: [Contact]

## Post-Incident

### Documentation
- Document root cause
- Document recovery steps taken
- Document timeline
- Document lessons learned

### Prevention
- Enable Supabase Pro tier for better SLA
- Set up proactive monitoring for slow queries
- Implement query optimization
- Review and optimize database indexes

### Testing
- Schedule recovery drill
- Test point-in-time recovery
- Update runbook based on lessons learned
- Train team on Supabase recovery procedures

## Related Runbooks
- [Cache Failure Runbook](./cache-failure.md)
- [Deployment Rollback Runbook](./deployment-rollback.md)
- [Third-Party Outage Runbook](./third-party-outage.md)
