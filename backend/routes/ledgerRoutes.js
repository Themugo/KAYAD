import { Router } from "express";
import * as ledgerController from "../controllers/ledgerController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERM } from "../config/roles.js";
import { validateObjectId, validate, validateQuery } from "../middleware/validate.js";
import { recordEntrySchema, ledgerQuerySchema, reverseEntrySchema, reconciliationQuerySchema } from "../validation/ledger.schema.js";

// Ledger WRITES (manual entries, reversals, chart-of-accounts seeding) require the
// documented finance permission (MANAGE_FINANCE: accounts, admin, superadmin/owner,
// or an explicit per-user grant). adminOnly alone admitted every staff role,
// including ghost_checker, marketing and hr. Reads remain adminOnly pending the
// owner's read-access decision (see foundation report 2026-10-18).
const financeWrite = requirePermission(PERM.MANAGE_FINANCE);

const router = Router();

router.get("/balance-sheet", protect, adminOnly, ledgerController.getBalanceSheet);
router.get("/trial-balance", protect, adminOnly, ledgerController.getTrialBalance);
router.get("/reconciliation", protect, adminOnly, validateQuery(reconciliationQuerySchema), ledgerController.getReconciliationReport);
router.get("/", protect, adminOnly, validateQuery(ledgerQuerySchema), ledgerController.listLedgerEntries);
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
router.get("/:id", protect, adminOnly, validateObjectId, ledgerController.getLedgerEntry);
router.post("/:id/reverse", protect, adminOnly, financeWrite, validateObjectId, validate(reverseEntrySchema), ledgerController.reverseLedgerEntry);

export default router;
