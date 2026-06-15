# KAYAD Scalability Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the scalability improvements to the KAYAD platform, including MongoDB replica set, Redis caching, NGINX load balancing, and monitoring.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended) or Windows with WSL2
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **OpenSSL**: For SSL certificate generation
- **Node.js**: Version 18+ (for local development)
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: Minimum 50GB (100GB recommended)

### Software Requirements

- Docker and Docker Compose installed
- Git for cloning the repository
- Text editor for configuration files
- SSL certificates (or ability to generate them)

## Pre-Deployment Checklist

- [ ] Review environment variable documentation
- [ ] Prepare MongoDB connection string
- [ ] Prepare Redis connection details
- [ ] Obtain SSL certificates (or generate for development)
- [ ] Configure domain DNS records
- [ ] Review NGINX configuration
- [ ] Test locally before production deployment

## Deployment Steps

### Step 1: Clone and Prepare Repository

```bash
# Clone the repository
git clone https://github.com/your-org/KAYAD.git
cd KAYAD

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p logs/nginx
mkdir -p logs/mongodb
mkdir -p logs/redis
```

### Step 2: Configure Environment Variables

```bash
# Copy environment example
cp backend/.env.example backend/.env

# Edit the environment file
nano backend/.env
```

**Critical Variables to Update:**

```env
# MongoDB Configuration
MONGO_URI=mongodb://admin:your-password@primary:27017,secondary1:27017,secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin
MONGO_REPLICA_SET_NAME=kayadReplicaSet
MONGO_READ_PREFERENCE=secondaryPreferred
MONGO_WRITE_CONCERN_W=majority
MONGO_MAX_POOL_SIZE=100
MONGO_MIN_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://:your-redis-password@redis:6379
REDIS_PASSWORD=your-redis-password

# Application Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://kayad.space
```

### Step 3: Setup SSL Certificates

#### Option A: Development (Self-Signed)

```bash
# Generate self-signed certificates
chmod +x setup-ssl.sh
./setup-ssl.sh dev api.kayad.space
```

#### Option B: Production (Let's Encrypt)

```bash
# Follow Let's Encrypt instructions
./setup-ssl.sh letsencrypt api.kayad.space admin@kayad.space

# Or manually with Certbot
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.kayad.space --email admin@kayad.space --agree-tos

# Copy certificates
sudo cp /etc/letsencrypt/live/api.kayad.space/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.kayad.space/privkey.pem nginx/ssl/key.pem
```

#### Option C: Production (Commercial SSL)

```bash
# Generate CSR
./setup-ssl.sh csr api.kayad.space KE Nairobi Nairobi KAYAD IT

# Submit CSR to your SSL provider
# After receiving the certificate, copy it to nginx/ssl/cert.pem
# Copy your private key to nginx/ssl/key.pem
```

### Step 4: Configure NGINX

```bash
# Edit NGINX configuration
nano nginx/nginx.conf
```

**Update the following:**

```nginx
server_name api.kayad.space;  # Your actual domain

# Update upstream servers if needed
upstream backend_servers {
    least_conn;
    server backend1:5000 max_fails=3 fail_timeout=30s;
    server backend2:5000 max_fails=3 fail_timeout=30s;
    server backend3:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Step 5: Deploy with Docker Compose

```bash
# Make deployment script executable
chmod +x deploy-scalability.sh

# Run deployment
./deploy-scalability.sh deploy
```

**Manual Deployment (if script fails):**

```bash
# Stop existing containers
docker-compose -f docker-compose.replica-set.yml down

# Build and start containers
docker-compose -f docker-compose.replica-set.yml up -d --build

# Wait for MongoDB to be ready
sleep 30

# Initialize replica set
docker exec kayad-backend node backend/scripts/setup-replica-set.js

# Check replica set status
docker exec kayad-mongo-primary mongosh --eval "rs.status()"

# Check Redis status
docker exec kayad-redis redis-cli ping

# Check backend health
curl http://localhost:5000/health
```

### Step 6: Verify Deployment

#### Check Container Status

```bash
docker-compose -f docker-compose.replica-set.yml ps
```

Expected output:
```
NAME                 STATUS
kayad-mongo-primary  Up (healthy)
kayad-mongo-secondary1  Up (healthy)
kayad-mongo-secondary2  Up (healthy)
kayad-redis          Up (healthy)
kayad-backend        Up (healthy)
```

#### Check Health Endpoints

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Cache statistics
curl http://localhost:5000/health/cache
```

