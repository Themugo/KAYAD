// Minimal in-memory PostgREST-style fake for featured_vehicle_campaigns / history / cars.
import crypto from "crypto";
export function makeCampaignDb() {
  const tables = { featured_vehicle_campaigns: [], featured_vehicle_campaign_history: [], cars: [] };
  const state = { failHistory: false, failTable: null };
  const val = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v).getTime() : v);
  const from = (name) => {
    const rows = tables[name];
    let op = "select"; let payload = null; const flt = []; const orders = []; let lim = null; let single = false;
    const q = {
      select: () => q, insert: (p) => { op = "insert"; payload = p; return q; }, update: (p) => { op = "update"; payload = p; return q; }, delete: () => { op = "delete"; return q; },
      eq: (c, v) => { flt.push((r) => r[c] === v); return q; }, in: (c, vs) => { flt.push((r) => vs.includes(r[c])); return q; },
      lte: (c, v) => { flt.push((r) => val(r[c]) <= val(v)); return q; }, gt: (c, v) => { flt.push((r) => val(r[c]) > val(v)); return q; },
      is: (c, v) => { flt.push((r) => (v === null ? r[c] == null : r[c] === v)); return q; }, or: () => q,
      order: (c, o) => { orders.push([c, o?.ascending !== false]); return q; }, limit: (n) => { lim = n; return q; }, single: () => { single = true; return q; },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    const match = (r) => flt.every((f) => f(r));
    const run = () => {
      if (state.failTable === name) return { data: null, error: { message: `relation "${name}" does not exist`, code: "42P01" } };
      if (op === "insert") {
        if (name === "featured_vehicle_campaign_history" && state.failHistory) return { data: null, error: { message: "boom" } };
        const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), at: new Date().toISOString(), paused: false, ...JSON.parse(JSON.stringify(payload)) };
        rows.push(row); return { data: single ? row : [row], error: null };
      }
      if (op === "update") { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(payload)))); return { data: single ? hit[0] : hit, error: null }; }
      if (op === "delete") { const keep = rows.filter((r) => !match(r)); rows.length = 0; rows.push(...keep); return { data: null, error: null }; }
      let out = rows.filter(match).slice();
      out.sort((a, b) => { for (const [c, asc] of orders) { const x = val(a[c]), y = val(b[c]); if (x < y) return asc ? -1 : 1; if (x > y) return asc ? 1 : -1; } return 0; });
      if (lim !== null) out = out.slice(0, lim);
      return { data: single ? out[0] : out, error: null };
    };
    return q;
  };
  return { tables, from, state };
}
