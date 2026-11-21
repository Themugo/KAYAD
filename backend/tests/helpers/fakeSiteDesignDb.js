// Minimal in-memory PostgREST-style fake for site_designs / site_design_publications (select/insert/update/delete, eq, order, limit, single).
import crypto from "crypto";
export function makeSiteDesignDb({ failPublicationInsert = false } = {}) {
  const tables = { site_designs: [], site_design_publications: [] };
  const state = { failPublicationInsert };
  const from = (name) => {
    const rows = tables[name];
    let op = "select"; let payload = null; const eq = []; let order = null; let lim = null; let single = false;
    const q = {
      select: () => q, insert: (p) => { op = "insert"; payload = p; return q; }, update: (p) => { op = "update"; payload = p; return q; }, delete: () => { op = "delete"; return q; },
      eq: (c, v) => { eq.push([c, v]); return q; }, order: (c, o) => { order = [c, o?.ascending !== false]; return q; }, limit: (n) => { lim = n; return q; }, single: () => { single = true; return q; },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    const match = (r) => eq.every(([c, v]) => r[c] === v);
    const run = () => {
      if (op === "insert") {
        if (name === "site_design_publications" && state.failPublicationInsert) return { data: null, error: { message: "boom" } };
        if (name === "site_designs" && rows.some((r) => r.name.trim().toLowerCase() === String(payload.name).trim().toLowerCase())) return { data: null, error: { code: "23505", message: "dup" } };
        const row = { id: crypto.randomUUID(), revision: 1, description: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: new Date().toISOString(), ...JSON.parse(JSON.stringify(payload)) };
        rows.push(row); return { data: single ? row : [row], error: null };
      }
      if (op === "update") {
        const hit = rows.filter(match);
        if (name === "site_designs" && payload.name && rows.some((r) => !hit.includes(r) && r.name.toLowerCase() === payload.name.toLowerCase())) return { data: null, error: { code: "23505", message: "dup" } };
        hit.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(payload)))); return { data: hit, error: null };
      }
      if (op === "delete") { const keep = rows.filter((r) => !match(r)); rows.length = 0; rows.push(...keep); return { data: null, error: null }; }
      let out = rows.filter(match).slice();
      if (order) out.sort((a, b) => (a[order[0]] < b[order[0]] ? -1 : a[order[0]] > b[order[0]] ? 1 : 0) * (order[1] ? 1 : -1));
      if (lim !== null) out = out.slice(0, lim);
      return { data: single ? out[0] : out, error: null };
    };
    return q;
  };
  return { tables, from, state };
}
