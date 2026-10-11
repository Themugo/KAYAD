// M5 — listing ownership & auction authorization through the real server + real PostgreSQL.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s, owner, rival, buyer, car;
before(async () => {
  s = await startStack(); owner = await s.makeUser("Owner Dealer", { role: "dealer" }); rival = await s.makeUser("Rival Dealer", { role: "dealer" }); buyer = await s.makeUser("Plain Buyer");
  car = (await s.pool.query("insert into cars (title,brand,model,year,price,dealer_id) values ('Owner Car','Toyota','Prado',2019,3500000,$1) returning id", [owner.id])).rows[0].id;
});
after(async () => { await s.stop(); });
const row = async () => (await s.pool.query("select title, price, dealer_id, deleted_at from cars where id=$1", [car])).rows[0];

test("rival dealer cannot update or delete another dealer's listing", async () => {
  const c = s.client(rival);
  const put = await c.req("PUT", `/api/cars/${car}`, { title: "Hijacked", brand: "Toyota", model: "Prado", year: 2019, price: 1 });
  assert.ok(put.status >= 400 && put.status < 500, `PUT -> ${put.status} ${put.text.slice(0, 120)}`);
  const del = await c.del(`/api/cars/${car}`);
  assert.ok(del.status >= 400 && del.status < 500, `DELETE -> ${del.status} ${del.text.slice(0, 120)}`);
  const r = await row(); assert.equal(r.title, "Owner Car"); assert.equal(Number(r.price), 3500000); assert.equal(r.dealer_id, owner.id); assert.equal(r.deleted_at, null);
});

test("plain buyer cannot create, update or delete listings", async () => {
  const c = s.client(buyer);
  for (const r of [await c.post("/api/cars", {}), await c.req("PUT", `/api/cars/${car}`, { title: "x" }), await c.del(`/api/cars/${car}`)]) assert.equal(r.status, 403, `${r.status} ${r.text.slice(0, 100)}`);
  assert.equal((await row()).title, "Owner Car");
});

test("anonymous cannot mutate listings or place/end bids", async () => {
  const c = s.client(null);
  for (const r of [await c.req("PUT", `/api/cars/${car}`, { title: "x" }), await c.del(`/api/cars/${car}`), await c.post(`/api/bids/${car}/end`, {}), await c.post(`/api/bids/${car}/bid`, { amount: 1 }, { "idempotency-key": uuid() })])
    assert.ok([401, 403].includes(r.status), `${r.status} ${r.text.slice(0, 100)}`);
  assert.equal((await row()).title, "Owner Car");
});

test("non-admin cannot end an auction (even the listing owner)", async () => {
  for (const u of [owner, buyer]) { const r = await s.client(u).post(`/api/bids/${car}/end`, {}, { "idempotency-key": uuid() }); assert.equal(r.status, 403, `${r.status} ${r.text.slice(0, 100)}`); }
});

test("owner can still update their own listing (control: ownership gate is not over-blocking)", async () => {
  const r = await s.client(owner).req("PUT", `/api/cars/${car}`, { title: "Owner Car v2", brand: "Toyota", model: "Prado", year: 2019, price: 3400000 });
  console.log("# owner PUT ->", r.status, r.text.slice(0, 140));
  assert.equal(r.status, 200, `${r.status} ${r.text.slice(0, 120)}`);
  const after = await row(); assert.equal(after.title, "Owner Car v2"); assert.equal(Number(after.price), 3400000); assert.equal(after.dealer_id, owner.id);
});

test("bid gates: owner cannot bid on own car; unverified phone blocked; unpublished auction blocked (no bid row written)", async () => {
  await s.pool.query("update cars set auction_status='live', allow_bid=true, starting_bid=1000000, current_bid=1000000, auction_start_time=now()-interval '1 hour', auction_end=now()+interval '1 hour' where id=$1", [car]);
  const mk = () => ({ "idempotency-key": uuid() });
  const own = await s.client(owner).post(`/api/bids/${car}/bid`, { amount: 1100000 }, mk()); assert.equal(own.status, 400); assert.match(own.text, /own car/i);
  const nophone = await s.client(buyer).post(`/api/bids/${car}/bid`, { amount: 1100000 }, mk()); assert.equal(nophone.status, 400); assert.match(nophone.text, /phone/i);
  await s.pool.query("update users set phone='+254711000111', phone_verified=true where id=$1", [buyer.id]);
  const unpub = await s.client(buyer).post(`/api/bids/${car}/bid`, { amount: 1100000 }, mk()); assert.equal(unpub.status, 409); assert.match(unpub.text, /AUCTION_NOT_PUBLISHED/);
  assert.equal(Number((await s.pool.query("select count(*) n from bids where car_id=$1", [car])).rows[0].n), 0, "no bid persisted by rejected requests");
});
