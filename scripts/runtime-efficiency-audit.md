# KAYAD Runtime Efficiency Audit & Monthly Cost Forecast
# Generated: 2026-06-23

---

## 1. Redis Usage

### Current State
| Metric | Value | Assessment |
|--------|-------|------------|
| Redis provider | Self-hosted / env URL | No ElastiCache/MemoryDB |
| Connection library | **DUAL: `ioredis` (config/redis.js) + `node-redis` (services/redisCacheService.js)** | ⚠️ TWO separate Redis clients |
| Max retries | 3 | OK |
| Retry strategy | Exponential 100-2000ms | OK |
| Circuit breaker | Yes (config/redis.js) | Good |
| In-memory fallback | Yes | Good, but unbounded growth risk |
| Health check interval | 30s | OK |
| Key patterns (5) | `popular:listings`, `search:*`, `dealer:*:stats`, `car:*:detail`, `analytics:*` | Sparse — only 5 cache categories |
| TTLs | 300-3600s | Short for most use cases |
| Avg cache key size | ~5KB (JSON car listings) | Estimated |
| Queue system | **ALL QUEUES DISABLED** (`DISABLE_REDIS = true`) | ⚠️ BullMQ queues not running |
| Pipeline/batch usage | None detected | Missed optimization |
| Redis Streams/PubSub | None (Socket.IO used instead) | Could replace Socket.IO for reliability |

### Issues
1. **Dual Redis clients** — `config/redis.js` (ioredis) and `services/redisCacheService.js` (node-redis) are completely separate connections. Cache written by one is invisible to the other.
2. **Queues disabled** — `config/queue.js:15` has `DISABLE_REDIS = true`. Email, notification, report, auction, and image processing jobs execute synchronously or not at all.
3. **No Redis adapter for Socket.IO** — Multi-instance deployment impossible without Redis adapter (messages lost between instances).
4. **No maxmemory policy** — No eviction strategy configured (important for production).
5. **`redisCacheService.js` uses `redis` package (v4)** but `config/redis.js` uses `ioredis` — two different API surfaces.

---

## 2. MongoDB Utilization

### Current State
| Metric | Value | Assessment |
|--------|-------|------------|
| Connection pool | `maxPoolSize: 10` | ⚠️ Very conservative — should be 50-100 |
| `minPoolSize` | Not set | Connections may drop to zero under idle |
| Write concern | Not set (default: `w:1`) | Risk of data loss on primary failover |
| Read preference | Not set (default: `primary`) | All reads hit primary — no read scaling |
| Replica set | Not configured | Single point of failure |
| Auto-index | Enabled (implicit) | ⚠️ Drops indexes in production on schema change |
| Collections | 67 models | Many redundant (see domain audit) |
| Unbounded collections | 13+ | No archival strategy for any |
| TTL indexes | 4 (Notification, RefreshToken, NotificationAudit, IdempotencyKey) | Only 4 of 67 collections auto-purge |
| Total indexes | ~150+ | Some may be redundant |

### Unbounded Collection Growth Estimates
| Collection | Monthly Growth | Annual Size | Risk |
|-----------|---------------|-------------|------|
| `events` | 500K-5M docs (~500MB) | 6GB | 🔴 Highest |
| `bids` | 50K-500K docs (~50MB) | 600MB | 🔴 |
| `searchanalytics` | 50K-500K | 600MB | 🔴 |
| `messages` | 20K-200K | 240MB | 🟡 |
| `auditlogs` | 5K-50K | 60MB | 🟡 |
| `securitylogs` | 1K-10K | 12MB | 🟢 |
| `notifications` | 50K-100K (TTL purged) | Auto-purged at 30d | 🟢 |
| `payments` | 5K-50K | 60MB | 🟢 |
| `transactions` | 5K-50K | 60MB | 🟢 |
| `leads` | 5K-50K | 60MB | 🟢 |
| Total annual storage growth | | **~8.5GB** | |

### Query Performance Risks
- **No `.lean()` on some aggregate pipelines** — 1,116 `.find()` calls, only 62 use `.lean()`
- **N+1 populate patterns** — multiple routes triple-populate (inspection: car+buyer+inspector)
- **Large aggregations** — admin dashboard runs 20+ parallel queries and aggregations via `Promise.all`
- **No query timeout** — no `maxTimeMS` on any query

---

## 3. Queue Processing

### Current State
| Queue | Worker | Concurrency | Retries | Backoff | Status |
|-------|--------|-------------|---------|---------|--------|
| `emails` | Email worker (stub — no real send) | 5 | 3 | 2s exp | 🔴 DISABLED |
| `notifications` | Calls sendNotification | 5 | 3 | 2s exp | 🔴 DISABLED |
| `reports` | Stub — returns placeholder URL | 5 | 2 | 5s exp | 🔴 DISABLED |
| `auctions` | Stub — logs only | 5 | 3 | 1s exp | 🔴 DISABLED |
| `image-processing` | Stub — returns input URL | 5 | 2 | 3s exp | 🔴 DISABLED |

