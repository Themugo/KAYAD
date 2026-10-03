// Minimal schema-validating PostgREST stand-in used by registration e2e tests.
// It parses the real Supabase migrations so a code/schema mismatch (unknown
// column, NOT NULL without default, CHECK, unique) fails exactly like production.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.resolve(here, "../../../supabase/migrations");

export const parseSchema = () => {
  const sql = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n");
  const tables = {};
  const createRe = /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\);/gi;
  let m;
  while ((m = createRe.exec(sql))) {
    const cols = (tables[m[1]] ||= {});
    for (const line of m[2].split("\n")) {
      const c = /^ {2}"?([A-Za-z_]\w*)"?\s+([A-Za-z][\w\[\]\(\), ]*?)(?:\s+(.*))?$/.exec(line);
      if (!c || /^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)$/i.test(c[1])) continue;
      const rest = c[3] || "";
      cols[c[1]] = { notNull: /NOT NULL|PRIMARY KEY/i.test(rest), hasDefault: /DEFAULT/i.test(rest) };
    }
  }
  const alterRe = /ALTER TABLE(?: IF EXISTS)?\s+(?:public\.)?"?(\w+)"?\s+([\s\S]*?);/gi;
  while ((m = alterRe.exec(sql))) {
    const t = (tables[m[1]] ||= {});
    const addRe = /ADD COLUMN(?: IF NOT EXISTS)?\s+"?(\w+)"?\s+([^,;]*)/gi;
    let a;
    while ((a = addRe.exec(m[2]))) {
      t[a[1]] = { notNull: /NOT NULL/i.test(a[2]), hasDefault: /DEFAULT/i.test(a[2]) };
    }
  }
  const functions = new Set();
  const fnRe = /CREATE(?: OR REPLACE)? FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
  while ((m = fnRe.exec(sql))) functions.add(m[1]);
  Object.defineProperty(tables, "__functions", { value: functions, enumerable: false });
  return tables;
};

const USER_ROLES = ["user","individual_seller","dealer","broker","ghost_checker","moderator","ad_manager","marketing","escrow_officer","technical_support","hr","accounts","admin","superadmin"];
const USER_STATUS = ["pending","approved","suspended","rejected"];

