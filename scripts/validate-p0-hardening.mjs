#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pass = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures.push(name);
};

pass('dealerPlatformApi.js removed', !exists('src/services/dealerPlatformApi.js'));
pass('canonical dealerPlatformApi.ts exists', exists('src/services/dealerPlatformApi.ts'));
pass('SupportView duplicate implementation removed', !exists('src/features/SupportView/components/SupportView.tsx'));
pass('SupportFAQ duplicate implementation removed', !exists('src/features/SupportView/components/SupportFAQ.tsx'));
pass('DealersView duplicate implementation removed', !exists('src/features/DealersView/components/DealersView.tsx'));
pass('SupportView index resolves to flat canonical implementation', read('src/features/SupportView/index.ts').includes("from '../SupportView'"));
pass('DealersView index resolves to flat canonical implementation', read('src/features/DealersView/index.ts').includes("from '../DealersView'"));
pass('dispute RPC privilege hardening migration exists', exists('supabase/migrations/20260919100000_harden_dispute_rpc_execute_privileges.sql'));
pass('dispute RPC hardening revokes authenticated execution', read('supabase/migrations/20260919100000_harden_dispute_rpc_execute_privileges.sql').includes('FROM authenticated'));
pass('inventory webhook limits payload size', read('backend/routes/webhookRoutes.js').includes('listings.length > 500'));
pass('inventory webhook allowlists fields', read('backend/routes/webhookRoutes.js').includes('ALLOWED_FIELDS'));
pass('inventory webhook uses constant-time API key comparison', read('backend/routes/webhookRoutes.js').includes('crypto.timingSafeEqual'));
pass('inventory webhook computes durable dedupe key', read('backend/routes/webhookRoutes.js').includes('buildInventoryDedupeKey'));
pass('inventory webhook claims distributed replay lock', read('backend/routes/webhookRoutes.js').includes('kayad_try_acquire_lock'));
pass('inventory webhook records webhook receipt', read('backend/routes/webhookRoutes.js').includes('recordInventoryWebhookReceipt'));
pass('inventory webhook marks receipt processed or failed', read('backend/routes/webhookRoutes.js').includes('markInventoryWebhook'));
pass('frontend has no direct Supabase table access', !read('src/services/vehicleApi.ts').includes('createClient('));
pass('RLS service-only classification report exists', exists('P0_RLS_CLASSIFICATION_20260919.md'));
pass('reachable schema reconciliation report exists', exists('P0_REACHABLE_SCHEMA_RECONCILIATION_20260919.md'));

console.log(`\nKAYAD P0 hardening static gate: ${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
process.exitCode = failures.length ? 1 : 0;