### Issues
1. **All queues DISABLED** — `config/queue.js:15` hardcodes `DISABLE_REDIS = true`. No async processing occurs.
2. **Two queue systems** — `config/queue.js` (with dead letter queue, proper metrics) vs `services/queueService.js` (simpler, separate connection). Both are disabled.
3. **Stub workers** — Even if enabled, email/report/image workers are stubs with `// commented out` real implementations.
4. **No queue monitoring** — `queueMetricsService.js` exists but never called (queues disabled).
5. **No DLQ alerting** — DLQ > 100 threshold exists but disabled with queues.

---

## 4. WebSocket Consumption

### Current State
| Metric | Value | Assessment |
|--------|-------|------------|
| Library | Socket.IO v4 | Standard |
| Transports | websocket + polling | OK |
| ping interval | 25s | OK |
| ping timeout | 60s | OK |
| Events | 7 (joinAuction, joinChat, leaveChat, typing, joinAdmin, joinShowroom, leaveShowroom) | Minimal surface |
| Per-socket rate limit | 10 events/10s | Good |
| Auth | JWT (optional) | OK |
| Rooms | Per-user, per-car, per-chat, per-showroom, per-admin | OK |
| Max concurrent | 1000 (bulkhead) | Reasonable |
| Adapter | None (in-memory only) | ⚠️ No multi-instance support |
| Memory per connection | ~50-100KB | ~50-100MB for 1000 conns |

### Issues
1. **No Redis adapter** — Socket.IO events NOT shared between server instances. Requires sticky sessions.
2. **No presence tracking** — No way to know which users are online across restarts.
3. **Message delivery not guaranteed** — No message persistence/retry for missed WebSocket messages.
4. **`typing` event broadcasts to entire chat room** — Could be high-volume for large rooms.

---

## 5. Storage Growth

### Annual Projection (Year 1)
| Category | Monthly | Annual | Cost |
|----------|---------|--------|------|
| MongoDB data | ~700MB | ~8.5GB | $60/mo (M10) |
| Cloudinary images | ~500MB | ~6GB | $89/mo (25GB plan) |
| Redis memory | Minimal (caching only) | <100MB | Included |
| Logs (Pino) | ~50MB | ~600MB | $0 (local) |
| Backups | ~1GB | ~12GB | $5/mo (S3) |
| **Total storage** | **~1.25GB** | **~15GB** | |

### Projected Growth (Year 2-3)
- MongoDB: ~8.5GB/yr → 17-25GB by year 3 (M10→M20 required: $120/mo)
- Cloudinary: ~6GB/yr → 12-18GB by year 3 (upgrade to $249/mo plan)
- Logs: ~600MB/yr → 1.8GB by year 3 (log shipping needed)

---

## 6. Observability Costs

### Current Spend Estimate
| Service | Plan | Monthly Cost | Coverage |
|---------|------|-------------|----------|
| Sentry | Team ($26/mo) | $26 | 100K errors/mo, 10% trace sampling |
| OpenTelemetry | **DISABLED** (ConsoleSpanExporter) | $0 | No production tracing |
| Metrics | In-memory only (no Prometheus) | $0 | Lost on restart, no history |
| Logging | Pino → console/file | $0 | No log aggregation service |
| Grafana | Local dashboard files only | $0 | Not connected to live data |
| **Total** | | **$26/mo** | |

### Recommended Observability Stack (for production)
| Service | Plan | Monthly Cost | Purpose |
|---------|------|-------------|---------|
| Sentry | Team | $26 | Error tracking + performance |
| Grafana Cloud | Free tier | $0 | 3 users, 10K series, 14d retention |
| Prometheus | Self-hosted | $0 | Metric collection (on EC2) |
| Loki/Grafana | Self-hosted | $0 | Log aggregation |
| Uptime monitoring | BetterUptime free | $0 | 3 monitors |
| **Total recommended** | | **$26/mo** | |

---

## 7. Monthly Cost Forecast

### Current Infrastructure (estimated)
| Resource | Spec | Monthly Cost |
|----------|------|-------------|
| MongoDB Atlas | M10 (2GB RAM, shared vCPU) | $60 |
| Redis (self-hosted on EC2) | Shared | $0 |
| EC2 (Node.js backend) | t3.medium (2vCPU, 4GB) | $30 |
| Cloudinary | 25GB storage, 25GB BW | $89 |
| Sentry | Team plan | $26 |
| S3 (backups + assets) | 50GB | $5 |
| ELB (load balancer) | 1 x application LB | $20 |
| Domain + DNS | Route53 | $5 |
| **Total** | | **$235/mo** |

### Projected 12-Month Cost
| Month | Cumulative | Notes |
|-------|-----------|-------|
| M1 | $235 | Baseline |
| M3 | $705 | +Monitoring stack |
| M6 | $1,410 | +MongoDB M10→M20 at M6 ($120/mo) |
| M12 | $3,060 | +Cloudinary upgrade at M9 ($249/mo) |
| **Year 1** | **~$3,060** | |

