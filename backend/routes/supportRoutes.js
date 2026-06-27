import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  createTicket,
  getAllTickets,
  getUserTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  rateTicket,
  getSupportAnalytics,
} from "../controllers/supportController.js";

const router = express.Router();

// =============================
// 🎫 SUPPORT TICKETS
// =============================

// Create support ticket
router.post("/", protect, asyncHandler(createTicket));

// Get user's tickets
router.get("/my-tickets", protect, asyncHandler(getUserTickets));

// Get all tickets (admin only)
router.get("/all", protect, adminOnly, asyncHandler(getAllTickets));

// Get support analytics (admin only)
router.get("/analytics", protect, adminOnly, asyncHandler(getSupportAnalytics));

// =============================
// 📄 TICKET OPERATIONS
// =============================

// Get ticket details
router.get("/:ticketId", protect, validateObjectId, asyncHandler(getTicket));

// Add message to ticket
router.post("/:ticketId/messages", protect, validateObjectId, asyncHandler(addMessage));

// Update ticket status (admin only)
router.put("/:ticketId/status", protect, adminOnly, validateObjectId, asyncHandler(updateTicketStatus));

// Rate ticket satisfaction
router.post("/:ticketId/rate", protect, validateObjectId, asyncHandler(rateTicket));

export default router;
