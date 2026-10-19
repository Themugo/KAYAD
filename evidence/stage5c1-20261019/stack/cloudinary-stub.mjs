/* eslint-disable no-undef -- LOCAL TEST HARNESS ONLY: provider STUB (not live Cloudinary). Answers like Cloudinary's upload/destroy API, records what it received, and can inject failures. */
import http from "node:http"; import crypto from "node:crypto"; import fs from "node:fs";
const LOG = "/home/claude/s5c/stack/cloudinary-stub.jsonl", FAIL = "/home/claude/s5c/stack/cloudinary.fail";
const field = (txt, name) => { const m = new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(txt); return m ? m[1] : null; };
http.createServer((req, res) => {
  const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => {
    const body = Buffer.concat(chunks); const txt = body.toString("latin1");
    const id = `kayad-stub/${crypto.randomBytes(6).toString("hex")}`;
    const injected = fs.existsSync(FAIL);
    const fileStart = txt.indexOf('name="file"'); 
    fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), method: req.method, url: req.url, bytes: body.length, bodySha256: crypto.createHash("sha256").update(body).digest("hex"),
      hasFilePart: fileStart >= 0, deliveryType: field(txt, "type"), folder: field(txt, "folder"), injectedFailure: injected }) + "\n");
    res.setHeader("content-type", "application/json");
    if (injected) { res.statusCode = 500; return res.end(JSON.stringify({ error: { message: "stub injected storage failure" } })); }
    if (/destroy/.test(req.url)) return res.end(JSON.stringify({ result: "ok" }));
    const dtype = field(txt, "type") || "upload";
    res.end(JSON.stringify({ public_id: id, version: 1, signature: "stub", width: 1, height: 1, format: "webp", resource_type: "image", created_at: new Date().toISOString(), bytes: body.length, type: dtype, url: `http://127.0.0.1:9099/${id}.webp`, secure_url: `http://127.0.0.1:9099/${id}.webp` }));
  });
}).listen(9099, "127.0.0.1");
