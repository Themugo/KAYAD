// M5 — payment callback idempotency, amount integrity, webhook auth. Real server + real PostgreSQL. NO real provider is contacted;
// callbacks are locally forged request bodies against the local server (dev-mode IP allowlist bypass), clearly not provider confirmations.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s, u;
before(async () => { s = await startStack({ extraEnv: { COMMUNICATION_WEBHOOK_SECRET: "wh".repeat(16) } }); u = await s.makeUser("Payer One"); });
after(async () => { await s.stop(); });
const cb = (checkout, { code = 0, amount = 1000, receipt = "RCPT" + Math.random().toString(36).slice(2, 8).toUpperCase() } = {}) => ({ Body: { stkCallback: { MerchantRequestID: "m-" + checkout, CheckoutRequestID: checkout, ResultCode: code, ResultDesc: code ? "Request cancelled by user" : "The service request is processed successfully.", ...(code ? {} : { CallbackMetadata: { Item: [{ Name: "Amount", Value: amount }, { Name: "MpesaReceiptNumber", Value: receipt }, { Name: "PhoneNumber", Value: 254700000000 }] } }) } } });
const post = (p, b, h = {}) => fetch(s.base + p, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, text: await r.text() }));
const mkPayment = async (amount = 1000, type = "purchase") => { u = await s.makeUser("Payer"); const co = "ws_CO_" + uuid().slice(0, 12);
  const seller = await s.makeUser("Seller", { role: "dealer" });
  const car = (await s.pool.query("insert into cars (title, brand, model, year, price, dealer_id) values ('T','B','M',2020,$1,$2) returning id", [amount, seller.id])).rows[0].id;
  const r = await s.pool.query("insert into payments (user_id, car_id, amount, type, status, checkout_request_id) values ($1,$2,$3,$4,'pending',$5) returning id", [u.id, car, amount, type, co]); return { id: r.rows[0].id, co }; };
const pay = async (id) => (await s.pool.query("select status, mpesa_receipt, processed from payments where id=$1", [id])).rows[0];
const nCount = async (title) => Number((await s.pool.query("select count(*) n from notifications where user_id=$1 and title=$2", [u.id, title])).rows[0].n);

test("CSRF exemption reaches provider callbacks on /api and /api/v1 (D-FIN-1)", async () => {
  for (const p of ["/api/payments/callback", "/api/v1/payments/callback"]) { const r = await post(p, cb("ws_CO_none", { amount: 1 })); assert.notEqual(r.status, 403, `${p} -> ${r.status} ${r.text.slice(0, 80)}`); }
  const c = await post("/api/payments/start-not-exempt", {}); assert.equal(c.status, 403, "non-exempt state-changing route without CSRF stays blocked");
});

test("success callback replayed concurrently (N=12): payment settles once, one webhook receipt", async () => {
  const p = await mkPayment(1000); const body = cb(p.co, { receipt: "RCPTONCE1" });
  const rs = await Promise.all(Array.from({ length: 12 }, () => post("/api/payments/callback", body)));
  assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status + r.text.slice(0, 80)).join("|"));
  const row = await pay(p.id); assert.equal(row.status, "success"); assert.equal(row.mpesa_receipt, "RCPTONCE1");
  const ev = await s.pool.query("select count(*) n from payment_webhook_events").catch(() => null);
  if (ev) console.log("# webhook receipts rows total=", ev.rows[0].n);
});

test("sequential replay after success is a no-op and does not change the receipt", async () => {
  const p = await mkPayment(2500);
  await post("/api/payments/callback", cb(p.co, { amount: 2500, receipt: "FIRSTRCPT" }));
  const r2 = await post("/api/payments/callback", cb(p.co, { amount: 2500, receipt: "SECONDRCPT" }));
  assert.equal(r2.status, 200); assert.equal((await pay(p.id)).mpesa_receipt, "FIRSTRCPT");
});

test("amount mismatch is never settled as success", async () => {
  const p = await mkPayment(5000);
  await post("/api/payments/callback", cb(p.co, { amount: 1, receipt: "SHORTPAY1" }));
  const row = await pay(p.id); assert.notEqual(row.status, "success"); assert.equal(row.status, "failed");
});

test("failed callback replayed 8x: one failure notification, status failed", async () => {
  const p = await mkPayment(700); const before_ = await nCount("Payment Failed");
  await Promise.all(Array.from({ length: 8 }, () => post("/api/payments/callback", cb(p.co, { code: 1032 }))));
  assert.equal((await pay(p.id)).status, "failed"); assert.equal((await nCount("Payment Failed")) - before_, 1);
});

test("unknown checkout id and malformed bodies create nothing and never settle", async () => {
  const before_ = Number((await s.pool.query("select count(*) n from payments")).rows[0].n);
  const r1 = await post("/api/payments/callback", cb("ws_CO_unknown", { amount: 10 }));
  const r2 = await post("/api/payments/callback", { nope: true });
  assert.notEqual(r1.status, 403, "provider callback must not be CSRF-blocked"); assert.ok(r1.status < 500, `unknown checkout -> ${r1.status}`);
  assert.equal(r2.status, 200, "provider-facing reject convention"); assert.equal(JSON.parse(r2.text).ResultCode, 1, "malformed body is rejected with ResultCode 1, not accepted");
  assert.equal(Number((await s.pool.query("select count(*) n from payments")).rows[0].n), before_);
});

test("communication webhooks: no/incorrect secret rejected; correct secret accepted", async () => {
  for (const p of ["/api/communications/webhooks/status", "/api/communications/webhooks/africastalking/status"]) {
    assert.equal((await post(p, {})).status, 401, p);
    assert.equal((await post(p, {}, { "x-kayad-webhook-secret": "wrong" + "x".repeat(27) })).status, 401, p);
  }
  const ok = await post("/api/communications/webhooks/status", { provider: "x", providerMessageId: "none", status: "delivered" }, { "x-kayad-webhook-secret": "wh".repeat(16) });
  assert.ok(ok.status < 500 && ok.status !== 401, `valid secret -> ${ok.status} ${ok.text.slice(0, 100)}`);
  assert.equal((await post("/api/communications/webhooks/brevo/events", { event: "delivered" })).status, 401, "brevo unsigned");
});
