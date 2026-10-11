// Runs the foundation's own opt-in database test (backend/tests/integration/chat-message-integrity.integration.test.js),
// which is SKIPPED in the normal suites for lack of a database, against the local PostgreSQL via the emulator.
// Evidence level: local PostgreSQL + emulated REST, not Supabase.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { startStack, BACKEND } from "../lib/stack.mjs";

let s;
before(async () => { s = await startStack({ withServer: false }); });
after(async () => { await s.stop(); });

test("foundation chat-message-integrity test executes (not skipped) and passes", async () => {
  const a = await s.makeUser("Integrity A"), b = await s.makeUser("Integrity B"), chat = await s.newChat(a, b);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; // otherwise the child node:test runner refuses to run (nested)
  // Async spawn: the emulator lives in THIS process, so a blocking spawnSync would deadlock it.
  const r = await new Promise((resolve) => {
    const c = spawn("node", ["--test", "tests/integration/chat-message-integrity.integration.test.js"], {
      cwd: BACKEND,
      env: { ...env, SUPABASE_URL: s.emu.url, SUPABASE_SERVICE_ROLE_KEY: s.jwt.sign({ role: "service_role" }, "x"), KAYAD_CHAT_TEST_CHAT_ID: chat, KAYAD_CHAT_TEST_USER_A_ID: a.id, KAYAD_CHAT_TEST_USER_B_ID: b.id },
    });
    let stdout = "", stderr = ""; c.stdout.on("data", (d) => (stdout += d)); c.stderr.on("data", (d) => (stderr += d));
    c.on("close", (status) => resolve({ status, stdout, stderr }));
  });
  const out = r.stdout + r.stderr; console.log(out.split("\n").filter((l) => /^# (tests|pass|fail|skipped)/.test(l)).join(" | "));
  assert.equal(r.status, 0, out.slice(-1500));
  assert.match(out, /# skipped 0/); assert.match(out, /# pass 1/);
});