#### Check Metrics

```bash
# All metrics
curl http://localhost:5000/metrics

# HTTP metrics
curl http://localhost:5000/metrics/http

# Database metrics
curl http://localhost:5000/metrics/database

# Cache metrics
curl http://localhost:5000/metrics/cache

# Replica set metrics
curl http://localhost:5000/metrics/replica-set

# System metrics
curl http://localhost:5000/metrics/system
```

#### Check Replica Set Status

```bash
docker exec kayad-mongo-primary mongosh --eval "rs.status()"
```

Expected output should show:
- Primary node with state "PRIMARY"
- Secondary nodes with state "SECONDARY"
- All nodes with health 1

### Step 7: Configure DNS

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

### Step 8: Test Application Functionality

```bash
# Test API endpoints
curl https://api.kayad.space/api/cars
curl https://api.kayad.space/health
curl https://api.kayad.space/metrics

# Test authentication
curl -X POST https://api.kayad.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test cache functionality
curl https://api.kayad.space/api/cars  # First request (cache miss)
curl https://api.kayad.space/api/cars  # Second request (cache hit)
```

## Post-Deployment Configuration

### Enable SSL Auto-Renewal (Let's Encrypt)

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
crontab -e
```

Add this line:
```
0 0 * * 0 certbot renew --quiet
```

### Configure Monitoring

```bash
# Install monitoring tools (optional)
# Prometheus, Grafana, or cloud monitoring solutions

# Set up alerts for:
# - Replica set health
# - Cache hit rate
# - Error rates
# - Response times
# - Memory usage
```

### Configure Backup Strategy

```bash
# MongoDB backup script
docker exec kayad-mongo-primary mongodump --out /backup

# Schedule regular backups
crontab -e
```

Add this line:
```
0 2 * * * docker exec kayad-mongo-primary mongodump --out /backup/$(date +\%Y\%m\%d)
```

## Troubleshooting

### MongoDB Connection Issues

**Problem**: Cannot connect to MongoDB replica set

**Solutions**:
1. Check MongoDB container status: `docker ps`
2. Check MongoDB logs: `docker logs kayad-mongo-primary`
3. Verify environment variables in backend/.env
4. Check replica set initialization: `docker exec kayad-mongo-primary mongosh --eval "rs.status()"`
5. Ensure all replica set members are accessible

### Redis Connection Issues

**Problem**: Cannot connect to Redis

**Solutions**:
1. Check Redis container status: `docker ps`
2. Check Redis logs: `docker logs kayad-redis`
3. Test Redis connection: `docker exec kayad-redis redis-cli ping`
4. Verify Redis password in environment variables
5. Check Redis configuration

### Cache Not Working

**Problem**: Cache hits are low or not working

**Solutions**:
1. Check Redis connection: `curl http://localhost:5000/health/cache`
2. Verify cache middleware is applied to routes
3. Check cache service logs
4. Monitor cache metrics: `curl http://localhost:5000/metrics/cache`
5. Ensure Redis is configured correctly

### SSL Certificate Issues

**Problem**: SSL certificate errors

**Solutions**:
1. Verify certificate files exist: `ls -la nginx/ssl/`
2. Check certificate validity: `openssl x509 -in nginx/ssl/cert.pem -text -noout`
3. Ensure NGINX configuration points to correct certificate files
4. For Let's Encrypt, check renewal status: `sudo certbot certificates`
5. Restart NGINX: `docker-compose restart nginx`

### High Memory Usage

**Problem**: Application consuming too much memory

**Solutions**:
1. Check connection pool size: reduce `MONGO_MAX_POOL_SIZE`
2. Monitor cache size: implement cache eviction policies
3. Check for memory leaks in application code
4. Increase server memory if needed
5. Monitor system metrics: `curl http://localhost:5000/metrics/system`

### Slow Response Times

**Problem**: API responses are slow

**Solutions**:
1. Check cache hit rate: `curl http://localhost:5000/metrics/cache`
2. Optimize database queries
3. Increase cache TTL for frequently accessed data
4. Check replica set lag: `curl http://localhost:5000/metrics/replica-set`
5. Monitor HTTP metrics: `curl http://localhost:5000/metrics/http`

