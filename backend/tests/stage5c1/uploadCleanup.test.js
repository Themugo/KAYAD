// STAGE 5C.1 — multer disk files must not be left behind when an upload request is rejected or fails (defect D5C1-02).
import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
const { cleanupUploadsOnError } = await import("../../middleware/upload.js");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "kayad-up-"));
const mkFile = (dir, n) => { const p = path.join(dir, n); fs.writeFileSync(p, "x"); return { path: p, filename: n }; };
const run = (req, status) => { const res = new EventEmitter(); res.statusCode = status; res.once = res.once.bind(res); let nexted = false; cleanupUploadsOnError(req, res, () => { nexted = true; }); res.emit("finish"); return nexted; };
const gone = async (p) => { for (let i = 0; i < 20; i++) { if (!fs.existsSync(p)) return true; await new Promise((r) => setTimeout(r, 25)); } return false; };
describe("cleanupUploadsOnError", () => {
  test("calls next and removes every req.files entry when the response is an error (>=400)", async () => {
    const d = tmp(); const f = [mkFile(d, "a.png"), mkFile(d, "b.png")];
    expect(run({ files: f }, 422)).toBe(true);
    expect(await gone(f[0].path)).toBe(true); expect(await gone(f[1].path)).toBe(true);
  });
  test("removes req.file and object-style req.files (fields) on a 500", async () => {
    const d = tmp(); const a = mkFile(d, "c.png"), b = mkFile(d, "d.png");
    run({ file: a, files: { images: [b] } }, 500);
    expect(await gone(a.path)).toBe(true); expect(await gone(b.path)).toBe(true);
  });
  test("keeps files when the request succeeded (<400) — they are still needed by the background provider upload", async () => {
    const d = tmp(); const f = mkFile(d, "e.png");
    run({ files: [f] }, 201);
    await new Promise((r) => setTimeout(r, 150)); expect(fs.existsSync(f.path)).toBe(true);
  });
  test("is a no-op for requests without files", () => { expect(run({}, 400)).toBe(true); });
});
