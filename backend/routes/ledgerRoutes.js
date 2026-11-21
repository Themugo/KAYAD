import { Router } from "express";
import * as ledgerController from "../controllers/ledgerController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { requireAnyPermission } from "../middleware/rbac.js";
import { STAFF_ACCESS_POLICY } from "../config/staffAccessPolicy.js";
import { validateObjectId, validate, validateQuery } from "../middleware/validate.js";
import { recordEntrySchema, ledgerQuerySchema, reverseEntrySchema, reconciliationQuerySchema } from "../validation/ledger.schema.js";

// PHASE 16: ledger READS and WRITES both require the finance permission (MANAGE_FINANCE: accounts, admin, superadmin/owner, or an explicit
// per-user grant). Until Phase 15 reads were open to every staff role (ghost_checker, marketing, hr ...). Policy: config/staffAccessPolicy.js.
const financeWrite = requireAnyPermission(...STAFF_ACCESS_POLICY["ledger.write"]);
const financeRead = requireAnyPermission(...STAFF_ACCESS_POLICY["ledger.read"]);

const router = Router();

router.get("/balance-sheet", protect, adminOnly, financeRead, ledgerController.getBalanceSheet);
router.get("/trial-balance", protect, adminOnly, financeRead, ledgerController.getTrialBalance);
router.get("/reconciliation", protect, adminOnly, financeRead, validateQuery(reconciliationQuerySchema), ledgerController.getReconciliationReport);
router.get("/", protect, adminOnly, financeRead, validateQuery(ledgerQuerySchema), ledgerController.listLedgerEntries);
router.post("/", protect, adminOnly, financeWrite, validate(recordEntrySchema), ledgerController.createLedgerEntry);
// STAGE 4A (G6): seeding writes the chart of accounts, so it must not be reachable by GET
// (prefetch, link scanners and crawlers issue GETs; GET must be safe/idempotent-free of side effects).
// POST is the mutation (idempotent upsert by account code). GET /seed is retained only to answer 405
// with guidance for any old caller; it never reaches the service. No in-repo consumer used GET.
router.post("/seed", protect, adminOnly, financeWrite, ledgerController.seedAccounts);
router.get("/seed", protect, adminOnly, (req, res) => {
  res.set("Allow", "POST");
  return res.status(405).json({ success: false, code: "METHOD_NOT_ALLOWED", message: "Use POST /api/ledger/seed. GET never changes ledger state." });
});
router.get("/:id", protect, adminOnly, financeRead, validateObjectId, ledgerController.getLedgerEntry);
router.post("/:id/reverse", protect, adminOnly, financeWrite, validateObjectId, validate(reverseEntrySchema), ledgerController.reverseLedgerEntry);

export default router;
