import { Router } from "express";
import * as ledgerController from "../controllers/ledgerController.js";
import { adminAuth, auth } from "../middleware/auth.js";
import { validateObjectId, validate, validateQuery } from "../middleware/validate.js";
import { recordEntrySchema, ledgerQuerySchema, reverseEntrySchema, reconciliationQuerySchema } from "../validation/ledger.schema.js";

const router = Router();

router.get("/balance-sheet", auth, adminAuth, ledgerController.getBalanceSheet);
router.get("/trial-balance", auth, adminAuth, ledgerController.getTrialBalance);
router.get("/reconciliation", auth, adminAuth, validateQuery(reconciliationQuerySchema), ledgerController.getReconciliationReport);
router.get("/", auth, adminAuth, validateQuery(ledgerQuerySchema), ledgerController.listLedgerEntries);
router.post("/", auth, adminAuth, validate(recordEntrySchema), ledgerController.createLedgerEntry);
router.get("/seed", auth, adminAuth, ledgerController.seedAccounts);
router.get("/:id", auth, adminAuth, validateObjectId, ledgerController.getLedgerEntry);
router.post("/:id/reverse", auth, adminAuth, validateObjectId, validate(reverseEntrySchema), ledgerController.reverseLedgerEntry);

export default router;
