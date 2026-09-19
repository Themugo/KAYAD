#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const read=p=>fs.readFileSync(path.join(root,p),'utf8'); const files=fs.readdirSync(path.join(root,'supabase/migrations')).map(f=>'supabase/migrations/'+f); const all=files.map(f=>read(f)).join('\n'); const fails=[];
const pass=(n,ok)=>{console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fails.push(n)};
pass('idempotency key unique constraint exists',/idempotency_keys[\s\S]{0,1000}UNIQUE|UNIQUE INDEX[^\n]*idempotency_keys/i.test(all));
pass('payment checkout request is unique',/uq_payments_checkout_request_id/i.test(all));
pass('payment pending operation is concurrency protected',/uq_payments_pending_operation/i.test(all));
pass('payment attempt checkout is unique',/uq_payment_attempt_checkout/i.test(all));
pass('financial workflow event is append-only/idempotent',/financial_workflow_events[\s\S]{0,2500}(UNIQUE|event_key|event_type)/i.test(all));
pass('distributed lock RPC exists',/CREATE OR REPLACE FUNCTION kayad_try_acquire_lock/i.test(all));
pass('atomic bid RPC exists',/kayad_place_bid_atomic/i.test(all));
pass('atomic escrow transition exists',/kayad_transition_escrow_atomic/i.test(all));
pass('atomic dispute resolution exists',/kayad_resolve_dispute_atomic/i.test(all));
pass('webhook dedupe unique constraint exists',/webhook_events_dedupe_key_key|dedupe_key TEXT NOT NULL UNIQUE/i.test(all));
pass('payment webhook receipt service exists',/recordWebhookReceipt/i.test(read('backend/services/paymentFinancialLifecycle.service.js')));
pass('payment webhook processing errors are retained',/processingError/i.test(read('backend/services/paymentFinancialLifecycle.service.js')));
console.log(`\nP0 financial failure-mode structural gate: ${fails.length?'FAIL':'PASS'} (${12-fails.length}/12)`); process.exitCode=fails.length?1:0;
