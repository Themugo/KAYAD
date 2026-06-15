# Scalability Deployment Checklist

## Overview

This checklist provides step-by-step instructions for deploying the scalability improvements. Complete each step in order.

## Prerequisites Verification

- [ ] Docker is installed (`docker --version`)
- [ ] Docker Compose is installed (`docker-compose --version`)
- [ ] OpenSSL is installed (`openssl version`)
- [ ] Git is installed (`git --version`)
- [ ] At least 8GB RAM available
- [ ] At least 50GB storage available

## Step 1: Update backend/.env with Actual Values

### Action Required: Manual Configuration

The `.env` file contains sensitive credentials and cannot be auto-generated. You must provide your actual values.

**Instructions:**

1. **Copy the template:**
   ```bash
   cp backend/.env.scalability.template backend/.env
   ```

2. **Edit the .env file:**
   ```bash
   nano backend/.env
   # or
   code backend/.env
   ```

3. **Update these critical values:**

   **MongoDB Configuration:**
   - `MONGO_URI`: Your MongoDB connection string
   - For Docker Compose deployment: `mongodb://admin:YOUR_PASSWORD@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin`
   - For MongoDB Atlas: `mongodb+srv://user:password@cluster.mongodb.net/kayad?retryWrites=true&w=majority`

   **JWT Secrets (Generate secure random strings):**
   - `JWT_SECRET`: Generate using `openssl rand -base64 32`
   - `REFRESH_TOKEN_SECRET`: Generate using `openssl rand -base64 32`

   **Redis Password:**
   - `REDIS_PASSWORD`: Generate using `openssl rand -base64 16`

   **Third-party API Keys:**
   - `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`
   - `SENDGRID_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `AT_API_KEY`, `AT_USERNAME` (Africa's Talking)

   **Domain Configuration:**
   - `FRONTEND_URL`: Your frontend domain (e.g., `https://kayad.space`)

   **Admin Credentials:**
   - `SEED_ADMIN_EMAIL`: Your admin email
   - `SEED_ADMIN_PASSWORD`: Strong password for admin account

4. **Save the file**

**Verification:**
```bash
# Check that .env exists
ls -la backend/.env

# Verify critical variables are set (not default values)
grep -E "MONGO_URI|JWT_SECRET|REDIS_PASSWORD" backend/.env
```

## Step 2: Run SSL Certificate Setup

### Action Required: Manual Execution

**For Development (Self-Signed Certificates):**

```bash
# Make script executable
chmod +x setup-ssl.sh

# Generate self-signed certificates
./setup-ssl.sh dev api.kayad.space
```

