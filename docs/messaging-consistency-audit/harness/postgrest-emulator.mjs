// TEST-ONLY PostgREST emulator over a real PostgreSQL connection.
//
// What this is: a small HTTP server that understands the subset of the PostgREST protocol that
// @supabase/supabase-js and KAYAD's db layer actually use (filters, ordering, paging, counts, single/maybeSingle,
// insert/upsert/update/delete, rpc). Every statement runs inside a transaction as the role named in the request's
// JWT (`SET LOCAL ROLE`), with `request.jwt.claims` set, so grants and RLS of the REAL migration-built schema apply.
//
// What this is NOT: PostgREST, Supabase, GoTrue, Realtime or Storage. Results from this harness are
// "local PostgreSQL + emulated REST layer" evidence and must never be reported as Supabase/staging evidence.
import http from "node:http";
import pg from "pg";

const { Pool } = pg;

export async function startEmulator({ database = "msg_chain", port = 0, user = "postgres", password, host = "/var/run/postgresql", log = false } = {}) {
  const pool = new Pool({ database, user, password, host, max: 40 });
  const typeCache = new Map(); // table -> Map(col -> format_type)
  const fnCache = new Map();
  const stats = { requests: 0, errors: [] };

  const colTypes = async (client, table) => {
    if (typeCache.has(table)) return typeCache.get(table);
    const r = await client.query(
      `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type
         FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1 AND a.attnum > 0 AND NOT a.attisdropped`, [table]);
    if (!r.rowCount) { const e = new Error(`relation "public.${table}" does not exist`); e.code = "42P01"; throw e; }
    const m = new Map(r.rows.map((x) => [x.name, x.type]));
    typeCache.set(table, m);
    return m;
  };
  const q = (id) => `"${String(id).replace(/"/g, '""')}"`;

  // ── filter parsing ────────────────────────────────────────────────────────────
  const splitTop = (s) => { // split on commas not inside () or quotes
    const out = []; let depth = 0, cur = "", inq = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') inq = !inq;
      if (!inq) { if (ch === "(" || ch === "{") depth++; if (ch === ")" || ch === "}") depth--; }
      if (ch === "," && depth === 0 && !inq) { out.push(cur); cur = ""; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  };
  const unq = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v);

  const cond = (col, op, val, types, params, neg = false) => {
    const t = types.get(col);
    if (!t) { const e = new Error(`column ${col} does not exist`); e.code = "42703"; throw e; }
    const c = q(col);
    const p = (v, cast = t) => { params.push(v); return `$${params.length}::text::${cast}`; };
    let sql;
    switch (op) {
      case "eq": sql = `${c} = ${p(val)}`; break;
      case "neq": sql = `${c} <> ${p(val)}`; break;
      case "gt": sql = `${c} > ${p(val)}`; break;
      case "gte": sql = `${c} >= ${p(val)}`; break;
      case "lt": sql = `${c} < ${p(val)}`; break;
      case "lte": sql = `${c} <= ${p(val)}`; break;
      case "like": sql = `${c}::text LIKE ${p(val.replace(/\*/g, "%"), "text")}`; break;
      case "ilike": sql = `${c}::text ILIKE ${p(val.replace(/\*/g, "%"), "text")}`; break;
      case "is": sql = val === "null" ? `${c} IS NULL` : val === "true" ? `${c} IS TRUE` : val === "false" ? `${c} IS FALSE` : `${c} IS UNKNOWN`; break;
      case "in": {
        const items = splitTop(val.replace(/^\(|\)$/g, "")).map((x) => unq(x.trim()));
        params.push(`{${items.map((x) => `"${x.replace(/(["\\])/g, "\\$1")}"`).join(",")}}`);
        sql = `${c} = ANY($${params.length}::text::${t.replace(/\[\]$/, "")}[])`; break;
      }
      case "cs": sql = `${c} @> ${p(t === "jsonb" || t === "json" ? val : val, t)}`; break;
      case "cd": sql = `${c} <@ ${p(val, t)}`; break;
      case "ov": sql = `${c} && ${p(val, t)}`; break;
      default: { const e = new Error(`unsupported operator ${op}`); e.code = "PGRST100"; throw e; }
    }
    return neg ? `NOT (${sql})` : sql;
  };
  const parseExpr = (expr, types, params) => { // inside of or=(...) / and=(...)
    const parts = splitTop(expr);
    return parts.map((part) => {
      const m = part.match(/^(and|or)\((.*)\)$/s);
      if (m) return `(${parseExpr(m[2], types, params).join(m[1] === "and" ? " AND " : " OR ")})`;
      const [col, op, ...rest] = part.split(".");
      if (op === "not") { const [op2, ...r2] = rest; return cond(col, op2, r2.join("."), types, params, true); }
      return cond(col, op, rest.join("."), types, params);
    });
  };
  const buildWhere = (searchParams, types, params) => {
    const where = [];
    for (const [k, v] of searchParams) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
      if (k === "or" || k === "and") { where.push(`(${parseExpr(v.replace(/^\(|\)$/g, ""), types, params).join(k === "or" ? " OR " : " AND ")})`); continue; }
      const [op, ...rest] = v.split(".");
      if (op === "not") { const [op2, ...r2] = rest; where.push(cond(k, op2, r2.join("."), types, params, true)); continue; }
      where.push(cond(k, op, rest.join("."), types, params));
    }
    return where.length ? ` WHERE ${where.join(" AND ")}` : "";
  };
  const buildSelect = (sel, types) => {
    if (!sel || sel === "*") return "*";
    const cols = splitTop(sel).map((s) => s.trim()).filter(Boolean);
    return cols.map((c) => {
      if (/[()]/.test(c)) { const e = new Error(`embedded resource select not supported by emulator: ${c}`); e.code = "PGRST200"; throw e; }
      const [name, alias] = c.split(":").reverse();
      const col = alias ? c.split(":")[1] : c;
      if (!types.has(col) && col !== "*") { const e = new Error(`column ${col} does not exist`); e.code = "42703"; throw e; }
      return col === "*" ? "*" : q(col);
    }).join(", ");
  };
  const buildOrder = (order) => !order ? "" : " ORDER BY " + order.split(",").map((p) => {
    const [c, ...mods] = p.split("."); return `${q(c)} ${mods.includes("desc") ? "DESC" : "ASC"}${mods.includes("nullsfirst") ? " NULLS FIRST" : mods.includes("nullslast") ? " NULLS LAST" : ""}`;
  }).join(", ");

  const errBody = (e) => {
    const code = e.code || "XX000";
    const status = code === "23505" ? 409 : code === "23503" ? 409 : code === "42501" ? 403 : code === "42P01" ? 404 : code === "PGRST116" ? 406 : code.startsWith("22") || code.startsWith("23") || code === "P0001" || code === "42703" || code.startsWith("PGRST") ? 400 : 500;
    return { status, body: { code, message: e.message, details: e.detail || null, hint: e.hint || null } };
  };

  const server = http.createServer(async (req, res) => {
    stats.requests++;
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const url = new URL(req.url, "http://emu");
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    const client = await pool.connect();
    try {
      const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([A-Za-z0-9_]+)$/);
      if (!m) return send(404, { code: "PGRST125", message: "Invalid path" });
      let role = "service_role", claims = { role: "service_role" };
      const auth = req.headers.authorization || ""; const apikey = req.headers.apikey || "";
      const tok = auth.startsWith("Bearer ") ? auth.slice(7) : apikey;
      if (tok.split(".").length === 3) { try { claims = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()); role = claims.role || "anon"; } catch { /* default */ } }
      if (!["anon", "authenticated", "service_role"].includes(role)) return send(401, { code: "PGRST301", message: "JWT role not allowed" });
      const prefer = String(req.headers.prefer || "");
      const wantRep = /return=representation/.test(prefer);
      const wantCount = /count=(exact|planned|estimated)/.test(prefer);
      const single = /vnd\.pgrst\.object\+json/.test(String(req.headers.accept || ""));
      await client.query("BEGIN");
      await client.query(`SET LOCAL ROLE ${q(role)}`);
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      let status = 200, payload, headers = {};
      try {
        if (m[1]) { // ── RPC
          const fn = m[2];
          let meta = fnCache.get(fn);
          if (!meta) {
            const r = await client.query(`SELECT p.proargnames AS names, p.proargtypes::oid[] AS oids, p.proretset AS retset, format_type(p.prorettype, null) AS rettype,
                (SELECT array_agg(format_type(o, null)) FROM unnest(p.proargtypes::oid[]) o) AS types
              FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname=$1 LIMIT 1`, [fn]);
            if (!r.rowCount) { const e = new Error(`Could not find the function public.${fn} in the schema cache`); e.code = "PGRST202"; throw e; }
            meta = r.rows[0]; fnCache.set(fn, meta);
          }
          const args = raw ? JSON.parse(raw) : {}; const params = []; const named = [];
          for (const [k, v] of Object.entries(args)) {
            const idx = (meta.names || []).indexOf(k); const t = idx >= 0 ? meta.types[idx] : "text";
            params.push(v === null || v === undefined ? null : (typeof v === "object" ? JSON.stringify(v) : String(v)));
            named.push(`${q(k)} => $${params.length}::text::${t}`);
          }
          const call = `public.${q(fn)}(${named.join(", ")})`;
          if (meta.retset) { const r = await client.query(`SELECT coalesce(json_agg(t), '[]'::json) AS j FROM ${call} t`, params); payload = r.rows[0].j; }
          else if (meta.rettype === "void") { await client.query(`SELECT ${call}`, params); status = 204; payload = undefined; }
          else { const r = await client.query(`SELECT to_json(${call}) AS j`, params); payload = r.rows[0].j; }
        } else { // ── table
          const table = m[2]; const types = await colTypes(client, table); const params = [];
          if (req.method === "GET" || req.method === "HEAD") {
            const where = buildWhere(url.searchParams, types, params);
            const sel = buildSelect(url.searchParams.get("select"), types);
            const order = buildOrder(url.searchParams.get("order"));
            const limit = url.searchParams.get("limit") ? ` LIMIT ${Number(url.searchParams.get("limit"))}` : "";
            const offset = url.searchParams.get("offset") ? ` OFFSET ${Number(url.searchParams.get("offset"))}` : "";
            let total = null;
            if (wantCount || req.method === "HEAD") { const c = await client.query(`SELECT count(*)::int AS n FROM ${q(table)}${where}`, params); total = c.rows[0].n; }
            if (req.method === "HEAD") { payload = undefined; }
            else {
              const r = await client.query(`SELECT coalesce(json_agg(t), '[]'::json) AS j FROM (SELECT ${sel} FROM ${q(table)}${where}${order}${limit}${offset}) t`, params);
              payload = r.rows[0].j;
            }
            const n = Array.isArray(payload) ? payload.length : 0; const start = Number(url.searchParams.get("offset") || 0);
            headers["content-range"] = `${n ? `${start}-${start + n - 1}` : "*"}/${total ?? "*"}`;
          } else if (req.method === "POST") {
            const body = JSON.parse(raw || "{}"); const rows = Array.isArray(body) ? body : [body];
            const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
            for (const c of cols) if (!types.has(c)) { const e = new Error(`Could not find the '${c}' column of '${table}' in the schema cache`); e.code = "PGRST204"; throw e; }
            const upsert = /resolution=(merge|ignore)-duplicates/.test(prefer); const onConflict = url.searchParams.get("on_conflict");
            let sql = `INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) SELECT ${cols.map(q).join(", ")} FROM json_populate_recordset(null::public.${q(table)}, $1::json)`;
            if (upsert) {
              const target = onConflict ? `(${onConflict.split(",").map((c) => q(c)).join(", ")})` : "";
              sql += /merge/.test(prefer) ? ` ON CONFLICT ${target} DO UPDATE SET ${cols.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(", ")}` : ` ON CONFLICT ${target} DO NOTHING`;
            }
            sql += " RETURNING *";
            const r = await client.query(`WITH ins AS (${sql}) SELECT coalesce(json_agg(ins), '[]'::json) AS j FROM ins`, [JSON.stringify(rows)]);
            status = 201; payload = wantRep ? r.rows[0].j : undefined;
          } else if (req.method === "PATCH") {
            const body = JSON.parse(raw || "{}"); const cols = Object.keys(body);
            for (const c of cols) if (!types.has(c)) { const e = new Error(`Could not find the '${c}' column of '${table}' in the schema cache`); e.code = "PGRST204"; throw e; }
            params.push(JSON.stringify(body));
            const sets = cols.map((c) => `${q(c)} = (json_populate_record(null::public.${q(table)}, $1::json)).${q(c)}`).join(", ");
            const where = buildWhere(url.searchParams, types, params);
            const r = await client.query(`WITH upd AS (UPDATE ${q(table)} SET ${sets}${where} RETURNING *) SELECT coalesce(json_agg(upd), '[]'::json) AS j FROM upd`, params);
            status = wantRep ? 200 : 204; payload = wantRep ? r.rows[0].j : undefined;
          } else if (req.method === "DELETE") {
            const where = buildWhere(url.searchParams, types, params);
            const r = await client.query(`WITH del AS (DELETE FROM ${q(table)}${where} RETURNING *) SELECT coalesce(json_agg(del), '[]'::json) AS j FROM del`, params);
            status = wantRep ? 200 : 204; payload = wantRep ? r.rows[0].j : undefined;
          } else { status = 405; payload = { code: "PGRST117", message: "Unsupported HTTP method" }; }
          if (single && Array.isArray(payload)) {
            if (payload.length !== 1) { const e = new Error("JSON object requested, multiple (or no) rows returned"); e.code = "PGRST116"; e.detail = `The result contains ${payload.length} rows`; throw e; }
            payload = payload[0];
          }
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      }
      send(status, payload, headers);
    } catch (e) {
      const { status, body } = errBody(e);
      stats.errors.push({ path: url.pathname + url.search, code: body.code, message: body.message });
      if (log) console.error("[emu] error", body.code, body.message, url.pathname + url.search);
      send(status, body);
    } finally { client.release(); }
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, port: server.address().port, pool, stats, close: async () => { await new Promise((r) => server.close(r)); await pool.end(); } };
}
