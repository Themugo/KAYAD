// backend/routes/disputeRoutes.js
// ─────────────────────────────────────────────────────────────
// Generic dispute-case management is intentionally unavailable.
//
// The canonical Supabase migration chain does not define generic
// `disputes` or `evidence` tables. It only defines the separately scoped
// `inspection_disputes` contract. Exposing the legacy generic dispute
// controllers would therefore advertise a workflow that cannot persist
// against the authoritative production schema.
//
// Escrow fund-locking remains supported through POST
// /api/escrow/:id/dispute, which transitions the real `escrows` record
// atomically. Do not replace this 501 contract by inventing schema here.
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, (_req, res) => {
  return res.status(501).json({
    success: false,
    code: "GENERIC_DISPUTES_UNAVAILABLE",
    message:
      "Generic dispute case management is not available because the canonical migration chain does not define generic disputes/evidence tables. Escrow parties can still raise an escrow dispute through the supported escrow workflow.",
  });
});

export default router;
