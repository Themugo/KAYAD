#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const pass = (name, ok) => checks.push({ name, ok });

const queue = read("backend/config/queue.js");
const manager = read("backend/infrastructure/queues/workerManager.js");
const server = read("backend/server.js");

pass("worker Redis connection is separate from queue connection", /const workerConnection = createRedisConnection\(null\);/.test(queue));
pass("worker Redis connection disables ioredis request retry exhaustion", /maxRetriesPerRequest,/.test(queue) && /createRedisConnection\(null\)/.test(queue));
pass("BullMQ Worker uses workerConnection", /connection: workerConnection,/.test(queue));
pass("worker startup isolates individual worker failures", /const startWorker = \(name, factory\)/.test(manager) && /Worker unavailable: \$\{name\}/.test(manager));
pass("worker startup reports degraded state instead of hiding failures", /Worker startup completed with failures/.test(manager) && /status: \"failed\"/.test(manager));
pass("worker status exposes all canonical workers", /notification: createNotificationWorker/.test(manager) && /seo: createSEOWorker/.test(manager));
pass("server consumes worker startup result", /const workerStartup = startAllWorkers\(\);/.test(server) && /workerStartup\.failed\.length/.test(server));
pass("legacy generic worker startup failure message removed", !/Worker startup failed \(non-fatal\)/.test(server));
pass("worker Redis connection closes with queue infrastructure", /workerConnection\?\.disconnect\(\)/.test(queue));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
console.log(`\nWorker runtime validation: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
