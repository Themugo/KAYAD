// Minimal in-memory stand-in for the supabase-js query builder, enough for the
// provider discovery / governance services. It applies filters for real, so tests
// exercise the services' own query logic and not a canned answer.
let seq = 0;
const uid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

export function createFakeSupabase(seed = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ id: uid(), ...r }));
  const tbl = (n) => (tables[n] ||= []);

  const likeToRegex = (pat) => new RegExp('^' + String(pat).replace(/\\([\\%_])/g, '\u0000$1').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.').replace(/\u0000(.)/g, (_, c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + '$', 'i');

  function from(name) {
    const st = { op: 'select', filters: [], payload: null, order: null, limit: null, range: null, single: null };
    const api = {
      select() { return api; },
      insert(p) { st.op = 'insert'; st.payload = p; return api; },
      update(p) { st.op = 'update'; st.payload = p; return api; },
      delete() { st.op = 'delete'; return api; },
      eq(c, v) { st.filters.push((r) => r[c] === v); return api; },
      neq(c, v) { st.filters.push((r) => r[c] !== v); return api; },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return api; },
      is(c, v) { st.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return api; },
      not(c, op, v) { if (op === 'is') st.filters.push((r) => (v === null ? r[c] != null : r[c] !== v)); else throw new Error('fake .not supports only is'); return api; },
      ilike(c, pat) { const re = likeToRegex(pat); st.filters.push((r) => r[c] != null && re.test(String(r[c]))); return api; },
      order(c, o = {}) { st.order = [c, o.ascending !== false]; return api; },
      limit(n) { st.limit = n; return api; },
      range(a, b) { st.range = [a, b]; return api; },
      maybeSingle() { st.single = 'maybe'; return api; },
      single() { st.single = 'one'; return api; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    function run() {
      const rows = tbl(name);
      const match = (r) => st.filters.every((f) => f(r));
      let out;
      if (st.op === 'insert') {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: uid(), created_at: new Date().toISOString(), ...p }));
        rows.push(...list); out = list;
      } else if (st.op === 'update') {
        out = rows.filter(match); out.forEach((r) => Object.assign(r, st.payload));
      } else if (st.op === 'delete') {
        out = rows.filter(match); tables[name] = rows.filter((r) => !match(r));
      } else {
        out = rows.filter(match);
      }
      const count = out.length;
      if (st.order) { const [c, asc] = st.order; out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
      if (st.range) out = out.slice(st.range[0], st.range[1] + 1);
      if (st.limit != null) out = out.slice(0, st.limit);
      out = out.map((r) => ({ ...r }));
      if (st.single) {
        if (st.single === 'one' && out.length !== 1) return { data: null, error: { message: 'single row expected' } };
        return { data: out[0] || null, error: null };
      }
      return { data: out, error: null, count };
    }
    return api;
  }
  return { from, tables, _uid: uid };
}
