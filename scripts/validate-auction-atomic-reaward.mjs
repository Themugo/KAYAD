import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const service = fs.readFileSync(path.join(root, "backend/services/auctionFulfilment.service.js"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261114130000_auction_atomic_reaward.sql"), "utf8");
const checks = [
  ["service calls atomic RPC", service.includes("kayad_reaward_auction_outcome_atomic") && service.includes("getSupabase().rpc(")],
  ["no split bid claim remains in re-award", !service.slice(service.indexOf("export async function reawardAuctionOutcome")).includes('updateMany("bids"')],
  ["SQL locks outcome", /auction_outcomes[\s\S]*?FOR UPDATE/i.test(sql)],
  ["SQL locks candidate bid", /bids[\s\S]*?FOR UPDATE/i.test(sql)],
  ["SQL locks bidder registration", /auction_registrations[\s\S]*?FOR UPDATE/i.test(sql)],
  ["SQL validates organizer and prior winner", sql.includes("v_outcome.organizer_id IS DISTINCT FROM p_actor_id") && sql.includes("v_outcome.winner_user_id IS DISTINCT FROM p_expected_previous_winner_id")],
  ["only applied hold for this outcome is credited", sql.includes("status = 'applied'") && sql.includes("applied_outcome_id = v_outcome.id")],
];
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([,ok]) => !ok)) process.exit(1);
