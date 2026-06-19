import express from "express";
import asyncHandler from "../middleware/asyncHandler.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import {
  createTicket,
  getAllTickets,
  getUserTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  rateTicket,
  getSupportAnalytics,
} from "../controllers/supportController.ts";

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
router.get("/:ticketId", protect, asyncHandler(getTicket));

// Add message to ticket
router.post("/:ticketId/messages", protect, asyncHandler(addMessage));

// Update ticket status (admin only)
router.put("/:ticketId/status", protect, adminOnly, asyncHandler(updateTicketStatus));

// Rate ticket satisfaction
router.post("/:ticketId/rate", protect, asyncHandler(rateTicket));

export default router;