### Optimization Target
| Category | Current | Optimized | Savings |
|----------|---------|-----------|---------|
| MongoDB | $60/mo (M10) | $60/mo (M10 with TTL + archiving) | $0 (delays upgrade) |
| Redis | $0 (self-hosted) | $15 (ElastiCache t4g.micro) | -$15 (but more reliable) |
| EC2 | $30 (t3.medium) | Covered by serverless/multi-purpose | $0 |
| Cloudinary | $89/mo | $0 (migrate to S3+Imgix) | **$89/mo** |
| Sentry | $26/mo | $26/mo | $0 |
| **Total optimized** | **$235/mo** | **$146/mo** | **$89/mo savings** |

---

## 8. Top 20 Optimization Opportunities

### Critical (Immediate Action — Cost/Stability Impact)

| # | Opportunity | Area | Impact | Effort |
|---|------------|------|--------|--------|
| 1 | 🚨 **Merge dual Redis clients** (`ioredis` + `node-redis`) into single `ioredis` client | Redis | Eliminates split-brain cache, reduces connections 50% | 2h |
| 2 | 🚨 **Enable BullMQ queues** (`DISABLE_REDIS = false`) | Queue | All async processing goes from non-functional to working | 5min |
| 3 | 🚨 **Add Redis adapter to Socket.IO** (`@socket.io/redis-adapter`) | WebSocket | Enables multi-instance horizontal scaling | 1h |
| 4 | 🚨 **Implement TTL/archival on ALL unbounded collections** (events, searchanalytics, messages, bids) | MongoDB | Prevents uncontrolled storage growth — saves $60/mo upgrade | 4h |
| 5 | 🚨 **Add `.lean()` to all read-only `.find()` queries** (1,116 calls, only 62 use `.lean()`) | MongoDB | Reduces query time 30-50%, CPU | 2h |

### High (Within 2 Weeks)

| # | Opportunity | Area | Impact | Effort |
|---|------------|------|--------|--------|
| 6 | **Set `minPoolSize: 5` + `maxPoolSize: 50` on MongoDB** | MongoDB | Eliminates connection storms, handles traffic spikes | 5min |
| 7 | **Set write concern `w: majority` for payments/escrow operations** | MongoDB | Prevents data loss on failover | 30min |
| 8 | **Disable `autoIndex` in production** | MongoDB | Prevents accidental index drop on deploy | 5min |
| 9 | **Implement Redis cache pipeline** via `ioredis` pipelining for batch operations | Redis | Reduces Redis round-trips 5-10x | 1h |
| 10 | **Implement queue dead letter alerting** (DLQ > 100 sends Slack/email) | Queue | Catches processing failures before they impact users | 2h |
| 11 | **Add `maxTimeMS: 10000` to all MongoDB queries** | MongoDB | Prevents runaway queries from exhausting CPU | 1h |
| 12 | **Remove duplicate queue system** (keep `config/queue.js`, delete `services/queueService.js`) | Queue | Eliminates confusion, single Redis connection | 2h |
| 13 | **Set Redis `maxmemory-policy allkeys-lru`** | Redis | Prevents OOM, auto-evicts stale cache | 5min |
| 14 | **Consolidate 7 duplication clusters in services** | Architecture | Reduces CPU/memory from duplicate processing | 8h |

### Medium (Within 1 Month)

| # | Opportunity | Area | Impact | Effort |
|---|------------|------|--------|--------|
| 15 | **Remove console.log calls across backend** (migrate to Pino logger) | Observability | Professional log management, searchable logs | 2h |
| 16 | **Enable OpenTelemetry OTLP export** (replace ConsoleSpanExporter with OTLPTraceExporter) | Observability | Distributed tracing across services | 2h |
| 17 | **Migrate images from Cloudinary to S3+Imgix** | Storage | Saves $89/mo Cloudinary bill | 8h |
| 18 | **Add Prometheus metrics endpoint** (`/metrics`) for Prometheus to scrape | Observability | Enables Grafana dashboards with live data | 4h |
| 19 | **Implement Redis-based Socket.IO presence** (track online users with Redis Set) | WebSocket | Know which users are online, detect ghost connections | 2h |
| 20 | **Replace Socket.IO with Server-Sent Events for non-critical realtime** | WebSocket | Reduces WebSocket connection overhead by 50% | 4h |

### Estimated Savings by Priority Level
| Priority | Effort | Monthly Savings | Annual Savings |
|----------|--------|----------------|----------------|
| Critical (1-5) | ~9h | $60 (delays MongoDB upgrade) | $720 |
| High (6-14) | ~20h | $15 (ElastiCache) | $180 |
| Medium (15-20) | ~22h | $89 (Cloudinary migration) | $1,068 |
| **Total** | **~51h** | **$164/mo** | **$1,968/yr** |
