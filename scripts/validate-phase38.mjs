import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(!exists("backend/utils/supabaseSession.js"), "No-op Supabase transaction session shim must be retired");
assert(!read("backend/models/_base.js").includes("session(_session)"), "Model query adapter must not expose fake .session()");
assert(!read("backend/models/_base.js").includes('EscrowVault: "escrow_vaults"'), "EscrowVault model mapping must be retired");
assert(!exists("backend/controllers/escrowVaultController.js"), "Legacy EscrowVault controller must be removed");
assert(!exists("backend/routes/escrowVaultRoutes.js"), "Legacy EscrowVault routes must be removed");
assert(!exists("backend/models/EscrowVault.js"), "Legacy EscrowVault model must be removed");
assert(!read("backend/server.js").includes("escrowVaultRoutes"), "Server must not mount legacy escrow-vault routes");
assert(!read("backend/routes/v1.js").includes("escrowVaultRoutes"), "v1 must not mount legacy escrow-vault routes");
assert(!read("backend/services/reconciliationService.js").includes('"escrow_vaults"'), "Reconciliation must not query retired escrow_vaults");
assert(!read("backend/controllers/reconciliationController.js").includes("compareVaultBalances"), "Reconciliation controller must not expose vault balance comparison");
assert(read("backend/controllers/bidController.js").includes("atomicPlaceBid"), "Bid placement must retain canonical atomic RPC");
assert(read("backend/controllers/bidController.js").includes("acquireLock"), "Bid placement must retain distributed lock");

const scanDirs = ["backend/controllers", "backend/routes", "backend/services", "backend/models", "src/api", "src/services"];
for (const dir of scanDirs) {
  const abs = path.join(root, dir);
  for (const name of fs.readdirSync(abs)) {
    if (!/\.(js|ts|tsx|jsx)$/.test(name)) continue;
    const file = path.join(abs, name);
    const text = fs.readFileSync(file, "utf8");
    if (/escrowVault|EscrowVault|escrow_vaults|escrow-vault/.test(text)) failures.push(`Legacy escrow-vault reference remains: ${path.relative(root, file)}`);
  }
}

if (failures.length) {
  console.error("PHASE 38 TRANSACTION BOUNDARY VALIDATION: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("PHASE 38 TRANSACTION BOUNDARY VALIDATION: PASS");
console.log("No-op transaction session shim: RETIRED");
console.log("Legacy escrow_vaults runtime dependency: RETIRED");
console.log("Canonical escrow source: public.escrows");
console.log("Canonical bid atomicity: PostgreSQL RPC + distributed lock");
