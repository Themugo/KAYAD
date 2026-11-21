#!/usr/bin/env node
// Read-only dealer inventory latency diagnostic. Makes NO write. Run against STAGING first.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backend/scripts/diagnose-dealer-inventory-latency.mjs [dealerId]
//
// Without a dealerId it picks the dealer with the most listings. It times, for that dealer:
//   1. the OLD shape  - every listing, all columns (what /api/cars/my-listings returns with no paging)
//   2. a 20-row page  - what the paged path / dealer-platform inventory now does
//   3. status counts  - the cheap COUNT queries behind the stats
// and prints rows, payload size and milliseconds, so slow queries and oversized rows (huge JSONB `images`) are visible.
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (staging first)."); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const time = async (label, fn) => { const t = performance.now(); const r = await fn(); const ms = Math.round(performance.now() - t); const rows = Array.isArray(r?.data) ? r.data.length : r?.count ?? "-"; const kb = Array.isArray(r?.data) ? Math.round(JSON.stringify(r.data).length / 1024) : "-"; if (r?.error) console.log(`${label.padEnd(34)} ERROR ${r.error.message}`); else console.log(`${label.padEnd(34)} ${String(ms).padStart(6)} ms  rows=${rows}  payload=${kb} KB`); return r; };

let dealerId = process.argv[2];
if (!dealerId) {
  const { data, error } = await sb.from("cars").select("dealer_id").not("dealer_id", "is", null).limit(5000);
  if (error) { console.error(error.message); process.exit(1); }
  const tally = new Map(); for (const r of data) tally.set(r.dealer_id, (tally.get(r.dealer_id) || 0) + 1);
  dealerId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  console.log(`Largest dealer in the first 5000 rows: ${dealerId} (${tally.get(dealerId)} listings)`);
}
const scoped = () => sb.from("cars").select("*", { count: "exact" }).eq("dealer_id", dealerId).is("deleted_at", null);
await time("OLD: all listings, all columns", () => scoped().order("created_at", { ascending: false }));
await time("PAGE: 20 newest, all columns", () => scoped().order("created_at", { ascending: false }).range(0, 19));
for (const s of ["available", "draft", "pending", "reserved", "sold", "archived"])
  await time(`COUNT status=${s}`, () => sb.from("cars").select("id", { count: "exact", head: true }).eq("dealer_id", dealerId).is("deleted_at", null).eq("status", s));
const { data: big } = await sb.from("cars").select("id,images").eq("dealer_id", dealerId).is("deleted_at", null).limit(200);
const sizes = (big || []).map((r) => JSON.stringify(r.images ?? []).length).sort((a, b) => b - a);
console.log(`images JSONB per row (top 3 of ${sizes.length}): ${sizes.slice(0, 3).map((n) => Math.round(n / 1024) + " KB").join(", ") || "n/a"}`);
console.log("Compare OLD vs PAGE: if OLD is slow and PAGE is fast the unbounded read was the cause; if PAGE is also slow, check indexes on cars(dealer_id, created_at) and row/JSONB size.");
