import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const routes = read("backend/routes/disputeRoutes.js");
const controller = read("backend/controllers/escrowController.js");
const service = read("backend/services/escrow.service.js");
const server = read("backend/server.js");

check("generic dispute API stays mounted truthfully", server.includes('app.use("/api/disputes"'));
check("generic dispute API explicitly returns 501", routes.includes("res.status(501)"));
check("generic dispute API has stable unsupported code", routes.includes("GENERIC_DISPUTES_UNAVAILABLE"));
check("generic dispute API does not import legacy dispute controller", !routes.includes("disputeController"));
check("generic dispute API points users to supported escrow workflow", routes.includes("/api/escrow/:id/dispute"));

check("seller escrow disputes preserve seller role", controller.includes('String(escrow.seller) === userId ? "seller" : "buyer"'));
check("escrow dispute controller forwards idempotency key", controller.includes("idempotencyKey: req.idempotencyKey"));
check("escrow dispute service accepts idempotency key", /disputeEscrow\s*=\s*async[\s\S]*?\{\s*idempotencyKey\s*\}\s*=\s*\{\}/.test(service));
check("escrow dispute atomic transition receives idempotency key", /nextStatus:\s*STATES\.DISPUTED[\s\S]*?idempotencyKey/.test(service));

const migrationsDir = path.join(root, "supabase/migrations");
const migrationText = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.sql"))
  .map((f) => read(path.join("supabase/migrations", f)))
  .join("\n");

check("canonical schema does not invent generic disputes table", !/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?[\"']?disputes[\"']?\s*\(/i.test(migrationText));
check("canonical schema does not invent generic evidence table", !/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?[\"']?evidence[\"']?\s*\(/i.test(migrationText));
check("inspection disputes remain a distinct persisted contract", /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+inspection_disputes\s*\(/i.test(migrationText));

for (const { label, ok } of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nPhase 13 dispute/refund truthfulness checks: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