export const startFakePostgrest = async (options = {}) => {
  const schema = parseSchema();
  const db = {};
  const log = [];
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  const err = (res, status, code, message) => send(res, status, { code, message, details: null, hint: null });

  const matches = (row, params) => {
    for (const [k, v] of params) {
      if (["select", "limit", "offset", "order", "columns"].includes(k)) continue;
      const mm = /^(eq|neq|is|in)\.(.*)$/.exec(v);
      if (!mm) continue;
      const [, op, val] = mm;
      const cur = row[k];
      if (op === "eq" && String(cur) !== val) return false;
      if (op === "neq" && String(cur) === val) return false;
      if (op === "is" && !(val === "null" ? cur == null : String(cur) === val)) return false;
    }
    return true;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const rpc = /^\/rest\/v1\/rpc\/(\w+)$/.exec(url.pathname);
    const m = /^\/rest\/v1\/(\w+)$/.exec(url.pathname);
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (rpc) {
        const fn = rpc[1];
        const args = raw ? JSON.parse(raw) : {};
        log.push({ method: "RPC", fn, args: { ...args, p_password_hash: args.p_password_hash ? "<hash>" : undefined } });
        if (!schema.__functions.has(fn) || options.missingFunctions?.includes(fn)) {
          return err(res, 404, "PGRST202", `Could not find the function public.${fn} in the schema cache`);
        }
        if (fn === "kayad_register_identity_atomic") {
          const users = (db.users ||= []);
          const auth = (db.user_auth ||= []);
          if (!["user", "individual_seller", "dealer"].includes(args.p_role)) return err(res, 400, "22023", "Invalid self-registration role");
          const email = String(args.p_email || "").trim().toLowerCase();
          if (users.some((u) => u.email === email)) return err(res, 409, "23505", 'duplicate key value violates unique constraint "users_email_key"');
          const sellerish = ["dealer", "individual_seller"].includes(args.p_role);
          const row = {
            id: crypto.randomUUID(), name: args.p_name, email, role: args.p_role,
            phone: String(args.p_phone || "").trim() || null,
            status: args.p_role === "user" ? "approved" : "pending", email_verified: false,
            business_name: sellerish ? args.p_business_name || null : null,
            location: sellerish ? args.p_location || null : null,
            referred_by: args.p_referred_by || null, created_at: new Date().toISOString(),
          };
          users.push(row);
          auth.push({ id: crypto.randomUUID(), user_id: row.id, password: args.p_password_hash, token_version: 0,
            email_verify_token: args.p_email_verify_token, email_verify_expire: args.p_email_verify_expire });
          if (args.p_role === "dealer") (db.dealers ||= []).push({ user: row.id, business_name: row.business_name, location: row.location, approved: false });
          return send(res, 200, row);
        }
        return err(res, 501, "PGRST", `fake rpc ${fn} not implemented`);
      }
      if (!m) return err(res, 404, "PGRST125", "Invalid path");
      const table = m[1];
      const cols = schema[table];
      log.push({ method: req.method, table, query: url.search, body: raw ? JSON.parse(raw) : undefined });
      if (!cols) return err(res, 404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`);
      const rows = (db[table] ||= []);
      const wantRep = /return=representation/.test(req.headers.prefer || "");
      const single = /vnd\.pgrst\.object/.test(req.headers.accept || "");
      const respond = (data, status = 200) => {
        if (single) {
          if (data.length !== 1) return err(res, 406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
          return send(res, status, data[0]);
        }
        return send(res, status, data);
      };

      if (req.method === "GET" || req.method === "HEAD") {
        const out = rows.filter((r) => matches(r, url.searchParams));
        for (const [k] of url.searchParams) {
          if (!["select", "limit", "offset", "order"].includes(k) && !(k in cols)) {
            return err(res, 400, "42703", `column ${table}.${k} does not exist`);
          }
        }
        const lim = Number(url.searchParams.get("limit") || out.length);
        return respond(out.slice(0, lim));
      }

      if (req.method === "POST") {
        const body = JSON.parse(raw || "{}");
        const list = Array.isArray(body) ? body : [body];
        const created = [];
        for (const item of list) {
          for (const k of Object.keys(item)) {
            if (!(k in cols)) {
              return err(res, 400, "PGRST204", `Could not find the '${k}' column of '${table}' in the schema cache`);
            }
          }
          for (const [c, meta] of Object.entries(cols)) {
            if (meta.notNull && !meta.hasDefault && (item[c] === undefined || item[c] === null)) {
              return err(res, 400, "23502", `null value in column "${c}" of relation "${table}" violates not-null constraint`);
            }
          }
          if (table === "users") {
            if (item.role !== undefined && !USER_ROLES.includes(item.role)) return err(res, 400, "23514", "users_role_check violated");
            if (item.status !== undefined && !USER_STATUS.includes(item.status)) return err(res, 400, "23514", "users_status_check violated");
            if (rows.some((r) => r.email === item.email)) return err(res, 409, "23505", "duplicate key value violates unique constraint \"users_email_key\"");
          }
          if (table === "user_auth" && rows.some((r) => r.user_id === item.user_id)) {
            return err(res, 409, "23505", "duplicate key value violates unique constraint \"user_auth_user_id_key\"");
          }
          if (table === "user_auth" && !(db.users || []).some((u) => u.id === item.user_id)) {
            return err(res, 409, "23503", "user_auth_user_id_fkey violated");
          }
          const row = { ...item };
          if ("id" in cols && !row.id) row.id = crypto.randomUUID();
          for (const [c, meta] of Object.entries(cols)) if (row[c] === undefined) row[c] = null;
          rows.push(row);
          created.push(row);
        }
        return wantRep ? respond(created, 201) : send(res, 201, undefined);
      }

      if (req.method === "PATCH" || req.method === "DELETE") {
        const targets = rows.filter((r) => matches(r, url.searchParams));
        if (req.method === "PATCH") {
          const body = JSON.parse(raw || "{}");
          for (const k of Object.keys(body)) {
            if (!(k in cols)) return err(res, 400, "PGRST204", `Could not find the '${k}' column of '${table}' in the schema cache`);
          }
          targets.forEach((t) => Object.assign(t, body));
        } else {
          db[table] = rows.filter((r) => !targets.includes(r));
        }
        return wantRep ? respond(targets) : send(res, 204);
      }
      return err(res, 405, "PGRST", "method not allowed");
    });
  });

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    db,
    log,
    schema,
    close: () => new Promise((r) => server.close(r)),
  };
};
