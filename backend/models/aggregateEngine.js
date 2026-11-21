// In-memory aggregation engine for the Mongo-compat model layer (2026-11-21 audit "silent aggregation").
//
// Contract: every operator we do not implement THROWS (AggregateUnsupportedError). Nothing is ignored, so a dashboard can
// never show a plausible-but-wrong figure because a stage or accumulator was skipped. Prefer SQL/RPC for money; this engine
// exists so the legacy `Model.aggregate([...])` call sites return exactly what the equivalent MongoDB pipeline would.
export class AggregateUnsupportedError extends Error {
  constructor(what) { super(`aggregate(): unsupported ${what}. Use a SQL/RPC aggregate for this query.`); this.name = "AggregateUnsupportedError"; this.code = "AGGREGATE_UNSUPPORTED"; }
}
const unsupported = (w) => { throw new AggregateUnsupportedError(w); };

const ISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
// Normalise for comparison: Date and ISO timestamp strings compare as instants; numeric strings are NOT coerced here.
export const norm = (v) => {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" && ISO.test(v)) { const t = Date.parse(v); return Number.isNaN(t) ? v : t; }
  return v;
};
const isNil = (v) => v === null || v === undefined;
const get = (d, path) => String(path).split(".").reduce((o, k) => (isNil(o) ? undefined : o[k]), d);
const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v); // PostgREST may return numeric/bigint as text
  return null;
};
const cmp = (a, b) => {
  a = norm(a); b = norm(b);
  if (isNil(a) && isNil(b)) return 0; if (isNil(a)) return -1; if (isNil(b)) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0;
};

// ---- $match ---------------------------------------------------------------------------------------------------------
const OPS = new Set(["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists", "$regex", "$options"]);
const eq = (a, b) => (isNil(b) ? isNil(a) : !isNil(a) && cmp(a, b) === 0);
function fieldMatches(val, cond) {
  const isOps = cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond) && !(cond instanceof RegExp) && Object.keys(cond).some((k) => k.startsWith("$"));
  if (cond instanceof RegExp) return typeof val === "string" && cond.test(val);
  if (!isOps) return eq(val, cond);
  for (const [op, arg] of Object.entries(cond)) {
    if (!OPS.has(op)) unsupported(`$match operator ${op}`);
    switch (op) {
      case "$eq": if (!eq(val, arg)) return false; break;
      case "$ne": if (eq(val, arg)) return false; break;
      case "$gt": if (isNil(val) || cmp(val, arg) <= 0) return false; break;
      case "$gte": if (isNil(val) || cmp(val, arg) < 0) return false; break;
      case "$lt": if (isNil(val) || cmp(val, arg) >= 0) return false; break;
      case "$lte": if (isNil(val) || cmp(val, arg) > 0) return false; break;
      case "$in": if (!Array.isArray(arg)) unsupported("$in with a non-array"); if (!arg.some((a) => eq(val, a))) return false; break;
      case "$nin": if (!Array.isArray(arg)) unsupported("$nin with a non-array"); if (arg.some((a) => eq(val, a))) return false; break;
      case "$exists": if ((!isNil(val)) !== !!arg) return false; break;
      case "$regex": { const re = arg instanceof RegExp ? arg : new RegExp(arg, cond.$options || ""); if (typeof val !== "string" || !re.test(val)) return false; break; }
      default: break; // $options is consumed by $regex
    }
  }
  return true;
}
export function matches(doc, spec) {
  for (const [k, v] of Object.entries(spec || {})) {
    if (k === "$and") { if (!v.every((s) => matches(doc, s))) return false; }
    else if (k === "$or") { if (!v.some((s) => matches(doc, s))) return false; }
    else if (k === "$nor") { if (v.some((s) => matches(doc, s))) return false; }
    else if (k.startsWith("$")) unsupported(`$match operator ${k}`);
    else if (!fieldMatches(get(doc, k), v)) return false;
  }
  return true;
}

// ---- expressions (only what the application's pipelines use) --------------------------------------------------------
function evalExpr(e, d) {
  if (typeof e === "string") return e.startsWith("$") ? get(d, e.slice(1)) : e;
  if (e === null || typeof e !== "object" || e instanceof Date || Array.isArray(e)) { if (Array.isArray(e)) unsupported("array expression"); return e; }
  const keys = Object.keys(e); if (keys.length !== 1 || !keys[0].startsWith("$")) unsupported("object expression");
  const op = keys[0], a = e[op];
  const args = () => (Array.isArray(a) ? a : [a]).map((x) => evalExpr(x, d));
  switch (op) {
    case "$literal": return a;
    case "$cond": { const [i, t, f] = Array.isArray(a) ? a : [a.if, a.then, a.else]; const c = evalExpr(i, d); return evalExpr(c && c !== 0 ? t : f, d); }
    case "$ifNull": { const [x, y] = args(); return isNil(x) ? y : x; }
    case "$add": return args().reduce((s, x) => s + (num(x) ?? 0), 0);
    case "$subtract": { const [x, y] = args(); return num(x) - num(y); }
    case "$multiply": return args().reduce((s, x) => s * num(x), 1);
    case "$divide": { const [x, y] = args(); return num(y) ? num(x) / num(y) : null; }
    case "$round": { const [x, p = 0] = args(); const n = num(x); if (n === null) return null; const f = 10 ** p; return Math.round(n * f) / f; }
    case "$size": { const [x] = args(); if (!Array.isArray(x)) unsupported("$size of a non-array"); return x.length; }
    case "$eq": { const [x, y] = args(); return eq(x, y); }
    case "$gt": { const [x, y] = args(); return cmp(x, y) > 0; }
    default: return unsupported(`expression operator ${op}`);
  }
}

