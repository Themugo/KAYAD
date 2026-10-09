import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { requireSupportStaff } from "../middleware/supportAccess.js";
import { validateObjectId } from "../middleware/validate.js";
import { createLimiter, chatLimiter } from "../middleware/rateLimiter.js";
import {
  getSupportConfig, createTicket, getUserTickets, getTicket, addMessage, rateTicket,
  staffQueue, staffMetrics, staffTeam, staffGetCase, staffReply, staffUpdate,
  getAllTickets, getSupportAnalytics, updateTicketStatus,
} from "../controllers/supportController.js";

const router = express.Router();

// Customer: only ever the caller's own cases, customer projection (no internal notes, no staff identities).
router.get("/config", protect, asyncHandler(getSupportConfig));
router.post("/", protect, createLimiter, asyncHandler(createTicket));
router.get("/my-tickets", protect, asyncHandler(getUserTickets));

// Staff workspace: PERM.MANAGE_SUPPORT only. Declared before "/:id" so literal segments win.
router.get("/staff/queue", protect, requireSupportStaff, asyncHandler(staffQueue));
router.get("/staff/metrics", protect, requireSupportStaff, asyncHandler(staffMetrics));
router.get("/staff/team", protect, requireSupportStaff, asyncHandler(staffTeam));
router.get("/staff/:id", protect, requireSupportStaff, validateObjectId, asyncHandler(staffGetCase));
router.post("/staff/:id/messages", protect, requireSupportStaff, chatLimiter, validateObjectId, asyncHandler(staffReply));
router.patch("/staff/:id", protect, requireSupportStaff, validateObjectId, asyncHandler(staffUpdate));

// Legacy staff aliases -> same service and the same permission.
router.get("/all", protect, requireSupportStaff, asyncHandler(getAllTickets));
router.get("/analytics", protect, requireSupportStaff, asyncHandler(getSupportAnalytics));

router.get("/:id", protect, validateObjectId, asyncHandler(getTicket));
router.post("/:id/messages", protect, chatLimiter, validateObjectId, asyncHandler(addMessage));
router.post("/:id/rate", protect, validateObjectId, asyncHandler(rateTicket));
router.put("/:id/status", protect, requireSupportStaff, validateObjectId, asyncHandler(updateTicketStatus));

export default router;
