#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const pass = (name, ok, detail = "") => checks.push({ name, ok, detail });

const migration = read("supabase/migrations/20260929100000_production_service_role_runtime_integrity.sql");
const db = read("backend/db/index.js");
const render = read("render.yaml");
const priceAlert = read("backend/services/priceAlertCron.js");
const auctionReminder = read("backend/services/auctionReminderCron.js");

pass("canonical service-role table grants exist", /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;/.test(migration));
pass("future service-role table privileges exist", /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public/.test(migration));
pass("favorites price-alert column is reconciled", /notify_on_price_drop BOOLEAN NOT NULL DEFAULT false/.test(migration));
pass("cars readiness/runtime grant is explicit", /public\.cars TO service_role/.test(migration));
pass("saved-search runtime grant is explicit", /public\.saved_searches TO service_role/.test(migration));
pass("nested timestamp filters normalize Date values", /const normalizeFilterValue = \(value\) => value instanceof Date \? value\.toISOString\(\) : value;/.test(db) && /query\.gte\(col, normalizeFilterValue\(val\)\)/.test(db) && /query\.lte\(col, normalizeFilterValue\(val\)\)/.test(db));
pass("price alert cron uses canonical notify field", /notifyOnPriceDrop: true/.test(priceAlert));
pass("auction reminder uses canonical Date filters", /auctionEnd: \{ \$gte: windowStart, \$lte: windowEnd \}/.test(auctionReminder));
pass("Render Redis policy is noeviction", /maxmemoryPolicy:\s*noeviction/.test(render));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(`\nProduction runtime correction validation: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
