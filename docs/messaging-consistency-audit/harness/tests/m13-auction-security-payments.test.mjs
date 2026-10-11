// M13 — auction commitment / bid-security payment settlement on a schema built ONLY from supabase/migrations
// (no harness `transactions` shim). REAL server + real PostgreSQL + real atomic hold RPC. Callbacks are locally forged
// provider bodies (dev-mode IP allowlist bypass) — NOT Safaricom confirmations.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s;
const cb = (co, { code = 0, amount, receipt }) => ({ Body: { stkCallback: { MerchantRequestID: "m-" + co, CheckoutRequestID: co, ResultCode: code, ResultDesc: code ? "Cancelled" : "OK",
  ...(code ? {} : { CallbackMetadata: { Item: [{ Name: "Amount", Value: amount }, { Name: "MpesaReceiptNumber", Value: receipt }, { Name: "PhoneNumber", Value: 254700000000 }] } }) } } });
const post = (b) => fetch(s.base + "/api/payments/callback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, text: await r.text() }));
const q = async (sql, p = []) => (await s.pool.query(sql, p)).rows;

// Seeds exactly what initiateBidSecurity() leaves behind after a successful STK push (it is not called directly: that would
// contact M-Pesa): registration pending commitment, a pending commitment hold bound to the checkout id, and the pending
// security payment row in `payments` with the hold pointing at it (FK payment_transaction_id -> payments.id).
const seed = async ({ amount = 5000, legacy = false } = {}) => {
  const bidder = await s.makeUser("Bidder"), dealer = await s.makeUser("Organizer", { role: "dealer" });
  const car = (await q("insert into cars (title,brand,model,year,price,dealer_id) values ('Lot','B','M',2021,1,$1) returning id", [dealer.id]))[0].id;
  const reg = (await q(`insert into auction_registrations (auction_id,bidder_id,status,terms_version,terms_accepted_at,bidder_number,commitment_required,commitment_status)
    values ($1,$2,'pending_commitment','v1',now(),$3,true,'payment_pending') returning id`, [car, bidder.id, "B-" + uuid().slice(0, 6)]))[0].id;
  const co = "ws_CO_" + uuid().slice(0, 12);
  // Same order as the service: hold created first, STK push, payment row, then the hold is bound to the payment.
  const hold = (await q(`insert into auction_security_holds (auction_id,bidder_id,registration_id,hold_type,amount,status,checkout_request_id)
    values ($1,$2,$3,'commitment',$4,'pending',$5) returning id`, [car, bidder.id, reg, amount, co]))[0].id;
  const meta = JSON.stringify({ auctionRegistrationId: reg, auctionId: car, auctionSecurityHoldId: hold, auctionSecurityHoldType: "commitment" });
  let paymentId = null;
  if (!legacy) {
    paymentId = (await q(`insert into payments (user_id,car_id,amount,type,status,checkout_request_id,mode,metadata) values ($1,$2,$3,'bid_commitment','pending',$4,'mpesa',$5) returning id`,
      [bidder.id, car, amount, co, meta]))[0].id;
    await q("update auction_security_holds set payment_transaction_id=$2 where id=$1", [hold, paymentId]);
  } else {
    await q(`insert into transactions (checkout_request_id,type,status,user_id,amount,metadata) values ($1,'bid_commitment','pending',$2,$3,$4)`, [co, bidder.id, amount, meta]);
  }
  return { bidder, car, reg, co, paymentId, hold, amount };
};

before(async () => {
  s = await startStack();
  assert.equal((await q("select to_regclass('public.transactions') t"))[0].t, null, "this suite must run on a migration-only schema (no transactions shim)");
});
after(async () => { if (process.env.SHOW_LOGS) console.log(s.logs().split("\n").filter((l) => /./.test(l)).slice(-30).join("\n")); await s.stop(); });

test("commitment payment settles: payment success+processed, hold held, registration active/eligible; 10 concurrent replays settle once", async () => {
  const x = await seed();
  const body = cb(x.co, { amount: x.amount, receipt: "COMMIT001" });
  const rs = await Promise.all(Array.from({ length: 10 }, () => post(body)));
  assert.ok(rs.every((r) => r.status === 200), rs.map((r) => `${r.status}:${r.text.slice(0, 60)}`).join(" | "));
  const p = (await q("select status, processed, mpesa_receipt, paid_at from payments where id=$1", [x.paymentId]))[0];
  assert.equal(p.status, "success"); assert.equal(p.processed, true); assert.equal(p.mpesa_receipt, "COMMIT001"); assert.ok(p.paid_at);
  const h = (await q("select status, mpesa_receipt from auction_security_holds where id=$1", [x.hold]))[0];
  assert.equal(h.status, "held"); assert.equal(h.mpesa_receipt, "COMMIT001");
  const r = (await q("select status, eligibility_status, commitment_status from auction_registrations where id=$1", [x.reg]))[0];
  assert.deepEqual(r, { status: "active", eligibility_status: "eligible", commitment_status: "satisfied" });
  assert.equal(Number((await q("select count(*) n from auction_registration_events where registration_id=$1 and event_type='commitment_confirmed'", [x.reg]))[0].n), 1, "confirmed exactly once");
  const wh = await q("select processed from webhook_events where raw_payload->'Body'->'stkCallback'->>'CheckoutRequestID' = $1", [x.co]);
  assert.ok(wh.length >= 1 && wh.every((w) => w.processed === true), "provider webhook recorded and marked processed (was left unprocessed + 500 before FIN-CB-1)");
});

test("amount mismatch is never settled: payment failed, hold not held, registration not activated", async () => {
  const x = await seed({ amount: 5000 });
  await post(cb(x.co, { amount: 1, receipt: "SHORT001" }));
  assert.equal((await q("select status from payments where id=$1", [x.paymentId]))[0].status, "failed");
  assert.notEqual((await q("select status from auction_security_holds where id=$1", [x.hold]))[0].status, "held");
  assert.notEqual((await q("select status from auction_registrations where id=$1", [x.reg]))[0].status, "active");
});

test("cancelled STK (ResultCode 1032): payment failed, hold failed, registration back to pending_commitment", async () => {
  const x = await seed();
  await post(cb(x.co, { code: 1032 }));
  assert.equal((await q("select status from payments where id=$1", [x.paymentId]))[0].status, "failed");
  assert.equal((await q("select status from auction_security_holds where id=$1", [x.hold]))[0].status, "failed");
  assert.deepEqual((await q("select status, commitment_status from auction_registrations where id=$1", [x.reg]))[0], { status: "pending_commitment", commitment_status: "failed" });
});

test("a regular (non-security) payment is not captured by the security route and still settles through the generic path", async () => {
  const u = await s.makeUser("Buyer"), d = await s.makeUser("Dealer", { role: "dealer" });
  const car = (await q("insert into cars (title,brand,model,year,price,dealer_id) values ('X','B','M',2020,700,$1) returning id", [d.id]))[0].id;
  const co = "ws_CO_" + uuid().slice(0, 12);
  const id = (await q("insert into payments (user_id,car_id,amount,type,status,checkout_request_id) values ($1,$2,700,'purchase','pending',$3) returning id", [u.id, car, co]))[0].id;
  await post(cb(co, { amount: 700, receipt: "PURCH001" }));
  assert.equal((await q("select status from payments where id=$1", [id]))[0].status, "success");
});

test("transition compatibility: an in-flight legacy row in an out-of-band `transactions` table is still settled (hold FK left null)", async () => {
  await q(`create table public.transactions (id uuid primary key default gen_random_uuid(), checkout_request_id text, type text, status text, user_id uuid, amount numeric,
    mpesa_receipt text, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now())`);
  try {
    const x = await seed({ legacy: true });
    await post(cb(x.co, { amount: x.amount, receipt: "LEGACY01" }));
    assert.equal((await q("select status from transactions where checkout_request_id=$1", [x.co]))[0].status, "success");
    assert.equal((await q("select status from auction_security_holds where id=$1", [x.hold]))[0].status, "held");
    assert.equal(Number((await q("select count(*) n from payments where checkout_request_id=$1", [x.co]))[0].n), 0, "no new row written to payments for a legacy record");
  } finally { await q("drop table public.transactions"); }
});
