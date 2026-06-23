---
title: SCALABILITY_ENVIRONMENT_VARIABLES
owner: @dba-lead
team: database
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [database]
---
# Scalability Environment Variables Documentation

## Overview

This document provides detailed information about the environment variables required for the scalability improvements implemented in the KAYAD platform.

## MongoDB Replica Set Configuration

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MONGO_REPLICA_SET_NAME` | Name of the MongoDB replica set | `kayadReplicaSet` | `kayadReplicaSet` |
| `MONGO_READ_PREFERENCE` | Read preference for queries | `secondaryPreferred` | `secondaryPreferred` |
| `MONGO_WRITE_CONCERN_W` | Write concern level | `majority` | `majority` |
| `MONGO_WRITE_CONCERN_J` | Journal write concern | `true` | `true` |
| `MONGO_WRITE_TIMEOUT` | Write operation timeout (ms) | `5000` | `5000` |
| `MONGO_MAX_POOL_SIZE` | Maximum connection pool size | `100` | `100` |
| `MONGO_MIN_POOL_SIZE` | Minimum connection pool size | `10` | `10` |
| `MONGO_MAX_IDLE_TIME` | Maximum idle time for connections (ms) | `30000` | `30000` |
| `MONGO_WAIT_QUEUE_TIMEOUT` | Wait queue timeout (ms) | `5000` | `5000` |
| `MONGO_SOCKET_TIMEOUT` | Socket timeout (ms) | `45000` | `45000` |
| `MONGO_SERVER_SELECTION_TIMEOUT` | Server selection timeout (ms) | `5000` | `5000` |
| `MONGO_HEARTBEAT_FREQUENCY` | Heartbeat frequency (ms) | `10000` | `10000` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MONGO_REPLICA_SET_HOSTS` | Comma-separated list of replica set hosts | `localhost:27017,localhost:27018,localhost:27019` | `primary:27017,secondary1:27017,secondary2:27017` |

### Configuration Examples

#### Single Instance (Development)
```env
MONGO_URI=mongodb://localhost:27017/kayad
# No replica set configuration needed
```

#### Replica Set (Production)
```env
MONGO_URI=mongodb://admin:password@primary:27017,secondary1:27017,secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin
MONGO_REPLICA_SET_NAME=kayadReplicaSet
MONGO_READ_PREFERENCE=secondaryPreferred
MONGO_WRITE_CONCERN_W=majority
MONGO_WRITE_CONCERN_J=true
```

#### MongoDB Atlas (Cloud)
```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/kayad?retryWrites=true&w=majority
# Atlas handles replica set automatically
```

## Redis Configuration

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_URL` | Full Redis connection URL | `""` | `redis://localhost:6379` |
| `REDIS_HOST` | Redis host | `127.0.0.1` | `redis.example.com` |
| `REDIS_PORT` | Redis port | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis password | `""` | `your-redis-password` |

### Redis Cluster Configuration (Advanced)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_HOST_1` | First Redis cluster host | `redis-1` | `redis-1.example.com` |
| `REDIS_PORT_1` | First Redis cluster port | `6379` | `6379` |
| `REDIS_HOST_2` | Second Redis cluster host | `redis-2` | `redis-2.example.com` |
| `REDIS_PORT_2` | Second Redis cluster port | `6379` | `6379` |
| `REDIS_HOST_3` | Third Redis cluster host | `redis-3` | `redis-3.example.com` |
| `REDIS_PORT_3` | Third Redis cluster port | `6379` | `6379` |

### Configuration Examples

#### Single Redis Instance (Development)
```env
REDIS_URL=redis://localhost:6379
# Or
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Redis with Authentication (Production)
```env
REDIS_URL=redis://:password@redis.example.com:6379
# Or
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

#### Redis Cluster (Advanced)
```env
# Use Redis cluster configuration
REDIS_HOST_1=redis-1.example.com
REDIS_PORT_1=6379
REDIS_HOST_2=redis-2.example.com
REDIS_PORT_2=6379
REDIS_HOST_3=redis-3.example.com
REDIS_PORT_3=6379
```

## Cache Configuration

The cache service uses the Redis configuration above. No additional environment variables are required for basic caching.

### Cache TTL Configuration

Cache TTL (Time To Live) is configured in the code:

- **Car Listings**: 5 minutes (300 seconds)
- **Car Details**: 10 minutes (600 seconds)
- **Price History**: 10 minutes (600 seconds)
- **Market Insights**: 10 minutes (600 seconds)
- **Valuation**: 10 minutes (600 seconds)

## Load Balancer Configuration

Load balancer configuration is done through NGINX configuration files, not environment variables. See `nginx/nginx.conf` for details.