// ---- $group ---------------------------------------------------------------------------------------------------------
const ACC = new Set(["$sum", "$avg", "$min", "$max", "$first", "$last", "$push", "$addToSet"]);
function groupKey(idSpec, d) {
  if (idSpec === null || idSpec === undefined) return null;
  if (typeof idSpec === "string") return idSpec.startsWith("$") ? (get(d, idSpec.slice(1)) ?? null) : idSpec;
  if (typeof idSpec === "object" && !Array.isArray(idSpec) && !(idSpec instanceof Date)) return Object.fromEntries(Object.entries(idSpec).map(([k, v]) => [k, evalExpr(v, d) ?? null]));
  return unsupported("$group _id expression");
}
function runGroup(docs, spec) {
  if (!("_id" in spec)) unsupported("$group without _id");
  for (const [f, acc] of Object.entries(spec)) {
    if (f === "_id") continue;
    if (!acc || typeof acc !== "object" || Object.keys(acc).length !== 1) unsupported(`$group field ${f}`);
    const op = Object.keys(acc)[0]; if (!ACC.has(op)) unsupported(`$group accumulator ${op}`);
  }
  const groups = new Map();
  for (const d of docs) {
    const id = groupKey(spec._id, d); const sk = JSON.stringify(norm(id) ?? null) + (typeof norm(id) === "number" ? "#n" : "");
    let g = groups.get(sk); if (!g) { g = { id, st: {} }; groups.set(sk, g); }
    for (const [f, acc] of Object.entries(spec)) {
      if (f === "_id") continue;
      const op = Object.keys(acc)[0]; const v = evalExpr(acc[op], d); const s = (g.st[f] ||= { sum: 0, n: 0, v: undefined, has: false, arr: [] });
      if (op === "$sum") { const n = num(v); if (n !== null) s.sum += n; }
      else if (op === "$avg") { const n = num(v); if (n !== null) { s.sum += n; s.n++; } }
      else if (op === "$min") { if (!isNil(v) && (!s.has || cmp(v, s.v) < 0)) { s.v = v; s.has = true; } }
      else if (op === "$max") { if (!isNil(v) && (!s.has || cmp(v, s.v) > 0)) { s.v = v; s.has = true; } }
      else if (op === "$first") { if (!s.has) { s.v = v; s.has = true; } }
      else if (op === "$last") { s.v = v; s.has = true; }
      else if (op === "$push") s.arr.push(v);
      else if (op === "$addToSet") { if (!s.arr.some((x) => cmp(x, v) === 0 && typeof x === typeof v)) s.arr.push(v); }
    }
  }
  return [...groups.values()].map((g) => {
    const out = { _id: g.id };
    for (const [f, acc] of Object.entries(spec)) {
      if (f === "_id") continue; const op = Object.keys(acc)[0]; const s = g.st[f] || { sum: 0, n: 0, arr: [] };
      out[f] = op === "$sum" ? s.sum : op === "$avg" ? (s.n ? s.sum / s.n : null) : (op === "$push" || op === "$addToSet") ? s.arr : (s.v ?? null);
    }
    return out;
  });
}

// ---- pipeline -------------------------------------------------------------------------------------------------------
export function runPipeline(docs, pipeline) {
  if (!Array.isArray(pipeline)) unsupported("pipeline (not an array)");
  let rows = docs;
  for (const stage of pipeline) {
    const keys = Object.keys(stage || {}); if (keys.length !== 1) unsupported("stage shape");
    const [name] = keys; const spec = stage[name];
    switch (name) {
      case "$match": rows = rows.filter((d) => matches(d, spec)); break;
      case "$group": rows = runGroup(rows, spec); break;
      case "$sort": { const ks = Object.entries(spec); rows = [...rows].sort((a, b) => { for (const [k, dir] of ks) { const c = cmp(get(a, k), get(b, k)); if (c) return dir === -1 ? -c : c; } return 0; }); break; }
      case "$limit": rows = rows.slice(0, spec); break;
      case "$skip": rows = rows.slice(spec); break;
      case "$count": rows = rows.length ? [{ [spec]: rows.length }] : []; break;
      case "$facet": rows = [Object.fromEntries(Object.entries(spec).map(([k, p]) => [k, runPipeline(rows, p)]))]; break;
      case "$unwind": {
        const path = typeof spec === "string" ? spec : spec?.path; if (typeof path !== "string" || !path.startsWith("$")) unsupported("$unwind path");
        const keep = typeof spec === "object" && spec.preserveNullAndEmptyArrays; const p = path.slice(1);
        if (p.includes(".")) unsupported("$unwind of a nested path");
        rows = rows.flatMap((d) => { const a = d[p]; if (Array.isArray(a) && a.length) return a.map((x) => ({ ...d, [p]: x })); return keep ? [d] : []; });
        break;
      }
      case "$project": {
        const entries = Object.entries(spec); const inc = entries.some(([k, v]) => k !== "_id" && v !== 0 && v !== false);
        if (!inc) { rows = rows.map((d) => { const o = { ...d }; for (const [k] of entries) delete o[k]; return o; }); break; }
        rows = rows.map((d) => { const o = {}; if (spec._id !== 0 && spec._id !== false && "_id" in d) o._id = d._id; for (const [k, v] of entries) { if (k === "_id") continue; if (v === 1 || v === true) o[k] = get(d, k); else if (v !== 0 && v !== false) o[k] = evalExpr(v, d); } return o; });
        break;
      }
      default: unsupported(`stage ${name}`);
    }
  }
  return rows;
}
