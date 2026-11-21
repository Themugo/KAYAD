// Regression guard (2026-11-21 journey verification): kayad_offer_action must never filter
// marketplace_offers by a column that table does not have. Static check of the migration chain; the
// executable proof is docs/handover/.../evidence/journeys/j4_offers.mjs against a migrated database.
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const defs = files.filter((f) => /CREATE OR REPLACE FUNCTION public\.kayad_offer_action\(/i.test(fs.readFileSync(path.join(dir, f), 'utf8')));
const latest = defs.at(-1);
const sql = fs.readFileSync(path.join(dir, latest), 'utf8');
const table = fs.readFileSync(path.join(dir, '20261110120000_canonical_offer_negotiation_workflow.sql'), 'utf8');
const offersCols = /CREATE TABLE IF NOT EXISTS public\.marketplace_offers \(([\s\S]*?)\n\);/.exec(table)[1];
const checks = [
  ['kayad_offer_action is defined by at least the original and the corrective migration', defs.length >= 2],
  ['the LATEST definition is the corrective migration or its successor (settlement binding)', ['20261121090000_offer_action_replay_lookup_fix.sql', '20261121110000_offer_settlement_binding.sql'].includes(latest)],
  ['marketplace_offers has no actor_id column (sender_id is the actor column)', !/\bactor_id\b/.test(offersCols) && /\bsender_id\b/.test(offersCols)],
  ['latest definition never filters marketplace_offers by actor_id', !/FROM public\.marketplace_offers[^;]*\bactor_id\b/i.test(sql)],
  ['latest definition replays by sender_id on marketplace_offers', /FROM public\.marketplace_offers WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND sender_id=p_actor_id/.test(sql)],
  ['events replay lookup still uses actor_id on marketplace_offer_events', /FROM public\.marketplace_offer_events WHERE lead_id=p_lead_id AND idempotency_key=p_idempotency_key AND actor_id=p_actor_id/.test(sql)],
  ['execute stays service_role only', /REVOKE ALL ON FUNCTION public\.kayad_offer_action[\s\S]*FROM PUBLIC, anon, authenticated/.test(sql) && /GRANT EXECUTE ON FUNCTION public\.kayad_offer_action[\s\S]*TO service_role/.test(sql)],
  ['SECURITY DEFINER keeps a pinned search_path', /SECURITY DEFINER SET search_path = public/.test(sql)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) { console.error(`${failed} check(s) failed`); process.exit(1); }
console.log('Offer action function column guard passed');