## Performance Optimization

### Connection Pool Tuning

For high-traffic applications:
```env
MONGO_MAX_POOL_SIZE=200
MONGO_MIN_POOL_SIZE=20
```

For low-traffic applications:
```env
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=5
```

### Cache Tuning

For high-read applications:
- Increase cache TTL (e.g., 1800 seconds for car listings)
- Use Redis cluster for better performance
- Monitor cache hit ratio

For high-write applications:
- Decrease cache TTL for frequently updated data
- Use cache invalidation strategies
- Monitor cache write performance

### NGINX Tuning

Update `nginx/nginx.conf`:
```nginx
# Increase worker connections
worker_connections 2048;

# Enable gzip compression
gzip on;
gzip_types text/plain application/json;

# Adjust keepalive timeout
keepalive_timeout 65;
```

## Scaling Strategy

### Horizontal Scaling

Add more backend instances:

1. Update `docker-compose.replica-set.yml` to add more backend services
2. Update NGINX upstream configuration
3. Deploy additional instances
4. Monitor load balancer distribution

### Vertical Scaling

Increase server resources:
- Add more RAM
- Add more CPU cores
- Increase storage capacity
- Update connection pool sizes accordingly

### Database Scaling

For MongoDB:
- Add more replica set members
- Use sharding for large datasets
- Optimize indexes
- Use read replicas for read-heavy workloads

For Redis:
- Use Redis cluster
- Increase memory allocation
- Use persistence options
- Monitor memory usage

## Monitoring and Alerting

### Key Metrics to Monitor

- **Cache Hit Rate**: Should be > 80%
- **Response Time**: p95 < 200ms
- **Error Rate**: < 1%
- **Replica Set Lag**: < 5 seconds
- **Connection Pool Usage**: < 80%
- **Memory Usage**: < 80%

### Alert Thresholds

Set up alerts for:
- Cache hit rate < 70%
- Response time p95 > 500ms
- Error rate > 5%
- Replica set lag > 10 seconds
- Memory usage > 90%
- Connection pool usage > 90%

### Monitoring Tools

Recommended tools:
- **Prometheus**: For metrics collection
- **Grafana**: For visualization
- **Sentry**: For error tracking
- **New Relic**: For APM
- **Datadog**: For comprehensive monitoring

## Security Considerations

### Network Security

- Use SSL/TLS for all connections
- Configure firewall rules
- Use VPN for administrative access
- Implement IP whitelisting

### Application Security

- Keep dependencies updated
- Use strong passwords
- Rotate credentials regularly
- Implement rate limiting
- Use security headers

### Data Security

- Encrypt sensitive data at rest
- Use secure authentication
- Implement audit logging
- Regular security audits
- Backup encryption

## Maintenance

### Regular Tasks

- **Daily**: Monitor health endpoints
- **Weekly**: Review metrics and logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Disaster recovery test

### Update Procedure

```bash
# Pull latest changes
git pull origin main

# Update environment variables if needed
nano backend/.env

# Rebuild and restart containers
docker-compose -f docker-compose.replica-set.yml up -d --build

# Verify deployment
curl http://localhost:5000/health
```

### Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.replica-set.yml down

# Revert to previous version
git checkout <previous-commit>

# Restart with previous version
docker-compose -f docker-compose.replica-set.yml up -d --build

# Verify rollback
curl http://localhost:5000/health
```

## Support and Resources

### Documentation

- Environment Variables: `SCALABILITY_ENVIRONMENT_VARIABLES.md`
- MongoDB Replica Set: MongoDB documentation
- Redis: Redis documentation
- NGINX: NGINX documentation
- Docker: Docker documentation

### Getting Help

- Check logs: `docker-compose -f docker-compose.replica-set.yml logs`
- Check health: `curl http://localhost:5000/health`
- Check metrics: `curl http://localhost:5000/metrics`
- Review troubleshooting section

## Conclusion

Following this guide will help you successfully deploy the scalability improvements to the KAYAD platform. Regular monitoring and maintenance will ensure optimal performance and reliability.

For questions or issues, refer to the troubleshooting section or consult the additional documentation provided.
