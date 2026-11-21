// Realtime (Socket.IO) session bridge — RT-3. See services/socketAuth.service.js.
import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { socketTicketLimiter } from "../middleware/rateLimiter.js";
import { issueSocketTicket } from "../services/socketAuth.service.js";

const router = express.Router();

// POST (not GET) so the global double-submit CSRF check applies; the ticket is returned in the body only (never a URL),
// is valid for 60 s, single-use, and bound to the cookie session that protect() just validated.
router.post(
  "/socket-ticket",
  protect,
  socketTicketLimiter,
  asyncHandler(async (req, res) => {
    const { ticket, expiresIn } = issueSocketTicket(req);
    res.set("Cache-Control", "no-store");
    res.json({ success: true, ticket, expiresIn });
  }),
);

export default router;
