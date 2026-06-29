import { Router } from "express";
import * as ledgerController from "../controllers/ledgerController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId, validate, validateQuery } from "../middleware/validate.js";
import { recordEntrySchema, ledgerQuerySchema, reverseEntrySchema, reconciliationQuerySchema } from "../validation/ledger.schema.js";

const router = Router();

router.get("/balance-sheet", protect, adminOnly, ledgerController.getBalanceSheet);
router.get("/trial-balance", protect, adminOnly, ledgerController.getTrialBalance);
router.get("/reconciliation", protect, adminOnly, validateQuery(reconciliationQuerySchema), ledgerController.getReconciliationReport);
router.get("/", protect, adminOnly, validateQuery(ledgerQuerySchema), ledgerController.listLedgerEntries);
router.post("/", protect, adminOnly, validate(recordEntrySchema), ledgerController.createLedgerEntry);
router.get("/seed", protect, adminOnly, ledgerController.seedAccounts);
router.get("/:id", protect, adminOnly, validateObjectId, ledgerController.getLedgerEntry);
router.post("/:id/reverse", protect, adminOnly, validateObjectId, validate(reverseEntrySchema), ledgerController.reverseLedgerEntry);

export default router;