### NGINX Configuration

The NGINX configuration includes:
- Upstream server definitions
- Load balancing method (least_conn)
- SSL termination
- Security headers
- Rate limiting
- Health checks

## Monitoring Configuration

Monitoring metrics are collected automatically. No additional environment variables are required for basic monitoring.

### Metrics Available

- **Cache Metrics**: Hits, misses, sets, deletes, errors
- **Database Metrics**: Connection pool stats, query performance
- **Replica Set Metrics**: Status, primary availability, secondary count, lag
- **HTTP Metrics**: Request count, duration, status codes
- **System Metrics**: Memory usage, uptime

## Docker Compose Configuration

Docker Compose uses environment variables from the `.env` file. See `docker-compose.replica-set.yml` for the complete configuration.

### Docker Environment Variables

```env
# MongoDB
MONGO_USERNAME=admin
MONGO_PASSWORD=your-password

# Redis
REDIS_PASSWORD=your-redis-password

# Application
NODE_ENV=production
PORT=5000
```

## Security Considerations

### Password Security

- Use strong, unique passwords for MongoDB and Redis
- Store passwords in environment variables, not in code
- Rotate passwords regularly
- Use secrets management in production (AWS Secrets Manager, HashiCorp Vault)

### Network Security

- Use SSL/TLS for all connections
- Configure firewall rules to restrict access
- Use VPN for administrative access
- Implement IP whitelisting for sensitive operations

## Testing Configuration

### Local Development

For local development without replica set:

```env
MONGO_URI=mongodb://localhost:27017/kayad
REDIS_URL=redis://localhost:6379
# No replica set configuration needed
```

### Staging Environment

For staging with replica set:

```env
MONGO_URI=mongodb://admin:staging-password@primary:27017,secondary1:27017,secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin
MONGO_REPLICA_SET_NAME=kayadReplicaSet
MONGO_READ_PREFERENCE=secondaryPreferred
REDIS_URL=redis://staging-redis:6379
```

### Production Environment

For production with full configuration:

```env
MONGO_URI=mongodb://admin:strong-password@primary:27017,secondary1:27017,secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin
MONGO_REPLICA_SET_NAME=kayadReplicaSet
MONGO_READ_PREFERENCE=secondaryPreferred
MONGO_WRITE_CONCERN_W=majority
MONGO_WRITE_CONCERN_J=true
MONGO_MAX_POOL_SIZE=100
MONGO_MIN_POOL_SIZE=10
REDIS_URL=redis://:strong-redis-password@production-redis:6379
```

## Troubleshooting

### Common Issues

**Issue**: MongoDB connection fails with replica set error
- **Solution**: Ensure `MONGO_REPLICA_SET_NAME` matches the actual replica set name
- **Solution**: Check that all replica set members are accessible
- **Solution**: Verify authentication credentials

**Issue**: Redis connection fails
- **Solution**: Check Redis server is running
- **Solution**: Verify Redis host and port
- **Solution**: Check Redis password if authentication is enabled

**Issue**: Cache not working
- **Solution**: Ensure Redis is configured and accessible
- **Solution**: Check cache service logs
- **Solution**: Verify cache middleware is applied to routes

**Issue**: High database connection pool usage
- **Solution**: Increase `MONGO_MAX_POOL_SIZE`
- **Solution**: Check for connection leaks in application code
- **Solution**: Monitor connection pool metrics

## Performance Tuning

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
- Increase cache TTL for frequently accessed data
- Use Redis cluster for better performance
- Monitor cache hit ratio

For high-write applications:
- Decrease cache TTL for frequently updated data
- Use cache invalidation strategies
- Monitor cache write performance

## Migration Guide

### From Single Instance to Replica Set

1. **Backup existing data**
   ```bash
   mongodump --uri="mongodb://localhost:27017/kayad" --out=/backup
   ```

2. **Set up replica set**
   - Deploy MongoDB replica set using Docker Compose
   - Initialize replica set using setup script
   - Verify replica set status

3. **Update environment variables**
   ```env
   MONGO_URI=mongodb://admin:password@primary:27017,secondary1:27017,secondary2:27017/kayad?replicaSet=kayadReplicaSet&authSource=admin
   MONGO_REPLICA_SET_NAME=kayadReplicaSet
   ```

4. **Restore data**
   ```bash
   mongorestore --uri="mongodb://primary:27017/kayad" /backup
   ```

5. **Test application**
   - Verify database connectivity
   - Check replica set health
   - Monitor application performance

## Additional Resources

- [MongoDB Replica Set Documentation](https://docs.mongodb.com/manual/replication/)
- [Redis Documentation](https://redis.io/documentation)
- [NGINX Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
