// In-memory PostgREST-style stand-in for the analytics tables: eq/gte/lt/lte/in filters, order, range, insert (with the unique
// constraints from the migration), update, delete. Enough to run the real services end to end.
export const makeAnalyticsDb = () => {
  const UNIQUE = {
    analytics_visitors: ["visitor_hash"], analytics_sessions: ["session_hash"], analytics_events: ["event_id", "dedupe_key"], system_settings: ["key"],
  };
  const tables = { analytics_visitors: [], analytics_sessions: [], analytics_events: [], system_settings: [] };
  const from = (name) => {
    const rows = tables[name] || (tables[name] = []);
    const f = []; let order = null; let rng = null; let op = "select"; let payload = null; let single = false; let wantRows = false;
    const test = (row) => f.every(({ o, c, v }) => {
      const x = row[c];
      if (o === "eq") return String(x) === String(v);
      if (o === "gte") return x >= v; if (o === "gt") return x > v; if (o === "lt") return x < v; if (o === "lte") return x <= v;
      if (o === "in") return v.map(String).includes(String(x));
      return true;
    });
    const run = () => {
      if (op === "insert") {
        for (const col of UNIQUE[name] || []) if (rows.some((r) => r[col] === payload[col])) return { data: null, error: { code: "23505", message: `duplicate ${col}` } };
        rows.push({ ...payload }); return { data: [payload], error: null };
      }
      if (op === "update") { const hit = rows.filter(test); hit.forEach((r) => Object.assign(r, payload)); return { data: hit.map((r) => ({ ...r })), error: null }; }
      if (op === "delete") { const hit = rows.filter(test); hit.forEach((r) => rows.splice(rows.indexOf(r), 1)); return { data: hit, error: null }; }
      let out = rows.filter(test).map((r) => ({ ...r }));
      if (order) out.sort((a, b) => (a[order.c] < b[order.c] ? -1 : a[order.c] > b[order.c] ? 1 : 0) * (order.asc ? 1 : -1));
      if (rng) out = out.slice(rng[0], rng[1] + 1);
      if (single) return { data: out[0] ?? null, error: null };
      return { data: out, error: null };
    };
    const q = {
      select: () => { if (op !== "select") wantRows = true; return q; },
      insert: (p) => { op = "insert"; payload = p; return q; },
      update: (p) => { op = "update"; payload = p; return q; },
      delete: () => { op = "delete"; return q; },
      eq: (c, v) => (f.push({ o: "eq", c, v }), q), gte: (c, v) => (f.push({ o: "gte", c, v }), q), gt: (c, v) => (f.push({ o: "gt", c, v }), q),
      lt: (c, v) => (f.push({ o: "lt", c, v }), q), lte: (c, v) => (f.push({ o: "lte", c, v }), q), in: (c, v) => (f.push({ o: "in", c, v }), q),
      order: (c, o = {}) => { order = { c, asc: o.ascending !== false }; return q; },
      range: (a, b) => { rng = [a, b]; return q; },
      maybeSingle: () => { single = true; return Promise.resolve(run()); },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  return { tables, from, rpc: async () => ({ data: null, error: null }) };
};
