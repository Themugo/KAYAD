// M12 — legacy chat-attachment inventory CLI, run as a real child process through supabase-js against the PostgREST emulator
// on a migration replay seeded with legacy (pre-fix) messages. Proves: read-only (row checksums unchanged), shared vehicle
// assets excluded, no message text in the manifest. Cloudinary is NOT contacted (inventory mode makes no Cloudinary call).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile); // async: the emulator runs in THIS process and must keep serving
import { createRequire } from "node:module";
import { startEmulator } from "../postgrest-emulator.mjs";
import { BACKEND, uuid } from "../lib/stack.mjs";

const require = createRequire(BACKEND + "/package.json");
const jwt = require("jsonwebtoken");
let emu, q, out, chatId;
const pub = (id) => `https://res.cloudinary.com/demo/image/upload/v1700000000/${id}.png`;
const tag = uuid().slice(0, 8);

before(async () => {
  emu = await startEmulator({ database: process.env.KAYAD_TEST_DB || "msg_chain" });
  q = async (s, p = []) => (await emu.pool.query(s, p)).rows;
  const a = uuid(), b = uuid();
  for (const [id, n] of [[a, "inv-a"], [b, "inv-b"]]) await q("insert into users (id,name,email,role,status) values ($1,$2,$3,'user','approved')", [id, n, `${n}.${id.slice(0, 6)}@example.test`]);
  await q("insert into cars (title,brand,model,year,price,images,dealer_id) values ('Car','Toyota','Prado',2020,1,$1::jsonb,$2)", [JSON.stringify([pub(`kayad/chat/shared-${tag}`)]), b]);
  chatId = (await q("insert into chats (participants, messages) values ($1::uuid[], $2::jsonb) returning id", [[a, b].sort(), JSON.stringify([
    { id: uuid(), sender: a, text: `CONFIDENTIAL-${tag}`, createdAt: new Date().toISOString(), seenBy: [], attachments: [{ url: pub(`kayad/chat/legacy-${tag}`), type: "image" }, { url: pub(`kayad/chat/shared-${tag}`) }, "http://insecure.example/x.png"] },
    { id: uuid(), sender: b, text: "ok", createdAt: new Date().toISOString(), seenBy: [], attachments: [{ uploadId: uuid(), type: "image" }] },
  ])]))[0].id;
  out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "inv-")), "inv.json");
});
after(async () => { await emu.close(); });

test("inventory is read-only, classifies legacy entries, excludes shared vehicle assets and never copies message text", async () => {
  const sum = async () => (await q("select md5(string_agg(t::text, '|' order by t::text)) h from (select id, messages from chats union all select id, images from cars) t"))[0].h;
  const before = await sum();
  const { stdout } = await execFileP(process.execPath, [path.join(BACKEND, "scripts/chat-attachment-inventory.mjs"), `--out=${out}`], {
    env: { ...process.env, SUPABASE_URL: emu.url, SUPABASE_SERVICE_ROLE_KEY: jwt.sign({ role: "service_role" }, "x"), CLOUDINARY_API_SECRET: "" }, encoding: "utf8" });
  assert.match(stdout, /migrationCandidates/);
  assert.equal(await sum(), before, "no database row changed");
  const m = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(m.mode, "inventory-read-only");
  assert.ok(m.candidates.some((c) => c.publicId === `kayad/chat/legacy-${tag}`), "legacy public chat asset is a candidate");
  assert.ok(m.excluded.some((c) => c.publicId === `kayad/chat/shared-${tag}` && c.reason === "shared_with_vehicle_listing"), "shared asset excluded");
  assert.ok((m.counts.legacy_unsafe || 0) >= 1 && (m.counts.reference || 0) >= 1);
  assert.ok(!fs.readFileSync(out, "utf8").includes(`CONFIDENTIAL-${tag}`), "no message text in the manifest");
  assert.ok(!fs.readFileSync(out, "utf8").includes(chatId), "no chat ids in the manifest (counts only)");
});

test("the migration script refuses to act without a reviewed manifest, refuses non-chat ids, and needs --confirm for --apply", async () => {
  const script = path.join(BACKEND, "scripts/migrate-chat-attachments-private.mjs");
  const run = async (args) => { try { await execFileP(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "1", CLOUDINARY_API_SECRET: "x" } }); return { code: 0, err: "" }; } catch (e) { return { code: e.code, err: String(e.stderr) }; } };
  assert.match((await run([])).err, /--manifest/);
  const bad = path.join(path.dirname(out), "bad.json");
  fs.writeFileSync(bad, JSON.stringify({ mode: "inventory-read-only", candidates: [{ publicId: "kayad/cars/car1" }] }));
  assert.match((await run([`--manifest=${bad}`])).err, /non-chat/);
  const notInv = path.join(path.dirname(out), "notinv.json");
  fs.writeFileSync(notInv, JSON.stringify({ candidates: [] }));
  assert.match((await run([`--manifest=${notInv}`])).err, /not an inventory manifest/);
});
