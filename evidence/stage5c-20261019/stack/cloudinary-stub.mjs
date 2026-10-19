/* eslint-disable no-undef -- LOCAL TEST HARNESS ONLY: provider STUB (not live Cloudinary). Answers like Cloudinary's upload/destroy API. */
import http from "node:http"; import crypto from "node:crypto"; import fs from "node:fs";
const LOG = "/home/claude/s5c/stack/cloudinary-stub.jsonl";
http.createServer((req, res) => {
  const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => {
    const body = Buffer.concat(chunks); const id = `kayad-stub/${crypto.randomBytes(6).toString("hex")}`;
    fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), method: req.method, url: req.url, bytes: body.length }) + "\n");
    res.setHeader("content-type", "application/json");
    if (/destroy/.test(req.url)) return res.end(JSON.stringify({ result: "ok" }));
    res.end(JSON.stringify({ public_id: id, version: 1, signature: "stub", width: 1, height: 1, format: "webp", resource_type: "image", created_at: new Date().toISOString(), bytes: body.length, type: "upload", url: `http://127.0.0.1:9099/${id}.webp`, secure_url: `http://127.0.0.1:9099/${id}.webp` }));
  });
}).listen(9099, "127.0.0.1");