**For Production (Let's Encrypt):**

```bash
# View Let's Encrypt setup instructions
./setup-ssl.sh letsencrypt api.kayad.space admin@kayad.space

# Then follow the instructions to:
# 1. Install Certbot: sudo apt-get install certbot
# 2. Generate certificate: sudo certbot certonly --standalone -d api.kayad.space --email admin@kayad.space --agree-tos
# 3. Copy certificates to nginx/ssl/
```

**For Production (Commercial SSL):**

```bash
# Generate CSR
./setup-ssl.sh csr api.kayad.space KE Nairobi Nairobi KAYAD IT

# Submit CSR to your SSL provider
# After receiving certificate, copy to nginx/ssl/cert.pem
# Copy your private key to nginx/ssl/key.pem
```

**Verification:**
```bash
# Check certificates exist
ls -la nginx/ssl/

# Verify certificate
openssl x509 -in nginx/ssl/cert.pem -text -noout | head -20
```

## Step 3: Run Deployment Script

### Action Required: Manual Execution

**Instructions:**

```bash
# Make script executable
chmod +x deploy-scalability.sh

# Run deployment
./deploy-scalability.sh deploy
```

**What the script does:**
1. Checks Docker and Docker Compose installation
2. Creates necessary directories
3. Generates SSL certificates (if not present)
4. Validates environment variables
5. Stops existing containers
6. Builds and starts containers
7. Waits for MongoDB to be ready
8. Initializes replica set
9. Verifies replica set status
10. Checks Redis status
11. Checks backend health
12. Displays deployment status

**If the script fails:**

```bash
# View logs
docker-compose -f docker-compose.replica-set.yml logs

# Check container status
docker-compose -f docker-compose.replica-set.yml ps

# Restart specific service
docker-compose -f docker-compose.replica-set.yml restart kayad-backend
```

**Verification:**
```bash
# Check all containers are running
docker-compose -f docker-compose.replica-set.yml ps

# Check health endpoint
curl http://localhost:5000/health

# Check detailed health
curl http://localhost:5000/health/detailed

# Check cache stats
curl http://localhost:5000/health/cache
```

## Step 4: Monitor Metrics and Optimize Configuration

### Action Required: Ongoing Monitoring

**Initial Monitoring:**

```bash
# Check all metrics
curl http://localhost:5000/metrics

# Check HTTP metrics
curl http://localhost:5000/metrics/http

# Check database metrics
curl http://localhost:5000/metrics/database

# Check cache metrics
curl http://localhost:5000/metrics/cache

# Check replica set metrics
curl http://localhost:5000/metrics/replica-set

# Check system metrics
curl http://localhost:5000/metrics/system
```

**Key Metrics to Monitor:**

1. **Cache Hit Rate** (target: > 80%)
   ```bash
   curl http://localhost:5000/metrics/cache | jq '.efficiency.hitRate'
   ```

2. **Response Time** (target: p95 < 200ms)
   ```bash
   curl http://localhost:5000/metrics/http | jq '.histograms'
   ```

3. **Replica Set Lag** (target: < 5 seconds)
   ```bash
   curl http://localhost:5000/metrics/replica-set | jq '.replicaSetStatus'
   ```

4. **Connection Pool Usage** (target: < 80%)
   ```bash
   curl http://localhost:5000/metrics/database | jq '.connectionPool'
   ```

5. **Memory Usage** (target: < 80%)
   ```bash
   curl http://localhost:5000/metrics/system | jq '.system.memory'
   ```

**Optimization Actions:**

**If cache hit rate is low (< 70%):**
- Increase cache TTL in route configurations
- Check Redis connection stability
- Monitor cache invalidation patterns

**If response time is high (p95 > 500ms):**
- Check database query performance
- Increase connection pool size
- Optimize database indexes
- Check replica set lag

**If replica set lag is high (> 10 seconds):**
- Check network connectivity between nodes
- Increase MongoDB resources
- Check write concern settings
- Monitor primary node performance

**If memory usage is high (> 90%):**
- Reduce connection pool size
- Implement cache eviction policies
- Check for memory leaks
- Increase server memory

**If connection pool usage is high (> 90%):**
- Increase `MONGO_MAX_POOL_SIZE`
- Check for connection leaks
- Monitor query patterns
- Add more backend instances

## Step 5: Configure DNS (Production Only)

### Action Required: Manual DNS Configuration

**Update your DNS records:**

```
A    api.kayad.space    ->    your-server-ip
```

**For load balancer setup:**

```
A    api.kayad.space    ->    load-balancer-ip
A    backend1.kayad.space ->    backend1-ip
A    backend2.kayad.space ->    backend2-ip
A    backend3.kayad.space ->    backend3-ip
```

**Verification:**
```bash
# Check DNS propagation
dig api.kayad.space

# Test HTTPS connection
curl https://api.kayad.space/health
```

## Step 6: Test Application Functionality

### Action Required: Manual Testing

**Test API Endpoints:**

```bash
# Test health endpoint
curl https://api.kayad.space/health

# Test car listings
curl https://api.kayad.space/api/cars

# Test cache functionality
curl https://api.kayad.space/api/cars  # First request (cache miss)
curl https://api.kayad.space/api/cars  # Second request (cache hit)

# Test metrics endpoint
curl https://api.kayad.space/metrics
```

**Test Authentication:**

```bash
# Test login
curl -X POST https://api.kayad.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kayad.space","password":"your-password"}'
```

## Step 7: Setup Monitoring and Alerting

### Action Required: Manual Configuration

**Install Monitoring Tools (Optional):**

```bash
# Install Prometheus for metrics collection
# Install Grafana for visualization
# Configure alerts for critical metrics
```

**Set Up Alerts For:**
- Cache hit rate < 70%
- Response time p95 > 500ms
- Error rate > 5%
- Replica set lag > 10 seconds
- Memory usage > 90%
- Connection pool usage > 90%

## Step 8: Configure Backup Strategy

### Action Required: Manual Configuration

**MongoDB Backup:**

```bash
# Create backup script
cat > backup-mongodb.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec kayad-mongo-primary mongodump --out $BACKUP_DIR/$DATE
# Keep last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x backup-mongodb.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/backup-mongodb.sh
```

## Step 9: Enable SSL Auto-Renewal (Let's Encrypt)

### Action Required: Manual Configuration

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
crontab -e
# Add: 0 0 * * 0 certbot renew --quiet
```

## Troubleshooting

**Deployment Script Fails:**
```bash
# Check Docker status
docker ps
docker-compose -f docker-compose.replica-set.yml logs

# Restart deployment
./deploy-scalability.sh stop
./deploy-scalability.sh deploy
```

**MongoDB Connection Issues:**
```bash
# Check MongoDB logs
docker logs kayad-mongo-primary

# Check replica set status
docker exec kayad-mongo-primary mongosh --eval "rs.status()"

# Reinitialize replica set
docker exec kayad-backend node backend/scripts/setup-replica-set.js
```

**Redis Connection Issues:**
```bash
# Check Redis logs
docker logs kayad-redis

# Test Redis connection
docker exec kayad-redis redis-cli ping

# Check Redis configuration
docker exec kayad-redis redis-cli CONFIG GET "*"
```

**SSL Certificate Issues:**
```bash
# Verify certificates
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Regenerate certificates
rm nginx/ssl/cert.pem nginx/ssl/key.pem
./setup-ssl.sh dev api.kayad.space
```

## Completion Checklist

- [ ] backend/.env updated with actual values
- [ ] SSL certificates generated and configured
- [ ] Docker Compose deployment completed successfully
- [ ] All containers running and healthy
- [ ] Health endpoints responding correctly
- [ ] Metrics endpoints accessible
- [ ] Cache hit rate > 80%
- [ ] Response time p95 < 200ms
- [ ] Replica set status healthy
- [ ] DNS configured (production)
- [ ] Application functionality tested
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] SSL auto-renewal configured

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.replica-set.yml logs`
- Check health: `curl http://localhost:5000/health`
- Check metrics: `curl http://localhost:5000/metrics`
- Review: `SCALABILITY_DEPLOYMENT_GUIDE.md`
- Review: `SCALABILITY_ENVIRONMENT_VARIABLES.md`
