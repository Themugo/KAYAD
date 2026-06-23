# Database Failure Runbook

## Severity: Critical
## RTO: 1 hour
## RPO: 15 minutes

## Symptoms
- Application unable to connect to database
- High database connection errors
- Database response timeouts
- 500 errors on database-dependent endpoints

## Immediate Actions

### 1. Check Database Connectivity
```bash
# Check MongoDB connection
npm run backup:status

# Check database logs
tail -f /var/log/mongodb/mongod.log

# Check database service status
sudo systemctl status mongod
```

### 2. Verify Database Service
```bash
# Check if MongoDB is running
pgrep mongod

# Check MongoDB process
ps aux | grep mongod

# Check MongoDB logs for errors
sudo journalctl -u mongod -n 100
```

### 3. Check System Resources
```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk space
df -h

# Check disk I/O
iostat -x 1
```

### 4. Alert On-Call
- Send alert to on-call database administrator
- Create incident ticket
- Update status page

## Recovery Steps

### Scenario 1: Database Service Down

#### Steps:
1. **Restart MongoDB Service**
   ```bash
   sudo systemctl restart mongod
   ```

2. **Verify Restart Success**
   ```bash
   sudo systemctl status mongod
   ```

3. **Check Logs**
   ```bash
   sudo journalctl -u mongod -n 50
   ```

4. **Test Connectivity**
   ```bash
   mongosh "mongodb://localhost:27017/kayad" --eval "db.adminCommand('ping')"
   ```

5. **Monitor Application**
   - Check application logs
   - Verify database connections
   - Monitor error rates

#### If Restart Fails:
1. Check MongoDB configuration file
2. Check data directory permissions
3. Check port availability (27017)
4. Check system resources
5. Review MongoDB error logs

### Scenario 2: Database Corruption

#### Steps:
1. **Identify Corruption Extent**
   ```bash
   mongosh --eval "db.adminCommand({validate: 'collection_name'})"
   ```

2. **Stop MongoDB Service**
   ```bash
   sudo systemctl stop mongod
   ```

3. **Restore from Latest Verified Backup**
   ```bash
   cd backend
   npm run backup:status
   # Note latest backup filename
   node -e "
   const { restoreBackup } = require('./services/backupService.js');
   restoreBackup('kayad-backup-<timestamp>.gz');
   "
   ```

4. **Apply Transaction Logs**
   - If point-in-time recovery is needed
   - Apply oplog from backup time to current time

5. **Verify Data Integrity**
   ```bash
   mongosh --eval "db.adminCommand({validate: 'collection_name'})"
   ```

6. **Start MongoDB Service**
   ```bash
   sudo systemctl start mongod
   ```

7. **Verify Application**
   - Run health checks
   - Test critical queries
   - Monitor for 30 minutes

### Scenario 3: Primary Database Failure (with Standby)

#### Steps:
1. **Verify Primary Failure**
   ```bash
   # Check primary status
   mongosh --eval "rs.status()"
   ```

2. **Promote Standby Database**
   ```bash
   # Connect to standby
   mongosh --host <standby-host> --eval "rs.stepUp()"
   ```

3. **Update Application Connection String**
   - Update MONGODB_URI environment variable
   - Or update DNS record
   - Or update load balancer configuration

4. **Verify Failover Success**
   ```bash
   # Check new primary status
   mongosh --host <new-primary> --eval "rs.status()"
   ```

5. **Test Application Connectivity**
   - Run health checks
   - Test database queries
   - Monitor error rates

6. **Rebuild Failed Primary**
   - Once primary is recovered
   - Rejoin as secondary
   - Resync data

## Verification

### Health Checks
```bash
# Run application health check
curl https://api.kayad.co.ke/health

# Run deep health check
curl https://api.kayad.co.ke/health/deep

# Check database connectivity
mongosh "mongodb://localhost:27017/kayad" --eval "db.adminCommand('ping')"
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

### Data Consistency
```bash
# Check document counts
mongosh --eval "
db = db.getSiblingDB('kayad');
print('Cars:', db.cars.countDocuments());
print('Users:', db.users.countDocuments());
print('Bids:', db.bids.countDocuments());
"

# Check recent data
mongosh --eval "
db = db.getSiblingDB('kayad');
print('Latest car:', db.cars.findOne({}, {sort: {createdAt: -1}}));
"
```

### Monitoring
- Monitor error rates for 30 minutes
- Check database performance metrics
- Monitor application response times
- Verify cache hit rates return to normal

## Escalation

### Timeline
- **15 minutes**: Alert senior DBA if not resolved
- **30 minutes**: Alert CTO if not resolved
- **1 hour**: Declare major incident, escalate to executive team

### Escalation Contacts
- **Senior DBA**: [Contact]
- **CTO**: [Contact]
- **Executive Team**: [Contact]

## Post-Incident

### Documentation
- Document root cause
- Document recovery steps taken
- Document timeline
- Document lessons learned

### Prevention
- Update monitoring alerts
- Improve backup frequency if needed
- Consider adding standby database
- Review database configuration

### Testing
- Schedule recovery drill
- Update runbook based on lessons learned
- Train team on recovery procedures

## Related Runbooks
- [Cache Failure Runbook](./cache-failure.md)
- [Deployment Rollback Runbook](./deployment-rollback.md)
- [Third-Party Outage Runbook](./third-party-outage.md)
